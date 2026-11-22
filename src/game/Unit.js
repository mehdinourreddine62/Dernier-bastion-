import { CONFIG } from '../config.js?v=19';
import { Entity } from './Entity.js?v=19';

// Multiplicateur de dégâts de l'attaquant contre les types de la cible.
// On prend le meilleur bonus parmi les types de la cible.
// Les résistances de la cible (ex. Carapace contre les tirs) s'appliquent ensuite,
// sauf si l'attaquant perce les blindages (pierce).
export function bonusMultiplier(attackerDef, target) {
  const bonuses = attackerDef.bonuses;
  let m = 1;
  if (bonuses) for (const tag of target.tags) {
    if (bonuses[tag] && bonuses[tag] > m) m = bonuses[tag];
  }
  const res = target.def && target.def.resist;
  if (res && !attackerDef.pierce) {
    let r = 1;
    for (const tag of attackerDef.tags || []) if (res[tag] !== undefined && res[tag] < r) r = res[tag];
    m *= r;
  }
  return m;
}

const NO_BONUS = { hp: 1, damage: 1 };

// Premier indice de la liste (triée par x) dont la position est >= x
export function lowerBound(list, x) {
  let lo = 0, hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].x < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}

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
    // Unités à durée de vie limitée (tourelle posée par un commandant)
    if (def.lifetime) this.life = def.lifetime;
    // Unités volantes : altitude (visuelle et pour la visée)
    this.alt = def.flying ? 70 + Math.random() * 18 : 0;
    this.speedMult = 1;       // boss enragé
    this.howled = 0;          // cri d'un Hurleur proche (réglages du cri) ou 0
    if (def.summon) this.summonTimer = def.summon.every;
  }

  // Multiplicateurs de vitesse et de dégâts du moment (Cri de ralliement, Hurleur, rage)
  speedFactor(game) { return game.rallyMult(this.side) * this.speedMult * (this.howled ? 1 + this.howled.speed : 1); }
  damageFactor(game) { return game.rallyMult(this.side) * (this.howled ? 1 + this.howled.damage : 1); }

  get tags() { return this.def.tags; }

  // Puis-je attaquer cette unité ? Les volants ne sont touchés que par les unités anti-aériennes ;
  // les volants, eux, n'attaquent que les unités à distance (ils survolent la mêlée).
  canHit(e) {
    if (e.def.flying) return !!this.def.antiAir;
    if (this.def.flying) return e.def.tags.includes('ranged');
    return true;
  }
  get aimY() { return this.y - this.alt - this.def.bodyHeight * 0.55; }

  die() {
    this.dying = true;
    this.deadTime = 0;
    this.state = 'dead';
  }

  update(dt, game) {
    if (this.dying) {
      this.deadTime += dt;
      if (this.alt > 0) this.alt = Math.max(0, this.alt - dt * 220);   // un volant abattu tombe
      return;
    }

    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.cd = Math.max(0, this.cd - dt);
    if (this.life !== undefined && (this.life -= dt) <= 0) {
      this.hp = 0; this.die(); game.fx.puff(this.x, this.y - 10, '#8a7a66');
      return;
    }
    this.attackAnim = Math.max(0, this.attackAnim - dt / CONFIG.combat.attackAnimTime);
    // Boss qui appelle des renforts à intervalle régulier (Matriarche)
    if (this.def.summon && (this.summonTimer -= dt) <= 0) {
      const sm = this.def.summon;
      this.summonTimer = sm.every;
      for (let i = 0; i < sm.count; i++) game.spawnUnit(this.side, sm.unit, this.x + this.dir * (30 + i * 16));
      game.fx.hit(this.x + this.dir * 40, this.y - 30, 'ichor');
    }

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
      this.x += this.dir * this.def.speed * this.speedFactor(game) * dt;
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
    // Liste des ennemis triée par position : on cherche le premier devant moi
    // (derrière moi : ignoré, on ne recule jamais)
    const L = game.byX[this.side === 'player' ? 'enemy' : 'player'];
    if (this.dir > 0) {
      for (let i = lowerBound(L, this.x - tol); i < L.length; i++) {
        const e = L[i];
        if (e.x - this.x > range) break;
        if (e.alive && this.canHit(e)) return e;
      }
    } else {
      for (let i = lowerBound(L, this.x + tol + 0.0001) - 1; i >= 0; i--) {
        const e = L[i];
        if (this.x - e.x > range) break;
        if (e.alive && this.canHit(e)) return e;
      }
    }
    if (unitsOnly) return null;

    const base = game.bases[this.side === 'player' ? 'enemy' : 'player'];
    if (base.alive && (base.faceX - this.x) * this.dir <= range) return base;
    return null;
  }

  // Les unités de mêlée attendent derrière un allié de mêlée qui combat (ou attend déjà).
  isBlocked(game) {
    if (this.def.range > CONFIG.combat.meleeWaitRange || this.def.flying) return false;
    const gap = CONFIG.combat.blockGap;
    const L = game.byX[this.side];
    // Alliés juste devant moi (entre 0 et `gap`), via la liste triée
    let i = this.dir > 0 ? lowerBound(L, this.x) : lowerBound(L, this.x) - 1;
    for (; i >= 0 && i < L.length; i += this.dir) {
      const a = L[i];
      const d = (a.x - this.x) * this.dir;
      if (d >= gap) break;
      if (a === this || d <= 0 || !a.alive || a.def.flying) continue;
      // On ne s'arrête que derrière une autre unité de corps à corps :
      // on dépasse les tireurs, lance-flammes et blindés pour les protéger
      if (a.def.range > CONFIG.combat.meleeWaitRange) continue;
      if (a.state === 'attack' || a.state === 'wait') return true;
    }
    return false;
  }

  attack(target, game) {
    const def = this.def;
    const atk = def.attack;
    this.cd = def.attackInterval;
    this.attackAnim = 1;
    game.src = this.defId;   // les dégâts qui suivent sont attribués à ce type d'unité
    const dmg = this.damage * this.damageFactor(game);   // Cri de ralliement, Hurleur
    if (atk.kind !== 'flame') game.emit('attack', this.x, { id: this.defId });

    switch (atk.kind) {
      case 'projectile':
      case 'cannon':
        game.projectiles.spawn({
          side: this.side,
          x: this.x + this.dir * def.bodyWidth * 0.55,
          y: this.y - this.alt - def.bodyHeight * 0.62,
          target, damage: dmg, attackerDef: def, source: this.defId,
          cfg: atk.projectile, splash: atk.splashRadius || 0,
        });
        break;
      case 'flame':
        game.flameAttack(this);
        break;
      case 'shotgun':
        game.coneAttack(this, atk.targets || 3);
        break;
      case 'suicide': {
        // Kamikaze : explose sur la cible (bonus contre les blindés) et meurt
        const cx = target.isBase ? target.faceX : target.x;
        game.explode(this.side, cx, atk.splashRadius, this.damage, def, true, 'normal');
        this.hp = 0;
        this.die();
        game.emit('death', this.x, { id: this.defId });
        break;
      }
      default: { // 'melee'
        if (atk.splashRadius) {
          const cx = target.isBase ? target.faceX : target.x;
          game.explode(this.side, cx, atk.splashRadius, dmg, def, true, 'slam');
        } else {
          const mult = bonusMultiplier(def, target);
          game.dealDamage(this.side, target, dmg * mult, mult > 1);
          if (atk.knockback && !target.isBase && target.alive) game.knockBack(target, atk.knockback);
        }
      }
    }
  }
}
