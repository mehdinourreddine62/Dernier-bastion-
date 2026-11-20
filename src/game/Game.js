import { CONFIG } from '../config.js?v=4';
import { Unit, bonusMultiplier } from './Unit.js?v=4';
import { Base } from './Base.js?v=4';
import { ProjectilePool } from './Projectile.js?v=4';
import { Particles } from './Particles.js?v=4';
import { Spells } from './Spell.js?v=4';
import { AI } from './AI.js?v=4';

const SIDES = ['player', 'enemy'];
const MAX_EVENTS = 120;

// État d'une partie : bases, unités, ressources, file de recrutement, sorts, IA.
// Aucune dépendance au navigateur : la simulation peut tourner sans écran.
// Les sons et secousses d'écran sont pilotés par la liste `events`, vidée par main.js.
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
    this.events = [];         // événements de l'image (sons, secousses)

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
    // Traces au sol : cratères, brûlures, flaques d'acide, restes de mutants
    this.decals = Array.from({ length: CONFIG.pools.decals }, () => ({ active: false }));
    this.bossDone = this.level.bosses.map(() => false);
    this.ai = new AI(this);
    this._boomTimer = 0;
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

  emit(type, x, data) {
    if (this.events.length < MAX_EVENTS) this.events.push({ type, x, data });
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
    if (side === 'player') this.emit('upgrade', 0);
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
    if (side === 'player') this.emit('queue', 0);
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
    this.fx.dust(x, u.y, 4);
    this.emit('spawn', x, { side, id: defId });
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
      this.fx.hit(tx, target.aimY, target.isBase ? 'base' : target.side === 'enemy' ? 'ichor' : 'blood');
    }
    if (target.isBase) this.emit('baseHit', tx, { side: target.side });

    if (!target.alive && !target.isBase) {
      target.die();
      const bounty = Math.round(target.def.cost * CONFIG.economy.killBountyRatio);
      this.sides[attackerSide].scrap += bounty;
      this.emit('death', target.x, { id: target.defId });
      if (target.defId === 'blinde') {
        this.fx.explosion(target.x, target.y - 30, 60);
        this.addDecal('scorch', target.x, 60, 8);
        this.emit('explosion', target.x, { big: true });
      } else if (target.side === 'enemy') {
        this.addDecal('ichor', target.x, target.def.bodyWidth * 0.6, 5);
        this.fx.hit(target.x, target.y - 20, 'ichor');
      } else {
        this.fx.puff(target.x, target.y - 8, '#8a7a66');
      }
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
    const gy = CONFIG.world.groundY;
    if (look === 'slam') {
      this.fx.slam(x, gy, radius);
      this.emit('slam', x);
    } else {
      this.fx.explosion(x, gy - 8, look === 'big' ? radius * 1.2 : radius);
      this.addDecal('scorch', x, radius * 0.9, 7);
      this.emit('explosion', x, { big: look === 'big' });
    }
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
    this.emit('flame', unit.x);
  }

  // Recul infligé par la Brute (sans passer derrière sa propre base)
  knockBack(target, dist) {
    const own = this.bases[target.side];
    target.x -= target.dir * dist;
    if ((target.x - own.faceX) * target.dir < 0) target.x = own.faceX;
  }

  // Trace au sol temporaire : 'crater' | 'scorch' | 'acid' | 'ichor'
  addDecal(kind, x, r, life) {
    let d = this.decals.find((o) => !o.active);
    if (!d) d = this.decals.reduce((a, b) => (a.life < b.life ? a : b));
    d.active = true; d.kind = kind; d.x = x; d.r = r; d.life = d.maxLife = life;
    d.seed = Math.random() * 1000;
  }

  // Boss : apparaissent quand la base ennemie passe sous un seuil de PV
  _checkBosses() {
    const ratio = this.bases.enemy.hp / this.bases.enemy.maxHp;
    this.level.bosses.forEach((b, i) => {
      if (this.bossDone[i] || ratio > b.atBaseHpRatio) return;
      this.bossDone[i] = true;
      this.spawnUnit('enemy', b.unit);
      this.banner = { text: "L'ABOMINATION SORT DU NID !", time: CONFIG.combat.bossBannerTime };
      this.emit('boss', this.bases.enemy.faceX);
    });
  }

  // ---------- Boucle ----------

  update(dt) {
    this.time += dt;
    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }
    for (const d of this.decals) if (d.active && (d.life -= dt) <= 0) d.active = false;

    // Après la fin de partie : la base vaincue explose, puis seuls les effets vivent
    if (this.result) {
      this.resultTime += dt;
      const b = this.result === 'won' ? this.bases.enemy : this.bases.player;
      this._boomTimer -= dt;
      if (this.resultTime < 1.6 && this._boomTimer <= 0) {
        this._boomTimer = 0.14;
        const x = b.x + (Math.random() - 0.5) * b.width;
        this.fx.explosion(x, b.y - Math.random() * b.height * 0.8, 40 + Math.random() * 30);
        if (Math.random() < 0.5) this.emit('explosion', x, { big: Math.random() < 0.4 });
      }
      for (const u of this.units) if (u.dying) u.deadTime += dt;
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
      this._boomTimer = 0;
      this.emit(this.result === 'won' ? 'win' : 'lose', 0);
      const b = this.result === 'won' ? this.bases.enemy : this.bases.player;
      this.emit('explosion', b.faceX, { big: true, huge: true });
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
