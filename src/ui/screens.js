import { CONFIG } from '../config.js';
import { COL, drawPanel, drawButton, drawStar, text } from './widgets.js';

// Écrans : titre, pause, fin de partie. Dessinés sur le canvas, comme le HUD.
// Chaque écran fournit ses boutons (pour le clic/toucher) et sa fonction de dessin.

const W = CONFIG.display.width;
const H = CONFIG.display.height;

function column(view, ids, firstY, w = 340) {
  const minL = CONFIG.display.minButtonPx / view.scale;
  const h = Math.max(70, minL);
  return ids.map(([id, label, primary], i) => ({
    id, label, primary, enabled: true,
    x: (W - w) / 2, y: firstY + i * (h + 16), w, h,
  }));
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(15,8,4,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

// ---------- Titre ----------
export function titleButtons(view) {
  return column(view, [['play', 'JOUER', true]], 430);
}

export function drawTitle(ctx, buttons, pressed) {
  dim(ctx, 0.45);
  ctx.lineJoin = 'round';
  ctx.font = 'bold 96px system-ui, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 12; ctx.strokeStyle = COL.dark;
  ctx.strokeText('DERNIER BASTION', W / 2, 190);
  ctx.fillStyle = '#e8a04a';
  ctx.fillText('DERNIER BASTION', W / 2, 190);
  text(ctx, 'Survivants contre Mutants', W / 2, 270, 30, COL.text, 'center', 'middle');
  text(ctx, 'Niveau 1 — ' + CONFIG.levels[0].name, W / 2, 330, 24, COL.dim, 'center', 'middle');
  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: 34 });
  text(ctx, 'Glisse pour faire défiler le champ de bataille • Étape 1 du développement',
    W / 2, H - 28, 18, COL.dim, 'center', 'middle');
}

// ---------- Pause ----------
export function pauseButtons(view) {
  return column(view, [['resume', 'REPRENDRE', true], ['restart', 'RECOMMENCER'], ['menu', 'MENU']], 260);
}

export function drawPause(ctx, buttons, pressed) {
  dim(ctx, 0.6);
  drawPanel(ctx, W / 2 - 220, 120, 440, 520, 16);
  text(ctx, 'PAUSE', W / 2, 190, 52, COL.text, 'center', 'middle');
  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: 28 });
}

// ---------- Fin de partie ----------
export function endButtons(view) {
  return column(view, [['restart', 'REJOUER', true], ['menu', 'MENU']], 450);
}

export function drawEnd(ctx, game, buttons, pressed) {
  dim(ctx, 0.6);
  drawPanel(ctx, W / 2 - 260, 80, 520, 560, 16);
  const won = game.result === 'won';
  text(ctx, won ? 'VICTOIRE !' : 'DÉFAITE', W / 2, 150, 56, won ? COL.yellow : COL.bad, 'center', 'middle');
  for (let i = 0; i < 3; i++) drawStar(ctx, W / 2 + (i - 1) * 90, 255, 38, i < game.stars);
  const pct = Math.round(Math.max(0, game.bases.player.hp / game.bases.player.maxHp) * 100);
  text(ctx, won ? 'Base restante : ' + pct + ' %' : 'Le nid mutant a détruit ta base.', W / 2, 335, 24, COL.text, 'center', 'middle');
  const t = Math.round(game.time);
  text(ctx, 'Durée : ' + Math.floor(t / 60) + ' min ' + String(t % 60).padStart(2, '0') + ' s', W / 2, 375, 22, COL.dim, 'center', 'middle');
  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: 30 });
}
