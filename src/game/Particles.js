import { CONFIG } from '../config.js';

// Effets visuels : étincelles, fumée, chiffres flottants. Tout est en pool.
export class Particles {
  constructor() {
    this.parts = Array.from({ length: CONFIG.pools.particles }, () => ({ active: false }));
    this.texts = Array.from({ length: CONFIG.pools.floatingTexts }, () => ({ active: false }));
    this.nextPart = 0;
    this.nextText = 0;
  }

  _part() {
    const p = this.parts[this.nextPart];
    this.nextPart = (this.nextPart + 1) % this.parts.length;
    return p;
  }

  sparks(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const p = this._part();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      p.active = true; p.kind = 'spark';
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - 30;
      p.life = p.maxLife = 0.25 + Math.random() * 0.25;
      p.size = 2; p.color = color; p.gravity = 300;
    }
  }

  smoke(x, y) {
    const p = this._part();
    p.active = true; p.kind = 'smoke';
    p.x = x; p.y = y;
    p.vx = (Math.random() - 0.5) * 14; p.vy = -22 - Math.random() * 14;
    p.life = p.maxLife = 1.4 + Math.random() * 0.8;
    p.size = 8 + Math.random() * 6; p.color = '#3b322c'; p.gravity = 0;
  }

  puff(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const p = this._part();
      p.active = true; p.kind = 'smoke';
      p.x = x + (Math.random() - 0.5) * 16; p.y = y - Math.random() * 10;
      p.vx = (Math.random() - 0.5) * 50; p.vy = -10 - Math.random() * 30;
      p.life = p.maxLife = 0.5 + Math.random() * 0.4;
      p.size = 6 + Math.random() * 5; p.color = color; p.gravity = 0;
    }
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
