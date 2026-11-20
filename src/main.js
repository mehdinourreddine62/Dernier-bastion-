import { CONFIG } from './config.js?v=4';
import { Game } from './game/Game.js?v=4';
import { Camera } from './game/Camera.js?v=4';
import { Renderer } from './render/Renderer.js?v=4';
import { HUD } from './ui/HUD.js?v=4';
import { Input } from './ui/input.js?v=4';
import * as screens from './ui/screens.js?v=4';
import { Sfx } from './audio/sfx.js?v=4';
import { loadSave, writeSave } from './save.js?v=4';

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
document.addEventListener('fullscreenchange', () => setTimeout(resize, 50));
document.addEventListener('webkitfullscreenchange', () => setTimeout(resize, 50));
resize();

// ---------- État global ----------
const save = loadSave();
const settings = save.settings;          // { sound, shake, speedIndex }
let screen = 'title';                    // 'title' | 'playing'
let game = null;
let selectedLevel = 0;
const camera = new Camera();
const renderer = new Renderer();
const hud = new HUD();
const input = new Input(canvas, view);
const sfx = new Sfx();
sfx.setEnabled(settings.sound);
let buttons = [];
let shake = 0;                           // intensité de la secousse d'écran (0..1)
let toast = null;                        // { text, time }

// Visée d'un sort : { spell, sx, sy (position écran logique), visible, pointer }
let aim = null;

const portraitQuery = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

function saveSettings() { writeSave(save); }
function showToast(text, time = 4) { toast = { text, time }; }

function startGame() {
  game = new Game(selectedLevel);
  game.speed = CONFIG.loop.speeds[settings.speedIndex] || 1;
  camera.reset();
  cancelAim();
  shake = 0;
  screen = 'playing';
}

function autoPause() {
  if (screen === 'playing' && game && !game.result) { game.paused = true; cancelAim(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

// Le son ne peut démarrer qu'après une interaction de l'utilisateur
input.onInteract = () => sfx.unlock();

// ---------- Plein écran ----------
function toggleFullscreen() {
  const d = document;
  const el = d.documentElement;
  const isFs = d.fullscreenElement || d.webkitFullscreenElement;
  try {
    if (isFs) {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    } else if (el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' })
        .then(() => {
          // Android : on verrouille en paysage une fois en plein écran
          const o = window.screen.orientation;
          if (o && o.lock) o.lock('landscape').catch(() => {});
        })
        .catch(() => showToast('Le plein écran est refusé par ce navigateur.'));
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else {
      // iPhone : Safari ne permet pas le plein écran pour une page web
      showToast("Sur iPhone : touche « Partager » puis\n« Sur l'écran d'accueil » pour jouer en plein écran.", 6);
    }
  } catch (e) {
    showToast('Le plein écran n’est pas disponible ici.');
  }
}
// ---------- Sorts : visée ----------
function startAim(spell) {
  if (!game.spells.isReady(spell)) return;
  if (aim && aim.spell === spell) { cancelAim(); return; }   // re-toucher le bouton = annuler
  const m = input.mouse;
  aim = { spell, sx: m.inside ? m.x : CONFIG.display.width / 2, sy: 450, visible: m.inside, pointer: null };
  input.aiming = true;
  sfx.play('click');
}
function cancelAim() {
  aim = null;
  input.aiming = false;
}
// Zone où l'on peut viser : entre la barre du haut et la barre du bas
const inField = (y) => y > 60 && y < hud.barY;

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

// Mini-carte : la caméra se centre sur le point touché
input.onButtonDrag = (id, x) => {
  if (id === 'minimap' && canScroll()) camera.move(hud.minimapToWorld(x) - CONFIG.display.width / 2 - camera.x);
};

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
    case 'pause': return screens.pauseButtons(view, settings);
    case 'end': return screens.endButtons(view);
    default: return game.result ? [] : hud.build(game, view, aim && aim.spell, settings);
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
  if (b.kind === 'unit') { if (!game.recruit('player', b.unit)) sfx.play('deny'); return; }
  if (b.kind === 'spell') { startAim(b.spell); return; }
  sfx.play('click');
  if (b.level !== undefined) { selectedLevel = b.level; return; }
  switch (b.id) {
    case 'income': game.upgradeIncome('player'); break;
    case 'cancelAim': cancelAim(); break;
    case 'play': case 'restart': startGame(); break;
    case 'pause': game.paused = true; cancelAim(); break;
    case 'resume': game.paused = false; break;
    case 'menu': screen = 'title'; game = null; cancelAim(); break;
    case 'speed':
      settings.speedIndex = (settings.speedIndex + 1) % CONFIG.loop.speeds.length;
      game.speed = CONFIG.loop.speeds[settings.speedIndex];
      saveSettings();
      break;
    case 'sound': case 'toggleSound':
      settings.sound = !settings.sound;
      sfx.setEnabled(settings.sound);
      saveSettings();
      break;
    case 'toggleShake':
      settings.shake = !settings.shake;
      saveSettings();
      break;
    case 'fullscreen': toggleFullscreen(); break;
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
    if (id && !game.recruit('player', id)) sfx.play('deny');
    return;
  }
  const k = e.key.toLowerCase();
  for (const id of game.spells.available) {
    if (CONFIG.spells[id].key.toLowerCase() === k) startAim(id);
  }
};

// ---------- Événements du jeu : sons et secousses ----------
function handleEvents() {
  sfx.cameraX = camera.x;
  for (const e of game.events) {
    sfx.playEvent(e);
    if (e.type === 'explosion' && settings.shake) {
      // secousse plus forte si l'explosion est à l'écran
      const onScreen = e.x > camera.x - 100 && e.x < camera.x + CONFIG.display.width + 100;
      if (onScreen) shake = Math.min(1, shake + (e.data && e.data.huge ? 0.9 : e.data && e.data.big ? 0.35 : 0.15));
    } else if (e.type === 'slam' && settings.shake) {
      shake = Math.min(1, shake + 0.3);
    }
  }
  game.events.length = 0;
}

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
  if (screen === 'playing') handleEvents();
  shake = Math.max(0, shake - delta * 2.2);
  if (toast && (toast.time -= delta) <= 0) toast = null;

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

  const levelId = screen === 'title' ? CONFIG.levels[selectedLevel].id : game.level.id;
  renderer.prepare(levelId, view.dpr * view.scale);

  const state = overlayState();
  if (screen === 'title') {
    renderer.drawBackdrop(ctx, 0, time);
    screens.drawTitle(ctx, buttons, input.pressed, selectedLevel);
    if (toast) hud.drawToast(ctx, toast.text);
    return;
  }

  // Secousse d'écran : seule la scène bouge, pas l'interface
  ctx.save();
  if (shake > 0.01) {
    const s = shake * shake * 12;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  renderer.draw(ctx, game, camera, time);
  if (aim && aim.visible) {
    const c = CONFIG.spells[aim.spell];
    renderer.drawAim(ctx, camera, camera.x + aim.sx, c.radius, aim.spell === 'heal' ? '#7ee05a' : '#ff9a2b', time);
  }
  ctx.restore();

  hud.draw(ctx, game, input.pressed, aim && aim.spell, camera);
  if (state === 'hud') {
    const tb = tooltipButton();
    if (tb) hud.drawTooltip(ctx, tb, game);
  }
  if (state === 'pause') screens.drawPause(ctx, buttons, input.pressed);
  else if (state === 'end') screens.drawEnd(ctx, game, buttons, input.pressed);
  if (toast) hud.drawToast(ctx, toast.text);
}

requestAnimationFrame(frame);
