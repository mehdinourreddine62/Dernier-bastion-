import { CONFIG } from '../config.js';

// Effets visuels : étincelles, fumée, flammes, explosions, soins, chiffres flottants.
// Tout est en pool : on recycle les plus anciens au lieu de créer des objets.
export class Particles {
  constructor() {
    this.parts = Array.from({ length: CONFIG.pools.particles }, () => ({ active: false }));
    this.texts = Array.from({ length: CONFIG.pools.floatingTexts }, () => ({ active: false }));
    this.nextPart = 0;
    this.nextText = 0;
  }

  _part(kind, x, y, vx, vy, life, size, color, gravity) {
    const p = this.parts[this.nextPart];
    this.nextPart = (this.nextPart + 1) % this.parts.length;
    p.active = true; p.kind = kind;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = p.maxLife = life;
    p.size = size; p.color = color; p.gravity = gravity;
    return p;
  }

  sparks(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this._part('spark', x, y, Math.cos(a) * s, Math.sin(a) * s - 30, 0.25 + Math.random() * 0.25, 2, color, 300);
    }
  }

  smoke(x, y) {
    this._part('smoke', x, y, (Math.random() - 0.5) * 14, -22 - Math.random() * 14,
      1.4 + Math.random() * 0.8, 8 + Math.random() * 6, '#3b322c', 0);
  }

  puff(x, y, color) {
    for (let i = 0; i < 6; i++) {
      this._part('smoke', x + (Math.random() - 0.5) * 16, y - Math.random() * 10,
        (Math.random() - 0.5) * 50, -10 - Math.random() * 30,
        0.5 + Math.random() * 0.4, 6 + Math.random() * 5, color, 0);
    }
  }

  // Jet de flammes vers l'avant (appelé à chaque pas tant que le lance-flammes tire)
  flame(x, y, dir, range) {
    const life = 0.32;
    const speed = range / life;
    this._part('flame', x, y + (Math.random() - 0.5) * 4,
      dir * speed * (0.75 + Math.random() * 0.35), (Math.random() - 0.6) * 40,
      life * (0.7 + Math.random() * 0.3), 4 + Math.random() * 3, '#ffb347', -40);
  }

  // Explosion : flash, onde de choc, étincelles, fumée
  explosion(x, y, radius) {
    this._part('flash', x, y, 0, 0, 0.15, radius * 0.9, '#fff3c0', 0);
    this._part('ring', x, y, 0, 0, 0.35, radius * 1.3, '#ffe0a0', 0);
    this.sparks(x, y - 6, '#ffb347', 10, 260);
    for (let i = 0; i < 6; i++) {
      this._part('smoke', x + (Math.random() - 0.5) * radius, y - Math.random() * radius * 0.6,
        (Math.random() - 0.5) * 40, -20 - Math.random() * 40,
        0.8 + Math.random() * 0.6, 8 + Math.random() * 8, '#4a3a30', 0);
    }
  }

  heal(x, y) {
    for (let i = 0; i < 5; i++) {
      this._part('plus', x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 20,
        0, -30 - Math.random() * 20, 0.7 + Math.random() * 0.3, 4, '#7ee05a', 0);
    }
  }

  healRing(x, y, radius) {
    this._part('ring', x, y, 0, 0, 0.5, radius, '#7ee05a', 0);
  }

  // Chiffre flottant (dégâts, prime…)
  text(x, y, str, color, size = 15) {
    const t = this.texts[this.nextText];
    this.nextText = (this.nextText + 1) % this.texts.length;
    t.active = true;
    t.x = x + (Math.random() - 0.5) * 10; t.y = y;
    t.str = str; t.color = color; t.size = size;
    t.life = t.maxLife = 0.8;
  }

  update(dt) {
    for (const p of this.parts) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (const t of this.texts) {
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) { t.active = false; continue; }
      t.y -= 28 * dt;
    }
  }
}
