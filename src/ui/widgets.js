// Petits éléments d'interface partagés (panneaux, boutons, étoiles).
// Style « signalétique de survivants » : plaques d'acier rivetées à coins coupés,
// peinture jaune écaillée pour les actions principales, lettrage au pochoir.

export const FONT = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const COL = {
  text: '#f3e3c3', dim: '#bda98a', yellow: '#f2c230',
  good: '#6bbf4a', bad: '#d9482b', dark: '#1d130c',
};

export function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, str, x, y, size, color = COL.text, align = 'left', baseline = 'alphabetic') {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// ---------- Plaques d'acier (panneaux, boutons) ----------
// Les plaques sont dessinées une fois puis mises en cache (même taille et même type = même image).
// kind : 'panel' (tôle sombre), 'steel' (bouton), 'paint' (bouton principal peint en jaune), 'off' (bouton inactif)
const PLATE_RES = 2;
const plateCache = new Map();

// Hasard reproductible : une plaque donnée a toujours les mêmes rayures
function seeded(n) {
  return () => { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; };
}

// Contour à coins coupés
export function chamferPath(c, x, y, w, h, k) {
  c.beginPath();
  c.moveTo(x + k, y); c.lineTo(x + w - k, y); c.lineTo(x + w, y + k); c.lineTo(x + w, y + h - k);
  c.lineTo(x + w - k, y + h); c.lineTo(x + k, y + h); c.lineTo(x, y + h - k); c.lineTo(x, y + k);
  c.closePath();
}

const PLATES = {
  panel: { top: '#544a40', bot: '#352c24', rust: 0.32, rivets: 'corners' },
  steel: { top: '#77706a', bot: '#4c4640', rust: 0.22, rivets: 'sides' },
  paint: { top: '#efbd36', bot: '#c58f1a', rust: 0, rivets: 'sides', chips: true },
  off: { top: '#4a4540', bot: '#35312c', rust: 0.15, rivets: 'sides' },
};

function makePlate(w, h, kind) {
  const P = PLATES[kind], R = PLATE_RES;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((w + 4) * R); cv.height = Math.ceil((h + 4) * R);
  const c = cv.getContext('2d');
  c.scale(R, R); c.translate(2, 2);
  const k = Math.max(5, Math.min(12, Math.min(w, h) / 5));
  const rnd = seeded(Math.round(w * 131 + h * 17 + kind.length * 7) % 2147483646 + 1);
  // fond
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, P.top); g.addColorStop(1, P.bot);
  chamferPath(c, 0, 0, w, h, k);
  c.fillStyle = g; c.fill();
  c.save(); chamferPath(c, 0, 0, w, h, k); c.clip();
  // métal brossé
  c.globalAlpha = kind === 'paint' ? 0.06 : 0.09;
  c.fillStyle = '#ffffff';
  for (let y = 2; y < h; y += 3) c.fillRect(0, y + rnd() * 1.5, w, 0.6);
  c.globalAlpha = 1;
  // rouille près des bords
  for (let i = 0; i < Math.round((w + h) / 60); i++) {
    if (!P.rust) break;
    const edge = rnd() < 0.5;
    const rx = edge ? (rnd() < 0.5 ? rnd() * 14 : w - rnd() * 14) : rnd() * w;
    const ry = edge ? rnd() * h : (rnd() < 0.5 ? rnd() * 8 : h - rnd() * 8);
    const rr = 4 + rnd() * 10;
    const rg = c.createRadialGradient(rx, ry, 0, rx, ry, rr);
    rg.addColorStop(0, `rgba(150,72,30,${P.rust})`); rg.addColorStop(1, 'rgba(150,72,30,0)');
    c.fillStyle = rg; c.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
  }
  // peinture écaillée : l'acier réapparaît aux bords
  if (P.chips) {
    c.fillStyle = '#5d5750';
    for (let i = 0; i < Math.round((w + h) / 45); i++) {
      const top = rnd() < 0.5;
      const cx = rnd() * w, cy = top ? (rnd() < 0.5 ? 0 : h) : rnd() * h;
      const px = top ? cx : (rnd() < 0.5 ? 0 : w);
      const s = 2 + rnd() * 5;
      c.beginPath(); c.moveTo(px - s, cy); c.lineTo(px + s * 0.4, cy - s * 0.8); c.lineTo(px + s, cy + s * 0.3); c.lineTo(px - s * 0.2, cy + s); c.closePath(); c.fill();
    }
  }
  // rayures
  c.strokeStyle = kind === 'paint' ? 'rgba(90,60,10,0.35)' : 'rgba(255,240,220,0.13)'; c.lineWidth = 0.8;
  for (let i = 0; i < 2 + Math.round(w / 120); i++) {
    const sx = rnd() * w, sy = rnd() * h, len = 8 + rnd() * 26, a = (rnd() - 0.5) * 0.8;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); c.stroke();
  }
  // biseau : arête claire en haut, sombre en bas
  c.fillStyle = 'rgba(255,245,225,0.22)'; c.fillRect(0, 0, w, 2);
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, h - 3, w, 3);
  c.restore();
  // contour
  chamferPath(c, 0, 0, w, h, k);
  c.lineWidth = 3; c.strokeStyle = COL.dark; c.lineJoin = 'round'; c.stroke();
  // rivets
  const riv = P.rivets === 'corners'
    ? [[k + 4, k + 4], [w - k - 4, k + 4], [k + 4, h - k - 4], [w - k - 4, h - k - 4]]
    : (w > 90 ? [[8, h / 2], [w - 8, h / 2]] : []);
  for (const [rx, ry] of riv) {
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(rx + 0.6, ry + 0.8, 2.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = kind === 'paint' ? '#8a6a24' : '#9a948a'; c.beginPath(); c.arc(rx, ry, 2.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(rx - 0.7, ry - 0.7, 0.8, 0, Math.PI * 2); c.fill();
  }
  return { cv, w, h };
}

export function drawPlate(ctx, x, y, w, h, kind = 'steel') {
  w = Math.round(w); h = Math.round(h);
  const key = kind + ':' + w + 'x' + h;
  let p = plateCache.get(key);
  if (!p) {
    if (plateCache.size > 300) plateCache.clear();
    p = makePlate(w, h, kind);
    plateCache.set(key, p);
  }
  ctx.drawImage(p.cv, x - 2, y - 2, w + 4, h + 4);
}

// Panneau de tôle sombre, rivets aux coins
export function drawPanel(ctx, x, y, w, h) {
  drawPlate(ctx, x, y, w, h, 'panel');
}

// ---------- Lettrage au pochoir ----------
// Le texte est dessiné à part puis « découpé » : les lettres à boucle (O, A, B, D, P, R…)
// reçoivent les ponts typiques d'un pochoir. Résultat mis en cache.
const BRIDGED = new Set('OQDBPRAa0bdeopqg689ÉÈÀÔÖ'.split(''));
const stencilCache = new Map();
function stencilImage(str, size, color) {
  const key = str + '|' + size + '|' + color;
  let img = stencilCache.get(key);
  if (img) return img;
  if (stencilCache.size > 400) stencilCache.clear();
  const R = PLATE_RES;
  const m = document.createElement('canvas').getContext('2d');
  const font = `900 ${size}px ${FONT}`;
  m.font = font;
  const tw = Math.ceil(m.measureText(str).width) + 8, th = Math.ceil(size * 1.4);
  const cv = document.createElement('canvas');
  cv.width = tw * R; cv.height = th * R;
  const c = cv.getContext('2d');
  c.scale(R, R);
  c.font = font; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = color;
  c.fillText(str, 4, th / 2);
  // ponts du pochoir
  c.globalCompositeOperation = 'destination-out';
  const bw = Math.max(1, size * 0.07);
  let x = 4;
  for (const ch of str) {
    const cw = c.measureText(ch).width;
    if (BRIDGED.has(ch)) c.fillRect(x + cw * 0.5 - bw / 2, 0, bw, th);
    x += cw;
  }
  img = { cv, w: tw, h: th };
  stencilCache.set(key, img);
  return img;
}

// Texte au pochoir centré sur (x, y) — pour les libellés fixes (boutons, titres)
export function stencilText(ctx, str, x, y, size, color = COL.text, align = 'center') {
  const img = stencilImage(str, size, color);
  const dx = align === 'center' ? x - img.w / 2 : align === 'right' ? x - img.w : x - 4;
  ctx.drawImage(img.cv, dx, y - img.h / 2, img.w, img.h);
}

// Bouton générique. b = { x, y, w, h, enabled? }
// opts.primary : bouton principal (plaque peinte en jaune, lettres sombres)
export function drawButton(ctx, b, label, pressed, opts = {}) {
  const enabled = b.enabled !== false;
  const dy = pressed && enabled ? 2 : 0;
  const kind = !enabled ? 'off' : opts.primary ? 'paint' : 'steel';
  // ombre portée sous la plaque (disparaît quand on appuie)
  if (!dy) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; chamferPath(ctx, b.x + 2, b.y + 4, b.w, b.h, Math.max(5, Math.min(12, Math.min(b.w, b.h) / 5))); ctx.fill(); }
  drawPlate(ctx, b.x, b.y + dy, b.w, b.h, kind);
  if (!label) return;
  const size = opts.size || 26;
  const color = !enabled ? '#8a7f70' : opts.primary ? '#2a1d0e' : COL.text;
  // lettres trop longues : texte normal qui rétrécit ; sinon pochoir
  ctx.font = `900 ${size}px ${FONT}`;
  let s = size;
  while (s > 11 && ctx.measureText(label).width > b.w - 22) { s--; ctx.font = `900 ${s}px ${FONT}`; }
  stencilText(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + dy + 1, s, color);
}

// Étoile à 5 branches
export function drawStar(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? COL.yellow : '#3a2b20';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COL.dark;
  ctx.stroke();
}
