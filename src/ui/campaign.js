import { CONFIG } from '../config.js?v=29';
import { COL, FONT, drawPanel, drawButton, drawStar, roundRectPath, text, stencilText } from './widgets.js?v=29';
import { unlocksAt, objectiveText, isSurvivalUnlocked, chapterOf } from '../progress.js?v=29';

// Carte de campagne : 2 chapitres de 10 lieux (onglets en haut), reliés par une route.
// Toucher un lieu ouvre sa fiche (infos + bouton LANCER).

const W = CONFIG.display.width;
const H = CONFIG.display.height;
const BOARD = { x: 30, y: 96, w: W - 60, h: H - 110 };

// Position de chaque niveau d'un chapitre sur la carte (en S, de bas-gauche vers le haut)
export const NODES = [
  [150, 590], [330, 525], [510, 585], [690, 515], [880, 570],
  [1080, 505], [1140, 345], [935, 285], [700, 300], [470, 220],
];
const R = 30;

const minSize = (view) => CONFIG.display.minButtonPx / view.scale;

const n3 = (n) => (n > 2 ? 180 : 200);   // largeur des onglets de chapitre
const bossNames = (lv) => lv.bosses.map((b) => CONFIG.units[b.unit].name);

// chapter = index du chapitre affiché ; selected = index du niveau dont la fiche est ouverte (ou null)
export function mapButtons(view, progress, selected, chapter) {
  const m = minSize(view);
  const bh = Math.max(56, m);
  if (selected !== null) {
    const h = Math.max(66, m);
    return [
      { id: 'launch', label: 'LANCER', primary: true, enabled: true, x: W / 2 - 230, y: 560, w: 220, h },
      { id: 'closeInfo', label: 'RETOUR', enabled: true, x: W / 2 + 10, y: 560, w: 220, h },
    ];
  }
  const btns = [
    { id: 'back', label: '◀ MENU', enabled: true, x: 30, y: 18, w: Math.max(150, m), h: bh },
    { id: 'workshop', label: 'ATELIER', enabled: true, x: W - 30 - Math.max(180, m), y: 18, w: Math.max(180, m), h: bh, primary: true },
  ];
  // Onglets des chapitres (un chapitre s'ouvre quand on atteint son premier niveau)
  const tw = n3(CONFIG.chapters.length), gap = 10, n = CONFIG.chapters.length;
  let tx = W / 2 - (n * tw + (n - 1) * gap) / 2 - 40;
  CONFIG.chapters.forEach((ch, i) => {
    btns.push({ id: 'chapter:' + i, chapter: i, label: ch.name, enabled: true,
      lockedChapter: ch.first > progress.unlocked, selected: chapter === i, x: tx, y: 18, w: tw, h: bh });
    tx += tw + gap;
  });
  // Bouton du mode Survie (en bas à droite de la carte)
  const sh = Math.max(60, m), sw = 220;
  btns.push({ id: 'survival', label: 'SURVIE', enabled: true, lockedSurvival: !isSurvivalUnlocked(progress),
    x: W - 38 - sw, y: H - 22 - sh, w: sw, h: sh });
  const s = Math.max(R * 2 + 10, m);
  const first = CONFIG.chapters[chapter].first - 1;
  NODES.forEach(([x, y], k) => {
    const i = first + k;
    if (!CONFIG.levels[i]) return;
    btns.push({ id: 'node:' + i, level: i, x: x - s / 2, y: y - s / 2, w: s, h: s, enabled: true,
      locked: CONFIG.levels[i].id > progress.unlocked });
  });
  return btns;
}

// Petit dessin du lieu à côté de chaque étape
// Chapitre 3 : dessins repris des lieux qui ressemblent (maison, arbre, grue, usine…)
const LANDMARK_CH3 = [0, 7, 3, 2, 17, 1, 5, 6, 8, 19];
function landmark(ctx, i, x, y) {
  if (i >= 20) i = LANDMARK_CH3[i - 20];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(60,40,24,0.55)';
  ctx.strokeStyle = 'rgba(60,40,24,0.55)';
  ctx.lineWidth = 2;
  switch (i) {
    case 0: // maisons
      for (const dx of [-14, 8]) { ctx.fillRect(dx, -12, 16, 12); ctx.beginPath(); ctx.moveTo(dx - 2, -12); ctx.lineTo(dx + 8, -20); ctx.lineTo(dx + 18, -12); ctx.fill(); }
      break;
    case 1: // pont cassé
      ctx.fillRect(-24, -16, 20, 4); ctx.fillRect(4, -14, 22, 4); ctx.fillRect(-18, -12, 4, 12); ctx.fillRect(14, -10, 4, 10);
      break;
    case 2: // tours de refroidissement
      for (const dx of [-12, 10]) { ctx.beginPath(); ctx.moveTo(dx - 9, 0); ctx.quadraticCurveTo(dx - 3, -12, dx - 6, -22); ctx.lineTo(dx + 6, -22); ctx.quadraticCurveTo(dx + 3, -12, dx + 9, 0); ctx.fill(); }
      break;
    case 3: // grue
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-6, -26); ctx.lineTo(22, -30); ctx.moveTo(-6, -26); ctx.lineTo(-20, -24); ctx.moveTo(16, -29); ctx.lineTo(16, -14); ctx.stroke();
      break;
    case 4: // symbole radioactif
      ctx.beginPath(); ctx.arc(0, -12, 3, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(0, -12); ctx.arc(0, -12, 12, k * 2.094 - 0.5, k * 2.094 + 0.5); ctx.fill(); }
      break;
    case 5: // gratte-ciel
      ctx.fillRect(-16, -30, 10, 30); ctx.fillRect(-4, -22, 10, 22); ctx.fillRect(8, -34, 9, 34);
      break;
    case 6: // torchère
      ctx.fillRect(-2, -30, 4, 30); ctx.fillRect(-16, -12, 12, 12);
      ctx.fillStyle = 'rgba(200,90,30,0.8)'; ctx.beginPath(); ctx.moveTo(-4, -30); ctx.lineTo(0, -40); ctx.lineTo(4, -30); ctx.fill();
      break;
    case 7: // arbres morts
      for (const dx of [-10, 10]) { ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx, -22); ctx.lineTo(dx - 7, -30); ctx.moveTo(dx, -14); ctx.lineTo(dx + 7, -22); ctx.stroke(); }
      break;
    case 8: // rempart
      ctx.fillRect(-22, -12, 44, 12);
      for (let k = 0; k < 5; k++) ctx.fillRect(-22 + k * 10, -18, 5, 6);
      break;
    case 9: // nid organique
      ctx.fillStyle = 'rgba(120,30,50,0.7)';
      ctx.beginPath(); ctx.ellipse(0, -8, 18, 12, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(-2, -32); ctx.lineTo(2, -16); ctx.fill();
      break;
    case 10: // maisons en flammes
      for (const dx of [-14, 8]) { ctx.fillRect(dx, -12, 16, 12); }
      ctx.fillStyle = 'rgba(200,90,30,0.8)';
      ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(-6, -28); ctx.lineTo(0, -12); ctx.moveTo(10, -12); ctx.lineTo(16, -24); ctx.lineTo(22, -12); ctx.fill();
      break;
    case 11: // barrage
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-20, -22); ctx.lineTo(20, -22); ctx.lineTo(26, 0); ctx.fill();
      ctx.fillStyle = 'rgba(80,120,160,0.7)'; ctx.fillRect(-2, -18, 4, 18);
      break;
    case 12: // cocons
      ctx.fillStyle = 'rgba(120,40,60,0.7)';
      for (const dx of [-12, 2, 14]) { ctx.beginPath(); ctx.ellipse(dx, -10, 6, 10, 0, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 13: // avion
      ctx.beginPath(); ctx.moveTo(-24, -10); ctx.lineTo(20, -12); ctx.lineTo(24, -8); ctx.lineTo(-24, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(4, -24); ctx.lineTo(8, -10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-20, -8); ctx.lineTo(-24, -18); ctx.lineTo(-16, -8); ctx.fill();
      break;
    case 14: // reine
      ctx.fillStyle = 'rgba(120,30,50,0.75)';
      ctx.beginPath(); ctx.ellipse(-6, -10, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12, -20, 7, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(6 + k * 5, -26); ctx.lineTo(8 + k * 5, -34); ctx.lineTo(10 + k * 5, -26); ctx.fill(); }
      break;
    case 15: // wagons
      for (const dx of [-26, 0]) ctx.fillRect(dx, -14, 24, 12);
      ctx.fillRect(-28, -2, 56, 2);
      break;
    case 16: // dunes
      ctx.beginPath(); ctx.moveTo(-28, 0); ctx.quadraticCurveTo(-12, -20, 4, 0); ctx.quadraticCurveTo(16, -14, 28, 0); ctx.fill();
      break;
    case 17: // coupole
      ctx.fillRect(-16, -10, 32, 10);
      ctx.beginPath(); ctx.ellipse(0, -10, 16, 14, 0, Math.PI, 0); ctx.fill();
      break;
    case 18: // cratère
      ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -6, 24, 8, 0, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(200,90,30,0.6)'; ctx.beginPath(); ctx.ellipse(0, -4, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 19: // cœur
      ctx.fillStyle = 'rgba(160,30,60,0.8)';
      ctx.beginPath(); ctx.arc(-6, -16, 8, 0, Math.PI * 2); ctx.arc(6, -16, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, -13); ctx.lineTo(0, 2); ctx.lineTo(14, -13); ctx.fill();
      break;
  }
  ctx.restore();
}

function padlock(ctx, x, y) {
  ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y - 5, 7, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#d8d0c0'; ctx.fillRect(x - 10, y - 5, 20, 15);
  ctx.fillStyle = '#3a3330'; ctx.fillRect(x - 1.5, y, 3, 6);
}

export function drawMap(ctx, progress, buttons, pressed, selected, time, chapter) {
  const ch = CONFIG.chapters[chapter], first = ch.first - 1;
  ctx.fillStyle = 'rgba(15,8,4,0.55)';
  ctx.fillRect(0, 0, W, H);

  // Plateau : panneau de tôle avec une carte usée à l'intérieur
  drawPanel(ctx, BOARD.x - 8, BOARD.y - 8, BOARD.w + 16, BOARD.h + 16, 16);
  const g = ctx.createLinearGradient(0, BOARD.y, 0, BOARD.y + BOARD.h);
  g.addColorStop(0, '#c9a26a'); g.addColorStop(1, '#a8804e');
  roundRectPath(ctx, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 10);
  ctx.fillStyle = g; ctx.fill();
  ctx.save();
  roundRectPath(ctx, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 10);
  ctx.clip();
  // taches et relief (toujours les mêmes)
  for (let i = 0; i < 40; i++) {
    const x = BOARD.x + ((i * 389) % BOARD.w), y = BOARD.y + ((i * 211) % BOARD.h);
    ctx.fillStyle = i % 3 ? 'rgba(90,60,30,0.08)' : 'rgba(255,240,200,0.08)';
    ctx.beginPath(); ctx.ellipse(x, y, 40 + (i % 5) * 18, 20 + (i % 4) * 10, i, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(90,60,30,0.15)'; ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    for (let x = BOARD.x; x < BOARD.x + BOARD.w; x += 20) ctx.lineTo(x, BOARD.y + 80 + k * 90 + Math.sin(x * 0.01 + k) * 20);
    ctx.stroke();
  }
  // zone contaminée vers le nid
  const rg = ctx.createRadialGradient(470, 220, 10, 470, 220, 260);
  rg.addColorStop(0, 'rgba(140,30,50,0.35)'); rg.addColorStop(1, 'rgba(140,30,50,0)');
  ctx.fillStyle = rg; ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
  // teinte du chapitre (plus sombre et rouge dans le chapitre 2)
  if (ch.mapTint) { ctx.fillStyle = ch.mapTint; ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h); }
  // titre du chapitre
  text(ctx, ch.title, BOARD.x + 24, BOARD.y + 30, 24, 'rgba(60,36,18,0.75)', 'left', 'middle');

  // Route entre les étapes (pleine si parcourue, en pointillés sinon)
  for (let i = 0; i < NODES.length - 1; i++) {
    if (!CONFIG.levels[first + i + 1]) break;
    const [x1, y1] = NODES[i], [x2, y2] = NODES[i + 1];
    const done = CONFIG.levels[first + i + 1].id <= progress.unlocked;
    ctx.strokeStyle = done ? '#5a3a1e' : 'rgba(90,60,30,0.45)';
    ctx.lineWidth = done ? 7 : 5;
    ctx.setLineDash(done ? [] : [10, 9]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2 + (y2 - y1) * 0.3, (y1 + y2) / 2 - (x2 - x1) * 0.15, x2, y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Étapes
  NODES.forEach(([x, y], k) => {
    const i = first + k;
    const lv = CONFIG.levels[i];
    if (!lv) return;
    const locked = lv.id > progress.unlocked;
    const stars = progress.stars[lv.id] || 0;
    const current = !locked && !progress.won[lv.id];
    landmark(ctx, i, x + (k % 2 ? -52 : 52), y - 6);
    if (current) {
      const p = 0.5 + Math.sin(time * 4) * 0.5;
      ctx.fillStyle = `rgba(242,194,48,${0.25 + 0.25 * p})`;
      ctx.beginPath(); ctx.arc(x, y, R + 8 + p * 5, 0, Math.PI * 2); ctx.fill();
    }
    const press = pressed.has('node:' + i) ? 2 : 0;
    ctx.fillStyle = locked ? '#5a5450' : progress.won[lv.id] ? '#5a7a3a' : '#c0693a';
    ctx.beginPath(); ctx.arc(x, y + press, R, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = COL.dark; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(x, y + press, R - 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    if (locked) padlock(ctx, x, y + press + 2);
    else text(ctx, String(lv.id), x, y + press + 1, 28, '#fff', 'center', 'middle');
    if (lv.bosses.length) {
      roundRectPath(ctx, x + 14, y - R - 10, 44, 18, 6);
      ctx.fillStyle = '#8a1e1e'; ctx.fill();
      text(ctx, 'BOSS', x + 36, y - R - 1, 12, '#fff', 'center', 'middle');
    }
    // nom + étoiles
    ctx.font = `bold 15px ${FONT}`;
    const tw = ctx.measureText(lv.name).width + 14;
    roundRectPath(ctx, x - tw / 2, y + R + 6, tw, 22, 6);
    ctx.fillStyle = 'rgba(40,26,14,0.75)'; ctx.fill();
    text(ctx, lv.name, x, y + R + 18, 15, locked ? '#a89a88' : COL.text, 'center', 'middle');
    if (!locked) for (let k = 0; k < 3; k++) drawStar(ctx, x + (k - 1) * 22, y + R + 44, 10, k < stars);
  });
  ctx.restore();

  // Barre du haut
  text(ctx, 'Pièces : ' + progress.parts, W - 240, 46, 20, COL.yellow, 'right', 'middle');
  for (const b of buttons) {
    if (b.id === 'back' || b.id === 'workshop') drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: 22 });
    else if (b.id === 'survival') {
      drawButton(ctx, b, '', pressed.has(b.id), { primary: !b.lockedSurvival });
      // plaque jaune quand la Survie est ouverte : lettres sombres
      const dy = pressed.has(b.id) ? 2 : 0;
      if (b.lockedSurvival) text(ctx, 'MODE SURVIE', b.x + b.w / 2 + 12, b.y + b.h / 2 - 8, 20, COL.dim, 'center', 'middle');
      else stencilText(ctx, 'MODE SURVIE', b.x + b.w / 2, b.y + b.h / 2 - 8 + dy, 21, '#2a1d0e');
      text(ctx, b.lockedSurvival ? 'après le niveau ' + CONFIG.survival.unlockAfterLevel : 'record : vague ' + progress.survival.bestWave,
        b.x + b.w / 2 + (b.lockedSurvival ? 12 : 0), b.y + b.h / 2 + 15 + dy, 14, b.lockedSurvival ? COL.dim : '#4a3416', 'center', 'middle');
      if (b.lockedSurvival) padlock(ctx, b.x + 24, b.y + b.h / 2 + 2);
    }
    else if (b.chapter !== undefined) {
      drawButton(ctx, b, b.lockedChapter ? '' : b.label, pressed.has(b.id), { primary: b.selected, size: 19 });
      if (b.lockedChapter) {
        text(ctx, b.label, b.x + b.w / 2 + 10, b.y + b.h / 2 + 1, 17, COL.dim, 'center', 'middle');
        padlock(ctx, b.x + 22, b.y + b.h / 2 + 2);
      }
    }
  }
}

// Fiche d'un niveau
export function drawLevelInfo(ctx, progress, index, buttons, pressed) {
  const lv = CONFIG.levels[index];
  ctx.fillStyle = 'rgba(15,8,4,0.6)';
  ctx.fillRect(0, 0, W, H);
  const b0 = buttons[0];
  drawPanel(ctx, W / 2 - 330, 90, 660, b0.y + b0.h + 26 - 90, 16);
  text(ctx, 'Niveau ' + lv.id + ' — ' + CONFIG.chapters[chapterOf(lv.id)].title, W / 2, 132, 22, COL.dim, 'center', 'middle');
  text(ctx, lv.name, W / 2, 172, 40, COL.yellow, 'center', 'middle');
  const best = progress.stars[lv.id] || 0;
  for (let k = 0; k < 3; k++) drawStar(ctx, W / 2 + (k - 1) * 44, 226, 17, k < best);
  const names = Object.keys(lv.ai.weights).map((id) => CONFIG.units[id].name);
  const lines = [
    ['Nid mutant : ' + lv.enemyBaseHp + ' PV', COL.text],
    ['Mutants : ' + names.join(', '), COL.text],
  ];
  if (lv.bosses.length) {
    const counts = {};
    for (const n of bossNames(lv)) counts[n] = (counts[n] || 0) + 1;
    lines.push(['Boss : ' + Object.entries(counts).map(([n, k]) => n + (k > 1 ? ' ×' + k : '')).join(', '), '#ff8a6a']);
  }
  for (const m of unlocksAt(lv.id)) lines.push([m, COL.good]);
  // Étoiles : victoire + objectifs
  if (lv.rules && lv.rules.text) lines.push(['⚠ ' + lv.rules.text, '#ff8a6a']);
  for (const o of lv.objectives || []) lines.push(['★ ' + objectiveText(o), '#f2d27a']);
  const hid = progress.heroes.selected, hcfg = CONFIG.heroes.list[hid];
  if (hcfg && hcfg.unlockLevel <= progress.unlocked) lines.push(['Commandant : ' + hcfg.name + ' (niv. ' + progress.heroes.levels[hid] + ') — à changer dans Atelier › Héros', '#9fd0ff']);
  lines.push([`Récompense : ${CONFIG.stars.partsPerStar} pièces par nouvelle étoile` +
    (progress.won[lv.id] ? '' : ` (+${CONFIG.stars.firstWinBonus} à la 1re victoire)`), COL.yellow]);
  lines.forEach(([l, c], i) => {
    // le texte rétrécit s'il est trop long pour la fiche
    let size = 21;
    ctx.font = `bold ${size}px ${FONT}`;
    while (size > 13 && ctx.measureText(l).width > 620) { size--; ctx.font = `bold ${size}px ${FONT}`; }
    text(ctx, l, W / 2, 272 + i * 32, size, c, 'center', 'middle');
  });
  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: 26 });
}
