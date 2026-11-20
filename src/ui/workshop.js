import { CONFIG } from '../config.js?v=8';
import { COL, FONT, drawPanel, drawButton, roundRectPath, text } from './widgets.js?v=8';
import { drawIcon, drawSpellIcon } from '../render/sprites.js?v=8';
import { isUpgradeAvailable, upgradeCost, upgradeEffect, upgradeUnlockLevel } from '../progress.js?v=8';

// Atelier : on dépense les pièces détachées en améliorations permanentes.
// 9 cartes (5 unités + murailles, tourelle, récupération, sorts), 5 niveaux chacune.

const W = CONFIG.display.width;
const H = CONFIG.display.height;
const GRID = { x: 24, y: 96, w: W - 48, h: H - 110, gap: 12 };
// La grille descend si les boutons du haut sont plus grands (téléphone)
function layoutGrid(bh) { GRID.y = Math.max(96, 18 + bh + 8); GRID.h = H - 14 - GRID.y; }

const minSize = (view) => CONFIG.display.minButtonPx / view.scale;

function cardRect(i) {
  const cw = (GRID.w - GRID.gap * 2) / 3;
  const ch = (GRID.h - GRID.gap * 2) / 3;
  return { x: GRID.x + (i % 3) * (cw + GRID.gap), y: GRID.y + Math.floor(i / 3) * (ch + GRID.gap), w: cw, h: ch };
}

const nameOf = (id) => (CONFIG.units[id] ? CONFIG.units[id].name : CONFIG.workshop.names[id]);

export function workshopButtons(view, progress) {
  const m = minSize(view);
  const bh = Math.max(56, m);
  layoutGrid(bh);
  const btns = [
    { id: 'back', label: '◀ RETOUR', enabled: true, x: 24, y: 18, w: Math.max(170, m), h: bh },
    { id: 'reset', label: 'RÉINITIALISER', enabled: true, x: W - 24 - Math.max(220, m), y: 18, w: Math.max(220, m), h: bh, small: true },
  ];
  CONFIG.workshop.order.forEach((id, i) => {
    const c = cardRect(i);
    const cost = upgradeCost(progress, id);
    const avail = isUpgradeAvailable(progress, id);
    if (!avail) return;
    const w = Math.max(140, m), h = Math.max(50, m);
    btns.push({
      id: 'buy:' + id, upgrade: id, cost,
      label: cost === null ? 'MAX' : cost + ' pièces',
      enabled: cost !== null && progress.parts >= cost,
      x: c.x + c.w - w - 12, y: c.y + c.h - h - 12, w, h,
    });
  });
  return btns;
}

// Texte qui rétrécit pour tenir dans la largeur donnée
function fitText(ctx, str, x, y, size, color, maxW) {
  let s = size;
  ctx.font = `bold ${s}px ${FONT}`;
  while (s > 10 && ctx.measureText(str).width > maxW) { s--; ctx.font = `bold ${s}px ${FONT}`; }
  text(ctx, str, x, y, s, color);
}

export function drawWorkshop(ctx, progress, buttons, pressed) {
  ctx.fillStyle = 'rgba(15,8,4,0.7)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'ATELIER', W / 2, 40, 34, COL.text, 'center', 'middle');
  text(ctx, 'Pièces détachées : ' + progress.parts, W / 2, 76, 20, COL.yellow, 'center', 'middle');

  const byId = {};
  for (const b of buttons) if (b.upgrade) byId[b.upgrade] = b;
  const maxLvl = CONFIG.workshop.maxLevel;

  CONFIG.workshop.order.forEach((id, i) => {
    const c = cardRect(i);
    const avail = isUpgradeAvailable(progress, id);
    const lvl = progress.upgrades[id];
    drawPanel(ctx, c.x, c.y, c.w, c.h, 12);
    if (!avail) { roundRectPath(ctx, c.x, c.y, c.w, c.h, 12); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); }

    // icône
    roundRectPath(ctx, c.x + 12, c.y + 12, 64, 64, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    if (CONFIG.units[id]) drawIcon(ctx, id, c.x + 44, c.y + 44, 56, !avail);
    else drawSpellIcon(ctx, { walls: 'walls', turret: 'turret', salvage: 'income', spells: 'mortar' }[id], c.x + 44, c.y + 44, 46, !avail);

    // nom + niveaux
    fitText(ctx, nameOf(id), c.x + 90, c.y + 36, 22, avail ? COL.text : COL.dim, c.w - 100);
    for (let k = 0; k < maxLvl; k++) {
      ctx.fillStyle = k < lvl ? COL.good : 'rgba(0,0,0,0.45)';
      ctx.fillRect(c.x + 90 + k * 24, c.y + 50, 18, 10);
    }

    const textW = c.w - 24 - (byId[id] ? byId[id].w + 12 : 0);
    if (!avail) {
      fitText(ctx, 'Débloqué au niveau ' + upgradeUnlockLevel(id), c.x + 14, c.y + c.h - 24, 18, COL.dim, c.w - 28);
      return;
    }
    fitText(ctx, lvl > 0 ? upgradeEffect(id, lvl) : 'Aucun bonus', c.x + 14, c.y + c.h - 46, 15, COL.dim, textW);
    fitText(ctx, lvl < maxLvl ? '→ ' + upgradeEffect(id, lvl + 1) : 'Niveau maximum', c.x + 14, c.y + c.h - 22, 15,
      lvl < maxLvl ? COL.yellow : COL.good, textW);
  });

  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.upgrade && b.enabled, size: b.small ? 18 : 20 });
}
