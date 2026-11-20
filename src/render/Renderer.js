import { CONFIG } from '../config.js';
import { drawSprite } from './sprites.js';

// Générateur pseudo-aléatoire à graine : le décor est toujours le même.
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genSkyline(r, totalW, minW, maxW, minH, maxH) {
  const arr = [];
  let x = -120;
  while (x < totalW) {
    const w = minW + r() * (maxW - minW);
    arr.push({ x, w, h: minH + r() * (maxH - minH), a: r() * 0.6, b: r() * 0.6, c: r() * 0.6, win: r() });
    x += w * (0.55 + r() * 0.5);
  }
  return arr;
}

function genProps(r) {
  const props = [];
  const W = CONFIG.world.width;
  let x = 360;
  while (x < W - 360) {
    const k = r();
    props.push({ type: k < 0.3 ? 'wreck' : k < 0.5 ? 'pylon' : k < 0.75 ? 'rubble' : 'barrel', x, s: 0.8 + r() * 0.6, flip: r() < 0.5 });
    x += 150 + r() * 260;
  }
  return props;
}

export class Renderer {
  constructor() {
    const W = CONFIG.world.width, V = CONFIG.display.width;
    this.far = genSkyline(rng(11), W * 0.15 + V + 200, 70, 150, 110, 230);
    this.mid = genSkyline(rng(23), W * 0.4 + V + 200, 90, 190, 80, 170);
    this.props = genProps(rng(5));
    this.dashes = Array.from({ length: 90 }, (_, i) => {
      const r = rng(100 + i); return { x: r() * W, y: r(), w: 20 + r() * 50 };
    });
    this.drawList = [];
  }

  // ---------- Décor (sans les bases) ----------
  drawBackdrop(ctx, camX, time) {
    const V = CONFIG.display.width, H = CONFIG.display.height;
    const { horizonY, groundY } = CONFIG.world;

    // Ciel poussiéreux
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, '#b8682f');
    sky.addColorStop(0.55, '#dd9a55');
    sky.addColorStop(1, '#efc888');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, V, horizonY + 2);

    // Soleil voilé
    const sx = 900 - camX * 0.03, sy = 150;
    const sg = ctx.createRadialGradient(sx, sy, 8, sx, sy, 150);
    sg.addColorStop(0, 'rgba(255,244,214,0.95)');
    sg.addColorStop(0.3, 'rgba(255,226,170,0.55)');
    sg.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 160, sy - 160, 320, 320);

    // Buildings en ruine : 2 couches de parallaxe
    this._skyline(ctx, this.far, camX * 0.15, horizonY + 6, '#a9764b', false);
    this._skyline(ctx, this.mid, camX * 0.4, horizonY + 10, '#7d5338', true);

    // Sol
    const gr = ctx.createLinearGradient(0, horizonY, 0, H);
    gr.addColorStop(0, '#8a6038');
    gr.addColorStop(0.3, '#6f4b2d');
    gr.addColorStop(1, '#3d2816');
    ctx.fillStyle = gr;
    ctx.fillRect(0, horizonY, V, H - horizonY);
    ctx.fillStyle = 'rgba(0,0,0,0.13)';                  // couloir de combat
    ctx.fillRect(0, groundY - 34, V, 68);
    ctx.fillStyle = 'rgba(255,230,180,0.08)';
    ctx.fillRect(0, horizonY, V, 3);

    // Cailloux / traces au sol (suivent la caméra)
    ctx.fillStyle = 'rgba(30,18,8,0.28)';
    for (const d of this.dashes) {
      const x = d.x - camX;
      if (x < -60 || x > V + 60) continue;
      ctx.fillRect(x, horizonY + 14 + d.y * (H - horizonY - 40), d.w, 2);
    }

    // Poussière qui flotte
    ctx.fillStyle = 'rgba(255,235,200,0.35)';
    for (let i = 0; i < 26; i++) {
      const px = ((i * 197 + time * (14 + (i % 5) * 4) - camX * 0.6) % (V + 40) + V + 40) % (V + 40) - 20;
      const py = 120 + ((i * 71) % 380) + Math.sin(time * 0.7 + i) * 10;
      ctx.fillRect(px, py, 2, 2);
    }
  }

  _skyline(ctx, list, offset, baseY, color, windows) {
    const V = CONFIG.display.width;
    ctx.fillStyle = color;
    for (const b of list) {
      const x = b.x - offset;
      if (x > V + 10 || x + b.w < -10) continue;
      const top = baseY - b.h;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, top + b.a * 30);
      ctx.lineTo(x + b.w * 0.35, top - b.b * 14);
      ctx.lineTo(x + b.w * 0.6, top + b.c * 40);
      ctx.lineTo(x + b.w, top + b.a * 12);
      ctx.lineTo(x + b.w, baseY);
      ctx.closePath();
      ctx.fill();
      if (windows) {
        ctx.fillStyle = 'rgba(40,22,12,0.35)';
        for (let wy = top + 40; wy < baseY - 18; wy += 26) {
          for (let wx = x + 10; wx < x + b.w - 14; wx += 22) {
            if (((wx * 7 + wy * 3 + b.win * 100) | 0) % 3 !== 0) ctx.fillRect(wx, wy, 9, 13);
          }
        }
        ctx.fillStyle = color;
      }
    }
  }

  // ---------- Scène complète ----------
  draw(ctx, game, camera, time) {
    this.drawBackdrop(ctx, camera.x, time);

    ctx.save();
    ctx.translate(-camera.x, 0);

    // Décor du couloir (carcasses, pylônes…) avant les unités
    for (const p of this.props) {
      if (p.x < camera.x - 140 || p.x > camera.x + CONFIG.display.width + 140) continue;
      this._prop(ctx, p);
    }

    // Cratères du mortier
    for (const c of game.craters) {
      if (!c.active) continue;
      ctx.globalAlpha = Math.min(1, c.life / 1.5);
      ctx.fillStyle = 'rgba(30,18,10,0.55)';
      ctx.beginPath(); ctx.ellipse(c.x, CONFIG.world.groundY + 4, c.r, c.r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(110,80,50,0.5)';
      ctx.beginPath(); ctx.ellipse(c.x, CONFIG.world.groundY - 1, c.r * 0.9, c.r * 0.12, 0, Math.PI, 0); ctx.fill();
      ctx.globalAlpha = 1;
    }

    this._base(ctx, game.bases.player, time);
    this._base(ctx, game.bases.enemy, time);

    // Unités triées par profondeur (y)
    const list = this.drawList;
    list.length = 0;
    for (const u of game.units) {
      if (u.x > camera.x - 80 && u.x < camera.x + CONFIG.display.width + 80) list.push(u);
    }
    list.sort((a, b) => a.y - b.y);
    for (const u of list) this._unit(ctx, u);
    for (const u of list) if (u.alive && u.hp < u.maxHp) this._hpBar(ctx, u);

    this._projectiles(ctx, game.projectiles);
    this._shells(ctx, game.spells);
    this._particles(ctx, game.fx);
    ctx.restore();
  }

  // Obus de mortier qui tombent du ciel
  _shells(ctx, spells) {
    const gy = CONFIG.world.groundY;
    for (const s of spells.shells) {
      if (!s.active || s.delay > 0) continue;
      const y = -40 + (gy + 40) * s.t * s.t;
      ctx.strokeStyle = 'rgba(255,240,200,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s.x, y - 50); ctx.lineTo(s.x, y); ctx.stroke();
      ctx.fillStyle = '#3a3a32';
      ctx.beginPath(); ctx.ellipse(s.x, y, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
      // ombre au sol qui grossit
      ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.35 * s.t})`;
      ctx.beginPath(); ctx.ellipse(s.x, gy + 2, 6 + 18 * s.t, 3 + 3 * s.t, 0, 0, Math.PI * 2); ctx.fill();
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

  _unit(ctx, u) {
    ctx.save();
    ctx.translate(u.x, u.y);
    // ombre
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 1, u.def.bodyWidth * 0.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    if (u.dir < 0) ctx.scale(-1, 1);
    if (u.dying) {
      // chute en arrière puis fondu
      const fall = Math.min(1, u.deadTime / 0.35);
      ctx.rotate(-fall * 1.45);
      const fadeStart = CONFIG.combat.corpseTime - CONFIG.combat.deathFadeTime;
      if (u.deadTime > fadeStart) ctx.globalAlpha = Math.max(0, 1 - (u.deadTime - fadeStart) / CONFIG.combat.deathFadeTime);
    }
    const pose = this._pose || (this._pose = { walk: 0, atk: 0, flash: false, moving: false });
    pose.walk = u.walk;
    pose.atk = u.attackAnim;
    pose.flash = u.hitFlash > 0 && !u.dying;
    pose.moving = u.state === 'walk';
    drawSprite(ctx, u.defId, pose);
    ctx.restore();
  }

  _hpBar(ctx, u) {
    const w = Math.max(34, u.def.bodyWidth * 0.7), h = 4, x = u.x - w / 2, y = u.y - u.def.bodyHeight - 12;
    const r = u.hp / u.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = r > 0.5 ? '#6bbf4a' : r > 0.25 ? '#e0a82e' : '#d9482b';
    ctx.fillRect(x, y, w * r, h);
  }

  _projectiles(ctx, pool) {
    for (const p of pool.items) {
      if (!p.active) continue;
      const c = p.cfg;
      if (c.shape === 'tracer') {
        ctx.strokeStyle = c.color;
        ctx.lineWidth = c.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * c.length, p.y - p.vy * c.length);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = c.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, c.width, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(p.x - 1.5, p.y - 1.5, c.width * 0.35, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  _particles(ctx, fx) {
    for (const p of fx.parts) {
      if (!p.active) continue;
      const k = p.life / p.maxLife;
      if (p.kind === 'smoke') {
        ctx.globalAlpha = 0.55 * k;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'flame') {
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = k > 0.6 ? '#fff0a0' : k > 0.35 ? '#ffb347' : '#d9482b';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2.2 - k), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'flash') {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'ring') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        const r = p.size * (1 - k * 0.8);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'plus') {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 4, p.y - 1.5, 8, 3);
        ctx.fillRect(p.x - 1.5, p.y - 4, 3, 8);
      } else {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 1, p.y - 1, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

  // ---------- Éléments de décor ----------
  _prop(ctx, p) {
    const y = CONFIG.world.groundY - 30;
    ctx.save();
    ctx.translate(p.x, y);
    ctx.scale(p.flip ? -p.s : p.s, p.s);
    if (p.type === 'wreck') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(0, 4, 48, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b3d26'; ctx.fillRect(-44, -26, 88, 22);
      ctx.fillStyle = '#7d4a2e'; ctx.fillRect(-44, -26, 88, 6);
      ctx.fillStyle = '#5a3320';
      ctx.beginPath(); ctx.moveTo(-26, -26); ctx.lineTo(-16, -44); ctx.lineTo(14, -44); ctx.lineTo(26, -26); ctx.fill();
      ctx.fillStyle = 'rgba(25,15,8,0.8)'; ctx.fillRect(-12, -41, 10, 13); ctx.fillRect(2, -41, 10, 13);
      ctx.fillStyle = '#1c1410';
      ctx.beginPath(); ctx.arc(-28, -4, 8, 0, Math.PI * 2); ctx.arc(28, -4, 8, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'pylon') {
      ctx.strokeStyle = '#3d2c22'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-4, -120); ctx.moveTo(14, 4); ctx.lineTo(4, -120); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-10, -40); ctx.lineTo(10, -70); ctx.moveTo(10, -40); ctx.lineTo(-10, -70);
      ctx.moveTo(-26, -112); ctx.lineTo(22, -122); ctx.moveTo(-24, -96); ctx.quadraticCurveTo(-60, -60, -40, -20); ctx.stroke();
    } else if (p.type === 'rubble') {
      ctx.fillStyle = '#5b4535';
      ctx.beginPath(); ctx.moveTo(-34, 4); ctx.lineTo(-20, -16); ctx.lineTo(-4, -8); ctx.lineTo(12, -22); ctx.lineTo(34, 4); ctx.fill();
      ctx.fillStyle = '#7a6350'; ctx.fillRect(-10, -14, 14, 8); ctx.fillRect(14, -10, 10, 6);
    } else {
      ctx.fillStyle = '#8a3a22'; ctx.fillRect(-10, -26, 20, 28);
      ctx.fillStyle = '#5a2415'; ctx.fillRect(-10, -18, 20, 3); ctx.fillRect(-10, -8, 20, 3);
      ctx.fillStyle = '#6a6a5e'; ctx.fillRect(-9, -29, 18, 4);
    }
    ctx.restore();
  }

  // ---------- Bases ----------
  _base(ctx, b, time) {
    ctx.save();
    const sh = b.shake > 0 ? (Math.random() - 0.5) * 8 * (b.shake / 0.25) : 0;
    ctx.translate(b.x + sh, b.y);
    if (b.side === 'enemy') ctx.scale(-1, 1);   // le dessin a sa « face » vers +x
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 6, 110, 10, 0, 0, Math.PI * 2); ctx.fill();

    if (b.side === 'player') this._fort(ctx, time, b); else this._nest(ctx, time, b);

    // Dégâts : suie + morceaux manquants
    const ds = b.damageState;
    if (ds > 0) {
      ctx.fillStyle = `rgba(20,10,5,${ds === 1 ? 0.18 : 0.32})`;
      ctx.fillRect(-95, -150, 190, 150);
      ctx.fillStyle = '#2a1c14';
      ctx.beginPath(); ctx.moveTo(-60, -110); ctx.lineTo(-40, -90); ctx.lineTo(-62, -80); ctx.fill();
      if (ds === 2) {
        ctx.beginPath(); ctx.moveTo(20, -150); ctx.lineTo(45, -120); ctx.lineTo(15, -118); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-95, -60); ctx.lineTo(-70, -48); ctx.lineTo(-95, -30); ctx.fill();
      }
    }
    if (b.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-95, -165, 190, 170);
    }
    ctx.restore();
  }

  // Fort des Survivants : carcasses, tôles, sacs de sable, tour, drapeau
  _fort(ctx, time, b) {
    // bus renversé au fond
    ctx.fillStyle = '#5f6e76'; ctx.fillRect(-95, -78, 110, 58);
    ctx.fillStyle = '#74848c'; ctx.fillRect(-95, -78, 110, 8);
    ctx.fillStyle = 'rgba(25,20,16,0.85)';
    for (let i = 0; i < 4; i++) ctx.fillRect(-88 + i * 26, -66, 18, 16);
    ctx.fillStyle = '#1c1410';
    ctx.beginPath(); ctx.arc(-66, -18, 11, 0, Math.PI * 2); ctx.arc(-14, -18, 11, 0, Math.PI * 2); ctx.fill();
    // mur de tôle ondulée
    ctx.fillStyle = '#7a5a3c'; ctx.fillRect(-10, -96, 105, 76);
    ctx.strokeStyle = '#5d4229'; ctx.lineWidth = 2;
    for (let x = -4; x < 95; x += 9) { ctx.beginPath(); ctx.moveTo(x, -96); ctx.lineTo(x, -20); ctx.stroke(); }
    ctx.fillStyle = '#4a3322'; ctx.fillRect(-10, -100, 105, 6);
    // tour de guet
    ctx.fillStyle = '#4a3a2c'; ctx.fillRect(-52, -160, 8, 70); ctx.fillRect(-16, -160, 8, 70);
    ctx.fillStyle = '#6b5440'; ctx.fillRect(-60, -166, 60, 10);
    ctx.fillStyle = '#5a4636'; ctx.fillRect(-56, -196, 52, 30);
    ctx.fillStyle = '#2a1c14'; ctx.fillRect(-52, -190, 44, 12);
    // mitrailleuse qui pivote vers sa cible
    ctx.save();
    ctx.translate(-14, -182);
    ctx.rotate(b.turretAngle);
    ctx.fillStyle = '#2b2b2e'; ctx.fillRect(-6, -3, 30, 6); ctx.fillRect(-10, -6, 12, 12);
    if (b.turretFlash > 0) {
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(34, -6); ctx.lineTo(40, 0); ctx.lineTo(34, 6); ctx.fill();
    }
    ctx.restore();
    // drapeau jaune
    ctx.fillStyle = '#3b2f22'; ctx.fillRect(-76, -206, 3, 50);
    ctx.fillStyle = '#f2c230';
    const w = Math.sin(time * 3) * 3;
    ctx.beginPath(); ctx.moveTo(-73, -204); ctx.lineTo(-48, -198 + w); ctx.lineTo(-73, -186); ctx.fill();
    // porte
    ctx.fillStyle = '#1e140d'; ctx.fillRect(62, -70, 30, 50);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(62, -72, 30, 4);
    // sacs de sable devant
    ctx.fillStyle = '#a8946a';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(30 + i * 20, -8, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 20, -20, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#6f5f40'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(30 + i * 20, -8, 12, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
  }

  // Nid des Mutants : chair, os, tôles rouillées, tentacule
  _nest(ctx, time, b) {
    // dôme de chair
    const g = ctx.createRadialGradient(0, -80, 10, 0, -60, 110);
    g.addColorStop(0, '#9a4a5a'); g.addColorStop(1, '#5a2638');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -52, 98, 62, 0, Math.PI, 0); ctx.lineTo(98, 0); ctx.lineTo(-98, 0); ctx.fill();
    ctx.fillStyle = '#6e3a4a';
    ctx.beginPath(); ctx.ellipse(-40, -86, 36, 30, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(46, -78, 30, 26, 0, Math.PI, 0); ctx.fill();
    // plaques de tôle rouillée
    ctx.fillStyle = '#7b4a2a';
    ctx.beginPath(); ctx.moveTo(-70, -30); ctx.lineTo(-30, -50); ctx.lineTo(-24, -20); ctx.lineTo(-66, -8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -92); ctx.lineTo(50, -86); ctx.lineTo(44, -60); ctx.lineTo(14, -64); ctx.fill();
    // côtes / os
    ctx.strokeStyle = '#d8cfae'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(-10 + i * 18, -4, 38 + i * 4, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    }
    // pustules toxiques qui pulsent
    const pulse = 0.6 + Math.sin(time * 2.4) * 0.25;
    for (const [px, py, pr] of [[-60, -58, 9], [-6, -72, 7], [70, -34, 8], [30, -108, 6]]) {
      ctx.fillStyle = `rgba(155,226,43,${pulse})`;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(px - 2, py - 2, pr * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    // bouche-porte
    ctx.fillStyle = '#1a0a12';
    ctx.beginPath(); ctx.ellipse(76, -26, 20, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(155,226,43,${0.25 + pulse * 0.2})`;
    ctx.beginPath(); ctx.ellipse(78, -24, 11, 20, 0, 0, Math.PI * 2); ctx.fill();
    // tentacule cracheur qui ondule
    ctx.strokeStyle = '#8a3c63'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -110);
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      ctx.lineTo(-6 + t * 52 + Math.sin(time * 2 + t * 5) * 8 * t, -110 - t * 70 + Math.cos(time * 1.7 + t * 4) * 4);
    }
    ctx.stroke();
    const tipX = 46 + Math.sin(time * 2 + 5) * 8, tipY = -180 + Math.cos(time * 1.7 + 4) * 4;
    const spit = b.turretFlash > 0 ? 4 : 0;
    ctx.fillStyle = '#9be22b'; ctx.beginPath(); ctx.arc(tipX, tipY, 8 + spit, 0, Math.PI * 2); ctx.fill();
  }
}
