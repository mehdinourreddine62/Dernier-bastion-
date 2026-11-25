import { CONFIG } from '../config.js?v=28';
import { COL, FONT, drawPanel, drawButton, roundRectPath, text } from './widgets.js?v=28';
import { drawIcon } from '../render/sprites.js?v=28';

// Bestiaire : tous les mutants, dévoilés une fois rencontrés en partie.
// À gauche la grille des mutants, à droite la fiche de celui qui est sélectionné.

const W = CONFIG.display.width;
const H = CONFIG.display.height;
const COLS = 4;
const GRID = { x: 24, y: 96, w: 600, h: H - 96 - 16, gap: 10 };
const PANEL = { x: 24 + 600 + 16, y: 96, w: W - 24 - 600 - 16 - 24, h: H - 96 - 16 };
// La grille et la fiche descendent si le bouton RETOUR est plus grand (téléphone)
function layout(bh) {
  GRID.y = PANEL.y = Math.max(96, 16 + bh + 8);
  GRID.h = PANEL.h = H - 16 - GRID.y;
}

export const BEASTS = Object.keys(CONFIG.bestiary);
const seen = (progress, id) => progress.bestiary[id] !== undefined;

function cellRect(i) {
  const rows = Math.ceil(BEASTS.length / COLS);
  const cw = (GRID.w - GRID.gap * (COLS - 1)) / COLS;
  const ch = (GRID.h - GRID.gap * (rows - 1)) / rows;
  return { x: GRID.x + (i % COLS) * (cw + GRID.gap), y: GRID.y + Math.floor(i / COLS) * (ch + GRID.gap), w: cw, h: ch };
}

export function bestiaryButtons(view) {
  const m = CONFIG.display.minButtonPx / view.scale;
  const h = Math.max(56, m);
  layout(h);
  const btns = [{ id: 'back', label: '◀ RETOUR', enabled: true, x: 24, y: 16, w: Math.max(170, m), h }];
  BEASTS.forEach((id, i) => btns.push(Object.assign({ id: 'beast:' + id, beast: id, enabled: true }, cellRect(i))));
  return btns;
}

// Texte sur plusieurs lignes dans une largeur donnée
function wrap(ctx, str, x, y, w, size, color, lh) {
  ctx.font = `bold ${size}px ${FONT}`;
  let line = '';
  for (const word of str.split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (ctx.measureText(t).width > w && line) { text(ctx, line, x, y, size, color); y += lh; line = word; }
    else line = t;
  }
  if (line) text(ctx, line, x, y, size, color);
  return y + lh;
}

export function drawBestiary(ctx, progress, selected, buttons, pressed) {
  ctx.fillStyle = 'rgba(15,8,4,0.78)';
  ctx.fillRect(0, 0, W, H);
  const n = BEASTS.filter((id) => seen(progress, id)).length;
  text(ctx, 'BESTIAIRE', W / 2, 40, 34, COL.text, 'center', 'middle');
  text(ctx, n + ' / ' + BEASTS.length + ' mutants rencontrés', W / 2, 76, 18, COL.yellow, 'center', 'middle');

  // Grille des mutants
  for (const b of buttons) {
    if (!b.beast) continue;
    const ok = seen(progress, b.beast);
    const sel = b.beast === selected;
    drawPanel(ctx, b.x, b.y + (pressed.has(b.id) ? 2 : 0), b.w, b.h, 10);
    if (sel) { roundRectPath(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 9); ctx.lineWidth = 3; ctx.strokeStyle = COL.yellow; ctx.stroke(); }
    if (ok) {
      drawIcon(ctx, b.beast, b.x + b.w / 2, b.y + b.h / 2 - 10, Math.min(b.w, b.h) - 40);
      ctx.font = `bold 14px ${FONT}`;
      text(ctx, CONFIG.units[b.beast].name, b.x + b.w / 2, b.y + b.h - 12, 14, sel ? COL.yellow : COL.text, 'center', 'middle');
    } else {
      text(ctx, '?', b.x + b.w / 2, b.y + b.h / 2 - 6, 48, 'rgba(255,255,255,0.25)', 'center', 'middle');
      text(ctx, 'Inconnu', b.x + b.w / 2, b.y + b.h - 12, 14, COL.dim, 'center', 'middle');
    }
  }

  // Fiche du mutant sélectionné
  const P = PANEL;
  drawPanel(ctx, P.x, P.y, P.w, P.h, 14);
  if (!selected || !seen(progress, selected)) {
    text(ctx, 'Pas encore rencontré', P.x + P.w / 2, P.y + P.h / 2 - 14, 26, COL.dim, 'center', 'middle');
    text(ctx, 'Il se dévoilera quand il apparaîtra en partie.', P.x + P.w / 2, P.y + P.h / 2 + 22, 17, COL.dim, 'center', 'middle');
  } else {
    const u = CONFIG.units[selected], info = CONFIG.bestiary[selected];
    roundRectPath(ctx, P.x + 20, P.y + 20, 200, 200, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    drawIcon(ctx, selected, P.x + 120, P.y + 120, 176);
    let x = P.x + 240, y = P.y + 46;
    text(ctx, u.name, x, y, 30, COL.yellow); y += 32;
    text(ctx, u.role, x, y, 18, COL.dim); y += 36;
    const types = u.tags.map((t) => CONFIG.typeNames[t] || t).join(', ');
    for (const [k, v] of [['PV', u.hp], ['Dégâts', u.damage], ['Portée', u.range], ['Vitesse', u.speed]]) {
      text(ctx, k, x, y, 17, COL.dim); text(ctx, String(v), x + 90, y, 17, COL.text); y += 24;
    }
    text(ctx, 'Type : ' + types, x, y, 16, COL.dim); y += 24;
    text(ctx, 'Tués : ' + (progress.bestiary[selected] || 0), x, y, 17, COL.good);
    y = P.y + 260;
    x = P.x + 24;
    text(ctx, 'Description', x, y, 19, COL.yellow); y += 28;
    y = wrap(ctx, info.desc, x, y, P.w - 48, 18, COL.text, 25) + 10;
    text(ctx, 'Comment le contrer', x, y, 19, COL.yellow); y += 28;
    wrap(ctx, info.weak, x, y, P.w - 48, 18, COL.text, 25);
  }
  for (const b of buttons) if (!b.beast) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: 22 });
}
