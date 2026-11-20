import { CONFIG } from '../config.js?v=4';
import { COL, drawPanel, drawButton, drawStar, text } from './widgets.js?v=4';

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
// Choix du niveau provisoire (pour tester) : remplacé par la carte de campagne à l'étape 4.
export function titleButtons(view, selected) {
  const btns = column(view, [['play', 'JOUER', true]], 360);
  const minL = CONFIG.display.minButtonPx / view.scale;
  const n = CONFIG.levels.length;
  const s = Math.max(70, minL);
  const gap = 10;
  const total = n * s + (n - 1) * gap;
  const scale = total > W - 40 ? (W - 40) / total : 1;
  const size = s * scale;
  let x = (W - (n * size + (n - 1) * gap * scale)) / 2;
  CONFIG.levels.forEach((lv, i) => {
    btns.push({ id: 'level:' + i, level: i, label: String(lv.id), x, y: 520, w: size, h: size,
      enabled: true, selected: i === selected });
    x += size + gap * scale;
  });
  return btns;
}

export function drawTitle(ctx, buttons, pressed, selected) {
  dim(ctx, 0.45);
  ctx.lineJoin = 'round';
  ctx.font = 'bold 96px system-ui, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 12; ctx.strokeStyle = COL.dark;
  ctx.strokeText('DERNIER BASTION', W / 2, 160);
  ctx.fillStyle = '#e8a04a';
  ctx.fillText('DERNIER BASTION', W / 2, 160);
  text(ctx, 'Survivants contre Mutants', W / 2, 240, 30, COL.text, 'center', 'middle');
  const lv = CONFIG.levels[selected];
  text(ctx, 'Niveau ' + lv.id + ' — ' + lv.name, W / 2, 300, 26, COL.yellow, 'center', 'middle');
  for (const b of buttons) {
    if (b.level !== undefined) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.selected, size: 26 });
    else drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: 34 });
  }
  text(ctx, 'Choix du niveau (test — la carte de campagne arrive à l’étape 4)', W / 2, 500, 17, COL.dim, 'center', 'middle');
}

// ---------- Pause ----------
// Réglages dans le menu pause : son et secousses d'écran (mémorisés)
export function pauseButtons(view, settings) {
  const minL = CONFIG.display.minButtonPx / view.scale;
  const h = Math.max(66, minL);
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
  btns.push({ id: 'menu', label: 'MENU', enabled: true, x, y, w, h });
  return btns;
}

export function drawPause(ctx, buttons, pressed) {
  dim(ctx, 0.6);
  const last = buttons[buttons.length - 1];
  drawPanel(ctx, W / 2 - 220, 100, 440, last.y + last.h + 30 - 100, 16);
  text(ctx, 'PAUSE', W / 2, 155, 52, COL.text, 'center', 'middle');
  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: b.small ? 17 : 28 });
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
