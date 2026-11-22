import { CONFIG } from '../config.js?v=24';

// Dessin procédural des unités, style « silhouettes cernées » façon jeu Flash.
// Origine = pieds au sol ; l'unité regarde vers +x (le Renderer retourne les Mutants).
// pose : { walk (phase de marche), atk (1 -> 0 pendant l'attaque), flash (touché),
//          moving (marche), time (horloge), dark (épave) }

const OUT = '#1b120b';
const LW = 1.5;
let X = null;   // contexte de dessin courant
let P = null;   // pose courante

// Couleur selon l'état : blanc si touché, assombrie si épave
const darkCache = new Map();
function C(c) {
  if (P.flash) return '#ffffff';
  if (!P.dark) return c;
  let d = darkCache.get(c);
  if (!d) {
    const n = parseInt(c.slice(1), 16);
    const f = (v) => Math.round(v * 0.35).toString(16).padStart(2, '0');
    d = '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
    darkCache.set(c, d);
  }
  return d;
}

// ---------- Primitives (remplissage + contour) ----------
function fillStroke() { X.fill(); X.strokeStyle = OUT; X.lineWidth = LW; X.stroke(); }

function poly(pts, fill, outline = true) {
  X.fillStyle = C(fill);
  X.beginPath();
  X.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) X.lineTo(pts[i], pts[i + 1]);
  X.closePath();
  if (outline) fillStroke(); else X.fill();
}
function blob(x, y, rx, ry, fill, rot = 0, outline = true) {
  X.fillStyle = C(fill);
  X.beginPath(); X.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (outline) fillStroke(); else X.fill();
}
function rr(x, y, w, h, r, fill, outline = true) {
  X.fillStyle = C(fill);
  X.beginPath();
  X.moveTo(x + r, y); X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r);
  X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r); X.closePath();
  if (outline) fillStroke(); else X.fill();
}
// Membre : trait épais cerné (1 ou 2 segments)
function limb(pts, w, fill) {
  X.lineCap = 'round'; X.lineJoin = 'round';
  X.beginPath(); X.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) X.lineTo(pts[i], pts[i + 1]);
  X.strokeStyle = OUT; X.lineWidth = w + LW * 2; X.stroke();
  X.strokeStyle = C(fill); X.lineWidth = w; X.stroke();
}
// Trait simple (détails)
function line(x1, y1, x2, y2, w, color) {
  X.lineCap = 'round';
  X.strokeStyle = C(color); X.lineWidth = w;
  X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.stroke();
}
function dot(x, y, r, color) {
  X.fillStyle = C(color);
  X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fill();
}
// Yeux qui brillent (mutants)
function glowEye(x, y, r, color) {
  if (P.flash) { dot(x, y, r, '#ffffff'); return; }
  if (P.dark) { dot(x, y, r, '#202020'); return; }
  X.fillStyle = color; X.globalAlpha *= 0.35;
  X.beginPath(); X.arc(x, y, r * 2.4, 0, Math.PI * 2); X.fill();
  X.globalAlpha /= 0.35;
  dot(x, y, r, color);
}

// Courbe d'attaque : préparation (recul) puis frappe. Renvoie -1..1
function swing() {
  if (P.atk <= 0) return 0;
  const q = 1 - P.atk;
  return q < 0.3 ? -q / 0.3 : -1 + 2 * Math.min(1, (q - 0.3) / 0.45);
}

// Jambes articulées avec genoux
function legs(hipY, len, w, pants, boot, stride, bootLen = 9) {
  const moving = P.moving;
  for (let i = 0; i < 2; i++) {
    const ph = P.walk + i * Math.PI;
    const fx = moving ? Math.sin(ph) * stride : (i ? 4 : -4);
    const lift = moving ? Math.max(0, -Math.cos(ph)) * 5 : 0;
    const kx = fx * 0.45 + 3;
    const ky = hipY * 0.5 - lift * 0.5;
    limb([0, hipY, kx, ky, fx, -3 - lift], w, i === 0 ? shade(pants) : pants);
    rr(fx - 3, -6 - lift, bootLen, 6, 2, boot);
  }
  void len;
}
// Couleur plus sombre pour les membres « arrière »
const shadeCache = new Map();
function shade(c) {
  let d = shadeCache.get(c);
  if (!d) {
    const n = parseInt(c.slice(1), 16);
    const f = (v) => Math.round(v * 0.78).toString(16).padStart(2, '0');
    d = '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
    shadeCache.set(c, d);
  }
  return d;
}

const bobY = (amp = 2) => (P.moving ? Math.abs(Math.cos(P.walk)) * amp : Math.sin(P.time * 2.2) * 0.6);
const armSwing = () => (P.moving ? Math.sin(P.walk) * 0.55 : 0);

// =====================================================================
//  SURVIVANTS
// =====================================================================

// Pillard : blouson rapiécé, sac à dos, épaulière en pneu, foulard, casquette, tuyau clouté
function pillard() {
  const s = swing();
  X.translate(s > 0 ? s * 5 : s * 2, -bobY(2));
  const br = P.moving ? 0 : Math.sin(P.time * 2.2) * 0.7;          // respiration
  const fl = P.moving ? Math.sin(P.walk * 2) * 2 : Math.sin(P.time * 3) * 1;   // foulard au vent
  // sac à dos + couverture roulée
  rr(-18, -53 - br, 10, 24, 3, '#5e4c34');
  rr(-17, -48 - br, 8, 3, 1, '#4a3a26', false);
  rr(-20, -58 - br, 13, 6, 3, '#8a4430');
  line(-16, -58 - br, -16, -52 - br, 1, '#5a2a1e');
  // bras arrière
  const ba = 1.9 - armSwing();
  limb([-3, -46, -3 + Math.cos(ba) * 10, -46 + Math.sin(ba) * 10, -3 + Math.cos(ba - 0.4) * 19, -46 + Math.sin(ba - 0.4) * 19], 5, shade('#7f8552'));
  dot(-3 + Math.cos(ba - 0.4) * 19, -46 + Math.sin(ba - 0.4) * 19, 2.6, shade('#d39a72'));
  legs(-25, 25, 6, '#4b4a36', '#2b241c', 10);
  // torse : blouson kaki (ombre au dos, reflet devant)
  poly([-9, -24, -10, -50 - br, 9, -51 - br, 10, -24], '#7f8552');
  poly([-10, -50 - br, -4, -51 - br, -5, -24, -9, -24], '#62683f', false);
  poly([6, -50 - br, 9, -51 - br, 10, -25, 7, -25], '#979d68', false);
  poly([-6, -51 - br, 7, -52 - br, 5, -47, -4, -47], '#6a7044');                   // col relevé
  rr(1, -44, 7, 8, 1, '#8f6a3e', false);                                           // pièce rapiécée
  X.strokeStyle = C('#5a4228'); X.lineWidth = 0.8;
  X.beginPath(); for (let k = 0; k < 4; k++) { X.moveTo(1.5 + k * 2, -44.5); X.lineTo(2 + k * 2, -43); } X.stroke();
  // bandoulière cloutée
  line(-8, -49 - br, 9, -29, 3, '#4a3828');
  for (let k = 0; k < 4; k++) dot(-5 + k * 4, -45 + k * 4.6, 0.9, '#c0b08a');
  rr(-10, -29, 20, 4, 1, '#3b2c1e');                                               // ceinture
  rr(-1, -29.5, 4, 5, 1, '#c0a060', false);                                        // boucle
  rr(4, -30, 5, 6, 1, '#5a4430', false);                                           // sacoche
  // épaulière en pneu
  blob(5, -49 - br, 6, 3.8, '#3a3634');
  dot(3, -49.5 - br, 0.9, '#8a8478'); dot(7, -49.5 - br, 0.9, '#8a8478');
  // tête : cou, oreille, nez, sourcil
  rr(-1, -54 - br, 5, 4, 1, '#bf8862', false);
  blob(1, -59 - br, 7.5, 8, '#d39a72');
  blob(-3, -58 - br, 3.5, 6, '#c08862', 0, false);
  blob(-2, -58 - br, 1.6, 2.3, '#b07a56');
  poly([8, -60 - br, 10.6, -57.6 - br, 8, -57 - br], '#c08862', false);
  line(3.5, -63.2 - br, 6.8, -63.8 - br, 1.2, '#3a2614');
  dot(5.2, -61 - br, 1.4, '#1a1008');
  // foulard rouge + pan qui flotte
  poly([-5, -57 - br, 8, -57 - br, 9, -52 - br, 2, -50 - br, -5, -53 - br], '#a8442b');
  poly([-4, -55 - br, -12, -53 + fl - br, -13, -49 + fl - br, -5, -52 - br], '#8e3824');
  // casquette + lunettes de soudeur relevées
  poly([-8, -61 - br, -7, -67 - br, 0, -69 - br, 7, -66 - br, 8, -62 - br], '#56708a');
  poly([-7, -64 - br, -6, -67 - br, -1, -68.5 - br, -2, -64 - br], '#4a6278', false);
  poly([6, -63 - br, 14, -62 - br, 13, -60 - br, 6, -61 - br], '#46607a');
  rr(-4, -66.5 - br, 10, 3.2, 1.5, '#2e2e2c');
  dot(-1, -65 - br, 1.2, '#9fd3e8'); dot(3.5, -65 - br, 1.2, '#9fd3e8');
  // bras avant + tuyau clouté (poignée scotchée)
  const a = P.atk > 0 ? (s < 0 ? -1.1 - (-s) * 1.3 : -2.4 + (s + 1) * 1.55) : -1.0 + armSwing() * 0.3;
  const hx = 5 + Math.cos(a + 1.2) * 4 + 8, hy = -46 + Math.sin(a + 1.2) * 4 + 9;
  limb([5, -46, (5 + hx) / 2 + 1, (-46 + hy) / 2 + 2, hx, hy], 5.5, '#7f8552');
  rr(5, -47, 5, 5, 1, '#f2c230', false);                 // brassard jaune
  const tx = hx + Math.cos(a) * 28, ty = hy + Math.sin(a) * 28;
  limb([hx, hy, tx, ty], 4, '#7a7570');
  line(hx + Math.cos(a) * 12, hy + Math.sin(a) * 12, tx, ty, 1.2, '#a8a49c');     // reflet du métal
  line(hx, hy, hx + Math.cos(a) * 9, hy + Math.sin(a) * 9, 5, '#3b2c1e');
  for (let k = 0; k < 2; k++) {
    const bx = hx + Math.cos(a) * (2 + k * 4), by = hy + Math.sin(a) * (2 + k * 4);
    line(bx + Math.cos(a - 1.57) * 2.5, by + Math.sin(a - 1.57) * 2.5, bx - Math.cos(a - 1.57) * 2.5, by - Math.sin(a - 1.57) * 2.5, 1.2, '#8a8478');
  }
  for (let i = 0; i < 3; i++) {
    const k = 0.65 + i * 0.12;
    const nx = hx + Math.cos(a) * 28 * k, ny = hy + Math.sin(a) * 28 * k;
    line(nx, ny, nx + Math.cos(a - 1.57) * 4, ny + Math.sin(a - 1.57) * 4, 1.2, '#c0c0b0');
  }
  dot(hx, hy, 3, '#d39a72');
}

// Tireur : long manteau, chapeau, écharpe, fusil à lunette
function tireur() {
  const recoil = P.atk > 0 ? -3.5 * P.atk : 0;
  X.translate(0, -bobY(1.5));
  legs(-24, 24, 5.5, '#3e434a', '#2b241c', 8.5);
  X.translate(recoil, 0);
  // pans du manteau
  const tail = P.moving ? Math.sin(P.walk * 2) * 2 : 0;
  poly([-9, -30, -14 - tail, -12, -2, -16, 9, -14, 9, -30], '#4a5e72');
  // bras arrière (tient la crosse)
  limb([-3, -46, 2, -38, 8, -41], 5, shade('#5b7288'));
  // torse
  poly([-9, -26, -9, -50, 9, -51, 9, -26], '#5b7288');
  poly([-9, -50, -4, -50, -4, -26, -9, -26], '#4a5e72', false);
  rr(-9, -31, 18, 3, 1, '#3b2c1e', false);
  poly([5, -50, 9, -51, 9, -27, 6, -27], '#6e86a0', false);                       // reflet du manteau
  for (const by of [-45, -39, -34]) dot(1.5, by, 1, '#2a2a2a');                   // boutons
  for (let k = 0; k < 4; k++) rr(-7 + k * 3.4, -32, 2.2, 4.5, 0.8, '#d8b040', false);   // cartouches à la ceinture
  // écharpe
  poly([-6, -52, 8, -52, 8, -48, -6, -47], '#c7b07a');
  poly([-6, -50, -12, -40, -9, -39, -3, -48], '#b49c66');
  // tête + chapeau à large bord
  blob(1, -58, 7, 7.5, '#d39a72');
  dot(5, -59, 1.3, '#1a1008');
  rr(-12, -64, 26, 3.5, 1.5, '#6e5a40');
  poly([-6, -64, -5, -72, 7, -72, 8, -64], '#6e5a40');
  rr(-5, -67, 13, 2.5, 1, '#3e2e20', false);
  blob(-3, -57, 1.5, 2.2, '#b07a56');                                              // oreille
  poly([7.5, -59, 10, -57, 7.5, -56], '#c08862', false);                           // nez
  line(3, -61.5, 6.5, -62, 1.1, '#3a2614');                                        // sourcil
  X.fillStyle = C('#8a6a50'); X.fillRect(2, -55, 5, 1.2);                          // barbe de trois jours
  // fusil
  limb([-6, -40, 10, -43], 6, '#6a4a2e');                // crosse
  limb([8, -43, 30, -45], 4, '#2a2a2c');                 // corps
  limb([28, -45, 40, -45.6], 2.5, '#1e1e20');            // canon
  rr(10, -50, 12, 4, 1.5, '#1a1a1a');                    // lunette
  dot(21, -48.5, 1, '#9fd3e8');                                                     // reflet de la lunette
  line(-5, -39, 1, -29, 1.2, '#4a3828');                                            // sangle
  // bras avant sous le canon
  limb([5, -47, 12, -40, 20, -43], 5, '#5b7288');
  rr(5, -48, 5, 5, 1, '#f2c230', false);                 // brassard jaune
  dot(20, -43, 2.6, '#d39a72');
  // flash de bouche du canon
  if (P.atk > 0.65 && !P.dark) {
    const r = 10 * (P.atk - 0.55) * 2.2;
    poly([41, -46, 41 + r, -51, 41 + r * 1.9, -46, 41 + r, -41], '#fff3b0', false);
    poly([41, -46, 41 + r * 0.6, -48, 41 + r * 1.1, -46, 41 + r * 0.6, -44], '#ff9a2b', false);
  }
}

// Motard : moto de cross rouillée, gilet de cuir, crête, fléau à chaîne
function wheel(x, y, r, spin) {
  blob(x, y, r, r, '#1c1714');
  X.strokeStyle = C('#3a332d'); X.lineWidth = 2;
  for (let i = 0; i < 8; i++) {                           // crampons
    const a = spin + (i * Math.PI) / 4;
    X.beginPath(); X.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); X.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); X.stroke();
  }
  blob(x, y, r * 0.45, r * 0.45, '#6a625a');
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI) / 3;
    line(x - Math.cos(a) * r * 0.4, y - Math.sin(a) * r * 0.4, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, 1, '#2a2420');
  }
}
function motard() {
  const s = swing();
  const bounce = P.moving ? Math.abs(Math.sin(P.walk * 2.2)) * 1.5 : 0;
  X.translate(0, -bounce);
  const spin = P.walk * 1.8;
  wheel(-18, -11, 11, spin);
  wheel(21, -11, 11, spin);
  // cadre
  limb([-18, -11, -4, -24, 12, -24], 3.5, '#3a3a3c');
  limb([21, -11, 13, -34], 3.5, '#8a8a8e');               // fourche
  poly([-14, -26, 2, -32, 14, -30, 16, -22, -6, -20], '#8a3a22');   // réservoir
  poly([-2, -31, 10, -30, 12, -26, 0, -27], '#a85a32', false);
  limb([-20, -16, -32, -22], 3, '#9a9a9e');               // pot d'échappement
  poly([16, -30, 23, -33, 24, -27, 18, -26], '#c09a2a');  // phare
  limb([10, -36, 16, -38], 2.5, '#222');                  // guidon
  rr(-24, -31, 16, 5, 2, '#2c2620');                      // selle
  poly([24, -14, 28, -22, 32, -14], '#4a4a4a');           // garde-boue
  line(-30, -21.5, -22, -17.5, 1, '#d8d8dc');                                       // reflet chromé
  poly([0, -31, 7, -30.5, 6, -29, 0, -29.5], '#d07a4a', false);                     // reflet du réservoir
  if (!P.dark) dot(21, -30, 1.6, '#fff3b0');                                       // ampoule du phare
  // pilote penché
  limb([-10, -30, 0, -22, 2, -12], 5, '#4a4a3a');
  rr(-1, -14, 8, 5, 2, '#2b241c');
  poly([-14, -30, -6, -54, 6, -52, 2, -30], '#6d6d52');
  poly([-13, -30, -7, -52, 0, -52, -4, -30], '#5a3a24');  // gilet de cuir
  blob(4, -60, 7, 7.5, '#d39a72');
  poly([-2, -66, 2, -76, 4, -66, 6, -74, 8, -66], '#a8442b');      // crête
  rr(4, -63, 8, 4, 1.5, '#9fd3e8');                       // lunettes
  poly([-1, -57, 10, -57, 10, -53, 0, -53], '#3a3a3c');   // bandana
  for (let k = 0; k < 3; k++) poly([-6 + k * 4, -52, -4 + k * 4, -57, -2 + k * 4, -52], '#c0c0b0');   // clous de l'épaule
  blob(0, -60, 1.5, 2.2, '#b07a56');                                                // oreille
  blob(1, -22, 3.2, 2.6, '#3a3a3c');                                                // genouillère
  // bras + fléau
  limb([2, -50, 10, -42, 16, -37], 5, '#6d6d52');
  rr(3, -51, 5, 5, 1, '#f2c230', false);
  const a = P.atk > 0 ? -1.4 + s * 1.6 : -2.3 + Math.sin(P.time * 6) * 0.3;
  const cx = 6, cy = -48;
  const ex = cx + Math.cos(a) * 24, ey = cy + Math.sin(a) * 24;
  limb([cx, cy, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10], 3, '#5a4430');
  X.setLineDash([2, 2]); line(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, ex, ey, 2, '#9a9a9a'); X.setLineDash([]);
  blob(ex, ey, 4, 4, '#5a5a5a');
  for (let i = 0; i < 4; i++) line(ex, ey, ex + Math.cos(i * 1.57) * 6, ey + Math.sin(i * 1.57) * 6, 1.5, '#8a8a8a');
}

// Lance-flammes : combinaison matelassée, masque à gaz, réservoirs, lance
function lanceFlammes() {
  X.translate(0, -bobY(1.5));
  legs(-25, 25, 7.5, '#5a5440', '#2a2018', 9, 11);
  // réservoirs dans le dos
  rr(-21, -58, 9, 30, 4, '#a8372a');
  rr(-15, -60, 9, 32, 4, '#c0442e');
  X.fillStyle = C('#f2c230');
  for (let i = 0; i < 3; i++) X.fillRect(-15, -52 + i * 9, 9, 3);
  blob(-10, -62, 3, 3, '#c0c0b0');                        // manomètre
  line(-10, -62, -9, -64, 0.8, '#a8372a');                                          // aiguille
  rr(-19, -56, 2, 26, 1, '#d06a50', false); rr(-13, -58, 2, 28, 1, '#e0705a', false);   // reflets des réservoirs
  poly([-12, -36, -10, -40, -8, -36], '#1a1a1a', false);                            // pictogramme danger
  // combinaison
  poly([-11, -24, -12, -54, 11, -55, 12, -24], '#6f6a4c');
  X.strokeStyle = C('#5a5640'); X.lineWidth = 1;
  for (let y = -50; y < -26; y += 6) { X.beginPath(); X.moveTo(-11, y); X.lineTo(11, y); X.stroke(); }
  rr(-12, -30, 24, 4, 1, '#3b2c1e');
  blob(5, -42, 3.5, 2.5, '#4e4a36', 0.3, false);                                    // traces de brûlure
  blob(-6, -36, 2.5, 2, '#4e4a36', 0, false);
  rr(-3, -30.5, 4, 5, 1, '#8a7a5a', false);                                         // briquet à la ceinture
  // tête : cagoule + masque à gaz
  blob(2, -62, 9, 9, '#4a4a40');
  blob(7, -63, 3.5, 3.5, P.atk > 0 ? '#ffcf7a' : '#7ab8d0');
  blob(1, -63, 3, 3, P.atk > 0 ? '#ffcf7a' : '#7ab8d0');
  rr(5, -58, 8, 7, 3, '#3a3a32');                        // cartouche filtrante
  for (let k = 0; k < 3; k++) line(6 + k * 2.4, -57, 6 + k * 2.4, -52.5, 0.8, '#5a5a50');   // grille du filtre
  if (!P.dark && !P.flash) { dot(8, -64.5, 0.9, '#ffffff'); dot(2, -64.2, 0.8, '#ffffff'); }   // reflets des verres
  // tuyau
  X.strokeStyle = C('#2a2420'); X.lineWidth = 3;
  X.beginPath(); X.moveTo(-12, -32); X.quadraticCurveTo(-2, -18, 10, -38); X.stroke();
  // bras + lance
  limb([6, -49, 12, -40], 7, '#6f6a4c');
  rr(4, -51, 6, 6, 1, '#f2c230', false);
  limb([6, -38, 30, -41], 5, '#3a3632');
  limb([28, -41, 35, -41], 7, '#6a6058');
  limb([-2, -40, 8, -38], 5, shade('#6f6a4c'));
  // veilleuse
  if (!P.dark) {
    const fl = 2.5 + Math.sin(P.time * 20) * 0.8;
    dot(38, -41, fl, P.atk > 0 ? '#ffe08a' : '#7ab8ff');
  }
}

// Blindé bricolé : camion blindé de tôles soudées, tourelle à canon, bélier
function blinde() {
  const recoil = P.atk > 0 ? -6 * P.atk : 0;
  const bob = P.moving ? Math.sin(P.walk * 3) * 0.8 : 0;
  X.translate(0, -bob);
  // échappement qui fume
  rr(-44, -84, 6, 26, 2, '#3a3632');
  if (!P.flash && !P.dark) {
    for (let i = 0; i < 3; i++) {
      const k = ((P.time * 0.8 + i / 3) % 1);
      X.fillStyle = `rgba(60,50,45,${0.4 * (1 - k)})`;
      X.beginPath(); X.arc(-41 - k * 10, -88 - k * 30, 4 + k * 8, 0, Math.PI * 2); X.fill();
    }
  }
  // antenne + fanion jaune
  line(-28, -64, -34, -104, 1.5, '#2a2a2a');
  poly([-34, -104, -22, -100 + Math.sin(P.time * 5) * 2, -34, -96], '#f2c230', false);
  // caisse
  poly([-48, -16, -50, -44, -40, -56, 36, -56, 50, -40, 48, -16], '#56633f');
  poly([-40, -56, 36, -56, 40, -50, -44, -50], '#6b7a50', false);
  poly([36, -56, 50, -40, 48, -16, 40, -16, 42, -44], '#4a5536', false);
  // plaques rapiécées + rivets
  rr(-42, -46, 20, 16, 1, '#7a4a2a');
  rr(8, -50, 18, 12, 1, '#6a6a5e');
  X.fillStyle = C('#a8a898');
  for (const [rx, ry] of [[-40, -44], [-26, -44], [-40, -33], [-26, -33], [10, -48], [23, -48], [10, -40], [23, -40]]) X.fillRect(rx, ry, 2, 2);
  // coulures de rouille, jerrican à l'arrière, sacs de sable, phare
  X.fillStyle = C('#8a4a2a');
  for (const [rx, ry, h] of [[-15, -52, 12], [2, -54, 9], [32, -46, 14], [-36, -28, 6]]) X.fillRect(rx, ry, 1.6, h);
  rr(-55, -42, 7, 14, 1.5, '#7a3a22'); rr(-54, -44, 3, 3, 1, '#5a2a18');
  blob(22, -58, 7, 3.2, '#a8946a'); blob(32, -58, 6, 3, '#b4a078');
  if (!P.dark) { dot(46, -36, 2.4, '#ffe9a0'); dot(46, -36, 1.2, '#ffffff'); }
  // fente de pilotage
  rr(28, -50, 14, 4, 1, '#14140e');
  if (!P.flash && !P.dark) { X.fillStyle = 'rgba(255,255,255,0.25)'; X.fillRect(30, -50, 4, 1.5); }
  // bande jaune
  X.fillStyle = C('#f2c230'); X.fillRect(-48, -26, 96, 4);
  // bélier à pointes
  poly([48, -40, 62, -30, 62, -18, 48, -16], '#5a5550');
  for (let i = 0; i < 3; i++) poly([62, -36 + i * 7, 70, -33 + i * 7, 62, -30 + i * 7], '#8a8478');
  // jupes
  rr(-48, -20, 96, 6, 1, '#3e4830');
  for (let k = 0; k < 7; k++) blob(-42 + k * 14, -15, 5 + (k % 3), 2.2, '#5a4a32', 0, false);   // boue
  // tourelle + canon (+ chef de char)
  X.save();
  X.translate(recoil, 0);
  blob(-6, -72, 5, 5, '#d39a72');
  poly([-11, -74, -10, -79, -1, -79, 0, -74], '#56708a');
  rr(-18, -70, 36, 16, 5, '#4c5a3e');
  rr(-18, -70, 36, 4, 2, '#5e6c4c', false);
  rr(-6, -75, 8, 5, 1.5, '#3e4832');                                               // trappe
  limb([6, -70, 6, -78], 2.4, '#2a2e28'); rr(4, -80, 5, 3, 1, '#2a2e28');           // périscope
  X.fillStyle = C('#f2c230'); X.fillRect(-14, -64, 6, 2);                          // marquage
  limb([14, -63, 52, -64], 6, '#3a3f36');
  rr(50, -68, 9, 8, 2, '#2a2e28');
  if (P.atk > 0.65 && !P.dark) {
    const r = 16 * (P.atk - 0.55) * 2.2;
    poly([60, -64, 60 + r, -71, 60 + r * 1.9, -64, 60 + r, -57], '#fff3b0', false);
    poly([60, -64, 60 + r * 0.6, -67, 60 + r * 1.1, -64, 60 + r * 0.6, -61], '#ff9a2b', false);
  }
  X.restore();
  // roues
  const spin = P.walk * 1.2;
  [-34, -12, 12, 34].forEach((x, i) => wheel(x, -12 + (P.moving ? Math.sin(P.walk * 3 + i) * 0.8 : 0), 12, spin));
}

// =====================================================================
//  MUTANTS
// =====================================================================

// Goule : décharnée, voûtée, longs bras griffus, yeux luisants
function goule() {
  const s = swing();
  const lunge = s > 0 ? s * 10 : s * 3;
  X.translate(lunge, -bobY(2.5));
  const sw = P.moving ? Math.sin(P.walk) : 0;
  const pant = P.moving ? 0 : Math.sin(P.time * 3) * 0.8;          // halètement
  // bras arrière griffu
  limb([2, -42, 10 - sw * 6, -30, 16 - sw * 8, -18], 4, shade('#a8b48a'));
  dot(10 - sw * 6, -30, 2.4, shade('#98a47a'));
  for (let i = -1; i <= 1; i++) line(16 - sw * 8, -18, 21 - sw * 8, -16 + i * 3, 1.3, '#cfc8a8');
  legs(-22, 22, 5, '#8a9670', '#6a7454', 9, 8);
  // haillons déchirés
  poly([-8, -24, 8, -26, 10, -14, 4, -18, 0, -11, -4, -17, -9, -14], '#5a4636');
  poly([-8, -24, -2, -25, -4, -17, -9, -14], '#4a382a', false);
  // torse voûté : peau pâle, reflet sur le dos, côtes, veines
  blob(2, -36 - pant * 0.3, 11 + pant * 0.2, 15, '#a8b48a', 0.5);
  blob(-2, -42, 6, 8, '#bcc8a0', 0.5, false);
  X.strokeStyle = C('#7d8a66'); X.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { X.beginPath(); X.arc(6, -36 + i * 5, 6, -0.6, 0.8); X.stroke(); }
  X.strokeStyle = C('#7e5a8c'); X.lineWidth = 1;
  X.beginPath(); X.moveTo(-6, -34); X.quadraticCurveTo(-2, -30, -5, -25); X.moveTo(8, -44); X.lineTo(12, -38); X.stroke();
  // colonne vertébrale saillante
  for (let i = 0; i < 4; i++) blob(-6 + i * 4, -45.5 + i * 2.6, 1.7, 1.3, '#cdd5b0', -0.6, false);
  // tête basse projetée en avant : crâne, orbite creuse, oreille pointue
  blob(14, -46, 8.5, 7.8, '#b8c49a');
  blob(11, -50, 4, 3, '#cad4ae', 0, false);
  poly([7, -49, 4, -55, 9, -51], '#a8b48a');
  blob(16.5, -48.5, 3, 2.4, '#5a6a46', 0, false);
  glowEye(17, -48.8, 1.8, '#f0e040');
  const open = P.atk > 0 ? 3.5 : 1.8 + Math.sin(P.time * 3) * 0.4;
  poly([16, -44, 23.5, -44, 22.5, -44 + open * 2, 16, -42 + open], '#2a1218');
  for (let i = 0; i < 3; i++) poly([17 + i * 2, -44, 18 + i * 2, -40.8, 19 + i * 2, -44], '#ece4c4', false);
  for (let i = 0; i < 2; i++) poly([18 + i * 2.5, -42 + open * 1.5, 19 + i * 2.5, -44 + open * 0.6, 20 + i * 2.5, -42 + open * 1.5], '#d8d0b0', false);
  // bave qui pend
  if (!P.dark) {
    const d = 3 + ((P.time * 2) % 1) * 5;
    line(21, -43 + open * 1.5, 21.4, -43 + open * 1.5 + d, 1.2, '#c8e890');
  }
  // bras avant griffu (coude noueux, griffes longues)
  const reach = P.atk > 0 ? 14 + Math.max(0, s) * 12 : 6 + sw * 6;
  const hx = 12 + reach, hy = P.atk > 0 ? -36 + Math.max(0, s) * 8 : -20;
  const ex = (8 + hx) / 2, ey = (-42 + hy) / 2 + 4;
  limb([8, -42, ex, ey, hx, hy], 4.5, '#a8b48a');
  dot(ex, ey, 2.6, '#98a47a');
  for (let i = -1; i <= 1; i++) line(hx, hy, hx + 8, hy + i * 3.5 + 2, 1.6, '#e8e2c0');
}

// Cracheur : ventre-poche violet, veines vertes, gorge qui gonfle avant de cracher
function cracheur() {
  const q = P.atk > 0 ? 1 - P.atk : 0;
  const swell = P.atk > 0 ? (q < 0.45 ? q / 0.45 : 1 - (q - 0.45) / 0.55) * 4 : 0;
  X.translate(-swell * 0.4, -bobY(1.5));
  legs(-15, 15, 6.5, '#5b4366', '#3a2a44', 6, 8);
  limb([-6, -30, -12, -20], 4, shade('#6a4377'));
  // ventre
  blob(0, -28, 15 + swell * 0.5, 16 + swell * 0.3, '#7b4f8c');
  blob(-5, -36, 7, 5, '#966aa8', 0.3, false);                                       // reflet du dos
  for (const [sx, sy, r] of [[-9, -22, 2], [-3, -16, 1.5], [8, -36, 1.6]]) blob(sx, sy, r, r * 0.8, '#5e3a6c', 0, false);   // taches
  // poche translucide verte
  if (!P.flash && !P.dark) {
    X.fillStyle = 'rgba(155,226,43,0.45)';
    X.beginPath(); X.ellipse(4, -24, 9, 9, 0, 0, Math.PI * 2); X.fill();
    X.fillStyle = 'rgba(220,255,160,0.6)';
    X.beginPath(); X.arc(1, -27, 2.5, 0, Math.PI * 2); X.fill();
  } else blob(4, -24, 9, 9, '#9d6bb0', 0, false);
  // veines
  X.strokeStyle = C('#9be22b'); X.lineWidth = 1.2;
  X.beginPath(); X.moveTo(-10, -36); X.quadraticCurveTo(-4, -30, -8, -20); X.moveTo(-12, -26); X.lineTo(-6, -24); X.stroke();
  // pustules dorsales
  glowEye(-11, -36, 3.5, '#9be22b');
  glowEye(-6, -43, 2.6, '#b6f04a');
  // petit bras
  limb([7, -32, 15, -26], 4, '#6a4377');
  // tête + mâchoire + gorge
  blob(9, -46, 8 + swell * 0.6, 6 + swell * 0.8, '#9d6bb0');   // gorge gonflée
  blob(9, -51, 8.5, 8, '#8f6aa0');
  glowEye(12, -55, 1.8, '#e8e24a');
  glowEye(7, -55, 1.4, '#e8e24a');
  const open = P.atk > 0 ? 0.3 + Math.max(0, (q - 0.4) / 0.6) * 0.9 : 0.15;
  poly([15, -49, 25, -49 - open * 9, 25, -49 + open * 9], '#2a0e22');
  for (let i = 0; i < 2; i++) poly([16 + i * 3, -49 - open * 4, 17 + i * 3, -46, 18 + i * 3, -49 - open * 4], '#e8e0c0', false);   // crocs
  if (!P.flash && !P.dark) {
    dot(22, -42 + ((P.time * 12) % 8), 1.8, '#9be22b');   // bave d'acide
  }
}

// Chien muté : galop, échine hérissée de pics, mâchoire énorme
function chien() {
  const s = swing();
  const lunge = s > 0 ? s * 12 : s * 3;
  const run = P.moving ? P.walk * 1.5 : P.time * 1.5;
  const pitch = P.moving ? Math.sin(run) * 0.06 : 0;
  X.translate(lunge, P.moving ? -Math.abs(Math.sin(run)) * 4 : 0);
  X.rotate(pitch);
  const s1 = P.moving ? Math.sin(run) * 11 : 2;
  const s2 = P.moving ? Math.sin(run + 1.3) * 11 : -2;
  // pattes arrière-plan
  limb([-14, -20, -18 - s1 * 0.5, -10, -14 - s1, -2], 4, shade('#7a4a3e'));
  limb([14, -22, 16 + s2 * 0.5, -11, 14 + s2, -2], 4, shade('#7a4a3e'));
  // queue
  limb([-22, -26, -30, -32, -36, -28 + Math.sin(run * 2) * 3], 2.5, '#7a4a3e');
  // corps
  blob(0, -25, 23, 9.5, '#8a5a48');
  blob(-4, -24, 12, 6, '#b06a5a', 0, false);                         // chair à vif
  blob(6, -27, 6, 4, '#7e4e72', 0, false);                            // plaie violette
  blob(-8, -31, 11, 3, '#a06a5a', 0, false);                                        // reflet de l'échine
  rr(16, -35, 4, 8, 1, '#4a4a46'); dot(18, -27, 1.6, '#8a8a84');                    // collier rouillé
  X.strokeStyle = C('#5a2e26'); X.lineWidth = 0.9;
  X.beginPath(); X.moveTo(-14, -26); X.lineTo(-9, -21); X.moveTo(9, -22); X.lineTo(13, -25); X.stroke();   // cicatrices
  X.strokeStyle = C('#d8cfae'); X.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) { X.beginPath(); X.moveTo(-6 + i * 5, -30); X.lineTo(-4 + i * 5, -20); X.stroke(); }
  for (let i = 0; i < 5; i++) poly([-16 + i * 7, -33, -13 + i * 7, -41 - (i % 2) * 3, -10 + i * 7, -33], '#d8cfae');
  // pattes premier plan
  limb([-10, -20, -12 + s1 * 0.5, -10, -10 + s1, -2], 4.5, '#8a5a48');
  limb([18, -22, 20 - s2 * 0.5, -11, 18 - s2, -2], 4.5, '#8a5a48');
  // tête
  blob(24, -31, 9, 7.5, '#8a5a48');
  const open = P.atk > 0 ? Math.max(0, s) * 0.7 + 0.2 : 0.15;
  poly([26, -30, 40, -31, 38, -26, 27, -27], '#a0685a');            // museau
  poly([26, -26, 38, -26 + open * 12, 36, -21 + open * 12, 25, -23], '#7a4038');   // mâchoire
  for (let i = 0; i < 3; i++) poly([29 + i * 3, -27, 30.5 + i * 3, -24, 32 + i * 3, -27], '#e8e0c0', false);
  glowEye(25, -34, 1.6, '#f0e040');
  glowEye(29, -35, 1.1, '#f0e040');
  if (!P.dark) line(36, -24 + open * 10, 36.4, -19 + open * 10 + ((P.time * 3) % 1) * 4, 1.1, '#e0d8c0');   // bave
  poly([17, -36, 19, -46, 23, -37], '#7a4a3e');                       // oreille
}

// Brute : colosse voûté, bras-massue de tôle soudée, chaînes
function brute() {
  const s = swing();
  X.translate(0, -bobY(3));
  legs(-36, 36, 11, '#8a5a50', '#4a2e28', 11, 13);
  // bras arrière
  limb([-14, -80, -22, -60, -18, -44], 11, shade('#b58374'));
  blob(-18, -42, 7, 7, shade('#b58374'));
  // torse massif avec bosse
  blob(-2, -64, 26, 30, '#b58374');
  blob(-14, -82, 16, 14, '#a87264');
  blob(6, -58, 14, 18, '#c49484', 0, false);
  blob(-8, -78, 9, 7, '#cba090', 0, false);                                        // reflet de l'épaule
  // plaque de tôle rivetée sur l'épaule arrière
  poly([-26, -86, -10, -96, 2, -88, -12, -78], '#6a6a62');
  for (const [px, py] of [[-20, -86], [-10, -91], [-6, -84]]) dot(px, py, 1, '#a8a898');
  // points de suture et veines
  X.strokeStyle = C('#5a2a2a'); X.lineWidth = 1.2;
  X.beginPath(); X.moveTo(-8, -76); X.lineTo(4, -60);
  for (let i = 0; i < 4; i++) { X.moveTo(-7 + i * 3, -73 + i * 4); X.lineTo(-3 + i * 3, -75 + i * 4); }
  X.stroke();
  X.strokeStyle = C('#7e4e8c'); X.lineWidth = 2;
  X.beginPath(); X.moveTo(-18, -70); X.quadraticCurveTo(-10, -58, -16, -46); X.stroke();
  // pagne + chaîne
  poly([-24, -42, 24, -44, 20, -30, -20, -30], '#4a3628');
  X.setLineDash([3, 2]); line(-24, -40, 24, -42, 3, '#7a7a7a'); X.setLineDash([]);
  // petite tête enfoncée avec mâchoire métallique
  blob(12, -94, 10, 9, '#a87264');
  rr(10, -91, 12, 6, 2, '#6a6a62');
  for (let i = 0; i < 3; i++) line(12 + i * 3.5, -91, 12 + i * 3.5, -85, 0.8, '#4a4a44');   // grille de la mâchoire
  glowEye(16, -98, 2, '#f0e040');
  // bras-massue : coup de haut en bas
  const a = P.atk > 0 ? (s < 0 ? -0.6 + s * 1.6 : -2.2 + (s + 1) * 1.4) : -0.5 + armSwing() * 0.2;
  const sx = 14, sy = -80;
  const ex = sx + Math.cos(a) * 34, ey = sy + Math.sin(a) * 34;
  limb([sx, sy, (sx + ex) / 2, (sy + ey) / 2 + 2, ex, ey], 12, '#b58374');
  X.save(); X.translate(ex, ey); X.rotate(a);
  rr(-2, -11, 26, 22, 2, '#7b4a2a');
  X.fillStyle = C('#9a9a8a');
  for (const [rx, ry] of [[2, -8], [18, -8], [2, 6], [18, 6]]) X.fillRect(rx, ry, 2, 2);
  X.restore();
}

// Abomination : masse de chair, têtes multiples, tentacules, pics d'os
function abomination() {
  const s = swing();
  X.translate(0, -bobY(3));
  const st = P.moving ? Math.sin(P.walk) * 8 : 0;
  // pattes trapues
  for (const [x, ph] of [[-38, 1], [-14, -1], [14, 1], [38, -1]]) limb([x, -30, x + st * ph * 0.5, -16, x + st * ph, -3], 13, ph > 0 ? '#5a2a44' : shade('#5a2a44'));
  // tentacule arrière
  X.lineCap = 'round';
  X.strokeStyle = OUT; X.lineWidth = 14;
  X.beginPath(); X.moveTo(-42, -96); X.quadraticCurveTo(-72, -70, -62, -34 + Math.sin(P.time * 2) * 6); X.stroke();
  X.strokeStyle = C('#6a2a4a'); X.lineWidth = 11; X.stroke();
  // pics d'os
  for (const [x, y, h, a] of [[-40, -128, 26, -0.5], [-16, -142, 30, -0.2], [10, -146, 24, 0.1], [-56, -108, 20, -0.8]]) {
    X.save(); X.translate(x, y); X.rotate(a); poly([-5, 6, 0, -h, 5, 6], '#d8cfae'); X.restore();
  }
  // masse principale
  blob(0, -82, 58, 62, '#7a3a5a');
  blob(-26, -112, 30, 28, '#8a4466');
  blob(24, -66, 30, 30, '#8e4a6a');
  blob(-20, -60, 24, 20, '#6a2e4a', 0, false);
  blob(-30, -116, 14, 10, '#a05478', 0, false); blob(10, -98, 18, 10, '#9a4c70', 0, false);   // reflets
  X.strokeStyle = C('#4a1a34'); X.lineWidth = 2;
  X.beginPath(); X.moveTo(-40, -70); X.quadraticCurveTo(-30, -50, -42, -36); X.moveTo(20, -50); X.quadraticCurveTo(30, -40, 22, -28); X.stroke();   // veines
  glowEye(-12, -96, 2.2, '#f0e040'); glowEye(-4, -92, 1.6, '#f0e040');               // yeux supplémentaires
  // côtes apparentes
  X.strokeStyle = C('#d8cfae'); X.lineWidth = 3;
  for (let i = 0; i < 3; i++) { X.beginPath(); X.arc(-24, -78 + i * 9, 16, -0.4, 0.9); X.stroke(); }
  // pustules
  const pulse = 0.6 + Math.sin(P.time * 2.5) * 0.3;
  for (const [x, y, r] of [[-32, -70, 7], [-6, -128, 5], [34, -100, 6], [-44, -100, 4.5], [8, -44, 5]]) {
    if (P.flash || P.dark) dot(x, y, r, '#9d6bb0');
    else { const a0 = X.globalAlpha; X.globalAlpha = a0 * pulse; glowEye(x, y, r, '#9be22b'); X.globalAlpha = a0; }
  }
  // têtes
  blob(42, -122, 15, 13, '#9a5070');
  blob(18, -144, 10, 9, '#9a5070');
  glowEye(48, -127, 2.6, '#f0e040'); glowEye(40, -126, 2, '#f0e040'); glowEye(21, -147, 1.8, '#f0e040');
  const open = P.atk > 0 ? Math.max(0.2, s) : 0.2 + Math.sin(P.time * 2) * 0.1;
  blob(50, -114, 8, 3 + open * 7, '#2a0e22');
  for (let i = 0; i < 3; i++) poly([45 + i * 4, -114 - open * 5, 47 + i * 4, -110, 49 + i * 4, -114 - open * 5], '#e8e0c0', false);
  // tentacule-bras qui frappe le sol
  const a = P.atk > 0 ? (s < 0 ? -1.2 + s * 0.4 : -1.6 + (s + 1) * 1.3) : -0.3 + Math.sin(P.time * 1.6) * 0.15;
  const ex = 54 + Math.cos(a) * 34, ey = -64 + Math.sin(a) * 54;
  X.strokeStyle = OUT; X.lineWidth = 17;
  X.beginPath(); X.moveTo(30, -92); X.quadraticCurveTo(64, -92 + Math.sin(a) * 20, ex, ey); X.stroke();
  X.strokeStyle = C('#6a2a4a'); X.lineWidth = 14; X.stroke();
  X.strokeStyle = C('#8a4466'); X.lineWidth = 5; X.stroke();
  blob(ex, ey, 9, 9, '#5a2040');
}

// Rouilleur : petit rampant couvert de rouille, ventre-bombe qui rougeoie
function rouilleur() {
  const run = P.moving ? P.walk * 1.6 : P.time * 2;
  X.translate(0, P.moving ? -Math.abs(Math.sin(run)) * 2.5 : 0);
  const s1 = P.moving ? Math.sin(run) * 7 : 1.5;
  limb([-8, -12, -10 - s1, -2], 3.5, shade('#5a4038'));
  limb([8, -12, 10 + s1, -2], 3.5, shade('#5a4038'));
  // corps trapu + plaques rouillées
  blob(0, -17, 15, 11, '#6e5246');
  poly([-12, -22, -4, -30, 6, -29, 10, -22], '#8a4a2a');
  poly([-2, -30, 1, -37, 4, -30], '#a85a32');
  poly([-9, -27, -7, -34, -4, -28], '#a85a32');
  for (const [rx, ry] of [[-7, -20], [4, -24], [-2, -14]]) dot(rx, ry, 1.2, '#4a3028');   // trous de rouille
  if (P.moving && !P.dark && !P.flash) { X.fillStyle = 'rgba(80,70,60,0.35)'; X.beginPath(); X.arc(-14, -26, 3 + (P.walk % 1) * 2, 0, 7); X.fill(); }
  // ventre-bombe qui pulse
  const pulse = 0.5 + Math.sin(P.time * 9) * 0.5;
  if (!P.flash && !P.dark) {
    X.fillStyle = `rgba(255,120,30,${0.25 + 0.25 * pulse})`;
    X.beginPath(); X.arc(2, -11, 13, 0, Math.PI * 2); X.fill();
  }
  limb([-6, -12, -8 + s1, -2], 3.5, '#6e5246');
  limb([10, -12, 12 - s1, -2], 3.5, '#6e5246');
  blob(2, -11, 8, 6.5, P.flash ? '#ffffff' : pulse > 0.5 ? '#ff9a3a' : '#e0702a');
  // tête
  blob(14, -21, 6.5, 5.5, '#8a6a5a');
  glowEye(17, -23, 1.6, '#f0e040');
  poly([18, -19, 23, -18, 18, -17], '#e8e0c0', false);
}

// Charognard ailé : vautour mutant aux ailes de peau, crâne déplumé
function wing(flap, color, dx) {
  const tipY = -26 - flap * 26;
  poly([dx + 2, -24, dx - 18, -30 - flap * 14, dx - 42, tipY, dx - 30, -16 + flap * 6, dx - 16, -14, dx - 4, -16], color);
  X.strokeStyle = C('#2a1a22'); X.lineWidth = 1.5;
  X.beginPath(); X.moveTo(dx + 2, -24); X.lineTo(dx - 18, -30 - flap * 14); X.lineTo(dx - 42, tipY); X.stroke();
  X.beginPath(); X.moveTo(dx - 18, -30 - flap * 14); X.lineTo(dx - 26, -15); X.stroke();
}
function charognard() {
  const flap = Math.sin(P.moving ? P.walk * 2.4 : P.time * 9);
  const s = swing();
  X.translate(s > 0 ? s * 10 : s * 3, flap * 2);
  wing(flap * 0.8, '#4a3040', 6);                        // aile du fond
  poly([-14, -20, -26, -26, -24, -16, -14, -16], '#3e2834');   // queue
  blob(0, -20, 14, 8.5, '#5e3e4e', -0.15);               // corps
  blob(-2, -17, 8, 4, '#7a5262', -0.15, false);
  for (let k = 0; k < 4; k++) poly([6 + k * 2, -24, 8 + k * 2, -30 + (k % 2) * 2, 10 + k * 2, -23], '#3a2832');   // collerette de plumes
  // pattes griffues (en avant quand il attaque)
  const reach = s > 0 ? s * 8 : 0;
  limb([2, -14, 4 + reach, -4], 2.5, '#8a7a5a');
  limb([-4, -14, -3 + reach * 0.6, -4], 2.5, '#7a6a4a');
  for (const cx of [4 + reach, -3 + reach * 0.6]) {
    line(cx, -4, cx + 4, -1, 1.3, '#e8e0c0'); line(cx, -4, cx - 2, -1, 1.3, '#e8e0c0');
  }
  // cou + crâne déplumé + bec
  limb([10, -22, 15, -27], 4, '#8a6a6a');
  blob(18, -29, 7, 6, '#c8b8a0');
  poly([23, -30, 34, -26, 23, -25], '#d8c070');
  glowEye(19, -31, 1.6, '#ff5030');
  wing(flap, '#5e3a4c', 0);                              // aile du premier plan
}

// =====================================================================
//  COMMANDANTS (plus grands, écharpe jaune flottante)
// =====================================================================
function scarf(x, y) {
  const w = P.moving ? Math.sin(P.walk * 2) * 3 : Math.sin(P.time * 3) * 2;
  poly([x, y, x - 16, y + 2 + w, x - 24, y + 6 + w * 1.5, x - 14, y + 7, x, y + 5], '#f2c230');
}

// Sergent Kane : colosse en gilet pare-balles, béret, fusil à pompe
function hero_kane() {
  X.scale(1.12, 1.12);
  const recoil = P.atk > 0 ? -4 * P.atk : 0;
  X.translate(0, -bobY(2));
  legs(-27, 27, 7.5, '#3e4434', '#1e1a16', 10, 11);
  X.translate(recoil, 0);
  limb([-4, -50, -2, -38, 6, -42], 6, shade('#6a7050'));
  poly([-11, -26, -12, -54, 12, -55, 12, -26], '#5a6248');                 // torse
  rr(-11, -52, 23, 22, 3, '#3a4038');                                       // gilet pare-balles
  X.fillStyle = C('#2a2e28'); X.fillRect(-9, -46, 19, 2); X.fillRect(-9, -40, 19, 2);
  rr(-12, -29, 24, 4, 1, '#3b2c1e');
  scarf(-6, -55);
  blob(1, -63, 8.5, 9, '#c88a62');                                          // tête
  poly([-9, -66, -7, -73, 8, -74, 11, -67], '#6a2a2a');                    // béret
  dot(6, -64, 1.4, '#1a1008');
  line(2, -58, 8, -58, 2, '#5a3a2a');                                       // barbe
  blob(-5, -62, 1.7, 2.4, '#b07a56');                                               // oreille
  poly([8.5, -64, 11.5, -61.5, 8.5, -60.5], '#b87c56', false);                      // nez
  line(-2, -67, 0.5, -62, 1, '#8a4a3a');                                            // cicatrice
  dot(-4, -70, 1.8, '#f2c230');                                                     // insigne du béret
  rr(-9, -38, 5, 6, 1, '#4a5040'); rr(4, -38, 5, 6, 1, '#4a5040');                  // poches du gilet
  line(0, -55, 1, -48, 0.8, '#b0b0a8'); dot(1, -47.5, 1.2, '#c8c8c0');              // plaque d'identité
  // fusil à pompe
  limb([-6, -43, 12, -45], 6, '#5a3a24');
  limb([10, -45, 34, -46], 5, '#2a2a2c');
  limb([18, -42, 28, -42], 4, '#4a3426');
  limb([6, -50, 14, -42, 20, -43], 6, '#5a6248');
  if (P.atk > 0.6 && !P.dark) {
    const r = 14 * (P.atk - 0.5) * 2;
    poly([35, -46, 35 + r, -54, 35 + r * 1.8, -46, 35 + r, -38], '#fff3b0', false);
  }
}

// Mécano Rosa : salopette, lunettes de soudure, clé dans le dos, lance-grenades à barillet
function hero_rosa() {
  X.scale(1.1, 1.1);
  const recoil = P.atk > 0 ? -3 * P.atk : 0;
  X.translate(0, -bobY(1.8));
  legs(-25, 25, 6.5, '#3e5a70', '#2a1e16', 9, 10);
  limb([-14, -54, -22, -24], 4, '#8a8a8e');                                 // grande clé dans le dos
  rr(-26, -28, 9, 6, 2, '#8a8a8e');
  X.translate(recoil, 0);
  limb([-3, -48, 0, -36, 6, -38], 5, shade('#4a6a84'));
  poly([-10, -24, -10, -50, 10, -51, 10, -24], '#4a6a84');                 // salopette
  rr(-7, -46, 14, 12, 2, '#3e5a70');
  dot(-4, -47, 1.5, '#c0c0b0'); dot(4, -47, 1.5, '#c0c0b0');
  scarf(-5, -52);
  blob(1, -59, 7.5, 8, '#d8a07a');
  poly([-8, -60, -6, -70, 4, -72, 10, -64, 8, -60], '#7a3a22');            // cheveux roux
  rr(-2, -64, 12, 5, 2, '#2a2a2a'); dot(4, -62, 2, '#5ab8d8'); dot(8, -62, 1.6, '#5ab8d8');   // lunettes de soudure
  line(-8, -63, -2, -62.5, 1.4, '#2a2a2a');                                         // sangle des lunettes
  for (const [fx, fy] of [[5, -57.5], [7, -58], [6, -56.5]]) dot(fx, fy, 0.6, '#a86a4a');   // taches de rousseur
  blob(-3, -32, 3, 2, '#2e3e4a', 0, false); blob(5, -40, 2.4, 1.8, '#2e3e4a', 0, false);   // taches d'huile
  rr(-11, -28, 22, 3.5, 1, '#5a3a24');                                              // ceinture à outils
  rr(-9, -27, 3, 7, 1, '#8a8a8e'); rr(6, -27, 2.5, 6, 1, '#c09a2a');               // tournevis, mètre
  // lance-grenades
  limb([-4, -40, 10, -42], 6, '#4a3626');
  blob(14, -42, 7, 7, '#3a3a3e');                                           // barillet
  limb([18, -43, 34, -45], 6, '#2e2e30');
  limb([6, -48, 12, -40, 18, -41], 5, '#4a6a84');
}

// Doc Vasquez : long manteau clair, brassard à croix rouge, fusil de précision
function hero_vasquez() {
  X.scale(1.1, 1.1);
  const recoil = P.atk > 0 ? -4 * P.atk : 0;
  X.translate(0, -bobY(1.5));
  legs(-25, 25, 6, '#4a4a44', '#2a2018', 8.5, 10);
  X.translate(recoil, 0);
  const tail = P.moving ? Math.sin(P.walk * 2) * 2 : 0;
  poly([-9, -32, -15 - tail, -10, -2, -14, 9, -12, 9, -32], '#c8c0a8');   // pans du manteau
  limb([-3, -48, 2, -40, 8, -43], 5, shade('#d8d0b8'));
  poly([-9, -28, -9, -52, 9, -53, 9, -28], '#d8d0b8');
  rr(-9, -33, 18, 3, 1, '#5a4a38', false);
  scarf(-5, -54);
  blob(1, -60, 7.5, 8, '#b07a5a');
  poly([-8, -62, -7, -69, 7, -70, 9, -63], '#2a2a2a');                     // cheveux
  dot(5, -61, 1.4, '#1a1008');
  blob(-3, -59, 1.5, 2.2, '#9a6a4a');                                               // oreille
  poly([7.5, -61, 10, -59, 7.5, -58], '#a06e50', false);                            // nez
  line(-6, -66, 4, -68, 1.2, '#5a5a5a');                                            // mèche grise
  rr(-14, -38, 8, 9, 2, '#7a2a22');                                                 // trousse de soins
  if (!P.flash && !P.dark) { X.fillStyle = '#ffffff'; X.fillRect(-11, -36, 2, 5); X.fillRect(-12.5, -34.5, 5, 2); }
  for (const by of [-48, -42, -36]) dot(3, by, 0.9, '#8a8270');                    // boutons du manteau
  // fusil de précision (long)
  limb([-8, -42, 14, -45], 5, '#4a3626');
  limb([12, -45, 50, -47], 3.5, '#1e1e20');
  rr(14, -52, 16, 5, 2, '#141414');
  limb([5, -50, 14, -42, 24, -45], 5, '#d8d0b8');
  if (!P.flash && !P.dark) {                                                // brassard à croix rouge
    X.fillStyle = '#ffffff'; X.fillRect(5, -50, 6, 6);
    X.fillStyle = '#c8382a'; X.fillRect(7, -49.5, 2, 5); X.fillRect(5.5, -48, 5, 2);
  }
  if (P.atk > 0.65 && !P.dark) {
    const r = 12 * (P.atk - 0.55) * 2.2;
    poly([51, -47, 51 + r, -52, 51 + r * 2, -47, 51 + r, -42], '#fff6c0', false);
  }
}

// Tourelle de campagne : mitrailleuse sur trépied derrière des sacs de sable
function tourelleCampagne() {
  for (let i = 0; i < 3; i++) blob(-8 + i * 12, -6, 9, 6.5, '#a8946a');
  for (let i = 0; i < 2; i++) blob(-2 + i * 12, -16, 9, 6.5, '#b4a078');
  limb([-6, -18, 4, -32, 12, -18], 3, '#3a3a3e');
  rr(-4, -40, 16, 12, 3, '#4a5048');
  limb([10, -34, 36, -35], 4.5, '#2b2b2e');
  rr(4, -48, 5, 22, 1, '#5e6a70');
  X.fillStyle = C('#f2c230'); X.fillRect(4, -38, 5, 3);
  X.setLineDash([1.6, 1.4]); line(8, -30, 2, -14, 2.4, '#d8b040'); X.setLineDash([]);   // bande de munitions
  X.strokeStyle = C('#8a7650'); X.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) { X.beginPath(); X.moveTo(-14 + i * 12, -6); X.lineTo(-2 + i * 12, -6); X.stroke(); }   // coutures des sacs
  if (P.atk > 0.6 && !P.dark) poly([37, -35, 44, -40, 50, -35, 44, -30], '#fff3b0', false);
}

// =====================================================================
//  CHAPITRE 2
// =====================================================================

// Lance-roquettes : casque de chantier, tube sur l'épaule, sac de roquettes
function lanceRoquettes() {
  const recoil = P.atk > 0 ? -5 * P.atk : 0;
  X.translate(0, -bobY(1.5));
  legs(-24, 24, 6, '#4a4a38', '#2b241c', 8.5);
  X.translate(recoil, 0);
  // sac de roquettes dans le dos
  rr(-18, -54, 10, 26, 3, '#5a5a3a');
  for (let i = 0; i < 2; i++) poly([-16 + i * 5, -54, -14 + i * 5, -64, -12 + i * 5, -54], '#c0442e');
  limb([-3, -46, 4, -40, 10, -44], 5, shade('#6a7046'));
  // torse : gilet orange de chantier
  poly([-9, -26, -9, -50, 9, -51, 9, -26], '#6a7046');
  poly([-8, -48, 8, -49, 8, -34, -8, -33], '#d0702a');
  X.fillStyle = C('#f2e6a0'); X.fillRect(-8, -42, 16, 2.5);
  rr(-9, -30, 18, 3, 1, '#3b2c1e', false);
  // tête + casque jaune
  blob(1, -58, 7, 7.5, '#c98e66');
  dot(5, -59, 1.3, '#1a1008');
  poly([-8, -60, -7, -68, 2, -71, 9, -68, 10, -61], '#e0b030');
  rr(-10, -62, 22, 3, 1.5, '#c8981e');
  blob(-3, -58, 1.5, 2.2, '#b07a56');                                               // oreille
  poly([7.5, -60, 10, -58, 7.5, -57], '#b07a56', false);                            // nez
  X.fillStyle = C('#3a2a1a'); X.fillRect(-4, -65, 10, 1.2);                        // jugulaire
  // tube lance-roquettes sur l'épaule
  limb([-16, -54, 30, -58], 8, '#4e5a3a');
  rr(24, -63, 8, 10, 2, '#2e2e2a');                 // bouche
  rr(-20, -60, 6, 12, 2, '#2e2e2a');               // arrière du tube
  rr(4, -66, 8, 5, 1.5, '#1a1a1a');                // viseur
  if (P.atk < 0.4 && !P.dark) poly([31, -61, 38, -58, 31, -55], '#c0442e');   // ogive prête
  limb([5, -47, 12, -52], 5, '#6a7046');
  dot(12, -53, 2.6, '#c98e66');
  // souffle arrière + flamme avant au tir
  if (P.atk > 0.6 && !P.dark) {
    const r = 12 * (P.atk - 0.5) * 2;
    poly([33, -58, 33 + r, -64, 33 + r * 1.8, -58, 33 + r, -52], '#fff3b0', false);
    X.fillStyle = `rgba(200,190,170,${0.5 * P.atk})`;
    X.beginPath(); X.arc(-26 - r, -55, 6 + r * 0.6, 0, Math.PI * 2); X.fill();
  }
}

// Mitrailleur lourd : colosse en treillis, ceinture de balles, mitrailleuse à canons
function mitrailleur() {
  const shake = P.atk > 0 ? Math.sin(P.time * 80) * 1.2 : 0;
  X.translate(0, -bobY(1.2));
  legs(-26, 26, 7, '#3e4636', '#2b241c', 8, 11);
  X.translate(shake * 0.5, 0);
  limb([-3, -48, 4, -40, 10, -42], 6, shade('#56603e'));
  // torse massif
  poly([-12, -26, -12, -54, 12, -55, 12, -26], '#56603e');
  poly([-12, -54, -6, -54, -6, -26, -12, -26], '#46502e', false);
  // ceinture de munitions en diagonale
  X.save(); X.beginPath(); X.moveTo(-12, -52); X.lineTo(12, -30); X.lineWidth = 5; X.strokeStyle = C('#6a4a2a'); X.stroke(); X.restore();
  X.fillStyle = C('#d8b040');
  for (let i = 0; i < 5; i++) X.fillRect(-10 + i * 4.6, -50 + i * 4.2, 2, 4);
  rr(-12, -31, 24, 4, 1, '#3b2c1e');
  // tête : bandana + lunettes
  blob(2, -62, 8, 8, '#b98260');
  poly([-6, -66, 9, -67, 10, -63, -6, -62], '#8a2a22');
  rr(3, -63, 8, 3.5, 1.5, '#2a2a2a');
  // mitrailleuse (canons multiples)
  limb([-8, -40, 14, -42], 9, '#3a3a3c');
  rr(12, -47, 14, 10, 2, '#2a2a2c');
  for (let i = 0; i < 3; i++) limb([24, -45 + i * 3, 42 + shake, -45 + i * 3], 1.8, '#1e1e20');
  rr(-4, -36, 10, 8, 2, '#5a5a4a');                // boîte de munitions
  X.setLineDash([1.8, 1.2]); line(1, -36, 14, -41, 2.4, '#d8b040'); X.setLineDash([]);   // bande de munitions
  limb([6, -49, 14, -40, 20, -43], 6, '#56603e');
  dot(20, -43, 3, '#b98260');
  if (P.atk > 0.3 && !P.dark && Math.sin(P.time * 60) > 0) {
    poly([43, -42, 49, -47, 55, -42, 49, -37], '#fff3b0', false);
  }
}

// Carapace : mutant à quatre pattes couvert de plaques d'os, tête-bélier
function carapace() {
  const s = swing();
  const lunge = s > 0 ? s * 8 : s * 2;
  X.translate(lunge, -bobY(1.5));
  const st = P.moving ? Math.sin(P.walk) * 6 : 0;
  for (const [x, ph] of [[-22, 1], [-8, -1], [10, 1], [22, -1]]) limb([x, -22, x + st * ph * 0.5, -10, x + st * ph, -3], 6, ph > 0 ? '#6a5a48' : shade('#6a5a48'));
  // ventre
  blob(0, -26, 30, 14, '#7a6450');
  // plaques de carapace qui se chevauchent
  for (let i = 0; i < 4; i++) {
    poly([-30 + i * 14, -26, -26 + i * 14, -46 - (i % 2) * 4, -12 + i * 14, -48 - (i % 2) * 4, -8 + i * 14, -26], i % 2 ? '#a89a7a' : '#988a6c');
  }
  X.strokeStyle = C('#5a4c3c'); X.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) { X.beginPath(); X.moveTo(-24 + i * 14, -44); X.lineTo(-20 + i * 14, -30); X.stroke(); }
  // tête cornue
  blob(30, -30, 11, 9, '#8a7458');
  poly([30, -38, 46, -44, 38, -32], '#d8cfae');      // corne
  poly([34, -26, 44, -24, 36, -21], '#e8e0c0', false);
  glowEye(32, -33, 1.8, '#f0a030');
  X.strokeStyle = C('#4a3c2c'); X.lineWidth = 1;
  X.beginPath(); X.moveTo(-18, -44); X.lineTo(-14, -38); X.moveTo(6, -46); X.lineTo(9, -40); X.stroke();   // fissures
  blob(-20, -32, 4, 2, '#5a6a3a', 0, false); blob(12, -30, 3, 1.6, '#5a6a3a', 0, false);   // mousse
}

// Couveuse : sac de chair gonflé de larves qui bougent, pattes grêles
function couveuse() {
  X.translate(0, -bobY(1));
  const st = P.moving ? Math.sin(P.walk) * 5 : 0;
  limb([-14, -16, -18 - st, -2], 3.5, shade('#8a5060'));
  limb([12, -16, 14 + st, -2], 3.5, shade('#8a5060'));
  // sac translucide
  const pulse = Math.sin(P.time * 3) * 1.5;
  blob(-2, -32, 26 + pulse * 0.4, 20 + pulse * 0.3, '#b0707e');
  if (!P.flash && !P.dark) {
    X.fillStyle = 'rgba(255,220,200,0.25)';
    X.beginPath(); X.ellipse(-4, -34, 18, 13, 0, 0, Math.PI * 2); X.fill();
    // larves à l'intérieur
    for (let i = 0; i < 4; i++) {
      const a = P.time * 1.4 + i * 1.6;
      X.fillStyle = 'rgba(90,30,50,0.55)';
      X.beginPath(); X.ellipse(-4 + Math.cos(a) * 10, -34 + Math.sin(a) * 7, 4, 2.5, a, 0, Math.PI * 2); X.fill();
    }
  }
  X.strokeStyle = C('#7a3a4a'); X.lineWidth = 1.5;
  X.beginPath(); X.moveTo(-20, -40); X.quadraticCurveTo(-8, -50, 6, -44); X.stroke();
  limb([-8, -16, -10 + st, -2], 3.5, '#8a5060');
  limb([6, -16, 8 - st, -2], 3.5, '#8a5060');
  // petite tête
  blob(22, -30, 7, 6, '#9a6070');
  glowEye(25, -32, 1.6, '#f0e040');
  poly([27, -28, 32, -27, 27, -25], '#2a0e1a', false);
}

// Larve : petit ver rampant rapide
function larve() {
  const w = P.moving ? Math.sin(P.walk * 3) : Math.sin(P.time * 4);
  const s = swing();
  X.translate(s > 0 ? s * 6 : 0, 0);
  for (let i = 0; i < 4; i++) blob(-10 + i * 6, -6 - Math.abs(Math.sin(w + i)) * 3, 5 - i * 0.3, 4.5, i % 2 ? '#9a5a6a' : '#a8687a', 0, i === 3);
  blob(13, -8, 5, 4.5, '#b07888');
  glowEye(15, -10, 1.2, '#f0e040');
  for (let i = 0; i < 2; i++) poly([16 + i * 2, -7, 17 + i * 2, -4, 18 + i * 2, -7], '#e8e0c0', false);
}

// Hurleur : mutant maigre et voûté, gorge démesurée qui pulse
function hurleur() {
  const q = P.atk > 0 ? 1 - P.atk : 0;
  X.translate(0, -bobY(2));
  legs(-30, 30, 5, '#5a4a6a', '#3a2a44', 8, 8);
  limb([-2, -56, -10, -42, -6, -30], 3.5, shade('#7a6a8a'));
  // torse maigre, côtes
  blob(0, -46, 10, 18, '#7a6a8a', 0.1);
  X.strokeStyle = C('#5a4a6a'); X.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { X.beginPath(); X.arc(2, -48 + i * 6, 6, -0.6, 0.8); X.stroke(); }
  // gorge-sac qui gonfle
  const swell = 5 + Math.sin(P.time * 4) * 1.5 + (P.atk > 0 ? 5 * (1 - q) : 0);
  blob(10, -60, 6 + swell * 0.6, 5 + swell * 0.5, '#b06aa0');
  // tête allongée, bouche grande ouverte
  blob(6, -72, 8, 9, '#8a7a9a');
  glowEye(9, -76, 1.8, '#ff70ff');
  for (const [vx, vy] of [[-2, -50], [3, -42]]) blob(vx, vy, 1.6, 1.2, '#5a4a6a', 0, false);   // côtes saillantes
  const open = P.atk > 0 ? 6 : 3 + Math.sin(P.time * 4) * 1;
  blob(14, -69, 4, open * 0.8, '#2a0e22');
  limb([4, -56, 14, -48, 20, -54], 3.5, '#7a6a8a');
  // ondes du cri (visibles au tir)
  if (P.atk > 0.2 && !P.dark && !P.flash) {
    X.strokeStyle = `rgba(220,120,255,${0.7 * P.atk})`; X.lineWidth = 2;
    for (let i = 0; i < 3; i++) { X.beginPath(); X.arc(18, -69, 8 + i * 7 + q * 10, -0.7, 0.7); X.stroke(); }
  }
}

// Épineux : dos hérissé de longues épines d'os qu'il projette
function epineux() {
  const q = P.atk > 0 ? 1 - P.atk : 0;
  X.translate(0, -bobY(1.5));
  legs(-22, 22, 6.5, '#5a6a3a', '#3a4426', 7, 9);
  // épines dans le dos (se dressent avant le tir)
  const rise = P.atk > 0 ? Math.min(1, q * 3) * 6 : 0;
  for (let i = 0; i < 6; i++) {
    X.save(); X.translate(-14 + i * 4, -40 - i * 3); X.rotate(-1.1 + i * 0.12);
    poly([-2, 0, 0, -22 - rise - (i % 2) * 6, 2, 0], '#e8dcb8'); X.restore();
  }
  // corps voûté
  blob(0, -36, 16, 14, '#6e7e46', 0.3);
  blob(4, -32, 8, 7, '#86965a', 0, false);
  for (const [sx, sy] of [[-8, -40], [-2, -44], [6, -40], [-6, -30]]) dot(sx, sy, 1.3, '#4e5c30');   // pustules
  limb([8, -38, 16, -28], 4, '#6e7e46');
  // tête plate
  blob(16, -46, 9, 7, '#7c8c52');
  glowEye(20, -48, 1.8, '#f0e040');
  poly([22, -44, 28, -43, 22, -41], '#2a1a0e', false);
}

// Matriarche : reine-pondeuse colossale, abdomen énorme, pattes d'araignée
function matriarche() {
  const s = swing();
  X.translate(0, -bobY(2));
  const st = P.moving ? Math.sin(P.walk) * 9 : 0;
  // pattes arrière
  for (const [x, ph] of [[-52, 1], [-30, -1]]) limb([x, -50, x - 14, -30, x + st * ph - 10, -3], 7, shade('#6a2a3a'));
  // abdomen-couvée
  blob(-36, -62, 40, 32, '#8a3a4c');
  if (!P.flash && !P.dark) {
    for (let i = 0; i < 6; i++) {
      const pulse = 0.4 + Math.sin(P.time * 3 + i) * 0.25;
      X.fillStyle = `rgba(255,190,160,${pulse})`;
      X.beginPath(); X.ellipse(-56 + (i % 3) * 18, -70 + Math.floor(i / 3) * 18, 6, 4.5, 0, 0, Math.PI * 2); X.fill();
    }
  }
  X.strokeStyle = C('#5a1e2e'); X.lineWidth = 2;
  for (let i = 0; i < 3; i++) { X.beginPath(); X.arc(-36, -62, 22 + i * 7, -2.4, -0.8); X.stroke(); }
  // thorax dressé
  blob(10, -84, 22, 30, '#9a4458', -0.2);
  // pattes avant
  for (const [x, ph] of [[0, -1], [18, 1]]) limb([x, -66, x + 14, -38, x + 6 + st * ph, -3], 7, '#6a2a3a');
  // tête couronnée
  blob(24, -118, 14, 13, '#a85068');
  for (let i = 0; i < 5; i++) { X.save(); X.translate(16 + i * 5, -128); X.rotate(-0.5 + i * 0.25); poly([-3, 0, 0, -16, 3, 0], '#d8cfae'); X.restore(); }
  glowEye(30, -120, 2.4, '#f0e040'); glowEye(24, -122, 1.8, '#f0e040');
  const open = P.atk > 0 ? Math.max(0.2, s) : 0.2;
  blob(34, -110, 6, 2 + open * 6, '#2a0e22');
  // griffe en faux
  const a = P.atk > 0 ? (s < 0 ? -1.4 + s * 0.4 : -1.8 + (s + 1) * 1.5) : -0.4 + Math.sin(P.time * 1.5) * 0.1;
  const ex = 30 + Math.cos(a) * 46, ey = -92 + Math.sin(a) * 46;
  limb([22, -96, ex, ey], 7, '#6a2a3a');
  X.save(); X.translate(ex, ey); X.rotate(a + 1.3); poly([0, -3, 26, 2, 0, 5], '#d8cfae'); X.restore();
}

// Le Fléau : titan de chair et de métal, cœur qui bat à l'air libre
function fleau() {
  const s = swing();
  X.translate(0, -bobY(3));
  const st = P.moving ? Math.sin(P.walk) * 10 : 0;
  // jambes colossales
  limb([-24, -70, -30, -36, -26 + st, -4], 20, shade('#4a2236'));
  limb([20, -70, 26, -36, 22 - st, -4], 20, '#4a2236');
  // tentacules dorsaux
  for (let i = 0; i < 3; i++) {
    const w = Math.sin(P.time * 2 + i) * 10;
    X.lineCap = 'round'; X.strokeStyle = OUT; X.lineWidth = 11;
    X.beginPath(); X.moveTo(-30 + i * 14, -150); X.quadraticCurveTo(-70 + i * 10, -190 + w, -90 + i * 20, -150 + w); X.stroke();
    X.strokeStyle = C('#5a2040'); X.lineWidth = 8; X.stroke();
  }
  // torse cuirassé de ferraille
  blob(0, -116, 52, 54, '#6a2e48');
  poly([-40, -140, -10, -164, 30, -156, 44, -120, 20, -96, -30, -100], '#5a5a5e');
  X.fillStyle = C('#9a9a8a');
  for (const [rx, ry] of [[-30, -136], [-6, -152], [24, -146], [30, -118], [-22, -110]]) X.fillRect(rx, ry, 3, 3);
  // cœur à vif
  const beat = 1 + Math.max(0, Math.sin(P.time * 5)) * 0.15;
  if (P.flash || P.dark) blob(4, -124, 13, 15, '#a03050');
  else { blob(4, -124, 13 * beat, 15 * beat, '#d0405a'); glowEye(4, -124, 5, '#ff8a6a'); }
  // tête de crâne cornu
  blob(34, -170, 16, 15, '#d8cfae');
  for (const [dx, a] of [[-10, -0.8], [12, 0.6]]) { X.save(); X.translate(34 + dx, -182); X.rotate(a); poly([-4, 0, 0, -26, 4, 0], '#2a1a14'); X.restore(); }
  glowEye(40, -172, 3, '#ff3020'); glowEye(30, -172, 2.4, '#ff3020');
  rr(30, -162, 18, 6, 2, '#2a0e12');
  // bras-marteau
  const a = P.atk > 0 ? (s < 0 ? -1.3 + s * 0.4 : -1.7 + (s + 1) * 1.5) : -0.2 + Math.sin(P.time * 1.4) * 0.12;
  const ex = 40 + Math.cos(a) * 56, ey = -120 + Math.sin(a) * 56;
  limb([36, -132, ex, ey], 16, '#6a2e48');
  X.save(); X.translate(ex, ey); X.rotate(a);
  rr(-4, -16, 34, 32, 4, '#4a4a4e');
  for (let i = 0; i < 3; i++) poly([30, -12 + i * 10, 40, -8 + i * 10, 30, -4 + i * 10], '#9a9a8a');
  X.restore();
}

const DRAWERS = { pillard, tireur, motard, lanceFlammes, blinde, goule, cracheur, chien, brute, abomination, rouilleur, charognard,
  hero_kane, hero_rosa, hero_vasquez, tourelleCampagne,
  lanceRoquettes, mitrailleur, carapace, couveuse, larve, hurleur, epineux, matriarche, fleau };

// Style de mort de chaque unité : 'fall' (tombe), 'melt' (s'affaisse), 'wreck' (épave)
export const DEATH_STYLE = {
  pillard: 'fall', tireur: 'fall', motard: 'fall', lanceFlammes: 'fall', blinde: 'wreck',
  goule: 'melt', cracheur: 'melt', chien: 'fall', brute: 'fall', abomination: 'melt',
  rouilleur: 'melt', charognard: 'fall',
  lanceRoquettes: 'fall', mitrailleur: 'fall', carapace: 'fall', couveuse: 'melt', larve: 'melt',
  hurleur: 'fall', epineux: 'melt', matriarche: 'melt', fleau: 'melt',
};

export function drawSprite(ctx, defId, pose) {
  const fn = DRAWERS[defId];
  if (!fn) return;
  X = ctx; P = pose;
  ctx.lineJoin = 'round';
  fn();
}

// Icône d'un bouton : même dessin, immobile, ajusté dans une case de taille `size`
const IDLE = { walk: 0, atk: 0, flash: false, moving: false, time: 0, dark: false };
export function drawIcon(ctx, defId, cx, cy, size, dim = false) {
  const def = CONFIG.units[defId];
  const h = def ? def.bodyHeight : 68;
  const w = def ? def.bodyWidth + 24 : 50;
  const k = Math.min(size / (h + 8), size / w);
  ctx.save();
  ctx.translate(cx - (defId === 'blinde' ? 6 * k : 0), cy + (h * k) / 2);
  ctx.scale(k, k);
  if (dim) ctx.globalAlpha = 0.45;
  drawSprite(ctx, defId, IDLE);
  ctx.restore();
}

// Icônes des sorts et de l'amélioration du revenu
export function drawSpellIcon(ctx, id, cx, cy, size, dim = false) {
  X = ctx; P = IDLE;
  ctx.save();
  ctx.translate(cx, cy);
  const k = size / 60;
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  if (dim) ctx.globalAlpha = 0.45;
  if (id === 'mortar') {
    poly([0, 22, -24, 14, -14, 6, -26, -2, -8, -2, 0, -14, 8, -2, 26, -2, 14, 6, 24, 14], '#ff9a2b');
    poly([0, 14, -12, 9, -6, 4, -12, 0, -3, 0, 0, -6, 3, 0, 12, 0, 6, 4, 12, 9], '#ffe08a', false);
    ctx.save(); ctx.translate(-4, -12); ctx.rotate(0.5);
    blob(0, -6, 7, 14, '#4a4a40');
    poly([-7, 6, 7, 6, 5, 14, -5, 14], '#2e2e28');
    blob(0, -14, 4, 5, '#c0a040');
    ctx.restore();
  } else if (id === 'heal') {
    rr(-22, -16, 44, 34, 6, '#e8e2d0');
    rr(-8, -22, 16, 7, 2, '#6a5a48');
    X.fillStyle = '#c8382a'; X.fillRect(-4, -10, 8, 22); X.fillRect(-11, -3, 22, 8);
  } else if (id === 'income') {
    X.fillStyle = '#c9a040';
    X.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const r = i % 2 === 0 ? 20 : 15;
      X.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    X.closePath(); fillStroke();
    blob(0, 0, 6, 6, '#3a2b20');
    poly([14, -2, 26, -18, 38, -2, 30, -2, 30, 14, 22, 14, 22, -2], '#7ee05a');
  } else if (id === 'sound' || id === 'mute') {
    poly([-16, -6, -6, -6, 6, -16, 6, 16, -6, 6, -16, 6], '#f3e3c3');
    X.strokeStyle = '#f3e3c3'; X.lineWidth = 3; X.lineCap = 'round';
    if (id === 'sound') {
      X.beginPath(); X.arc(8, 0, 8, -0.8, 0.8); X.stroke();
      X.beginPath(); X.arc(8, 0, 15, -0.8, 0.8); X.stroke();
    } else {
      X.strokeStyle = '#d9482b';
      X.beginPath(); X.moveTo(12, -8); X.lineTo(26, 8); X.moveTo(26, -8); X.lineTo(12, 8); X.stroke();
    }
  } else if (id === 'walls') {
    // tôles + sacs de sable
    rr(-24, -20, 14, 30, 2, '#7a5a3c'); rr(-10, -24, 14, 34, 2, '#6a6a62'); rr(4, -18, 14, 28, 2, '#8a5030');
    for (let i = 0; i < 3; i++) blob(-14 + i * 14, 12, 8, 6, '#a8946a');
    rr(18, -30, 4, 40, 1, '#3b2f22'); poly([22, -30, 34, -26, 22, -22], '#f2c230');
  } else if (id === 'turret') {
    // mitrailleuse sur trépied
    limb([-10, 18, 0, 0, 10, 18], 3, '#3a3a3e');
    limb([0, 0, 0, 18], 3, '#3a3a3e');
    rr(-14, -10, 16, 14, 3, '#3a3a3e');
    rr(0, -6, 28, 6, 2, '#2b2b2e');
    poly([28, -3, 36, -9, 42, -3, 36, 3], '#ffd27a', false);
  } else if (id === 'fullscreen') {
    X.strokeStyle = '#f3e3c3'; X.lineWidth = 4; X.lineCap = 'round';
    X.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      X.moveTo(sx * 18, sy * 8); X.lineTo(sx * 18, sy * 18); X.lineTo(sx * 8, sy * 18);
    }
    X.stroke();
  }
  ctx.restore();
}
