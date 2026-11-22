import { CONFIG } from '../config.js?v=18';

// Effets visuels : étincelles, fumée, flammes, explosions, débris, soins, chiffres.
// Tout est en pool : on recycle les plus anciens au lieu de créer des objets.
// Types (kind) : spark, smoke, dust, flame, glow, fireball, ring, plus, debris, ember, drop
export class Particles {
  constructor() {
    this.parts = Array.from({ length: CONFIG.pools.particles }, () => ({ active: false }));
    this.texts = Array.from({ length: CONFIG.pools.floatingTexts }, () => ({ active: false }));
    this.nextPart = 0;
    this.nextText = 0;
    this.groundY = CONFIG.world.groundY;
  }

  _part(kind, x, y, vx, vy, life, size, color, gravity) {
    const p = this.parts[this.nextPart];
    this.nextPart = (this.nextPart + 1) % this.parts.length;
    p.active = true; p.kind = kind;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = p.maxLife = life;
    p.size = size; p.color = color; p.gravity = gravity;
    p.rot = Math.random() * 6.28; p.spin = (Math.random() - 0.5) * 12;
    p.floor = this.groundY + (Math.random() - 0.5) * 24;
    return p;
  }

  sparks(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this._part('spark', x, y, Math.cos(a) * s, Math.sin(a) * s - 30, 0.2 + Math.random() * 0.25, 2, color, 400);
    }
  }

  // Impact sur une cible : 'blood' (survivant), 'ichor' (mutant), 'base'
  hit(x, y, kind) {
    if (kind === 'base') { this.sparks(x, y, '#ffcf7a', 4, 140); return; }
    const color = kind === 'ichor' ? '#8fcf3a' : '#8a2a1e';
    for (let i = 0; i < 3; i++) {
      this._part('drop', x, y, (Math.random() - 0.5) * 120, -40 - Math.random() * 80, 0.5, 2.5, color, 600);
    }
    this.sparks(x, y, '#ffe0a0', 2, 80);
  }

  splash(x, y, color) {
    for (let i = 0; i < 6; i++) {
      this._part('drop', x, y, (Math.random() - 0.5) * 160, -60 - Math.random() * 100, 0.6, 3, color, 700);
    }
    this._part('glow', x, y, 0, 0, 0.18, 22, '#9be22b', 0);
  }

  smoke(x, y) {
    this._part('smoke', x, y, (Math.random() - 0.5) * 14 + 6, -22 - Math.random() * 14,
      1.6 + Math.random() * 0.9, 9 + Math.random() * 7, '#3b322c', 0);
  }

  puff(x, y, color) {
    for (let i = 0; i < 6; i++) {
      this._part('smoke', x + (Math.random() - 0.5) * 16, y - Math.random() * 10,
        (Math.random() - 0.5) * 50, -10 - Math.random() * 30,
        0.5 + Math.random() * 0.4, 6 + Math.random() * 5, color, 0);
    }
  }

  // Poussière soulevée au sol
  dust(x, y, count = 1) {
    for (let i = 0; i < count; i++) {
      this._part('dust', x + (Math.random() - 0.5) * 10, y - 2,
        (Math.random() - 0.5) * 40, -8 - Math.random() * 16,
        0.6 + Math.random() * 0.5, 5 + Math.random() * 5, '#b89268', 0);
    }
  }

  // Jet de flammes vers l'avant (appelé à chaque pas tant que le lance-flammes tire)
  flame(x, y, dir, range) {
    const life = 0.32;
    const speed = range / life;
    this._part('flame', x, y + (Math.random() - 0.5) * 4,
      dir * speed * (0.75 + Math.random() * 0.35), (Math.random() - 0.65) * 50,
      life * (0.7 + Math.random() * 0.3), 4 + Math.random() * 3, '#ffb347', -60);
    if (Math.random() < 0.3) this._part('glow', x + dir * range * 0.5, y, 0, 0, 0.1, range * 0.5, '#ff9a3a', 0);
  }

  ember(x, y) {
    this._part('ember', x, y, (Math.random() - 0.5) * 30, -40 - Math.random() * 40, 1 + Math.random(), 2, '#ffb347', -10);
  }

  // Explosion : flash lumineux, boules de feu, onde de choc, débris, étincelles, fumée
  explosion(x, y, radius) {
    this._part('glow', x, y, 0, 0, 0.22, radius * 2.2, '#c88a3a', 0);
    this._part('ring', x, y + 6, 0, 0, 0.4, radius * 1.6, '#ffe8c0', 0);
    for (let i = 0; i < 6; i++) {
      this._part('fireball', x + (Math.random() - 0.5) * radius * 0.8, y - Math.random() * radius * 0.5,
        (Math.random() - 0.5) * 60, -30 - Math.random() * 60,
        0.45 + Math.random() * 0.35, radius * (0.28 + Math.random() * 0.22), '#ffb347', -30);
    }
    for (let i = 0; i < 7; i++) {
      this._part('debris', x, y - 4, (Math.random() - 0.5) * 360, -160 - Math.random() * 260,
        1.2 + Math.random() * 0.6, 2.5 + Math.random() * 3, Math.random() < 0.5 ? '#3a2a1e' : '#5a4636', 900);
    }
    this.sparks(x, y - 6, '#ffcf7a', 8, 300);
    for (let i = 0; i < 6; i++) {
      this._part('smoke', x + (Math.random() - 0.5) * radius, y - Math.random() * radius * 0.6,
        (Math.random() - 0.5) * 40, -24 - Math.random() * 40,
        1 + Math.random() * 0.8, 10 + Math.random() * 10, '#3e3028', 0);
    }
  }

  // Coup au sol (Abomination) : poussière et cailloux
  slam(x, y, radius) {
    this._part('ring', x, y, 0, 0, 0.35, radius * 1.4, '#d8b890', 0);
    for (let i = 0; i < 8; i++) {
      this._part('dust', x + (Math.random() - 0.5) * radius, y - 4, (Math.random() - 0.5) * 160, -20 - Math.random() * 40,
        0.7 + Math.random() * 0.4, 8 + Math.random() * 8, '#a88a66', 0);
    }
    for (let i = 0; i < 5; i++) {
      this._part('debris', x, y - 4, (Math.random() - 0.5) * 260, -120 - Math.random() * 160, 1, 3, '#5a4636', 900);
    }
  }

  heal(x, y) {
    for (let i = 0; i < 5; i++) {
      this._part('plus', x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 20,
        0, -30 - Math.random() * 20, 0.7 + Math.random() * 0.3, 4, '#7ee05a', 0);
    }
    this._part('glow', x, y, 0, 0, 0.4, 40, '#7ee05a', 0);
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
      p.rot += p.spin * dt;
      // Débris et gouttes : rebond / arrêt au sol
      if ((p.kind === 'debris' || p.kind === 'drop') && p.y > p.floor && p.vy > 0) {
        p.y = p.floor;
        if (p.kind === 'drop') { p.vx = 0; p.vy = 0; p.gravity = 0; p.life = Math.min(p.life, 0.3); }
        else { p.vy *= -0.3; p.vx *= 0.5; p.spin *= 0.5; }
      }
      if (p.kind === 'smoke' || p.kind === 'dust') { p.vx *= 1 - dt * 0.8; }
    }
    for (const t of this.texts) {
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) { t.active = false; continue; }
      t.y -= 28 * dt;
    }
  }
}
