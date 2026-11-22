import { CONFIG } from '../config.js?v=17';
import { COL, FONT, drawPanel, drawButton, drawStar, text } from './widgets.js?v=17';
import { objectiveText } from '../progress.js?v=17';
import { drawIcon, drawSpellIcon } from '../render/sprites.js?v=17';
import { ACHIEVEMENTS } from '../achievements.js?v=17';
import { roundRectPath } from './widgets.js?v=17';

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
export function titleButtons(view, canInstall) {
  const btns = column(view, [['play', 'JOUER', true], ['workshop', 'ATELIER'], ['options', 'OPTIONS']], 300);
  const m = minSize(view);
  // Bouton « Succès » en bas à gauche
  {
    const w = Math.max(190, m), h = Math.max(54, m);
    btns.push({ id: 'achievements', label: '🏆 SUCCÈS', small: true, enabled: true, x: 20, y: H - h - 20, w, h });
  }
  // Bouton « Installer » discret en bas à droite (absent si le jeu est déjà installé)
  if (canInstall) {
    const w = Math.max(190, m), h = Math.max(54, m);
    btns.push({ id: 'install', label: '⬇ INSTALLER', small: true, enabled: true, x: W - w - 20, y: H - h - 20, w, h });
  }
  return btns;
}

export function drawTitle(ctx, buttons, pressed, progress, stats) {
  dim(ctx, 0.4);
  bigTitle(ctx, 'DERNIER BASTION', 150, 96);
  text(ctx, 'Survivants contre Mutants', W / 2, 230, 30, COL.text, 'center', 'middle');
  drawAll(ctx, buttons, pressed, 32);
  if (stats.version) text(ctx, stats.version, W / 2, H - 22, 16, COL.dim, 'center', 'middle');
  const last = buttons.find((b) => b.id === 'options');
  text(ctx, `★ ${stats.stars} / ${stats.max}     Pièces détachées : ${progress.parts}`,
    W / 2, Math.min(H - 24, last.y + last.h + 40), 22, COL.yellow, 'center', 'middle');
}

// ---------- Options (depuis le titre) ----------
export function optionsButtons(view, settings, qualityLabel) {
  const h = Math.max(62, minSize(view));
  const gap = 12, w = 300, full = 2 * w + gap;
  const x0 = (W - full) / 2, x1 = x0 + w + gap;
  let y = 150;
  const b = (id, label, x, bw, primary) => ({ id, label, x, y, w: bw, h, enabled: true, primary });
  const yes = (v) => (v ? 'OUI' : 'NON');
  const out = [b('toggleSound', 'SON : ' + yes(settings.sound), x0, w), b('toggleMusic', 'MUSIQUE : ' + yes(settings.music), x1, w)];
  y += h + gap;
  out.push(b('toggleShake', 'SECOUSSES : ' + yes(settings.shake), x0, w), b('quality', 'QUALITÉ : ' + qualityLabel, x1, w));
  y += h + gap;
  out.push(b('replayTuto', 'REVOIR LE TUTORIEL', x0, full));
  y += h + gap;
  out.push(b('eraseSave', 'EFFACER LA SAUVEGARDE', x0, full));
  y += h + gap;
  out.push(b('back', 'RETOUR', x0, full, true));
  return out;
}

export function drawOptions(ctx, buttons, pressed) {
  dim(ctx, 0.55);
  bigTitle(ctx, 'OPTIONS', 82, 56);
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
  btns.push({ id: 'toggleMusic', label: 'MUSIQUE : ' + (settings.music ? 'OUI' : 'NON'), enabled: true, x: x + hw + 12, y, w: hw, h, small: true });
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
    ? [...(hasNext ? [['next', 'NIVEAU SUIVANT', true]] : []), ['restart', 'REJOUER', !hasNext], ['stats', 'BILAN'], ['map', 'CARTE']]
    : [['restart', 'RÉESSAYER', true], ['stats', 'BILAN'], ['workshop', 'ATELIER'], ['map', 'CARTE']];
  return row(view, ids, 560, ids.length > 3 ? 168 : 210);
}

// reward = résultat de recordResult (pièces gagnées, messages de déblocage)
export function drawEnd(ctx, game, buttons, pressed, reward) {
  dim(ctx, 0.6);
  drawPanel(ctx, W / 2 - 370, 50, 740, Math.max(640, buttons[0].y + buttons[0].h + 24) - 50, 16);
  if (game.survival) { drawSurvivalEnd(ctx, game, reward); drawAll(ctx, buttons, pressed, buttons.length > 3 ? 18 : 22); return; }
  const won = game.result === 'won';
  text(ctx, won ? 'VICTOIRE !' : 'DÉFAITE', W / 2, 112, 56, won ? COL.yellow : COL.bad, 'center', 'middle');
  text(ctx, 'Niveau ' + game.level.id + ' — ' + game.level.name + (game.mode !== 'normal' ? ' (' + CONFIG.modes[game.mode].name + ')' : ''),
    W / 2, 162, 22, COL.dim, 'center', 'middle');
  for (let i = 0; i < 3; i++) drawStar(ctx, W / 2 + (i - 1) * 86, 228, 36, i < game.stars);
  const pct = Math.round(Math.max(0, game.bases.player.hp / game.bases.player.maxHp) * 100);
  const t = Math.round(game.time);
  const dur = Math.floor(t / 60) + ' min ' + String(t % 60).padStart(2, '0') + ' s';
  text(ctx, won ? `Base restante : ${pct} %   ·   Durée : ${dur}` : `Le nid mutant a détruit ta base.   ·   Durée : ${dur}`,
    W / 2, 298, 21, COL.text, 'center', 'middle');
  // Objectifs d'étoiles : rempli (✓) ou raté (✗)
  let y = 336;
  for (const { obj, ok } of game.objectives) {
    const done = won && ok;
    text(ctx, (done ? '✓ ' : '✗ ') + objectiveText(obj), W / 2, y, 20, done ? COL.good : '#e88a6a', 'center', 'middle');
    y += 28;
  }
  y += 14;
  if (reward && reward.parts > 0) {
    const detail = reward.firstWin ? ` (dont ${Math.round(CONFIG.stars.firstWinBonus * CONFIG.modes[game.mode].partsMult)} de première victoire)` : '';
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
  // Succès débloqués pendant cette partie
  const ach = (reward && reward.achievements) || [];
  if (ach.length) {
    const gain = ach.reduce((n, a) => n + a.reward, 0);
    const line = '🏆 Succès : ' + ach.map((a) => a.name).join(', ') + ' (+' + gain + ' pièces)';
    let size = 21;
    ctx.font = `bold ${size}px ${FONT}`;
    while (size > 12 && ctx.measureText(line).width > 700) { size--; ctx.font = `bold ${size}px ${FONT}`; }
    text(ctx, line, W / 2, Math.min(y, 540), size, COL.yellow, 'center', 'middle');
  }
  drawAll(ctx, buttons, pressed, buttons.length > 3 ? 18 : 22);
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

// ---------- Bilan de la partie ----------
const SOURCE_NAME = { turret: 'Tourelle', mortar: 'Mortier' };

export function statsButtons(view) {
  const h = Math.max(60, minSize(view));
  return [{ id: 'closeStats', label: 'RETOUR', primary: true, enabled: true, x: W / 2 - 120, y: H - h - 24, w: 240, h }];
}

export function drawStats(ctx, game, buttons, pressed) {
  dim(ctx, 0.75);
  drawPanel(ctx, 30, 24, W - 60, H - 48, 16);
  const st = game.stats;
  text(ctx, 'BILAN — Niveau ' + game.level.id + ' · ' + game.level.name, W / 2, 62, 30, COL.yellow, 'center', 'middle');

  // Colonne de gauche : totaux
  const t = Math.round(game.time);
  const lines = [
    ['Durée', Math.floor(t / 60) + ' min ' + String(t % 60).padStart(2, '0')],
    ['Ferraille gagnée', Math.round(st.scrapEarned)],
    ['Unités recrutées', st.recruited],
    ['Unités perdues', st.lost],
    ['Mutants tués', st.killed],
    ['Armée max.', st.maxPop],
    ['Dégâts subis par la base', Math.round(st.baseDamage)],
    ['Mortiers / soins lancés', (st.spells.mortar || 0) + ' / ' + (st.spells.heal || 0)],
  ];
  lines.forEach(([k, v], i) => {
    const y = 128 + i * 52;
    roundRectPath(ctx, 56, y - 20, 380, 42, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
    text(ctx, k, 70, y + 1, 18, COL.dim, 'left', 'middle');
    text(ctx, String(v), 422, y + 1, 22, COL.text, 'right', 'middle');
  });

  // Tableau par source de dégâts
  // Commandant en premier (s'il a combattu), puis les unités, la tourelle posée, la tourelle du fort et le mortier
  const heroIds = CONFIG.heroes.order.map((h) => 'hero_' + h);
  const sources = [...heroIds, ...CONFIG.roster.player, 'tourelleCampagne', 'turret', 'mortar']
    .filter((id) => st.damage[id] || st.recruitedBy[id] || st.kills[id]);
  const maxDmg = Math.max(1, ...sources.map((id) => st.damage[id] || 0));
  let mvp = null;
  for (const id of sources) if (!mvp || (st.damage[id] || 0) > (st.damage[mvp] || 0)) mvp = id;
  const x0 = 470;
  text(ctx, 'recrutées', x0 + 300, 104, 14, COL.dim, 'center', 'middle');
  text(ctx, 'perdues', x0 + 380, 104, 14, COL.dim, 'center', 'middle');
  text(ctx, 'tués', x0 + 450, 104, 14, COL.dim, 'center', 'middle');
  text(ctx, 'dégâts infligés', x0 + 610, 104, 14, COL.dim, 'center', 'middle');
  const rowH = Math.min(60, 470 / Math.max(1, sources.length));
  sources.forEach((id, i) => {
    const y = 140 + i * rowH;
    roundRectPath(ctx, x0 - 10, y - rowH / 2 + 4, 750, rowH - 8, 8);
    ctx.fillStyle = id === mvp ? 'rgba(242,194,48,0.18)' : 'rgba(0,0,0,0.25)'; ctx.fill();
    if (CONFIG.units[id]) drawIcon(ctx, id, x0 + 22, y, rowH - 14);
    else drawSpellIcon(ctx, id === 'mortar' ? 'mortar' : 'turret', x0 + 22, y, rowH - 18);
    const name = CONFIG.units[id] ? CONFIG.units[id].name : SOURCE_NAME[id];
    text(ctx, name + (id === mvp ? '  ★ MVP' : ''), x0 + 52, y + 1, 18, id === mvp ? COL.yellow : COL.text, 'left', 'middle');
    // commandant : pas de recrutement, « perdues » = nombre de morts ; tourelles et mortier : —
    const isHero = !!(CONFIG.units[id] && CONFIG.units[id].hero);
    const recruitable = CONFIG.units[id] && !isHero && !CONFIG.units[id].lifetime;
    text(ctx, recruitable ? String(st.recruitedBy[id] || 0) : '—', x0 + 300, y + 1, 19, COL.text, 'center', 'middle');
    text(ctx, recruitable ? String(st.lostBy[id] || 0) : isHero ? String(st.heroDeaths || 0) : '—', x0 + 380, y + 1, 19, COL.text, 'center', 'middle');
    text(ctx, String(st.kills[id] || 0), x0 + 450, y + 1, 19, COL.text, 'center', 'middle');
    const dmg = st.damage[id] || 0;
    const bw = 165 * dmg / maxDmg;
    ctx.fillStyle = id === mvp ? COL.yellow : '#c0693a';
    ctx.fillRect(x0 + 500, y - 7, Math.max(2, bw), 14);
    text(ctx, String(Math.round(dmg)), x0 + 735, y + 1, 16, COL.text, 'right', 'middle');
  });
  if (!sources.length) text(ctx, 'Aucune donnée pour cette partie.', x0 + 360, 200, 20, COL.dim, 'center', 'middle');
  drawAll(ctx, buttons, pressed, 24);
}

// ---------- Succès ----------
const PER_PAGE = 10;
export const achievementPages = () => Math.ceil(ACHIEVEMENTS.length / PER_PAGE);

export function achievementsButtons(view, page) {
  const m = minSize(view);
  const h = Math.max(56, m);
  return [
    { id: 'back', label: '◀ RETOUR', enabled: true, x: 24, y: 16, w: Math.max(170, m), h },
    { id: 'achPrev', label: '◀', enabled: page > 0, x: W - 24 - 2 * Math.max(70, m) - 10, y: 16, w: Math.max(70, m), h },
    { id: 'achNext', label: '▶', enabled: page < achievementPages() - 1, x: W - 24 - Math.max(70, m), y: 16, w: Math.max(70, m), h },
  ];
}

function trophy(ctx, x, y, s, gold) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 40, s / 40);
  ctx.fillStyle = gold ? '#f2c230' : '#5a5450';
  ctx.strokeStyle = '#1d130c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(14, -16); ctx.quadraticCurveTo(13, 4, 0, 6); ctx.quadraticCurveTo(-13, 4, -14, -16); ctx.fill(); ctx.stroke();
  ctx.fillRect(-3, 6, 6, 7); ctx.fillRect(-10, 13, 20, 5); ctx.strokeRect(-10, 13, 20, 5);
  ctx.lineWidth = 3; ctx.strokeStyle = gold ? '#f2c230' : '#5a5450';
  ctx.beginPath(); ctx.arc(-14, -9, 6, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(14, -9, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  ctx.restore();
}

export function drawAchievements(ctx, progress, page, buttons, pressed) {
  dim(ctx, 0.75);
  const done = ACHIEVEMENTS.filter((a) => progress.achievements[a.id]).length;
  text(ctx, 'SUCCÈS', W / 2, 40, 34, COL.text, 'center', 'middle');
  text(ctx, done + ' / ' + ACHIEVEMENTS.length + ' débloqués · page ' + (page + 1) + '/' + achievementPages(), W / 2, 76, 18, COL.yellow, 'center', 'middle');
  const list = ACHIEVEMENTS.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const cw = (W - 48 - 16) / 2, ch = (H - 110 - 4 * 10) / 5;
  list.forEach((a, i) => {
    const x = 24 + (i % 2) * (cw + 16), y = 100 + Math.floor(i / 2) * (ch + 10);
    const ok = !!progress.achievements[a.id];
    drawPanel(ctx, x, y, cw, ch, 10);
    if (!ok) { roundRectPath(ctx, x, y, cw, ch, 10); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(); }
    trophy(ctx, x + 44, y + ch / 2 + 2, 44, ok);
    text(ctx, a.name, x + 84, y + 32, 21, ok ? COL.yellow : COL.text, 'left', 'middle');
    text(ctx, a.desc, x + 84, y + 60, 16, COL.dim, 'left', 'middle');
    text(ctx, ok ? '✓ +' + a.reward : '+' + a.reward + ' pièces', x + cw - 16, y + 32, 18, ok ? COL.good : COL.yellow, 'right', 'middle');
    if (a.goal && !ok) {
      const v = Math.min(a.goal, a.total(progress));
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 84, y + ch - 20, cw - 200, 8);
      ctx.fillStyle = COL.good; ctx.fillRect(x + 84, y + ch - 20, (cw - 200) * v / a.goal, 8);
      text(ctx, v + ' / ' + a.goal, x + cw - 16, y + ch - 16, 15, COL.text, 'right', 'middle');
    }
  });
  for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: 22 });
}

// ---------- Survie : choix d'une carte bonus ----------
export function cardsButtons(view, offer) {
  const n = offer.length, w = 330, gap = 24;
  const x0 = (W - (n * w + (n - 1) * gap)) / 2;
  return offer.map((id, i) => ({ id: 'card:' + id, card: id, enabled: true, x: x0 + i * (w + gap), y: 200, w, h: 340 }));
}

export function drawCards(ctx, buttons, pressed) {
  dim(ctx, 0.7);
  bigTitle(ctx, 'BOSS VAINCU !', 92, 52, COL.yellow);
  text(ctx, 'Choisis un bonus pour le reste de la partie', W / 2, 150, 24, COL.text, 'center', 'middle');
  for (const b of buttons) {
    const c = CONFIG.survival.cards[b.card];
    const dy = pressed.has(b.id) ? 3 : 0;
    drawPanel(ctx, b.x, b.y + dy, b.w, b.h, 14);
    roundRectPath(ctx, b.x, b.y + dy, b.w, b.h, 14);
    ctx.lineWidth = 3; ctx.strokeStyle = COL.yellow; ctx.stroke();
    roundRectPath(ctx, b.x + 20, b.y + dy + 20, b.w - 40, 140, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    if (CONFIG.units[c.icon]) drawIcon(ctx, c.icon, b.x + b.w / 2, b.y + dy + 90, 120);
    else drawSpellIcon(ctx, c.icon, b.x + b.w / 2, b.y + dy + 90, 90);
    text(ctx, c.name, b.x + b.w / 2, b.y + dy + 200, 24, COL.yellow, 'center', 'middle');
    let size = 19;
    ctx.font = `bold ${size}px ${FONT}`;
    while (size > 13 && ctx.measureText(c.desc).width > b.w - 30) { size--; ctx.font = `bold ${size}px ${FONT}`; }
    text(ctx, c.desc, b.x + b.w / 2, b.y + dy + 245, size, COL.text, 'center', 'middle');
    text(ctx, 'Toucher pour choisir', b.x + b.w / 2, b.y + dy + b.h - 30, 16, COL.dim, 'center', 'middle');
  }
}

function drawSurvivalEnd(ctx, game, reward) {
  const sv = game.survival;
  text(ctx, 'FIN DE LA SURVIE', W / 2, 112, 52, COL.bad, 'center', 'middle');
  text(ctx, 'Ta base est tombée à la vague ' + sv.wave, W / 2, 168, 24, COL.text, 'center', 'middle');
  text(ctx, 'Score : ' + sv.score, W / 2, 226, 44, COL.yellow, 'center', 'middle');
  if (reward && reward.newRecord) text(ctx, '★ NOUVEAU RECORD ★', W / 2, 274, 26, COL.good, 'center', 'middle');
  const t = Math.round(game.time);
  text(ctx, `Vagues tenues : ${Math.max(0, sv.wave - 1)}   ·   Mutants tués : ${game.stats.killed}   ·   Durée : ${Math.floor(t / 60)} min ${String(t % 60).padStart(2, '0')}`,
    W / 2, 318, 19, COL.dim, 'center', 'middle');
  const cards = sv.cards.map((id) => CONFIG.survival.cards[id].name);
  text(ctx, 'Bonus choisis : ' + (cards.length ? cards.join(', ') : 'aucun'), W / 2, 352, 17, COL.text, 'center', 'middle');
  let y = 396;
  if (reward && reward.parts > 0) { text(ctx, '+' + reward.parts + ' pièces détachées', W / 2, y, 24, COL.yellow, 'center', 'middle'); y += 34; }
  for (const m of (reward && reward.messages) || []) { text(ctx, m, W / 2, y, 19, COL.good, 'center', 'middle'); y += 28; }
  const ach = (reward && reward.achievements) || [];
  if (ach.length) text(ctx, '🏆 Succès : ' + ach.map((a) => a.name).join(', ') + ' (+' + ach.reduce((n, a) => n + a.reward, 0) + ' pièces)', W / 2, Math.min(y, 540), 18, COL.yellow, 'center', 'middle');
}
