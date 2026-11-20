import { CONFIG } from '../config.js?v=6';
import { COL, FONT, drawPanel, drawButton, drawStar, text } from './widgets.js?v=6';

// Écrans de menu : titre, options, pause, fin de partie, confirmation.
// Dessinés sur le canvas comme le HUD. Chaque écran fournit ses boutons
// (pour le clic/toucher) et sa fonction de dessin.

const W = CONFIG.display.width;
const H = CONFIG.display.height;

export const minSize = (view) => CONFIG.display.minButtonPx / view.scale;

function column(view, ids, firstY, w = 360) {
  const h = Math.max(66, minSize(view));
  return ids.map(([id, label, primary], i) => ({
    id, label, primary, enabled: true,
    x: (W - w) / 2, y: firstY + i * (h + 14), w, h,
  }));
}

// Rangée de boutons centrée
function row(view, ids, y, w = 210) {
  const h = Math.max(66, minSize(view));
  const gap = 16;
  const total = ids.length * w + (ids.length - 1) * gap;
  let x = (W - total) / 2;
  return ids.map(([id, label, primary]) => {
    const b = { id, label, primary, enabled: true, x, y, w, h };
    x += w + gap;
    return b;
  });
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(15,8,4,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function bigTitle(ctx, str, y, size, color = '#e8a04a') {
  ctx.lineJoin = 'round';
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = size / 8; ctx.strokeStyle = COL.dark;
  ctx.strokeText(str, W / 2, y);
  ctx.fillStyle = color;
  ctx.fillText(str, W / 2, y);
}

const drawAll = (ctx, buttons, pressed, size = 28) => {
  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: b.small ? 17 : size });
};

// ---------- Titre ----------
export function titleButtons(view) {
  return column(view, [['play', 'JOUER', true], ['workshop', 'ATELIER'], ['options', 'OPTIONS']], 300);
}

export function drawTitle(ctx, buttons, pressed, progress, stats) {
  dim(ctx, 0.4);
  bigTitle(ctx, 'DERNIER BASTION', 150, 96);
  text(ctx, 'Survivants contre Mutants', W / 2, 230, 30, COL.text, 'center', 'middle');
  drawAll(ctx, buttons, pressed, 32);
  const last = buttons[buttons.length - 1];
  text(ctx, `★ ${stats.stars} / ${CONFIG.levels.length * 3}     Pièces détachées : ${progress.parts}`,
    W / 2, Math.min(H - 24, last.y + last.h + 40), 22, COL.yellow, 'center', 'middle');
}

// ---------- Options (depuis le titre) ----------
export function optionsButtons(view, settings) {
  return column(view, [
    ['toggleSound', 'SON : ' + (settings.sound ? 'OUI' : 'NON')],
    ['toggleShake', 'SECOUSSES : ' + (settings.shake ? 'OUI' : 'NON')],
    ['eraseSave', 'EFFACER LA SAUVEGARDE'],
    ['back', 'RETOUR', true],
  ], 200, 440);
}

export function drawOptions(ctx, buttons, pressed) {
  dim(ctx, 0.55);
  bigTitle(ctx, 'OPTIONS', 120, 64);
  drawAll(ctx, buttons, pressed, 26);
}

// ---------- Pause ----------
// Réglages dans le menu pause : son et secousses d'écran (mémorisés)
export function pauseButtons(view, settings) {
  const h = Math.max(66, minSize(view));
  const gap = 14;
  const w = 360;
  const x = (W - w) / 2;
  let y = 200;
  const btns = [];
  btns.push({ id: 'resume', label: 'REPRENDRE', primary: true, enabled: true, x, y, w, h });
  y += h + gap;
  const hw = (w - 12) / 2;
  btns.push({ id: 'toggleSound', label: 'SON : ' + (settings.sound ? 'OUI' : 'NON'), enabled: true, x, y, w: hw, h, small: true });
  btns.push({ id: 'toggleShake', label: 'SECOUSSES : ' + (settings.shake ? 'OUI' : 'NON'), enabled: true, x: x + hw + 12, y, w: hw, h, small: true });
  y += h + gap;
  btns.push({ id: 'restart', label: 'RECOMMENCER', enabled: true, x, y, w, h });
  y += h + gap;
  btns.push({ id: 'abandon', label: 'ABANDONNER', enabled: true, x, y, w, h });
  return btns;
}

export function drawPause(ctx, buttons, pressed) {
  dim(ctx, 0.6);
  const last = buttons[buttons.length - 1];
  drawPanel(ctx, W / 2 - 220, 100, 440, last.y + last.h + 30 - 100, 16);
  text(ctx, 'PAUSE', W / 2, 155, 52, COL.text, 'center', 'middle');
  drawAll(ctx, buttons, pressed);
}

// ---------- Fin de partie ----------
export function endButtons(view, game) {
  const won = game.result === 'won';
  const hasNext = won && game.levelIndex + 1 < CONFIG.levels.length;
  const ids = won
    ? [...(hasNext ? [['next', 'NIVEAU SUIVANT', true]] : []), ['restart', 'REJOUER', !hasNext], ['map', 'CARTE']]
    : [['restart', 'RÉESSAYER', true], ['workshop', 'ATELIER'], ['map', 'CARTE']];
  return row(view, ids, 560);
}

// reward = résultat de recordResult (pièces gagnées, messages de déblocage)
export function drawEnd(ctx, game, buttons, pressed, reward) {
  dim(ctx, 0.6);
  drawPanel(ctx, W / 2 - 370, 50, 740, Math.max(640, buttons[0].y + buttons[0].h + 24) - 50, 16);
  const won = game.result === 'won';
  text(ctx, won ? 'VICTOIRE !' : 'DÉFAITE', W / 2, 112, 56, won ? COL.yellow : COL.bad, 'center', 'middle');
  text(ctx, 'Niveau ' + game.level.id + ' — ' + game.level.name, W / 2, 162, 22, COL.dim, 'center', 'middle');
  for (let i = 0; i < 3; i++) drawStar(ctx, W / 2 + (i - 1) * 86, 228, 36, i < game.stars);
  const pct = Math.round(Math.max(0, game.bases.player.hp / game.bases.player.maxHp) * 100);
  const t = Math.round(game.time);
  const dur = Math.floor(t / 60) + ' min ' + String(t % 60).padStart(2, '0') + ' s';
  text(ctx, won ? `Base restante : ${pct} %   ·   Durée : ${dur}` : `Le nid mutant a détruit ta base.   ·   Durée : ${dur}`,
    W / 2, 298, 21, COL.text, 'center', 'middle');
  let y = 344;
  if (reward && reward.parts > 0) {
    const detail = reward.firstWin ? ` (dont ${CONFIG.stars.firstWinBonus} de première victoire)` : '';
    text(ctx, `+${reward.parts} pièces détachées${detail}`, W / 2, y, 24, COL.yellow, 'center', 'middle');
    y += 36;
  } else if (won) {
    text(ctx, 'Pas de nouvelle étoile : pas de pièces cette fois.', W / 2, y, 20, COL.dim, 'center', 'middle');
    y += 36;
  } else {
    text(ctx, 'Astuce : renforce ton armée dans l’Atelier.', W / 2, y, 20, COL.dim, 'center', 'middle');
    y += 36;
  }
  for (const m of (reward && reward.messages) || []) {
    text(ctx, m, W / 2, y, 21, COL.good, 'center', 'middle');
    y += 32;
  }
  drawAll(ctx, buttons, pressed, 22);
}

// ---------- Confirmation ----------
export function confirmButtons(view) {
  return row(view, [['confirmYes', 'OUI', true], ['confirmNo', 'NON']], 420, 200);
}

export function drawConfirm(ctx, msg, buttons, pressed) {
  dim(ctx, 0.65);
  const b = buttons[0];
  drawPanel(ctx, W / 2 - 330, 200, 660, b.y + b.h + 30 - 200, 16);
  msg.split('\n').forEach((l, i) => text(ctx, l, W / 2, 262 + i * 34, 24, COL.text, 'center', 'middle'));
  drawAll(ctx, buttons, pressed);
}
