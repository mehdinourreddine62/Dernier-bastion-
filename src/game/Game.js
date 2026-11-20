import { CONFIG } from '../config.js';
import { Unit } from './Unit.js';
import { Base } from './Base.js';
import { ProjectilePool } from './Projectile.js';
import { Particles } from './Particles.js';
import { AI } from './AI.js';

// État d'une partie : bases, unités, ressources, projectiles, effets, IA.
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

    this.units = [];
    this.bases = {
      player: new Base('player', this.level),
      enemy: new Base('enemy', this.level),
    };
    this.sides = {
      player: this._makeSide(1),
      enemy: this._makeSide(this.level.aiIncomeMult),
    };
    this.projectiles = new ProjectilePool();
    this.fx = new Particles();
    this.ai = new AI(this);
  }

  _makeSide(incomeMult) {
    return {
      scrap: CONFIG.economy.startScrap,
      incomeMult,
      incomeLevel: 0,         // niveau d'amélioration du revenu (étape 2)
      cooldowns: {},          // recharge de chaque unité
      mods: { hp: 1, damage: 1 }, // bonus de l'atelier (étape 4)
    };
  }

  // Revenu de ferraille par seconde d'un camp
  income(side) {
    const e = CONFIG.economy;
    const s = this.sides[side];
    return (e.baseIncomePerSec + s.incomeLevel * e.incomeUpgrade.bonusPerLevel) * s.incomeMult;
  }

  // Nombre d'unités vivantes d'un camp
  pop(side) {
    let n = 0;
    for (const u of this.units) if (u.side === side && u.alive) n++;
    return n;
  }

  // Peut-on recruter cette unité maintenant ? (recharge, ferraille, population)
  canRecruit(side, defId) {
    const def = CONFIG.units[defId];
    const s = this.sides[side];
    return !this.result && def && def.side === side &&
      !(s.cooldowns[defId] > 0) &&
      s.scrap >= def.cost &&
      this.pop(side) < CONFIG.combat.populationMax;
  }

  recruit(side, defId) {
    if (!this.canRecruit(side, defId)) return false;
    const def = CONFIG.units[defId];
    const s = this.sides[side];
    s.scrap -= def.cost;
    s.cooldowns[defId] = def.recruitCooldown;
    const base = this.bases[side];
    const x = base.faceX + base.dir * CONFIG.combat.spawnOffset;
    this.units.push(new Unit(defId, side, x, s.mods));
    return true;
  }

  fireProjectile(shooter, target, damage, bonus) {
    this.projectiles.spawn(shooter, target, damage, bonus);
  }

  // Applique des dégâts, gère effets, mort et prime en ferraille.
  dealDamage(attackerSide, target, damage, bonus) {
    if (!target.alive) return;
    target.takeDamage(damage);
    const tx = target.isBase ? target.faceX : target.x;
    this.fx.text(tx, target.aimY - 30, String(Math.round(damage)),
      bonus ? '#ffd23f' : '#f3e3c3', bonus ? 18 : 14);
    this.fx.sparks(tx, target.aimY, bonus ? '#ffd23f' : '#ffb347', 3, 80);

    if (!target.alive && !target.isBase) {
      target.die();
      const bounty = Math.round(target.def.cost * CONFIG.economy.killBountyRatio);
      this.sides[attackerSide].scrap += bounty;
      this.fx.puff(target.x, target.y - 10, '#8a7a66');
      if (attackerSide === 'player') this.fx.text(target.x, target.y - 70, '+' + bounty, '#f2c230', 14);
    }
  }

  update(dt) {
    this.time += dt;

    // Après la fin de partie : on laisse seulement vivre les effets
    if (this.result) {
      this.resultTime += dt;
      this.fx.update(dt);
      this.bases.player.update(dt, this);
      this.bases.enemy.update(dt, this);
      return;
    }

    // Revenu + recharges
    for (const side of ['player', 'enemy']) {
      const s = this.sides[side];
      s.scrap += this.income(side) * dt;
      for (const id in s.cooldowns) {
        if (s.cooldowns[id] > 0) s.cooldowns[id] = Math.max(0, s.cooldowns[id] - dt);
      }
    }

    this.ai.update(dt);

    const n = this.units.length;
    for (let i = 0; i < n; i++) this.units[i].update(dt, this);
    this.projectiles.update(dt, this);
    this.bases.player.update(dt, this);
    this.bases.enemy.update(dt, this);
    this.fx.update(dt);

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
