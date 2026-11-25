import { CONFIG } from '../config.js?v=33';
import { COL, FONT, drawPanel, drawButton, roundRectPath, text } from './widgets.js?v=33';
import { drawIcon, drawSpellIcon } from '../render/sprites.js?v=33';
import { isUpgradeAvailable, upgradeCost, upgradeEffect, upgradeUnlockLevel,
  heroStarsAvailable, heroUnlocked, heroCost } from '../progress.js?v=33';

// Atelier, deux onglets :
//  - ATELIER : on dépense les pièces détachées (11 améliorations de 10 niveaux, grille 4 × 3) ;
//  - HÉROS   : on choisit son commandant et on l'améliore avec les étoiles de la campagne.

const W = CONFIG.display.width;
const H = CONFIG.display.height;
const GRID = { x: 24, y: 96, w: W - 48, h: H - 110, gap: 12 };
// La grille descend si les boutons du haut sont plus grands (téléphone)
function layoutGrid(bh) { GRID.y = Math.max(96, 18 + bh + 8); GRID.h = H - 14 - GRID.y; }

const minSize = (view) => CONFIG.display.minButtonPx / view.scale;

const COLS = 4;
function cardRect(i) {
  const cw = (GRID.w - GRID.gap * (COLS - 1)) / COLS;
  const ch = (GRID.h - GRID.gap * 2) / 3;
  return { x: GRID.x + (i % COLS) * (cw + GRID.gap), y: GRID.y + Math.floor(i / COLS) * (ch + GRID.gap), w: cw, h: ch };
}

const nameOf = (id) => (CONFIG.units[id] ? CONFIG.units[id].name : CONFIG.workshop.names[id]);

// Boutons communs : retour, onglets, réinitialiser
function topButtons(view, tab) {
  const m = minSize(view);
  const bh = Math.max(56, m);
  layoutGrid(bh);
  const tw = 190;
  return [
    { id: 'back', label: '◀ RETOUR', enabled: true, x: 24, y: 18, w: Math.max(170, m), h: bh },
    { id: 'tab:workshop', label: 'ATELIER', enabled: true, primary: tab === 'workshop', x: W / 2 - tw - 5, y: 18, w: tw, h: bh },
    { id: 'tab:heroes', label: 'HÉROS', enabled: true, primary: tab === 'heroes', x: W / 2 + 5, y: 18, w: tw, h: bh },
    { id: tab === 'heroes' ? 'resetHeroes' : 'reset', label: 'RÉINITIALISER', enabled: true, x: W - 24 - Math.max(220, m), y: 18, w: Math.max(220, m), h: bh, small: true },
  ];
}

export function workshopButtons(view, progress, tab = 'workshop') {
  if (tab === 'heroes') return heroesButtons(view, progress);
  const m = minSize(view);
  const btns = topButtons(view, 'workshop');
  CONFIG.workshop.order.forEach((id, i) => {
    const c = cardRect(i);
    const cost = upgradeCost(progress, id);
    const avail = isUpgradeAvailable(progress, id);
    if (!avail) return;
    const w = Math.max(150, m), h = Math.max(46, m);
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
  const reset = buttons.find((b) => b.id === 'reset');
  if (reset) text(ctx, 'Pièces : ' + progress.parts, reset.x - 16, reset.y + reset.h / 2 + 1, 20, COL.yellow, 'right', 'middle');

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
    const pip = Math.min(19, (c.w - 100) / maxLvl);
    for (let k = 0; k < maxLvl; k++) {
      ctx.fillStyle = k < lvl ? COL.good : 'rgba(0,0,0,0.45)';
      ctx.fillRect(c.x + 90 + k * pip, c.y + 50, pip - 5, 10);
    }

    if (!avail) {
      fitText(ctx, 'Débloqué au niveau ' + upgradeUnlockLevel(id), c.x + 14, c.y + c.h - 24, 18, COL.dim, c.w - 28);
      return;
    }
    const b = byId[id];
    const next = lvl < maxLvl ? '→ ' + upgradeEffect(id, lvl + 1) : 'Niveau maximum';
    const nextCol = lvl < maxLvl ? COL.yellow : COL.good;
    if (b.y - (c.y + 82) >= 42) {
      // assez de place : effet actuel et suivant sous l'icône, au-dessus du bouton
      const ty = Math.min(c.y + 100, b.y - 34);
      fitText(ctx, lvl > 0 ? upgradeEffect(id, lvl) : 'Aucun bonus', c.x + 14, ty, 15, COL.dim, c.w - 28);
      fitText(ctx, next, c.x + 14, ty + 21, 15, nextCol, c.w - 28);
    } else {
      // petit écran (gros boutons) : seulement le prochain effet, sur 2 lignes à gauche du bouton
      let lines = next.split(' · ');
      const m = lines.length === 1 && next.match(/^(.*) ([+-].*)$/);   // « → Revenu de départ » / « +1/s »
      if (m) lines = [m[1], m[2]];
      const tw = b.x - c.x - 22, my = b.y + b.h / 2 - (lines.length - 1) * 10;
      lines.forEach((l, k) => fitText(ctx, (k ? '  ' : '') + l, c.x + 14, my + k * 20 + 5, 15, nextCol, tw));
    }
  });

  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: (b.upgrade && b.enabled) || b.primary, size: b.small ? 18 : 20 });
}

// ---------- Onglet HÉROS ----------
function heroCard(i) {
  const cw = (GRID.w - GRID.gap * 2) / 3;
  return { x: GRID.x + i * (cw + GRID.gap), y: GRID.y, w: cw, h: GRID.h };
}

function heroesButtons(view, progress) {
  const m = minSize(view);
  const btns = topButtons(view, 'heroes');
  const avail = heroStarsAvailable(progress);
  CONFIG.heroes.order.forEach((id, i) => {
    if (!heroUnlocked(progress, id)) return;
    const c = heroCard(i);
    const h = Math.max(54, m), w = (c.w - 36) / 2;
    const cost = heroCost(progress, id);
    btns.push({ id: 'heroUp:' + id, hero: id, label: cost === null ? 'MAX' : 'AMÉLIORER ' + cost + ' ★',
      enabled: cost !== null && avail >= cost, x: c.x + 12, y: c.y + c.h - h - 12, w, h, small: true });
    const sel = progress.heroes.selected === id;
    btns.push({ id: 'heroPick:' + id, hero: id, label: sel ? '✓ CHOISI' : 'CHOISIR', enabled: !sel, primary: !sel,
      x: c.x + 24 + w, y: c.y + c.h - h - 12, w, h, small: true });
  });
  return btns;
}

// Texte sur plusieurs lignes ; renvoie la position y après le dernier mot
function wrap(ctx, str, x, y, maxW, size, color, lh) {
  ctx.font = `bold ${size}px ${FONT}`;
  let line = '';
  for (const word of str.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { text(ctx, line, x, y, size, color); y += lh; line = word; }
    else line = test;
  }
  if (line) { text(ctx, line, x, y, size, color); y += lh; }
  return y;
}

// Nombre de lignes qu'occupera un texte dans une largeur donnée
function countLines(ctx, str, maxW, size) {
  ctx.font = `bold ${size}px ${FONT}`;
  let line = '', n = 0;
  for (const word of str.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { n++; line = word; } else line = test;
  }
  return n + (line ? 1 : 0);
}

export function drawHeroes(ctx, progress, buttons, pressed) {
  ctx.fillStyle = 'rgba(15,8,4,0.7)';
  ctx.fillRect(0, 0, W, H);
  const reset = buttons.find((b) => b.id === 'resetHeroes');
  text(ctx, 'Étoiles : ' + heroStarsAvailable(progress) + ' ★', reset.x - 16, reset.y + reset.h / 2 + 1, 20, COL.yellow, 'right', 'middle');
  const H_ = CONFIG.heroes;
  H_.order.forEach((id, i) => {
    const c = heroCard(i);
    const cfg = H_.list[id], u = CONFIG.units['hero_' + id];
    const open = heroUnlocked(progress, id);
    const lvl = progress.heroes.levels[id];
    const sel = progress.heroes.selected === id && open;
    drawPanel(ctx, c.x, c.y, c.w, c.h, 12);
    if (sel) { roundRectPath(ctx, c.x, c.y, c.w, c.h, 12); ctx.lineWidth = 4; ctx.strokeStyle = COL.yellow; ctx.stroke(); }
    // portrait
    const ph = Math.min(130, c.h * 0.24);
    roundRectPath(ctx, c.x + 12, c.y + 12, c.w - 24, ph, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    drawIcon(ctx, 'hero_' + id, c.x + c.w / 2, c.y + 12 + ph / 2, ph - 14, !open);
    let y = c.y + ph + 40;
    fitText(ctx, cfg.name, c.x + 16, y, 24, open ? (sel ? COL.yellow : COL.text) : COL.dim, c.w - 32); y += 22;
    text(ctx, cfg.title, c.x + 16, y, 15, COL.dim); y += 16;
    for (let k = 0; k < H_.maxLevel; k++) {
      ctx.fillStyle = k < lvl ? COL.good : 'rgba(0,0,0,0.45)';
      ctx.fillRect(c.x + 16 + k * 19, y, 14, 9);
    }
    y += 32;
    if (!open) {
      wrap(ctx, 'Débloqué en atteignant le niveau ' + cfg.unlockLevel + ' de la campagne.', c.x + 16, y, c.w - 32, 17, COL.dim, 24);
      return;
    }
    const hp = Math.round(u.hp * (1 + H_.perLevel.hp * lvl)), dmg = Math.round(u.damage * (1 + H_.perLevel.damage * lvl));
    fitText(ctx, `Niv. ${lvl}   PV ${hp}   Dégâts ${dmg}   Portée ${u.range}`, c.x + 16, y, 16, COL.text, c.w - 32); y += 28;
    text(ctx, 'Aura', c.x + 16, y, 16, COL.yellow); y += 20;
    y = wrap(ctx, cfg.aura.text, c.x + 16, y, c.w - 32, 15, COL.text, 19) + 8;
    text(ctx, 'Capacité : ' + cfg.ability.name, c.x + 16, y, 16, COL.yellow); y += 20;
    y = wrap(ctx, cfg.ability.text, c.x + 16, y, c.w - 32, 15, COL.text, 19);
    const mult = Math.round(H_.perLevel.ability * lvl * 100), cd = Math.round(cfg.ability.cooldown * Math.max(0.3, 1 - H_.perLevel.cooldown * lvl));
    text(ctx, `Puissance +${mult} % · recharge ${cd} s`, c.x + 16, y + 4, 14, COL.dim);
    // Talent : débloqué au niveau maximum
    y += 28;
    const got = lvl >= H_.maxLevel;
    const by = buttons.find((b) => b.hero === id) ? buttons.find((b) => b.hero === id).y : c.y + c.h;
    if (y + 40 < by) {
      text(ctx, (got ? 'Talent : ' : 'Talent (niveau ' + H_.maxLevel + ') : ') + cfg.talent.name, c.x + 16, y, 16, got ? COL.good : COL.dim); y += 20;
      // le texte rétrécit si la carte est courte (téléphone) pour ne pas toucher les boutons
      const str = cfg.talent.text;
      let size = 14, lh = 18;
      while (size > 11 && y + countLines(ctx, str, c.w - 32, size) * lh > by - 4) { size--; lh -= 1.5; }
      wrap(ctx, str, c.x + 16, y, c.w - 32, size, got ? COL.text : COL.dim, lh);
    }
  });
  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: b.small ? 17 : 20 });
}
