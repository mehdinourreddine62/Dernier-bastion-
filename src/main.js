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
let speedIndex = 0;
const camera = new Camera();
const renderer = new Renderer();
const hud = new HUD();
const input = new Input(canvas, view);
let buttons = [];

const portraitQuery = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

function startGame() {
  game = new Game(0);
  game.speed = CONFIG.loop.speeds[speedIndex];
  camera.reset();
  screen = 'playing';
}

function autoPause() {
  if (screen === 'playing' && game && !game.result) game.paused = true;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

// ---------- Boutons ----------
function overlayState() {
  if (screen === 'title') return 'title';
  if (game.paused) return 'pause';
  if (game.result && game.resultTime > CONFIG.combat.resultOverlayDelay) return 'end';
  return 'hud';
}

function buildButtons() {
  switch (overlayState()) {
    case 'title': return screens.titleButtons(view);
    case 'pause': return screens.pauseButtons(view);
    case 'end': return screens.endButtons(view);
    default: return game.result ? [] : hud.build(game, view);
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
  if (b.id.startsWith('recruit:')) { game.recruit('player', b.unit); return; }
  switch (b.id) {
    case 'play': case 'restart': startGame(); break;
    case 'pause': game.paused = true; break;
    case 'resume': game.paused = false; break;
    case 'menu': screen = 'title'; game = null; break;
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

// Clavier : 1-5 recrutement, Espace/Échap pause
input.onKey = (e) => {
  if (screen === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') startGame();
    return;
  }
  if (e.code === 'Space' || e.code === 'Escape') {
    if (!game.result) game.paused = !game.paused;
    return;
  }
  if (game.paused || game.result) return;
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (m) {
    const id = CONFIG.roster.player.filter((u) => CONFIG.units[u].unlockLevel <= game.level.id)[Number(m[1]) - 1];
    if (id) game.recruit('player', id);
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

  // Simulation à pas fixe
  if (screen === 'playing' && !game.paused) {
    acc += delta * game.speed;
    while (acc >= CONFIG.loop.fixedStep) {
      game.update(CONFIG.loop.fixedStep);
      acc -= CONFIG.loop.fixedStep;
    }
  }

  buttons = buildButtons();
  render(now / 1000);
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
    screens.drawTitle(ctx, buttons, input.pressed);
    return;
  }

  renderer.draw(ctx, game, camera, time);
  hud.draw(ctx, game, input.pressed);
  if (state === 'pause') screens.drawPause(ctx, buttons, input.pressed);
  else if (state === 'end') screens.drawEnd(ctx, game, buttons, input.pressed);
}

requestAnimationFrame(frame);
