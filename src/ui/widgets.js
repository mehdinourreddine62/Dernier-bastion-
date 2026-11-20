// Petits éléments d'interface partagés (panneaux, boutons, étoiles).
// Style : tôle rouillée et bois, police système grasse.

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

// Panneau de tôle rouillée avec rivets
export function drawPanel(ctx, x, y, w, h, radius = 10) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#5a4636');
  g.addColorStop(1, '#3a2b20');
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COL.dark;
  ctx.stroke();
  ctx.fillStyle = '#8a7a66';
  for (const [rx, ry] of [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]]) {
    ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

// Bouton générique. b = { x, y, w, h, enabled? }
export function drawButton(ctx, b, label, pressed, opts = {}) {
  const enabled = b.enabled !== false;
  const dy = pressed && enabled ? 2 : 0;
  const top = opts.primary ? '#c0693a' : '#6b5440';
  const bot = opts.primary ? '#8a4220' : '#43332a';
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  g.addColorStop(0, pressed && enabled ? bot : top);
  g.addColorStop(1, pressed && enabled ? top : bot);
  roundRectPath(ctx, b.x, b.y + dy, b.w, b.h, 10);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COL.dark;
  ctx.stroke();
  if (!enabled) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(); }
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + dy, opts.size || 26,
    enabled ? COL.text : COL.dim, 'center', 'middle');
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
