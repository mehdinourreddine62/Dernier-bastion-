import { CONFIG } from '../config.js';

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

function wheel(ctx, x, y, r, spin, f) {
  ellipse(ctx, x, y, r, r, F('#1c1714', f));
  ellipse(ctx, x, y, r * 0.45, r * 0.45, F('#5a5048', f));
  ctx.strokeStyle = F('#3a332d', f);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI) / 3;
    ctx.moveTo(x - Math.cos(a) * r * 0.85, y - Math.sin(a) * r * 0.85);
    ctx.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
  }
  ctx.stroke();
}

function motard(ctx, p) {
  const f = p.flash;
  const q = p.atk > 0 ? 1 - p.atk : 0;
  const bob = p.moving ? Math.sin(p.walk * 2) * 1 : 0;
  ctx.translate(0, -bob);
  const spin = p.walk * 1.6;
  wheel(ctx, -16, -10, 10, spin, f);
  wheel(ctx, 19, -10, 10, spin, f);
  // cadre de la moto
  limb(ctx, -16, -10, 0, -22, 4, F('#3a3a3c', f));
  limb(ctx, 19, -10, 12, -30, 4, F('#3a3a3c', f));
  poly(ctx, [-12, -24, 14, -26, 16, -18, -8, -16], F('#7a3b22', f));      // réservoir rouillé
  limb(ctx, 10, -32, 16, -34, 3, F('#222', f));                            // guidon
  ellipse(ctx, -14, -26, 7, 3, F('#2c2620', f));                            // selle
  // pilote penché
  limb(ctx, -6, -28, 4, -16, 5, F('#4a4a3a', f));                          // jambe
  poly(ctx, [-12, -30, -4, -52, 6, -50, 2, -28], F('#6d6d52', f));          // torse
  if (!f) { ctx.fillStyle = '#f2c230'; ctx.fillRect(1, -48, 4, 6); }
  ellipse(ctx, 4, -57, 7, 7, F('#d7a27a', f));
  poly(ctx, [-3, -58, -1, -65, 8, -66, 12, -58], F('#3a3a3c', f));         // casque
  ctx.fillStyle = f ? '#fff' : '#9fd3e8'; ctx.fillRect(7, -60, 5, 3);       // lunettes
  // bras + chaîne/batte
  const a = p.atk > 0 ? -1.6 + 2.8 * q : -2.2;
  limb(ctx, 2, -48, 12, -38, 4.5, F('#6d6d52', f));
  limb(ctx, 2, -48, 2 + Math.cos(a) * 26, -48 + Math.sin(a) * 26, 3.5, F('#8a8070', f));
}

function lanceFlammes(ctx, p) {
  const f = p.flash;
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 1.5 : 0;
  ctx.translate(0, -bob);
  legs(ctx, p, -24, '#4d3f30', '#2a2018', 8, 7);
  // réservoir sur le dos
  ctx.fillStyle = F('#9a3a22', f);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-18, -56, 10, 28, 4) : ctx.rect(-18, -56, 10, 28); ctx.fill();
  ctx.fillStyle = F('#c75a35', f); ctx.fillRect(-17, -52, 3, 20);
  // combinaison épaisse
  ctx.fillStyle = F('#7a6a48', f);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-10, -54, 21, 31, 6) : ctx.rect(-10, -54, 21, 31); ctx.fill();
  ctx.fillStyle = F('#5d5036', f); ctx.fillRect(-10, -34, 21, 4);
  // tête avec masque à gaz
  ellipse(ctx, 2, -61, 8.5, 8.5, F('#5a5a4e', f));
  ellipse(ctx, 7, -60, 3.5, 3.5, F(p.atk > 0 ? '#ffcf7a' : '#9fd3e8', f));
  ellipse(ctx, 9, -55, 3.5, 4, F('#3a3a32', f));
  // tuyau + lance
  ctx.strokeStyle = F('#2a2420', f); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-13, -32); ctx.quadraticCurveTo(-2, -22, 10, -38); ctx.stroke();
  limb(ctx, 6, -46, 14, -38, 6, F('#7a6a48', f));
  if (!f) { ctx.fillStyle = '#f2c230'; ctx.fillRect(6, -48, 5, 6); }
  limb(ctx, 8, -38, 30, -40, 5, F('#3a3632', f));
  limb(ctx, 26, -40, 32, -40, 6, F('#6a6058', f));
  if (!f && p.atk > 0) ellipse(ctx, 34, -40, 4, 3, '#ffcf5a');               // veilleuse
}

function blinde(ctx, p) {
  const f = p.flash;
  const recoil = p.atk > 0 ? -5 * p.atk : 0;
  const bob = p.moving ? Math.sin(p.walk * 3) * 0.8 : 0;
  ctx.translate(0, -bob);
  // caisse
  poly(ctx, [-46, -14, -48, -40, -36, -50, 34, -50, 48, -36, 46, -14], F('#5a6a4a', f));
  poly(ctx, [-30, -50, -24, -58, 12, -58, 18, -50], F('#4c5a3e', f));
  // plaques rapiécées
  ctx.fillStyle = F('#7a4a2a', f); ctx.fillRect(-40, -40, 18, 14); ctx.fillRect(10, -44, 16, 10);
  ctx.fillStyle = F('#8a8a7a', f);
  for (const [rx, ry] of [[-38, -38], [-24, -38], [-38, -28], [12, -42], [24, -42]]) ctx.fillRect(rx, ry, 2, 2);
  ctx.fillStyle = f ? '#fff' : '#f2c230'; ctx.fillRect(-46, -22, 92, 4);    // bande jaune
  // tourelle + canon
  ctx.save();
  ctx.translate(recoil, 0);
  ctx.fillStyle = F('#4c5a3e', f);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-16, -72, 32, 16, 5) : ctx.rect(-16, -72, 32, 16); ctx.fill();
  limb(ctx, 12, -65, 52, -66, 6, F('#3a3f36', f));
  limb(ctx, 48, -66, 54, -66, 8, F('#2a2e28', f));
  if (!f && p.atk > 0.7) {
    const r = 14 * (p.atk - 0.6) * 2.5;
    poly(ctx, [55, -66, 55 + r, -73, 55 + r * 1.7, -66, 55 + r, -59], '#fff3b0');
  }
  ctx.restore();
  // roues
  const spin = p.walk;
  for (const x of [-34, -12, 12, 34]) wheel(ctx, x, -11, 11, spin, f);
}

function chien(ctx, p) {
  const f = p.flash;
  const q = p.atk > 0 ? 1 - p.atk : 0;
  const lunge = p.atk > 0 ? Math.sin(q * Math.PI) * 10 : 0;
  const run = p.moving ? p.walk * 1.4 : 0;
  ctx.translate(lunge, p.moving ? -Math.abs(Math.sin(run)) * 3 : 0);
  // pattes (galop)
  const s1 = p.moving ? Math.sin(run) * 10 : 0;
  const s2 = p.moving ? Math.sin(run + 1.2) * 10 : 0;
  limb(ctx, -14, -20, -14 - s1, -2, 4, F('#7a4a3e', f));
  limb(ctx, -10, -20, -10 + s1, -2, 4, F('#8a5a4a', f));
  limb(ctx, 14, -20, 14 + s2, -2, 4, F('#7a4a3e', f));
  limb(ctx, 18, -20, 18 - s2, -2, 4, F('#8a5a4a', f));
  // queue
  limb(ctx, -20, -24, -30, -30 + Math.sin(run * 2) * 3, 3, F('#7a4a3e', f));
  // corps décharné + côtes
  ellipse(ctx, 0, -24, 22, 9, F('#a0685a', f));
  ellipse(ctx, -6, -27, 9, 5, F('#7e4e72', f));
  if (!f) {
    ctx.strokeStyle = '#d8cfae'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(2 + i * 5, -30); ctx.lineTo(4 + i * 5, -19); ctx.stroke(); }
  }
  // tête + mâchoire
  ellipse(ctx, 22, -30, 9, 7, F('#a0685a', f));
  const open = p.atk > 0 ? Math.sin(q * Math.PI) * 0.6 : 0.1;
  poly(ctx, [24, -28, 36, -28 + open * 2, 34, -24 + open * 10, 24, -24], F('#8a4a3e', f));
  ctx.fillStyle = f ? '#fff' : '#e8e24a'; ctx.fillRect(24, -34, 3, 2);
  poly(ctx, [16, -36, 18, -44, 22, -36], F('#7a4a3e', f));                   // oreille
}

function brute(ctx, p) {
  const f = p.flash;
  const q = p.atk > 0 ? 1 - p.atk : 0;
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 2.5 : 0;
  ctx.translate(0, -bob);
  legs(ctx, p, -34, '#7a4e44', '#4a2e28', 10, 11);
  // bras arrière
  limb(ctx, -12, -78, -20, -46, 11, F('#94625a', f));
  // torse énorme
  ellipse(ctx, 0, -62, 25, 30, F('#b07a6a', f));
  ellipse(ctx, 6, -56, 14, 18, F('#c28b7a', f));
  if (!f) {                                                                   // veines violettes
    ctx.strokeStyle = '#7e4e8c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, -78); ctx.quadraticCurveTo(-6, -66, -12, -52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -84); ctx.quadraticCurveTo(18, -72, 10, -64); ctx.stroke();
  }
  poly(ctx, [-24, -40, 22, -42, 18, -30, -20, -30], F('#4a3628', f));        // pagne
  // petite tête enfoncée
  ellipse(ctx, 10, -94, 10, 9, F('#a06a5a', f));
  ctx.fillStyle = f ? '#fff' : '#e8e24a'; ctx.fillRect(13, -97, 3, 3);
  ctx.fillStyle = f ? '#fff' : '#3a1418'; ctx.fillRect(12, -89, 8, 2);
  // bras avant avec plaque de tôle : coup de massue de haut en bas
  const a = p.atk > 0 ? -2.2 + 2.6 * q : -0.4;
  const sx = 14, sy = -78;
  const ex = sx + Math.cos(a) * 34, ey = sy + Math.sin(a) * 34;
  limb(ctx, sx, sy, ex, ey, 12, F('#a8726a', f));
  ellipse(ctx, ex, ey, 9, 9, F('#94625a', f));
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
  ctx.fillStyle = F('#7b4a2a', f); ctx.fillRect(2, -9, 22, 18);
  ctx.restore();
}

function abomination(ctx, p) {
  const f = p.flash;
  const q = p.atk > 0 ? 1 - p.atk : 0;
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 3 : 0;
  ctx.translate(0, -bob);
  // pattes trapues
  const s = p.moving ? Math.sin(p.walk) * 8 : 0;
  for (const [x, ph] of [[-34, 1], [-10, -1], [16, 1], [36, -1]]) limb(ctx, x, -30, x + s * ph, -3, 13, F('#5a2a44', f));
  // masse de chair
  ellipse(ctx, 0, -82, 58, 62, F('#7a3a5a', f));
  ellipse(ctx, -24, -112, 30, 28, F('#8a4466', f));
  ellipse(ctx, 22, -66, 30, 30, F('#8e4a6a', f));
  // pustules
  if (!f) {
    const pulse = 0.6 + Math.sin(p.walk * 2) * 0.25;
    for (const [x, y, r] of [[-30, -70, 8], [-6, -128, 6], [34, -100, 7], [-40, -100, 5], [8, -44, 6]]) {
      ctx.fillStyle = `rgba(155,226,43,${pulse})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // têtes
  ellipse(ctx, 40, -122, 15, 13, F('#9a5070', f));
  ellipse(ctx, 18, -142, 10, 9, F('#9a5070', f));
  ctx.fillStyle = f ? '#fff' : '#e8e24a';
  ctx.fillRect(46, -128, 4, 4); ctx.fillRect(38, -127, 3, 3); ctx.fillRect(21, -146, 3, 3);
  const open = p.atk > 0 ? Math.sin(q * Math.PI) : 0.2;
  ctx.fillStyle = f ? '#fff' : '#2a0e22';
  ctx.beginPath(); ctx.ellipse(48, -114, 8, 3 + open * 7, 0, 0, Math.PI * 2); ctx.fill();
  // tentacules-bras qui frappent le sol
  const a = p.atk > 0 ? -1.4 + 2.4 * q : -0.2;
  ctx.strokeStyle = F('#6a2a4a', f); ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(30, -90);
  ctx.quadraticCurveTo(60, -90 + Math.sin(a) * 20, 58 + Math.cos(a) * 30, -60 + Math.sin(a) * 50);
  ctx.stroke();
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(-40, -96);
  ctx.quadraticCurveTo(-66, -70, -58, -36 + Math.sin(p.walk) * 6);
  ctx.stroke();
}

const DRAWERS = { pillard, tireur, motard, lanceFlammes, blinde, goule, cracheur, chien, brute, abomination };

export function drawSprite(ctx, defId, pose) {
  const fn = DRAWERS[defId];
  if (fn) fn(ctx, pose);
}

// Icône d'un bouton : même dessin, immobile, ajusté dans une case de taille `size`
const IDLE = { walk: 0, atk: 0, flash: false, moving: false };
export function drawIcon(ctx, defId, cx, cy, size, dim = false) {
  const def = CONFIG.units[defId];
  const h = def ? def.bodyHeight : 68;
  const w = def ? def.bodyWidth + 20 : 50;
  const k = Math.min(size / (h + 8), size / w);
  ctx.save();
  ctx.translate(cx - (defId === 'blinde' ? 4 * k : 0), cy + (h * k) / 2);
  ctx.scale(k, k);
  if (dim) ctx.globalAlpha = 0.45;
  drawSprite(ctx, defId, IDLE);
  ctx.restore();
}

// Icônes des sorts et de l'amélioration du revenu
export function drawSpellIcon(ctx, id, cx, cy, size, dim = false) {
  ctx.save();
  ctx.translate(cx, cy);
  const k = size / 60;
  ctx.scale(k, k);
  if (dim) ctx.globalAlpha = 0.45;
  if (id === 'mortar') {
    // obus qui tombe + explosion
    poly(ctx, [0, 22, -24, 14, -14, 6, -26, -2, -8, -2, 0, -14, 8, -2, 26, -2, 14, 6, 24, 14], '#ff9a2b');
    ctx.save(); ctx.rotate(0.5);
    ellipse(ctx, 0, -14, 7, 14, '#4a4a40');
    poly(ctx, [-7, -2, 7, -2, 5, 6, -5, 6], '#2e2e28');
    ellipse(ctx, 0, -22, 4, 5, '#c0a040');
    ctx.restore();
  } else if (id === 'heal') {
    ctx.fillStyle = '#e8e2d0';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-22, -16, 44, 34, 6) : ctx.rect(-22, -16, 44, 34); ctx.fill();
    ctx.fillStyle = '#6a5a48'; ctx.fillRect(-8, -22, 16, 7);
    ctx.fillStyle = '#c8382a'; ctx.fillRect(-4, -10, 8, 22); ctx.fillRect(-11, -3, 22, 8);
  } else if (id === 'income') {
    ctx.fillStyle = '#c9a040';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const r = i % 2 === 0 ? 20 : 15;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ellipse(ctx, 0, 0, 6, 6, '#3a2b20');
    poly(ctx, [14, -2, 26, -18, 38, -2, 30, -2, 30, 14, 22, 14, 22, -2], '#7ee05a');
  }
  ctx.restore();
}
