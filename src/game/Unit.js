import { CONFIG } from '../config.js';
import { Entity } from './Entity.js';

// Multiplicateur de dégâts de l'attaquant contre les types de la cible.
// On prend le meilleur bonus parmi les types de la cible.
export function bonusMultiplier(attackerDef, target) {
  const bonuses = attackerDef.bonuses;
  if (!bonuses) return 1;
  let m = 1;
  for (const tag of target.tags) {
    if (bonuses[tag] && bonuses[tag] > m) m = bonuses[tag];
  }
  return m;
}

// Une unité (Survivant ou Mutant). Avance, s'arrête devant un ennemi, attaque.
export class Unit extends Entity {
  constructor(defId, side, x, mods) {
    const def = CONFIG.units[defId];
    const c = CONFIG.combat;
    super(side, x, CONFIG.world.groundY + (Math.random() * 2 - 1) * c.yJitter, def.hp * mods.hp);
    this.defId = defId;
    this.def = def;
    this.dir = side === 'player' ? 1 : -1;
    this.damage = def.damage * mods.damage;
    this.cd = 0;              // temps avant la prochaine attaque
    this.state = 'walk';      // 'walk' | 'attack' | 'wait'
    this.walk = Math.random() * 6; // phase d'animation de marche
    this.attackAnim = 0;      // 1 -> 0 pendant l'animation d'attaque
    this.dying = false;
    this.deadTime = 0;
  }

  get tags() { return this.def.tags; }
  get aimY() { return this.y - 34; }

  die() {
    this.dying = true;
    this.deadTime = 0;
    this.state = 'dead';
  }

  update(dt, game) {
    if (this.dying) { this.deadTime += dt; return; }

    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.cd = Math.max(0, this.cd - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt / CONFIG.combat.attackAnimTime);

    const target = this.findTarget(game);
    if (target) {
      this.state = 'attack';
      if (this.cd <= 0) this.attack(target, game);
    } else if (this.isBlocked(game)) {
      this.state = 'wait';
    } else {
      this.state = 'walk';
      this.x += this.dir * this.def.speed * dt;
      this.walk += dt * this.def.speed * 0.14;
    }
  }

  // Ennemi le plus proche devant moi ; sinon la base ennemie si elle est à portée.
  findTarget(game) {
    const range = this.def.range;
    const tol = CONFIG.combat.targetBehindTolerance;
    let best = null;
    let bestD = Infinity;
    for (const e of game.units) {
      if (e.side === this.side || !e.alive) continue;
      const d = (e.x - this.x) * this.dir;
      if (d < -tol) continue;                 // derrière moi : on ne recule jamais
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best && bestD <= range) return best;

    const base = game.bases[this.side === 'player' ? 'enemy' : 'player'];
    if (base.alive && (base.faceX - this.x) * this.dir <= range) return base;
    return null;
  }

  // Les unités de mêlée attendent derrière un allié qui combat (ou attend déjà).
  isBlocked(game) {
    if (this.def.range > CONFIG.combat.meleeWaitRange) return false;
    const gap = CONFIG.combat.blockGap;
    for (const a of game.units) {
      if (a === this || a.side !== this.side || !a.alive) continue;
      const d = (a.x - this.x) * this.dir;
      if (d > 0 && d < gap && (a.state === 'attack' || a.state === 'wait')) return true;
    }
    return false;
  }

  attack(target, game) {
    const def = this.def;
    this.cd = def.attackInterval;
    this.attackAnim = 1;
    const mult = bonusMultiplier(def, target);
    const dmg = this.damage * mult;
    if (def.attack.kind === 'projectile') {
      game.fireProjectile(this, target, dmg, mult > 1);
    } else {
      // 'melee' (et repli provisoire pour 'flame' / 'cannon' avant l'étape 2)
      game.dealDamage(this.side, target, dmg, mult > 1);
    }
  }
}
