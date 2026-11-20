// Dessin procédural des unités. Origine = pieds au sol, l'unité regarde vers +x.
// pose : { walk (phase), atk (1 -> 0 pendant l'attaque), flash (bool), moving (bool) }

const F = (color, flash) => (flash ? '#ffffff' : color);

function limb(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

// Jambes qui se balancent à la marche
function legs(ctx, p, hipY, color, boot, spread, thick) {
  const s = p.moving ? Math.sin(p.walk) : 0;
  const lift1 = p.moving ? Math.max(0, Math.cos(p.walk)) * 4 : 0;
  const lift2 = p.moving ? Math.max(0, -Math.cos(p.walk)) * 4 : 0;
  limb(ctx, 0, hipY, -s * spread, -2 - lift2, thick, F(color, p.flash));
  limb(ctx, 0, hipY, s * spread, -2 - lift1, thick, F(color, p.flash));
  ellipse(ctx, -s * spread + 2, -1.5 - lift2, 4.5, 2.5, F(boot, p.flash));
  ellipse(ctx, s * spread + 2, -1.5 - lift1, 4.5, 2.5, F(boot, p.flash));
}

// ---------- SURVIVANTS ----------

function pillard(ctx, p) {
  const f = p.flash;
  const q = p.atk > 0 ? 1 - p.atk : 0;
  const lunge = p.atk > 0 ? Math.sin(q * Math.PI) * 7 : 0;
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 2 : 0;
  ctx.translate(lunge, -bob);

  legs(ctx, p, -24, '#4a4a3a', '#2c2620', 9, 6);
  // bras arrière
  limb(ctx, -4, -46, -9, -33, 5, F('#6f7549', f));
  // torse
  ctx.fillStyle = F('#7d8456', f);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9, -52, 18, 29, 4) : ctx.rect(-9, -52, 18, 29); ctx.fill();
  ctx.fillStyle = F('#3b2f22', f); ctx.fillRect(-9, -31, 18, 4);
  ctx.fillStyle = F('#5d6338', f); ctx.fillRect(-9, -52, 4, 29);
  // tête + casquette bleu délavé
  ellipse(ctx, 1, -59, 7.5, 7.5, F('#d7a27a', f));
  poly(ctx, [-7, -60, -6, -67, 3, -69, 9, -64, 11, -61, 0, -61], F('#5d7487', f));
  ctx.fillStyle = f ? '#fff' : '#2a1d14'; ctx.fillRect(5, -60, 2, 2);
  // bras avant + brassard jaune + tuyau
  const hx = 12, hy = -37;
  limb(ctx, 5, -47, hx, hy, 6, F('#7d8456', f));
  if (!f) { ctx.fillStyle = '#f2c230'; ctx.fillRect(6, -46, 4, 6); }
  const a = p.atk > 0 ? -1.3 + 2.6 * q : -0.9;
  limb(ctx, hx, hy, hx + Math.cos(a) * 27, hy + Math.sin(a) * 27, 4, F('#6b6258', f));
  limb(ctx, hx, hy, hx + Math.cos(a) * 9, hy + Math.sin(a) * 9, 5, F('#3b2f22', f));
}

function tireur(ctx, p) {
  const f = p.flash;
  const q = p.atk > 0 ? 1 - p.atk : 0;
  const recoil = p.atk > 0 ? -3 * p.atk : 0;
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 1.5 : 0;
  ctx.translate(recoil, -bob);

  legs(ctx, p, -23, '#4a5058', '#2c2620', 8, 5.5);
  ctx.fillStyle = F('#5f7690', f);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-8, -50, 16, 28, 4) : ctx.rect(-8, -50, 16, 28); ctx.fill();
  ctx.fillStyle = F('#3b2f22', f); ctx.fillRect(-8, -30, 16, 3);
  ellipse(ctx, 0, -57, 7, 7, F('#d7a27a', f));
  // bandana + chapeau
  ctx.fillStyle = F('#a8442b', f); ctx.fillRect(-7, -60, 14, 3);
  poly(ctx, [-9, -63, 9, -63, 6, -69, -6, -69], F('#6f6048', f));
  // fusil
  limb(ctx, 4, -46, 14, -41, 5, F('#5f7690', f));
  limb(ctx, 6, -39, 28, -43, 4.5, F('#4a3626', f));
  limb(ctx, 22, -43, 36, -44, 3, F('#1f1f22', f));
  if (!f) { ctx.fillStyle = '#f2c230'; ctx.fillRect(2, -47, 4, 6); }
  if (p.atk > 0.7) {                        // flash de bouche du canon
    const r = 9 * (p.atk - 0.6) * 2.5;
    poly(ctx, [36, -44, 36 + r, -48, 36 + r * 1.6, -44, 36 + r, -40], '#fff3b0');
    poly(ctx, [36, -44, 36 + r * 0.6, -46, 36 + r, -44, 36 + r * 0.6, -42], '#ff9a2b');
  }
  void q;
}

// ---------- MUTANTS ----------

function goule(ctx, p) {
  const f = p.flash;
  const q = p.atk > 0 ? 1 - p.atk : 0;
  const lunge = p.atk > 0 ? Math.sin(q * Math.PI) * 9 : 0;
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 2.5 : 0;
  ctx.translate(lunge, -bob);

  legs(ctx, p, -20, '#6f7c58', '#4a5438', 8, 5.5);
  // chiffons
  poly(ctx, [-6, -24, 8, -26, 10, -14, 0, -10, -8, -16], F('#5a4636', f));
  // torse voûté
  ellipse(ctx, 3, -35, 11, 16, F('#a3b07f', f), 0.4);
  ellipse(ctx, 4, -33, 6, 9, F('#8d9a69', f), 0.4);
  // bras qui pendent / griffent
  const s = p.moving ? Math.sin(p.walk) * 5 : 0;
  const reach = p.atk > 0 ? 14 + Math.sin(q * Math.PI) * 10 : 4;
  limb(ctx, 8, -42, 14 + reach + s, -22 - (p.atk > 0 ? 8 : 0), 4.5, F('#93a070', f));
  limb(ctx, 4, -42, 9 + reach - s, -20, 4.5, F('#7f8c5e', f));
  const cx = 14 + reach + s, cy = -22 - (p.atk > 0 ? 8 : 0);
  limb(ctx, cx, cy, cx + 5, cy + 4, 1.6, F('#e8e2c0', f));
  limb(ctx, cx, cy, cx + 6, cy, 1.6, F('#e8e2c0', f));
  // tête
  ellipse(ctx, 14, -47, 7.5, 7, F('#b3bf8f', f));
  ctx.fillStyle = f ? '#fff' : '#e8e24a';
  ctx.fillRect(15, -50, 3, 3);
  ctx.fillStyle = f ? '#fff' : '#2a1218';
  ctx.beginPath(); ctx.ellipse(18, -43, 3, p.atk > 0 ? 3.2 : 1.6, 0, 0, Math.PI * 2); ctx.fill();
}

function cracheur(ctx, p) {
  const f = p.flash;
  const q = p.atk > 0 ? 1 - p.atk : 0;
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 1.5 : 0;
  const swell = p.atk > 0 ? Math.sin(q * Math.PI) * 3 : 0;
  ctx.translate(-swell * 0.6, -bob);

  legs(ctx, p, -14, '#5b4366', '#3a2a44', 6, 6);
  // ventre gonflé
  ellipse(ctx, 0, -27, 14 + swell, 15 + swell * 0.6, F('#7b4f8c', f));
  ellipse(ctx, 3, -23, 8, 8, F('#9d6bb0', f));
  // pustules toxiques sur le dos
  if (!f) {
    ellipse(ctx, -9, -34, 4, 4, '#9be22b');
    ellipse(ctx, -5, -42, 3, 3, '#b6f04a');
    ellipse(ctx, -12, -25, 2.5, 2.5, '#9be22b');
  }
  // petits bras
  limb(ctx, 8, -30, 16, -24, 4, F('#6a4377', f));
  // tête avec gueule
  ellipse(ctx, 8, -48, 9, 9, F('#8f6aa0', f));
  ctx.fillStyle = f ? '#fff' : '#e8e24a';
  ctx.fillRect(10, -54, 3, 3); ctx.fillRect(5, -53, 2, 2);
  const open = p.atk > 0 ? 0.3 + Math.sin(q * Math.PI) * 0.9 : 0.12;
  ctx.fillStyle = f ? '#fff' : '#2a0e22';
  ctx.beginPath();
  ctx.moveTo(14, -46);
  ctx.lineTo(24, -46 - open * 9);
  ctx.lineTo(24, -46 + open * 9);
  ctx.closePath();
  ctx.fill();
  if (!f && p.atk > 0.3) {                   // bave d'acide
    ellipse(ctx, 22, -42 + (1 - p.atk) * 6, 2.5, 3.5, '#9be22b');
  }
}

// ---------- Repli pour les unités pas encore dessinées (étape 3) ----------
function generic(ctx, p, color) {
  const f = p.flash;
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 2 : 0;
  ctx.translate(0, -bob);
  legs(ctx, p, -22, '#444', '#222', 8, 6);
  ctx.fillStyle = F(color, f);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-11, -54, 22, 32, 5) : ctx.rect(-11, -54, 22, 32); ctx.fill();
  ellipse(ctx, 2, -60, 7, 7, F('#d7a27a', f));
}

const DRAWERS = {
  pillard, tireur, goule, cracheur,
};
const FALLBACK_COLORS = {
  motard: '#6d6d52', lanceFlammes: '#8a5a2b', blinde: '#5a6a4a',
  chien: '#7a5a4a', brute: '#8a4a5a', abomination: '#6a3a6a',
};

export function drawSprite(ctx, defId, pose) {
  const fn = DRAWERS[defId];
  if (fn) fn(ctx, pose);
  else generic(ctx, pose, FALLBACK_COLORS[defId] || '#777');
}

// Icône d'un bouton : même dessin, immobile, centré dans une case de taille `size`
const IDLE = { walk: 0, atk: 0, flash: false, moving: false };
export function drawIcon(ctx, defId, cx, cy, size, dim = false) {
  ctx.save();
  ctx.translate(cx, cy + size * 0.42);
  const k = size / 78;
  ctx.scale(k, k);
  if (dim) ctx.globalAlpha = 0.45;
  drawSprite(ctx, defId, IDLE);
  ctx.restore();
}
