import { CONFIG } from './config.js?v=26';
import { Game } from './game/Game.js?v=26';
import { Camera } from './game/Camera.js?v=26';
import { Renderer } from './render/Renderer.js?v=26';
import { HUD } from './ui/HUD.js?v=26';
import { Input } from './ui/input.js?v=26';
import * as screens from './ui/screens.js?v=26';
import * as campaign from './ui/campaign.js?v=26';
import * as workshop from './ui/workshop.js?v=26';
import { Tutorial } from './ui/tutorial.js?v=26';
import * as bestiary from './ui/bestiary.js?v=26';
import { checkAchievements, normalizeAchievements } from './achievements.js?v=26';
import { normalizeProgress, recordResult, playerMods, buyUpgrade, resetUpgrades, totalStars, maxStars,
  heroForGame, buyHeroLevel, resetHeroes, recordSurvival, isSurvivalUnlocked, chapterOf,
  recordBestiary, exportCode, parseCode } from './progress.js?v=26';
import { Sfx } from './audio/sfx.js?v=26';
import { Music } from './audio/music.js?v=26';
import { loadSave, writeSave } from './save.js?v=26';

// Numéro de version affiché sur l'écran titre : lu dans l'adresse de ce fichier (main.js?v=N),
// donc il suit automatiquement le numéro de version des fichiers. Bêta : 0.N
const VERSION_LABEL = 'Bêta 0.' + (new URL(import.meta.url).searchParams.get('v') || '0');

// ---------- Mise en place du canvas ----------
const canvas = document.getElementById('game');
const wrap = document.getElementById('wrap');
const ctx = canvas.getContext('2d');
const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };   // mise à l'échelle écran <-> monde logique
let dprCap = CONFIG.display.maxPixelRatio;           // abaissé en qualité basse

function resize() {
  const r = wrap.getBoundingClientRect();
  view.dpr = Math.min(window.devicePixelRatio || 1, dprCap);
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
const progress = normalizeProgress(save.progress);
normalizeAchievements(progress);
// Écran courant : 'title' | 'options' | 'map' | 'workshop' | 'playing'
let screen = 'title';
let game = null;
let selectedLevel = 0;
let mapInfo = null;      // niveau dont la fiche est ouverte sur la carte
let mapChapter = chapterOf(progress.unlocked);   // chapitre affiché sur la carte
let confirm = null;      // demande de confirmation { text, onYes }
let reward = null;       // gains de la dernière partie (écran de fin)
let tutorial = null;     // tutoriel en cours (niveau 1, première fois)
let showStats = false;   // écran BILAN ouvert par-dessus l'écran de fin
let achPage = 0;         // page de l'écran des succès
let workshopTab = 'workshop';   // onglet de l'atelier : 'workshop' | 'heroes'
let survivalRun = false;        // la partie en cours est-elle en mode Survie ?
let beastSel = null;            // mutant sélectionné dans le bestiaire
// Qualité : 'auto' (baisse toute seule si le jeu rame), 'high' ou 'low'
if (!settings.quality) settings.quality = 'auto';
let autoLow = false;
let frameEma = 16.7, slowTime = 0;
function applyQuality() {
  const low = settings.quality === 'low' || (settings.quality === 'auto' && autoLow);
  renderer.lowFx = low;
  const cap = low ? 1 : CONFIG.display.maxPixelRatio;
  if (cap !== dprCap) { dprCap = cap; resize(); }
}
const QUALITY_LABEL = { auto: 'AUTO', high: 'HAUTE', low: 'BASSE' };
const camera = new Camera();
const renderer = new Renderer();
const hud = new HUD();
const input = new Input(canvas, view);
const sfx = new Sfx();
sfx.setEnabled(settings.sound);
const music = new Music(sfx);
if (settings.music === undefined) settings.music = true;
music.setEnabled(settings.music);
applyQuality();
let buttons = [];
let shake = 0;                           // intensité de la secousse d'écran (0..1)
let toast = null;                        // { text, time }

// Visée d'un sort : { spell, sx, sy (position écran logique), visible, pointer }
let aim = null;

const portraitQuery = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

function saveSettings() { writeSave(save); }
const saveAll = saveSettings;
function askConfirm(text, onYes) { confirm = { text, onYes }; }

// ---------- Code de sauvegarde ----------
// Export : le code est copié dans le presse-papiers (sinon affiché dans une fenêtre pour le copier)
async function exportSave() {
  const code = exportCode(progress);
  try {
    await navigator.clipboard.writeText(code);
    showToast('Code de sauvegarde copié !\nColle-le dans une note ou un message pour le garder.', 4);
  } catch (e) {
    window.prompt('Copie ce code de sauvegarde et garde-le précieusement :', code);
  }
}

// Import : on colle un code, on vérifie, on demande confirmation avant de remplacer
function importSave() {
  const code = window.prompt('Colle ici ton code de sauvegarde (il commence par DB1-) :', '');
  if (code === null || !code.trim()) return;
  const data = parseCode(code);
  if (!data) { showToast('Code invalide.\nVérifie qu’il est copié en entier.', 3); return; }
  const p = normalizeProgress(data);
  askConfirm(`Charger cette sauvegarde ?\nNiveau ${p.unlocked} · ★ ${totalStars(p)} · ${p.parts} pièces\n(ta progression actuelle sera remplacée)`, () => {
    for (const k of Object.keys(progress)) delete progress[k];
    Object.assign(progress, p);
    normalizeAchievements(progress);
    saveAll();
    showToast('Sauvegarde chargée !', 2.5);
  });
}
function showToast(text, time = 4) { toast = { text, time }; }

function startGame() {
  game = new Game(selectedLevel, { mods: playerMods(progress), unlockedUpTo: progress.unlocked,
    hero: heroForGame(progress), survival: survivalRun });
  game.survivalBest = progress.survival.bestWave;
  reward = null;
  showStats = false;
  tutorial = !survivalRun && selectedLevel === 0 && !progress.tutorialDone ? new Tutorial() : null;
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

// ---------- Application installée ----------
// Lancé depuis l'icône de l'écran d'accueil ?
const isInstalled = () => window.matchMedia('(display-mode: fullscreen)').matches ||
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installPrompt = null;   // proposé par Chrome/Android quand le jeu est installable
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
window.addEventListener('appinstalled', () => { installPrompt = null; showToast('Dernier Bastion est installé !', 3); });

function installApp() {
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt.userChoice.finally(() => { installPrompt = null; });
  } else if (isIOS) {
    showToast("Pour installer le jeu : touche « Partager »\npuis « Sur l'écran d'accueil ».", 6);
  } else {
    showToast("Pour installer le jeu : ouvre le menu du navigateur\npuis « Installer l'application ».", 6);
  }
}

// ---------- Plein écran ----------
function toggleFullscreen() {
  const d = document;
  const el = d.documentElement;
  const isFs = d.fullscreenElement || d.webkitFullscreenElement;
  if (isInstalled() && !isFs && !el.requestFullscreen && !el.webkitRequestFullscreen) {
    showToast('Le jeu est déjà en plein écran.', 2.5);
    return;
  }
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
    if (inField(y) && game.spells.cast(aim.spell, camera.x + x)) {
      cancelAim();
      if (tutorial) tutorial.notify('cast');
    }
  }
};
input.onCancel = () => cancelAim();

// Mini-carte : la caméra se centre sur le point touché
input.onButtonDrag = (id, x) => {
  if (id === 'minimap' && canScroll()) camera.move(hud.minimapToWorld(x) - CONFIG.display.width / 2 - camera.x);
};

// ---------- Boutons ----------
function overlayState() {
  if (confirm) return 'confirm';
  if (screen !== 'playing') return screen;
  if (game.paused) return 'pause';
  if (game.result && game.resultTime > CONFIG.combat.resultOverlayDelay) return showStats ? 'stats' : 'end';
  if (tutorial && tutorial.showing && !game.result) return 'tuto';
  if (game.survival && game.survival.offer && !game.result) return 'cards';
  return 'hud';
}

function buildButtons() {
  switch (overlayState()) {
    case 'confirm': return screens.confirmButtons(view);
    case 'title': return screens.titleButtons(view, !isInstalled());
    case 'options': return screens.optionsButtons(view, settings, QUALITY_LABEL[settings.quality]);
    case 'map': return campaign.mapButtons(view, progress, mapInfo, mapChapter);
    case 'workshop': return workshop.workshopButtons(view, progress, workshopTab);
    case 'pause': return screens.pauseButtons(view, settings);
    case 'end': return screens.endButtons(view, game);
    case 'stats': return screens.statsButtons(view);
    case 'cards': return screens.cardsButtons(view, game.survival.offer);
    case 'achievements': return screens.achievementsButtons(view, achPage);
    case 'bestiary': return bestiary.bestiaryButtons(view);
    case 'tuto': {
      // Pendant une bulle : seuls les boutons utiles à l'étape restent actifs
      const all = hud.build(game, view, aim && aim.spell, settings);
      const allowed = tutorial.allowedIds();
      return [...all.filter((b) => allowed.includes(b.id)), ...tutorial.buttons(view, tutorial.targetRect(all, hud))];
    }
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

function goToMap() {
  // la carte s'ouvre sur le chapitre du niveau qu'on vient de jouer (sinon le dernier débloqué)
  mapChapter = chapterOf(game && !survivalRun ? Math.min(game.level.id + (game.result === 'won' ? 1 : 0), progress.unlocked) : progress.unlocked);
  screen = 'map';
  mapInfo = null;
  game = null;
  cancelAim();
}

input.onButton = (b) => {
  if (b.kind === 'unit') {
    if (!game.recruit('player', b.unit)) sfx.play('deny');
    else if (tutorial) tutorial.notify('recruit:' + b.unit);
    return;
  }
  if (b.kind === 'spell') { startAim(b.spell); return; }
  if (b.kind === 'hero') { game.heroAction(); return; }
  // Héros : amélioration (étoiles) et choix
  if (b.id.startsWith('heroUp:')) { if (buyHeroLevel(progress, b.hero)) { saveAll(); sfx.play('upgrade'); } return; }
  if (b.id.startsWith('heroPick:')) { progress.heroes.selected = b.hero; saveAll(); return; }
  if (b.id.startsWith('tab:')) { workshopTab = b.id.slice(4); return; }
  if (b.id.startsWith('card:')) { game.survival.choose(b.card); return; }
  if (b.id.startsWith('beast:')) { beastSel = b.beast; return; }
  sfx.play('click');
  // Carte : choix du chapitre
  if (b.chapter !== undefined) {
    if (b.lockedChapter) showToast('Termine le niveau ' + (CONFIG.chapters[b.chapter].first - 1) + '\npour ouvrir le ' + CONFIG.chapters[b.chapter].name.toLowerCase() + '.', 3);
    else mapChapter = b.chapter;
    return;
  }
  // Carte : toucher une étape ouvre sa fiche
  if (b.id.startsWith('node:')) {
    if (b.locked) showToast('Termine le niveau précédent pour débloquer ce lieu.', 2.5);
    else mapInfo = b.level;
    return;
  }
  // Atelier : achat
  if (b.id.startsWith('buy:')) {
    if (buyUpgrade(progress, b.upgrade)) {
      const fresh = checkAchievements(progress, null);
      if (fresh.length) showToast('Succès débloqué : ' + fresh[0].name + '\n+' + fresh[0].reward + ' pièces', 3);
      saveAll(); sfx.play('upgrade');
    }
    return;
  }
  switch (b.id) {
    // --- confirmation ---
    case 'confirmYes': { const f = confirm.onYes; confirm = null; f(); break; }
    case 'confirmNo': confirm = null; break;
    // --- menus ---
    case 'play': goToMap(); break;
    case 'options': screen = 'options'; break;
    case 'achievements': screen = 'achievements'; achPage = 0; break;
    case 'bestiary':
      screen = 'bestiary';
      beastSel = bestiary.BEASTS.find((id) => progress.bestiary[id] !== undefined) || null;
      break;
    case 'exportSave': exportSave(); break;
    case 'importSave': importSave(); break;
    case 'achPrev': achPage = Math.max(0, achPage - 1); break;
    case 'achNext': achPage = Math.min(screens.achievementPages() - 1, achPage + 1); break;
    case 'stats': showStats = true; break;
    case 'closeStats': showStats = false; break;
    case 'install': installApp(); break;
    case 'workshop': screen = 'workshop'; game = null; cancelAim(); break;
    case 'back': screen = screen === 'workshop' ? 'map' : 'title'; break;
    case 'eraseSave':
      askConfirm('Effacer toute la progression ?\n(niveaux, étoiles, pièces et atelier)', () => {
        for (const k of Object.keys(progress)) delete progress[k];
        normalizeProgress(progress);
        saveAll();
        showToast('Sauvegarde effacée.', 2.5);
      });
      break;
    case 'resetHeroes':
      askConfirm('Réinitialiser les commandants ?\nToutes les étoiles dépensées seront rendues.', () => {
        const n = resetHeroes(progress);
        saveAll();
        showToast(n + ' étoiles rendues.', 2.5);
      });
      break;
    case 'reset':
      askConfirm('Réinitialiser toutes les améliorations ?\nToutes les pièces dépensées seront rendues.', () => {
        const n = resetUpgrades(progress);
        saveAll();
        showToast(n + ' pièces rendues.', 2.5);
      });
      break;
    // --- carte ---
    case 'launch': selectedLevel = mapInfo; mapInfo = null; survivalRun = false; startGame(); break;
    case 'survival':
      if (!isSurvivalUnlocked(progress)) showToast('Termine le niveau ' + CONFIG.survival.unlockAfterLevel + '\npour débloquer la Survie.', 3);
      else { survivalRun = true; startGame(); }
      break;
    case 'closeInfo': mapInfo = null; break;
    // --- en partie ---
    case 'income': if (game.upgradeIncome('player') && tutorial) tutorial.notify('income'); break;
    case 'tutoOk': tutorial.next(); break;
    case 'tutoSkip': tutorial.skip(); break;
    case 'quality': {
      const order = ['auto', 'high', 'low'];
      settings.quality = order[(order.indexOf(settings.quality) + 1) % order.length];
      autoLow = false; applyQuality(); saveSettings();
      break;
    }
    case 'replayTuto': progress.tutorialDone = false; saveAll(); showToast('Le tutoriel se lancera au niveau 1.', 2.5); break;
    case 'cancelAim': cancelAim(); break;
    case 'restart': recordBestiary(progress, game); saveAll(); startGame(); break;
    case 'next': selectedLevel = Math.min(CONFIG.levels.length - 1, selectedLevel + 1); startGame(); break;
    case 'map': goToMap(); break;
    case 'pause': game.paused = true; cancelAim(); break;
    case 'resume': game.paused = false; break;
    case 'abandon': recordBestiary(progress, game); saveAll(); goToMap(); break;
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
    case 'toggleMusic':
      settings.music = !settings.music;
      music.setEnabled(settings.music);
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
const canScroll = () => screen === 'playing' && game && !game.paused && ['hud', 'tuto'].includes(overlayState());
input.onDrag = (dx) => { if (canScroll()) camera.move(-dx); };
input.onWheel = (d) => { if (canScroll()) camera.move(d * CONFIG.camera.wheelFactor); };

// Clavier : 1-5 recrutement, Q/W sorts, Espace pause, Échap annule la visée / pause
input.onKey = (e) => {
  if (confirm) { if (e.code === 'Escape') confirm = null; return; }
  if (screen !== 'playing') {
    if (e.code === 'Escape') {
      if (screen === 'map' && mapInfo !== null) mapInfo = null;
      else if (screen === 'workshop') screen = 'map';
      else screen = 'title';
    } else if (e.code === 'Enter') {
      if (screen === 'title') goToMap();
      else if (screen === 'map' && mapInfo !== null) { selectedLevel = mapInfo; mapInfo = null; startGame(); }
    }
    return;
  }
  if (e.code === 'Escape' && aim) { cancelAim(); return; }
  if (e.code === 'Space' || e.code === 'Escape') {
    if (!game.result) { game.paused = !game.paused; cancelAim(); }
    return;
  }
  if (game.paused || game.result || ['tuto', 'cards'].includes(overlayState())) return;
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (m) {
    const id = CONFIG.roster.player.filter((u) => game.isUnlocked('player', u))[Number(m[1]) - 1];
    if (id && !game.recruit('player', id)) sfx.play('deny');
    return;
  }
  const k = e.key.toLowerCase();
  if (k === 'e') { game.heroAction(); return; }
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

// Intensité de la musique : calme dans les menus, plus forte en partie, danger si boss ou base menacée
function musicIntensity() {
  if (screen !== 'playing' || !game || game.result) return 0;
  const base = game.bases.player;
  for (const u of game.units) {
    if (!u.alive || u.side !== 'enemy') continue;
    if (u.tags.includes('boss') || u.x - base.faceX < 600) return 2;
  }
  return 1;
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

  // Qualité automatique : si le jeu rame plusieurs secondes, on allège le rendu
  if (settings.quality === 'auto' && !autoLow && screen === 'playing' && delta < 0.1) {
    frameEma = frameEma * 0.95 + delta * 1000 * 0.05;
    slowTime = frameEma > 20 ? slowTime + delta : 0;
    if (slowTime > 3) { autoLow = true; applyQuality(); showToast('Qualité réduite automatiquement pour rester fluide.', 3); }
  }

  // Tutoriel : une bulle met le jeu en pause jusqu'à l'action demandée
  if (tutorial && screen === 'playing' && !game.paused && !game.result) {
    tutorial.update(game, camera);
    if (tutorial.showing && tutorial.step.wait === 'scroll' && camera.x > 250) tutorial.notify('scroll');
    if (tutorial.done) { progress.tutorialDone = true; saveAll(); tutorial = null; }
  }
  const frozen = (tutorial && tutorial.showing) || (game && game.survival && game.survival.offer);

  // Simulation à pas fixe
  if (screen === 'playing' && !game.paused && !frozen) {
    acc += delta * game.speed;
    while (acc >= CONFIG.loop.fixedStep) {
      game.update(CONFIG.loop.fixedStep);
      acc -= CONFIG.loop.fixedStep;
    }
    if (aim && (game.result || !game.spells.isReady(aim.spell))) cancelAim();
    // Fin de partie : étoiles, pièces, déblocages -> sauvegarde automatique
    if (game.result && !reward) {
      reward = game.survival ? recordSurvival(progress, game)
        : recordResult(progress, game.levelIndex, game.result === 'won', game.stars);
      reward.achievements = checkAchievements(progress, game);
      recordBestiary(progress, game);
      if (reward.achievements.length) sfx.play('upgrade');
      saveAll();
    }
  }
  if (screen === 'playing') handleEvents();
  music.update(musicIntensity());
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

  // Décor : celui du niveau joué, ou du dernier lieu atteint dans les menus
  const levelId = screen === 'playing' ? game.level.id : progress.unlocked;
  renderer.prepare(levelId, view.dpr * view.scale);

  const state = overlayState();
  if (screen !== 'playing') {
    renderer.drawBackdrop(ctx, 0, time);
    const p = input.pressed;
    if (screen === 'title') screens.drawTitle(ctx, buttons, p, progress, { stars: totalStars(progress), max: maxStars(), version: VERSION_LABEL });
    else if (screen === 'options') screens.drawOptions(ctx, buttons, p);
    else if (screen === 'achievements') screens.drawAchievements(ctx, progress, achPage, buttons, p);
    else if (screen === 'bestiary') bestiary.drawBestiary(ctx, progress, beastSel, buttons, p);
    else if (screen === 'map') {
      campaign.drawMap(ctx, progress, mapInfo === null ? buttons : campaign.mapButtons(view, progress, null, mapChapter), mapInfo === null ? p : new Set(), mapInfo, time, mapChapter);
      if (mapInfo !== null && !confirm) campaign.drawLevelInfo(ctx, progress, mapInfo, buttons, p);
    } else if (screen === 'workshop') {
      const wb = confirm ? workshop.workshopButtons(view, progress, workshopTab) : buttons;
      if (workshopTab === 'heroes') workshop.drawHeroes(ctx, progress, wb, p); else workshop.drawWorkshop(ctx, progress, wb, p);
    }
    if (confirm) screens.drawConfirm(ctx, confirm.text, buttons, p);
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
  if (state === 'tuto' && !aim) {
    const all = hud.buttons;
    tutorial.draw(ctx, tutorial.targetRect(all, hud), buttons.filter((b) => b.id.startsWith('tuto')), input.pressed, time);
  }
  if (state === 'pause') screens.drawPause(ctx, buttons, input.pressed);
  else if (state === 'end') screens.drawEnd(ctx, game, buttons, input.pressed, reward);
  else if (state === 'stats') screens.drawStats(ctx, game, buttons, input.pressed);
  else if (state === 'cards') screens.drawCards(ctx, buttons, input.pressed);
  if (toast) hud.drawToast(ctx, toast.text);
}

requestAnimationFrame(frame);
