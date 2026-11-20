import { CONFIG } from '../config.js?v=5';
import { Entity } from './Entity.js?v=5';

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

const NO_BONUS = { hp: 1, damage: 1 };

// Une unité (Survivant ou Mutant). Avance, s'arrête devant un ennemi, attaque.
export class Unit extends Entity {
  constructor(defId, side, x, mods) {
    const def = CONFIG.units[defId];
    const c = CONFIG.combat;
    const m = mods.units[defId] || NO_BONUS;
    super(side, x, CONFIG.world.groundY + (Math.random() * 2 - 1) * c.yJitter, def.hp * m.hp);
    this.defId = defId;
    this.def = def;
    this.dir = side === 'player' ? 1 : -1;
    this.damage = def.damage * m.damage;
    this.cd = 0;              // temps avant la prochaine attaque
    this.state = 'walk';      // 'walk' | 'attack' | 'wait' | 'dead'
    this.walk = Math.random() * 6; // phase d'animation de marche
    this.attackAnim = 0;      // 1 -> 0 pendant l'animation d'attaque
    this.dying = false;
    this.deadTime = 0;
  }

  get tags() { return this.def.tags; }
  get aimY() { return this.y - this.def.bodyHeight * 0.55; }

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

    let target = this.findTarget(game, this.def.range);
    // Bloquée derrière un allié qui combat : elle frappe quand même
    // si l'ennemi est à portée de « soutien » (2e rang de la mêlée)
    const blocked = !target && this.isBlocked(game);
    if (blocked) target = this.findTarget(game, this.def.range + CONFIG.combat.meleeSupportReach, true);
    if (target) {
      this.state = 'attack';
      if (this.def.attack.kind === 'flame') game.fx.flame(this.x + this.dir * 22, this.y - 38, this.dir, this.def.range);
      if (this.cd <= 0) this.attack(target, game);
    } else if (blocked) {
      this.state = 'wait';
    } else {
      this.state = 'walk';
      this.x += this.dir * this.def.speed * dt;
      this.walk += dt * Math.min(this.def.speed, 90) * 0.14;
      // Poussière soulevée par les unités rapides ou lourdes (effet visuel)
      if ((this.def.speed >= 100 || this.def.tags.includes('heavy') || this.def.tags.includes('boss')) && Math.random() < 0.25) {
        game.fx.dust(this.x - this.dir * this.def.bodyWidth * 0.4, this.y, 1);
      }
    }
  }

  // Ennemi le plus proche devant moi ; sinon la base ennemie si elle est à portée.
  // unitsOnly : en soutien, on ne frappe que les unités (pas la base)
  findTarget(game, range, unitsOnly = false) {
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
    if (unitsOnly) return null;

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
    const atk = def.attack;
    this.cd = def.attackInterval;
    this.attackAnim = 1;
    if (atk.kind !== 'flame') game.emit('attack', this.x, { id: this.defId });

    switch (atk.kind) {
      case 'projectile':
      case 'cannon':
        game.projectiles.spawn({
          side: this.side,
          x: this.x + this.dir * def.bodyWidth * 0.55,
          y: this.y - def.bodyHeight * 0.62,
          target, damage: this.damage, attackerDef: def,
          cfg: atk.projectile, splash: atk.splashRadius || 0,
        });
        break;
      case 'flame':
        game.flameAttack(this);
        break;
      default: { // 'melee'
        if (atk.splashRadius) {
          const cx = target.isBase ? target.faceX : target.x;
          game.explode(this.side, cx, atk.splashRadius, this.damage, def, true, 'slam');
        } else {
          const mult = bonusMultiplier(def, target);
          game.dealDamage(this.side, target, this.damage * mult, mult > 1);
          if (atk.knockback && !target.isBase && target.alive) game.knockBack(target, atk.knockback);
        }
      }
    }
  }
}
