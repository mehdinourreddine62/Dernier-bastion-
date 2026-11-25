import { CONFIG } from '../config.js?v=26';
import { bonusMultiplier } from './Unit.js?v=26';

// Un projectile visible (balle traçante, crachat d'acide, obus…) qui rejoint sa cible.
// Les projectiles sont réutilisés (pool) : aucune création/destruction en jeu.
export class ProjectilePool {
  constructor(size = CONFIG.pools.projectiles) {
    this.items = Array.from({ length: size }, () => ({ active: false }));
    this.next = 0;
  }

  // o = { side, x, y, target, damage, attackerDef (pour les bonus, ou null), cfg, splash }
  spawn(o) {
    let p = null;
    for (let i = 0; i < this.items.length; i++) {
      const c = this.items[(this.next + i) % this.items.length];
      if (!c.active) { p = c; break; }
    }
    if (!p) p = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;

    p.active = true;
    p.cfg = o.cfg;
    p.side = o.side;
    p.target = o.target;
    p.damage = o.damage;
    p.attackerDef = o.attackerDef || null;
    p.splash = o.splash || 0;
    p.source = o.source || null;
    p.sx = o.x;
    p.sy = o.y;
    p.tx = o.target.isBase ? o.target.faceX : o.target.x;
    p.ty = p.splash ? CONFIG.world.groundY - 10 : o.target.aimY;
    p.x = p.sx;
    p.y = p.sy;
    p.vx = Math.sign(p.tx - p.sx) || 1;
    p.vy = 0;
    p.duration = Math.max(0.05, Math.hypot(p.tx - p.sx, p.ty - p.sy) / o.cfg.speed);
    p.t = 0;
    return p;
  }

  update(dt, game) {
    for (const p of this.items) {
      if (!p.active) continue;
      // Suit la cible tant qu'elle est en vie
      if (p.target.alive) {
        p.tx = p.target.isBase ? p.target.faceX : p.target.x;
        if (!p.splash) p.ty = p.target.aimY;
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
      if (p.t < 1) continue;

      p.active = false;
      game.src = p.source;
      if (p.splash) {
        // Obus : explosion de zone (bonus calculé pour chaque cible)
        game.explode(p.side, p.x, p.splash, p.damage, p.attackerDef, true);
      } else {
        if (p.target.alive) {
          const mult = p.attackerDef ? bonusMultiplier(p.attackerDef, p.target) : 1;
          // tir rapide (Mitrailleur) : chiffres de dégâts affichés pour 1 balle sur 3
          const quiet = !!(p.attackerDef && p.attackerDef.rapidFire) && Math.random() > 0.33;
          game.dealDamage(p.side, p.target, p.damage * mult, mult > 1, quiet);
        }
        if (p.cfg.shape === 'glob') {
          // Crachat d'acide : éclaboussure + flaque au sol
          game.fx.splash(p.x, p.y, p.cfg.color);
          if (Math.random() < 0.6) game.addDecal('acid', p.x + (Math.random() - 0.5) * 16, 10 + Math.random() * 8, 4);
          game.emit('splat', p.x);
        } else if (p.cfg.shape !== 'sonic') {
          game.fx.sparks(p.x, p.y, p.cfg.color, 3, 90);
        }
      }
    }
  }
}
