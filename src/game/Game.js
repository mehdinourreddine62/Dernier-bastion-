import { CONFIG } from '../config.js';
import { Unit, bonusMultiplier } from './Unit.js';
import { Base } from './Base.js';
import { ProjectilePool } from './Projectile.js';
import { Particles } from './Particles.js';
import { Spells } from './Spell.js';
import { AI } from './AI.js';

const SIDES = ['player', 'enemy'];

// État d'une partie : bases, unités, ressources, file de recrutement, sorts, IA.
// Aucune dépendance au navigateur : la simulation peut tourner sans écran.
export class Game {
  constructor(levelIndex = 0) {
    this.levelIndex = levelIndex;
    this.level = CONFIG.levels[levelIndex];
    this.time = 0;
    this.speed = 1;
    this.paused = false;
    this.result = null;       // null | 'won' | 'lost'
    this.resultTime = 0;      // temps écoulé depuis la fin de partie
    this.banner = null;       // annonce à l'écran { text, time }

    this.sides = {
      player: this._makeSide(1),
      enemy: this._makeSide(this.level.aiIncomeMult),
    };
    this.units = [];
    this.bases = {
      player: new Base('player', this.level, this.sides.player.mods),
      enemy: new Base('enemy', this.level, this.sides.enemy.mods),
    };
    this.projectiles = new ProjectilePool();
    this.fx = new Particles();
    this.spells = new Spells(this);
    this.craters = Array.from({ length: CONFIG.pools.craters }, () => ({ active: false }));
    this.bossDone = this.level.bosses.map(() => false);
    this.ai = new AI(this);
  }

  _makeSide(incomeMult) {
    return {
      scrap: CONFIG.economy.startScrap,
      incomeMult,
      incomeLevel: 0,         // niveau d'amélioration du revenu en partie
      cooldowns: {},          // recharge de chaque unité
      queue: [],              // recrutements payés en attente de sortie
      // Bonus de l'atelier (étape 4) : multiplicateurs, 1 = aucun bonus
      mods: { hp: 1, damage: 1, wallHp: 0, turretDamage: 1, turretRange: 1, spellCooldown: 1, income: 0 },
    };
  }

  // ---------- Économie ----------

  // Revenu de ferraille par seconde d'un camp
  income(side) {
    const e = CONFIG.economy;
    const s = this.sides[side];
    return (e.baseIncomePerSec + s.mods.income + s.incomeLevel * e.incomeUpgrade.bonusPerLevel) * s.incomeMult;
  }

  // Coût du prochain niveau d'amélioration du revenu (null si au maximum)
  incomeUpgradeCost(side) {
    const costs = CONFIG.economy.incomeUpgrade.costs;
    const lvl = this.sides[side].incomeLevel;
    return lvl < costs.length ? costs[lvl] : null;
  }

  upgradeIncome(side) {
    const cost = this.incomeUpgradeCost(side);
    const s = this.sides[side];
    if (this.result || cost === null || s.scrap < cost) return false;
    s.scrap -= cost;
    s.incomeLevel++;
    return true;
  }

  // ---------- Recrutement ----------

  // Nombre d'unités vivantes d'un camp
  pop(side) {
    let n = 0;
    for (const u of this.units) if (u.side === side && u.alive) n++;
    return n;
  }

  isUnlocked(side, defId) {
    const def = CONFIG.units[defId];
    if (!def || def.side !== side) return false;
    return side === 'enemy' || def.unlockLevel <= this.level.id;
  }

  // Peut-on ajouter cette unité à la file ? (ferraille, place dans la file)
  canRecruit(side, defId) {
    const s = this.sides[side];
    return !this.result && this.isUnlocked(side, defId) &&
      s.scrap >= CONFIG.units[defId].cost &&
      s.queue.length < CONFIG.combat.recruitQueueMax;
  }

  // Paye l'unité et la met dans la file. Elle sort dès que sa recharge le permet.
  recruit(side, defId) {
    if (!this.canRecruit(side, defId)) return false;
    const s = this.sides[side];
    s.scrap -= CONFIG.units[defId].cost;
    s.queue.push(defId);
    return true;
  }

  queuedCount(side, defId) {
    let n = 0;
    for (const id of this.sides[side].queue) if (id === defId) n++;
    return n;
  }

  // Fait sortir la première unité de la file dont la recharge est terminée
  _processQueue(side) {
    const s = this.sides[side];
    if (s.queue.length === 0 || this.pop(side) >= CONFIG.combat.populationMax) return;
    for (let i = 0; i < s.queue.length; i++) {
      const id = s.queue[i];
      if (s.cooldowns[id] > 0) continue;
      s.queue.splice(i, 1);
      s.cooldowns[id] = CONFIG.units[id].recruitCooldown;
      this.spawnUnit(side, id);
      return;
    }
  }

  spawnUnit(side, defId) {
    const base = this.bases[side];
    const x = base.faceX + base.dir * CONFIG.combat.spawnOffset;
    const u = new Unit(defId, side, x, this.sides[side].mods);
    this.units.push(u);
    return u;
  }

  // ---------- Combat ----------

  // Applique des dégâts, gère effets, mort et prime en ferraille.
  dealDamage(attackerSide, target, damage, bonus, quiet = false) {
    if (!target.alive || damage <= 0) return;
    target.takeDamage(damage);
    const tx = target.isBase ? target.faceX : target.x;
    if (!quiet) {
      this.fx.text(tx, target.aimY - 30, String(Math.round(damage)),
        bonus ? '#ffd23f' : '#f3e3c3', bonus ? 18 : 14);
      this.fx.sparks(tx, target.aimY, bonus ? '#ffd23f' : '#ffb347', 3, 80);
    }

    if (!target.alive && !target.isBase) {
      target.die();
      const bounty = Math.round(target.def.cost * CONFIG.economy.killBountyRatio);
      this.sides[attackerSide].scrap += bounty;
      this.fx.puff(target.x, target.y - 10, '#8a7a66');
      if (attackerSide === 'player') this.fx.text(target.x, target.y - target.def.bodyHeight - 6, '+' + bounty, '#f2c230', 14);
    }
  }

  // Dégâts de zone autour du point x (obus, mortier, coup de l'Abomination).
  // attackerDef sert aux bonus de type (null = pas de bonus).
  explode(attackerSide, x, radius, damage, attackerDef, hitsBase, look = 'normal') {
    for (const u of this.units) {
      if (u.side === attackerSide || !u.alive) continue;
      if (Math.abs(u.x - x) > radius) continue;
      const mult = attackerDef ? bonusMultiplier(attackerDef, u) : 1;
      this.dealDamage(attackerSide, u, damage * mult, mult > 1);
    }
    if (hitsBase) {
      const base = this.bases[attackerSide === 'player' ? 'enemy' : 'player'];
      // La base est touchée si l'explosion atteint sa façade (ou est dedans)
      if ((base.faceX - x) * base.dir >= -radius) {
        const mult = attackerDef ? bonusMultiplier(attackerDef, base) : 1;
        this.dealDamage(attackerSide, base, damage * mult, mult > 1);
      }
    }
    if (look === 'slam') this.fx.puff(x, CONFIG.world.groundY - 4, '#6a5040');
    else this.fx.explosion(x, CONFIG.world.groundY - 8, look === 'big' ? radius * 1.2 : radius);
  }

  // Lance-flammes : touche tous les ennemis devant lui jusqu'à sa portée
  flameAttack(unit) {
    const def = unit.def;
    const tol = CONFIG.combat.targetBehindTolerance;
    for (const e of this.units) {
      if (e.side === unit.side || !e.alive) continue;
      const d = (e.x - unit.x) * unit.dir;
      if (d < -tol || d > def.range) continue;
      const mult = bonusMultiplier(def, e);
      this.dealDamage(unit.side, e, unit.damage * mult, mult > 1, Math.random() > 0.35);
    }
    const base = this.bases[unit.side === 'player' ? 'enemy' : 'player'];
    if ((base.faceX - unit.x) * unit.dir <= def.range) {
      const mult = bonusMultiplier(def, base);
      this.dealDamage(unit.side, base, unit.damage * mult, mult > 1, Math.random() > 0.35);
    }
  }

  // Recul infligé par la Brute (sans passer derrière sa propre base)
  knockBack(target, dist) {
    const own = this.bases[target.side];
    target.x -= target.dir * dist;
    if ((target.x - own.faceX) * target.dir < 0) target.x = own.faceX;
  }

  addCrater(x, r, life) {
    const c = this.craters.find((o) => !o.active) || this.craters[0];
    c.active = true; c.x = x; c.r = r; c.life = c.maxLife = life;
  }

  // Boss : apparaissent quand la base ennemie passe sous un seuil de PV
  _checkBosses() {
    const ratio = this.bases.enemy.hp / this.bases.enemy.maxHp;
    this.level.bosses.forEach((b, i) => {
      if (this.bossDone[i] || ratio > b.atBaseHpRatio) return;
      this.bossDone[i] = true;
      this.spawnUnit('enemy', b.unit);
      this.banner = { text: "L'ABOMINATION SORT DU NID !", time: CONFIG.combat.bossBannerTime };
    });
  }

  // ---------- Boucle ----------

  update(dt) {
    this.time += dt;
    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }
    for (const c of this.craters) if (c.active && (c.life -= dt) <= 0) c.active = false;

    // Après la fin de partie : on laisse seulement vivre les effets
    if (this.result) {
      this.resultTime += dt;
      this.fx.update(dt);
      this.bases.player.update(dt, this);
      this.bases.enemy.update(dt, this);
      return;
    }

    // Revenu + recharges + sorties de la file
    for (const side of SIDES) {
      const s = this.sides[side];
      s.scrap += this.income(side) * dt;
      for (const id in s.cooldowns) {
        if (s.cooldowns[id] > 0) s.cooldowns[id] = Math.max(0, s.cooldowns[id] - dt);
      }
      this._processQueue(side);
    }

    this.ai.update(dt);
    this.spells.update(dt);

    const n = this.units.length;
    for (let i = 0; i < n; i++) this.units[i].update(dt, this);
    this.projectiles.update(dt, this);
    this.bases.player.update(dt, this);
    this.bases.enemy.update(dt, this);
    this.fx.update(dt);
    this._checkBosses();

    // Retire les dépouilles anciennes
    const corpse = CONFIG.combat.corpseTime;
    let w = 0;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!(u.dying && u.deadTime >= corpse)) this.units[w++] = u;
    }
    this.units.length = w;

    // Victoire / défaite
    if (!this.bases.player.alive) this.result = 'lost';
    else if (!this.bases.enemy.alive) this.result = 'won';
    if (this.result) {
      this.resultTime = 0;
      const b = this.result === 'won' ? this.bases.enemy : this.bases.player;
      for (let i = 0; i < 14; i++) this.fx.puff(b.x + (Math.random() - 0.5) * b.width, b.y - Math.random() * b.height, '#5a4a3e');
    }
  }

  // Nombre d'étoiles (0 si défaite)
  get stars() {
    if (this.result !== 'won') return 0;
    const r = this.bases.player.hp / this.bases.player.maxHp;
    const c = CONFIG.stars;
    return r > c.threeStarsAbove ? 3 : r > c.twoStarsAbove ? 2 : 1;
  }
}
