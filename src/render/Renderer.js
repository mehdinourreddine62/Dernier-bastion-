import { CONFIG } from '../config.js?v=21';
import { drawSprite, DEATH_STYLE } from './sprites.js?v=21';
import { Backdrop } from './background.js?v=21';
import { drawFort, drawNest } from './bases.js?v=21';

// Position de la bouche du canon (x, y, rayon de lumière, couleur) pour la lueur des tirs
const MUZZLE = {
  tireur: [42, -46, 36, '255,210,120'],
  cracheur: [24, -49, 30, '155,226,43'],
  blinde: [62, -64, 64, '255,200,110'],
  hero_kane: [40, -52, 44, '255,210,120'],
  hero_rosa: [38, -50, 40, '255,200,110'],
  hero_vasquez: [58, -52, 40, '255,240,190'],
  tourelleCampagne: [40, -35, 34, '255,210,120'],
  lanceRoquettes: [36, -58, 50, '255,200,110'],
  mitrailleur: [48, -42, 36, '255,210,120'],
  hurleur: [18, -69, 40, '220,120,255'],
};

// Dessine la scène : décor en parallaxe, traces au sol, bases, unités,
// projectiles, effets, premier plan et vignettage.
export class Renderer {
  constructor() {
    this.backdrop = null;
    this.res = 1;
    this.drawList = [];
    this.pose = { walk: 0, atk: 0, flash: false, moving: false, time: 0, dark: false };
    this.cache = new Map();   // images d'animation déjà dessinées (voir _frame)
    this.cacheRes = 1;
    this.lowFx = false;       // qualité basse : moins d'effets (réglé par main.js)
  }

  // Décor du niveau (redessiné seulement si le niveau ou la résolution change)
  prepare(levelId, res) {
    if (!this.backdrop || this.backdrop.levelId !== levelId) this.backdrop = new Backdrop(levelId);
    this.backdrop.ensure(res);
    // Résolution des images d'unités en cache (plafonnée pour la mémoire)
    const cr = Math.max(0.75, Math.min(1.25, Math.round(res * 4) / 4));
    if (cr !== this.cacheRes) { this.cacheRes = cr; this.cache.clear(); }
  }

  // Image d'animation en cache : chaque position (marche, attaque, flash…) est dessinée
  // une seule fois, puis simplement recopiée. Indispensable avec 200 unités à l'écran.
  _frame(u, pose) {
    const TAU = Math.PI * 2;
    let key;
    if (pose.flash) {
      key = 'F' + (pose.moving ? 1 : 0);
      pose.walk = 0.4; pose.atk = 0; pose.time = 0;
    } else if (pose.moving) {
      const wf = Math.floor((((u.walk % TAU) + TAU) % TAU) / TAU * 12) % 12;
      key = 'w' + wf;
      pose.walk = ((wf + 0.5) / 12) * TAU; pose.atk = 0; pose.time = 0;
    } else {
      const af = pose.atk > 0 ? 1 + Math.min(4, Math.floor(pose.atk * 5)) : 0;
      const tf = Math.floor(pose.time * 1.2) % 2;
      key = 'i' + af + 't' + tf;
      pose.atk = af ? (af - 0.5) / 5 : 0; pose.time = tf * 0.8; pose.walk = 0;
    }
    if (pose.dark) key += 'D';
    key = u.defId + ':' + key;
    let f = this.cache.get(key);
    if (!f) {
      const def = u.def;
      const w = Math.ceil(def.bodyWidth * 1.4 + 140), h = Math.ceil(def.bodyHeight + 80);
      const r = this.cacheRes;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(w * r); cv.height = Math.ceil(h * r);
      const c = cv.getContext('2d');
      c.setTransform(r, 0, 0, r, (w / 2) * r, (h - 12) * r);
      drawSprite(c, u.defId, pose);
      f = { cv, w, h, ox: w / 2, oy: h - 12 };
      this.cache.set(key, f);
    }
    return f;
  }

  // Décor seul (écran titre)
  drawBackdrop(ctx, camX, time) {
    const b = this.backdrop;
    b.drawSky(ctx, time);
    b.drawLayers(ctx, camX);
    b.drawAir(ctx, camX, time);
    this._vignette(ctx);
  }

  // ---------- Scène complète ----------
  draw(ctx, game, camera, time) {
    const b = this.backdrop;
    const V = CONFIG.display.width;
    b.drawSky(ctx, time);
    b.drawLayers(ctx, camera.x);

    ctx.save();
    ctx.translate(-camera.x, 0);

    this._decals(ctx, game.decals, camera);
    for (const base of [game.bases.player, game.bases.enemy]) {
      if (base.x + 150 > camera.x && base.x - 150 < camera.x + V) this._base(ctx, base, time);
    }

    // Unités triées par profondeur (y)
    const list = this.drawList;
    list.length = 0;
    for (const u of game.units) {
      if (u.x > camera.x - 120 && u.x < camera.x + V + 120) list.push(u);
    }
    list.sort((a, c) => a.y - c.y);
    for (const u of list) this._unit(ctx, u, game.time);
    for (const u of list) if (u.alive && u.hp < u.maxHp) this._hpBar(ctx, u);

    this._projectiles(ctx, game.projectiles);
    this._shells(ctx, game.spells);
    this._particles(ctx, game.fx, camera);
    ctx.restore();

    // Qualité basse : on saute le premier plan, l'ambiance et le vignettage
    if (!this.lowFx) {
      b.drawForeground(ctx, camera.x);
      b.drawAir(ctx, camera.x, time);
      this._vignette(ctx);
    }
  }

  _vignette(ctx) {
    if (!this._vig || this._vigCtx !== ctx) {
      this._vigCtx = ctx;
      const g = ctx.createRadialGradient(640, 380, 360, 640, 380, 860);
      g.addColorStop(0, 'rgba(20,10,5,0)');
      g.addColorStop(1, 'rgba(20,10,5,0.45)');
      this._vig = g;
    }
    ctx.fillStyle = this._vig;
    ctx.fillRect(0, 0, CONFIG.display.width, CONFIG.display.height);
  }

  // ---------- Traces au sol ----------
  _decals(ctx, decals, camera) {
    const gy = CONFIG.world.groundY;
    for (const d of decals) {
      if (!d.active || d.x < camera.x - 100 || d.x > camera.x + CONFIG.display.width + 100) continue;
      ctx.globalAlpha = Math.min(1, d.life / 1.2);
      const y = gy + 2 + ((d.seed % 7) - 3);
      if (d.kind === 'crater') {
        ctx.fillStyle = 'rgba(25,15,8,0.6)';
        ctx.beginPath(); ctx.ellipse(d.x, y + 2, d.r, d.r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,90,60,0.55)';
        ctx.beginPath(); ctx.ellipse(d.x, y - 1, d.r * 0.95, d.r * 0.14, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = 'rgba(10,5,2,0.5)';
        ctx.beginPath(); ctx.ellipse(d.x, y + 3, d.r * 0.55, d.r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      } else if (d.kind === 'scorch') {
        ctx.fillStyle = 'rgba(20,12,6,0.35)';
        ctx.beginPath(); ctx.ellipse(d.x, y, d.r, d.r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      } else if (d.kind === 'acid') {
        ctx.fillStyle = 'rgba(140,210,40,0.55)';
        ctx.beginPath(); ctx.ellipse(d.x, y, d.r, d.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(220,255,150,0.5)';
        ctx.beginPath(); ctx.ellipse(d.x - d.r * 0.3, y - 1, d.r * 0.3, d.r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      } else if (d.kind === 'ichor') {
        ctx.fillStyle = 'rgba(70,90,20,0.55)';
        ctx.beginPath(); ctx.ellipse(d.x, y, d.r, d.r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Unités ----------
  _unit(ctx, u, time) {
    const def = u.def;
    ctx.save();
    ctx.translate(u.x, u.y);
    // ombre
    // ombre au sol (plus petite et plus pâle pour un volant)
    ctx.fillStyle = u.alt > 0 ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 1, def.bodyWidth * (u.alt > 0 ? 0.35 : 0.55), u.alt > 0 ? 3.5 : 5, 0, 0, Math.PI * 2); ctx.fill();
    if (u.alt > 0) ctx.translate(0, -u.alt);
    if (u.dir < 0) ctx.scale(-1, 1);

    const pose = this.pose;
    pose.walk = u.walk;
    pose.atk = u.attackAnim;
    pose.flash = u.hitFlash > 0 && !u.dying;
    pose.moving = u.state === 'walk';
    pose.time = time + u.walk * 0.37;
    pose.dark = false;

    if (u.dying) {
      const t = u.deadTime;
      const style = DEATH_STYLE[u.defId] || 'fall';
      pose.moving = false;
      if (style === 'fall') {
        const k = Math.min(1, t / 0.4);
        const e = k * k * (3 - 2 * k);
        ctx.translate(-e * def.bodyHeight * 0.15, 0);
        ctx.rotate(-e * 1.5);
      } else if (style === 'melt') {
        const k = Math.min(1, t / 0.9);
        const e = 1 - (1 - k) * (1 - k);
        ctx.scale(1 + e * 0.3, 1 - e * 0.78);
      } else {
        pose.dark = Math.min(1, t / 0.2) >= 1;
        ctx.rotate(-0.06 * Math.min(1, t / 0.3));
        ctx.translate(0, 3);
      }
      const c = CONFIG.combat;
      const fadeStart = c.corpseTime - c.deathFadeTime;
      if (t > fadeStart) ctx.globalAlpha = Math.max(0, 1 - (t - fadeStart) / c.deathFadeTime);
    }
    const f = this._frame(u, pose);
    ctx.drawImage(f.cv, -f.ox, -f.oy, f.w, f.h);
    ctx.restore();

    // Hurleur : zone de son cri au sol
    if (def.howl && !u.dying) {
      ctx.save();
      ctx.strokeStyle = `rgba(210,110,255,${0.25 + 0.15 * Math.sin(time * 6)})`; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = time * 30;
      ctx.beginPath(); ctx.ellipse(u.x, CONFIG.world.groundY + 6, def.howl.radius, def.howl.radius * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Commandant : zone d'aura au sol et étoile au-dessus de la tête
    if (def.hero && !u.dying) {
      const aura = CONFIG.heroes.list[def.hero].aura;
      ctx.save();
      ctx.strokeStyle = 'rgba(242,194,48,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -time * 20;
      ctx.beginPath(); ctx.ellipse(u.x, CONFIG.world.groundY + 6, aura.radius, aura.radius * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      const sy = u.y - def.bodyHeight * 1.12 - 18 + Math.sin(time * 3) * 2;
      ctx.fillStyle = '#f2c230'; ctx.strokeStyle = '#1b120b'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3.5 : 8;
        ctx.lineTo(u.x + Math.cos(a) * r, sy + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // Lumière du tir (flash de bouche du canon / crachat)
    const m = MUZZLE[u.defId];
    if (m && !u.dying && u.attackAnim > 0.6) {
      this._glow(ctx, u.x + u.dir * m[0], u.y + m[1], m[2], m[3], u.attackAnim);
    }
    // Lueur de la flamme du lance-flammes
    if (u.defId === 'lanceFlammes' && u.state === 'attack' && !u.dying) {
      this._glow(ctx, u.x + u.dir * 70, u.y - 40, 70, '255,150,60', 0.7 + Math.sin(time * 30) * 0.15);
    }
  }

  _glow(ctx, x, y, r, rgb, a) {
    if (this.lowFx) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${0.55 * a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  _hpBar(ctx, u) {
    const w = Math.max(34, u.def.bodyWidth * 0.7), h = 5, x = u.x - w / 2, y = u.y - u.alt - u.def.bodyHeight - 12;
    const r = u.hp / u.maxHp;
    ctx.fillStyle = 'rgba(15,8,4,0.75)';
    ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = r > 0.5 ? '#6bbf4a' : r > 0.25 ? '#e0a82e' : '#d9482b';
    ctx.fillRect(x, y, w * r, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, y, w * r, 2);
  }

  // ---------- Projectiles ----------
  _projectiles(ctx, pool) {
    for (const p of pool.items) {
      if (!p.active) continue;
      const c = p.cfg;
      if (c.shape === 'tracer') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,200,100,0.35)';
        ctx.lineWidth = c.width * 3;
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * c.length, p.y - p.vy * c.length); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.strokeStyle = c.color;
        ctx.lineWidth = c.width;
        ctx.stroke();
        ctx.restore();
      } else if (c.shape === 'shell') {
        ctx.fillStyle = 'rgba(80,70,60,0.3)';
        ctx.beginPath(); ctx.arc(p.x - p.vx * 10, p.y - p.vy * 10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2a26';
        ctx.beginPath(); ctx.arc(p.x, p.y, c.width, 0, Math.PI * 2); ctx.fill();
        this._glow(ctx, p.x, p.y, 12, '255,180,80', 0.7);
      } else if (c.shape === 'rocket') {
        // roquette : corps + flamme + fumée
        const ang = Math.atan2(p.vy, p.vx);
        ctx.fillStyle = 'rgba(190,180,165,0.35)';
        for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(p.x - p.vx * k * 9, p.y - p.vy * k * 9, 3 + k * 1.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-16, -3); ctx.lineTo(-14, 0); ctx.lineTo(-16, 3); ctx.fill();
        ctx.fillStyle = '#4e5a3a'; ctx.fillRect(-8, -2.5, 12, 5);
        ctx.fillStyle = '#c0442e'; ctx.beginPath(); ctx.moveTo(4, -2.5); ctx.lineTo(9, 0); ctx.lineTo(4, 2.5); ctx.fill();
        ctx.restore();
        this._glow(ctx, p.x - p.vx * 10, p.y - p.vy * 10, 16, '255,170,80', 0.8);
      } else if (c.shape === 'spine') {
        // épine d'os
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = c.color; ctx.strokeStyle = '#1b120b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(8, 0); ctx.lineTo(-12, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (c.shape === 'sonic') {
        // onde du cri du Hurleur
        ctx.save();
        ctx.strokeStyle = 'rgba(220,120,255,0.7)'; ctx.lineWidth = 2.5;
        const dir = p.vx < 0 ? Math.PI : 0;
        for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(p.x - p.vx * k * 8, p.y, c.width + k * 3, dir - 0.8, dir + 0.8); ctx.stroke(); }
        ctx.restore();
      } else {
        // crachat d'acide avec traînée de gouttes
        ctx.fillStyle = 'rgba(155,226,43,0.35)';
        ctx.beginPath(); ctx.arc(p.x - p.vx * 7, p.y - p.vy * 7, c.width * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x - p.vx * 13, p.y - p.vy * 13, c.width * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, c.width, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(240,255,200,0.7)';
        ctx.beginPath(); ctx.arc(p.x - 1.5, p.y - 1.5, c.width * 0.35, 0, Math.PI * 2); ctx.fill();
        this._glow(ctx, p.x, p.y, 16, '155,226,43', 0.6);
      }
    }
  }

  // Obus de mortier qui tombent du ciel
  _shells(ctx, spells) {
    const gy = CONFIG.world.groundY;
    for (const s of spells.shells) {
      if (!s.active || s.delay > 0) continue;
      const y = -40 + (gy + 40) * s.t * s.t;
      ctx.strokeStyle = 'rgba(255,240,200,0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s.x, y - 60); ctx.lineTo(s.x, y); ctx.stroke();
      ctx.fillStyle = '#3a3a32';
      ctx.beginPath(); ctx.ellipse(s.x, y, 5, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.35 * s.t})`;
      ctx.beginPath(); ctx.ellipse(s.x, gy + 2, 6 + 22 * s.t, 3 + 3 * s.t, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Cercle de visée d'un sort (x en coordonnées du monde)
  drawAim(ctx, camera, x, radius, color, time) {
    const gy = CONFIG.world.groundY;
    ctx.save();
    ctx.translate(-camera.x, 0);
    ctx.fillStyle = color + '33';
    ctx.beginPath(); ctx.ellipse(x, gy, radius, radius * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -time * 30;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, gy - 14); ctx.lineTo(x, gy + 14); ctx.moveTo(x - 14, gy); ctx.lineTo(x + 14, gy); ctx.stroke();
    ctx.restore();
  }

  // ---------- Particules ----------
  _particles(ctx, fx, camera) {
    const minX = camera.x - 60, maxX = camera.x + CONFIG.display.width + 60;
    // 1) particules « normales »
    for (const p of fx.parts) {
      if (!p.active || p.x < minX || p.x > maxX) continue;
      const k = p.life / p.maxLife;
      switch (p.kind) {
        case 'smoke':
        case 'dust':
          ctx.globalAlpha = (p.kind === 'dust' ? 0.35 : 0.5) * k;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.7 - k * 0.7), 0, Math.PI * 2); ctx.fill();
          break;
        case 'debris':
          ctx.globalAlpha = Math.min(1, k * 3);
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
          ctx.restore();
          break;
        case 'drop':
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        case 'ring': {
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * k + 1;
          const r = p.size * (1 - k * 0.85);
          ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
          break;
        }
        case 'plus':
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 4, p.y - 1.5, 8, 3);
          ctx.fillRect(p.x - 1.5, p.y - 4, 3, 8);
          break;
        case 'spark':
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke();
          break;
        case 'fireball':
          if (k < 0.45) {   // la boule de feu finit en fumée sombre
            ctx.globalAlpha = k * 1.4;
            ctx.fillStyle = '#3a2a22';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k), 0, Math.PI * 2); ctx.fill();
          }
          break;
      }
    }
    // 2) particules lumineuses (mode additif)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of fx.parts) {
      if (!p.active || p.x < minX || p.x > maxX) continue;
      const k = p.life / p.maxLife;
      if (p.kind === 'flame') {
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = k > 0.65 ? '#fff0a0' : k > 0.35 ? '#ffa040' : '#c83a1a';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2.4 - k), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'fireball' && k >= 0.3) {
        ctx.globalAlpha = Math.min(1, (k - 0.3) * 2.5);
        ctx.fillStyle = k > 0.8 ? '#ffd27a' : k > 0.55 ? '#ff9a3a' : '#c8401e';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.5 - k * 0.6), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'glow' && !this.lowFx) {
        const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
        g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = k * 0.8;
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      } else if (p.kind === 'ember') {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 2, 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // 3) chiffres flottants
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const t of fx.texts) {
      if (!t.active) continue;
      ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 2);
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,10,4,0.85)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Bases ----------
  _base(ctx, b, time) {
    ctx.save();
    const sh = b.shake > 0 ? (Math.random() - 0.5) * 8 * (b.shake / 0.25) : 0;
    ctx.translate(b.x + sh, b.y);
    if (b.side === 'enemy') ctx.scale(-1, 1);   // le dessin a sa « façade » vers +x
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(0, 6, 120, 12, 0, 0, Math.PI * 2); ctx.fill();

    if (b.side === 'player') drawFort(ctx, time, b); else drawNest(ctx, time, b);

    if (b.hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,230,200,0.18)';
      ctx.fillRect(-110, -200, 220, 205);
    }
    ctx.restore();
  }
}
