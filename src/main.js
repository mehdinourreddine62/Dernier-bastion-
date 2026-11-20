import { CONFIG } from './config.js';
import { Game } from './game/Game.js';
import { Camera } from './game/Camera.js';
import { Renderer } from './render/Renderer.js';
import { HUD } from './ui/HUD.js';
import { Input } from './ui/input.js';
import * as screens from './ui/screens.js';

// ---------- Mise en place du canvas ----------
const canvas = document.getElementById('game');
const wrap = document.getElementById('wrap');
const ctx = canvas.getContext('2d');
const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };   // mise à l'échelle écran <-> monde logique

function resize() {
  const r = wrap.getBoundingClientRect();
  view.dpr = Math.min(window.devicePixelRatio || 1, CONFIG.display.maxPixelRatio);
  canvas.width = Math.max(1, Math.round(r.width * view.dpr));
  canvas.height = Math.max(1, Math.round(r.height * view.dpr));
  view.scale = Math.min(r.width / CONFIG.display.width, r.height / CONFIG.display.height);
  view.ox = (r.width - CONFIG.display.width * view.scale) / 2;
  view.oy = (r.height - CONFIG.display.height * view.scale) / 2;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

// ---------- État global ----------
let screen = 'title';          // 'title' | 'playing'
let game = null;
let selectedLevel = 0;
let speedIndex = 0;
const camera = new Camera();
const renderer = new Renderer();
const hud = new HUD();
const input = new Input(canvas, view);
let buttons = [];

// Visée d'un sort : { spell, sx, sy (position écran logique), visible, pointer }
let aim = null;

const portraitQuery = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

function startGame() {
  game = new Game(selectedLevel);
  game.speed = CONFIG.loop.speeds[speedIndex];
  camera.reset();
  cancelAim();
  screen = 'playing';
}

function autoPause() {
  if (screen === 'playing' && game && !game.result) { game.paused = true; cancelAim(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

// ---------- Sorts : visée ----------
function startAim(spell) {
  if (!game.spells.isReady(spell)) return;
  if (aim && aim.spell === spell) { cancelAim(); return; }   // re-toucher le bouton = annuler
  const m = input.mouse;
  aim = { spell, sx: m.inside ? m.x : CONFIG.display.width / 2, sy: 450, visible: m.inside, pointer: null };
  input.aiming = true;
}
function cancelAim() {
  aim = null;
  input.aiming = false;
}
// Zone où l'on peut viser : entre la barre du haut et la barre du bas
const inField = (y) => y > 70 && y < hud.barY;

input.onAim = (x, y, phase, type) => {
  if (!aim) return;
  aim.sx = x; aim.sy = y;
  aim.visible = inField(y);
  aim.pointer = phase === 'down' || phase === 'move' ? type : null;
  if (phase === 'up') {
    if (inField(y) && game.spells.cast(aim.spell, camera.x + x)) cancelAim();
  }
};
input.onCancel = () => cancelAim();

// ---------- Boutons ----------
function overlayState() {
  if (screen === 'title') return 'title';
  if (game.paused) return 'pause';
  if (game.result && game.resultTime > CONFIG.combat.resultOverlayDelay) return 'end';
  return 'hud';
}

function buildButtons() {
  switch (overlayState()) {
    case 'title': return screens.titleButtons(view, selectedLevel);
    case 'pause': return screens.pauseButtons(view);
    case 'end': return screens.endButtons(view);
    default: return game.result ? [] : hud.build(game, view, aim && aim.spell);
  }
}

input.hitTest = (x, y) => {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
};

input.onButton = (b) => {
  if (b.kind === 'unit') { game.recruit('player', b.unit); return; }
  if (b.kind === 'spell') { startAim(b.spell); return; }
  if (b.level !== undefined) { selectedLevel = b.level; return; }
  switch (b.id) {
    case 'income': game.upgradeIncome('player'); break;
    case 'cancelAim': cancelAim(); break;
    case 'play': case 'restart': startGame(); break;
    case 'pause': game.paused = true; cancelAim(); break;
    case 'resume': game.paused = false; break;
    case 'menu': screen = 'title'; game = null; cancelAim(); break;
    case 'speed':
      speedIndex = (speedIndex + 1) % CONFIG.loop.speeds.length;
      game.speed = CONFIG.loop.speeds[speedIndex];
      break;
  }
};

// Caméra : glisser, molette
const canScroll = () => screen === 'playing' && game && !game.paused && overlayState() === 'hud';
input.onDrag = (dx) => { if (canScroll()) camera.move(-dx); };
input.onWheel = (d) => { if (canScroll()) camera.move(d * CONFIG.camera.wheelFactor); };

// Clavier : 1-5 recrutement, Q/W sorts, Espace pause, Échap annule la visée / pause
input.onKey = (e) => {
  if (screen === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') startGame();
    return;
  }
  if (e.code === 'Escape' && aim) { cancelAim(); return; }
  if (e.code === 'Space' || e.code === 'Escape') {
    if (!game.result) { game.paused = !game.paused; cancelAim(); }
    return;
  }
  if (game.paused || game.result) return;
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (m) {
    const id = CONFIG.roster.player.filter((u) => game.isUnlocked('player', u))[Number(m[1]) - 1];
    if (id) game.recruit('player', id);
    return;
  }
  const k = e.key.toLowerCase();
  for (const id of game.spells.available) {
    if (CONFIG.spells[id].key.toLowerCase() === k) startAim(id);
  }
};

// ---------- Boucle principale ----------
let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const delta = Math.min((now - last) / 1000, CONFIG.loop.maxDelta);
  last = now;

  // Téléphone en portrait : pause automatique (l'écran « Tourne ton téléphone » est en CSS)
  if (portraitQuery.matches) autoPause();

  camera.update(delta, input, canScroll());
  // En visant au doigt : la caméra défile si le doigt approche du bord
  if (aim && aim.pointer && aim.pointer !== 'mouse' && canScroll()) {
    const z = CONFIG.camera.aimEdgeZone;
    if (aim.sx < z) camera.move(-CONFIG.camera.edgeScrollSpeed * delta);
    else if (aim.sx > CONFIG.display.width - z) camera.move(CONFIG.camera.edgeScrollSpeed * delta);
  }

  // Simulation à pas fixe
  if (screen === 'playing' && !game.paused) {
    acc += delta * game.speed;
    while (acc >= CONFIG.loop.fixedStep) {
      game.update(CONFIG.loop.fixedStep);
      acc -= CONFIG.loop.fixedStep;
    }
    if (aim && (game.result || !game.spells.isReady(aim.spell))) cancelAim();
  }

  buttons = buildButtons();
  render(now / 1000);
}

// Bouton dont il faut afficher l'infobulle : survol souris, ou appui long au doigt
function tooltipButton() {
  const id = input.longPressedButton();
  if (id) return buttons.find((b) => b.id === id && b.tooltip) || null;
  if (input.mouse.inside && input.pointers.size === 0) {
    const b = input.hitTest(input.mouse.x, input.mouse.y);
    if (b && b.tooltip) return b;
  }
  return null;
}

function render(time) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.ox, view.dpr * view.oy);
  ctx.beginPath();
  ctx.rect(0, 0, CONFIG.display.width, CONFIG.display.height);
  ctx.clip();

  const state = overlayState();
  if (screen === 'title') {
    renderer.drawBackdrop(ctx, 0, time);
    screens.drawTitle(ctx, buttons, input.pressed, selectedLevel);
    return;
  }

  renderer.draw(ctx, game, camera, time);
  if (aim && aim.visible) {
    const c = CONFIG.spells[aim.spell];
    renderer.drawAim(ctx, camera, camera.x + aim.sx, c.radius, aim.spell === 'heal' ? '#7ee05a' : '#ff9a2b', time);
  }
  hud.draw(ctx, game, input.pressed, aim && aim.spell);
  if (state === 'hud') {
    const tb = tooltipButton();
    if (tb) hud.drawTooltip(ctx, tb, game);
  }
  if (state === 'pause') screens.drawPause(ctx, buttons, input.pressed);
  else if (state === 'end') screens.drawEnd(ctx, game, buttons, input.pressed);
}

requestAnimationFrame(frame);
