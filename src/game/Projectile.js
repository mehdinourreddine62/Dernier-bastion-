import { CONFIG } from '../config.js';

// Un projectile visible (balle traçante, crachat d'acide…) qui rejoint sa cible.
// Les projectiles sont réutilisés (pool) : aucune création/destruction en jeu.
class Projectile {
  constructor() { this.active = false; }
}

export class ProjectilePool {
  constructor(size = CONFIG.pools.projectiles) {
    this.items = Array.from({ length: size }, () => new Projectile());
    this.next = 0;
  }

  spawn(shooter, target, damage, bonus) {
    // Cherche un emplacement libre, sinon recycle le suivant
    let p = null;
    for (let i = 0; i < this.items.length; i++) {
      const c = this.items[(this.next + i) % this.items.length];
      if (!c.active) { p = c; break; }
    }
    if (!p) p = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;

    const cfg = shooter.def.attack.projectile;
    p.active = true;
    p.cfg = cfg;
    p.side = shooter.side;
    p.target = target;
    p.damage = damage;
    p.bonus = bonus;
    p.sx = shooter.x + shooter.dir * 20;
    p.sy = shooter.y - 40;
    p.tx = target.isBase ? target.faceX : target.x;
    p.ty = target.aimY;
    p.x = p.sx;
    p.y = p.sy;
    p.vx = shooter.dir;      // direction pour dessiner la traînée
    p.vy = 0;
    const dist = Math.hypot(p.tx - p.sx, p.ty - p.sy);
    p.duration = Math.max(0.05, dist / cfg.speed);
    p.t = 0;
    return p;
  }

  update(dt, game) {
    for (const p of this.items) {
      if (!p.active) continue;
      // Suit la cible tant qu'elle est en vie
      if (p.target.alive) {
        p.tx = p.target.isBase ? p.target.faceX : p.target.x;
        p.ty = p.target.aimY;
      }
      p.t += dt / p.duration;
      const t = Math.min(1, p.t);
      const nx = p.sx + (p.tx - p.sx) * t;
      const ny = p.sy + (p.ty - p.sy) * t - Math.sin(Math.PI * t) * p.cfg.arcHeight;
      const dx = nx - p.x;
      const dy = ny - p.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.001) { p.vx = dx / len; p.vy = dy / len; }
      p.x = nx;
      p.y = ny;
      if (p.t >= 1) {
        p.active = false;
        if (p.target.alive) game.dealDamage(p.side, p.target, p.damage, p.bonus);
        game.fx.sparks(p.x, p.y, p.cfg.color, 4, 90);
      }
    }
  }
}
