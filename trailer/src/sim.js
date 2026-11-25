// Plans de jeu de la bande-annonce : le vrai moteur et le vrai rendu de Dernier Bastion,
// pilotés par une mise en scène (apparitions, explosions, caméra) au lieu du joueur et de l'IA.
// Le hasard est rendu reproductible (graine fixe) : chaque image peut être recalculée à l'identique.
import { CONFIG } from '../../src/config.js?v=32';
import { Game } from '../../src/game/Game.js?v=32';
import { Renderer } from '../../src/render/Renderer.js?v=32';
import { playerMods, normalizeProgress } from '../../src/progress.js?v=32';

// ---------- Hasard reproductible ----------
let seed = 1;
Math.random = function () {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const R = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const STEP = 1 / 60;
const W = CONFIG.display.width;

// Fait apparaître une unité ; « weak » réduit ses PV (les mutants tombent plus vite à l'écran)
function spawn(g, side, id, x, weak = 1) {
  const u = g.spawnUnit(side, id, x);
  if (weak !== 1) { u.maxHp *= weak; u.hp = u.maxHp; }
  return u;
}

// Fait baisser des PV jusqu'à une valeur cible (pour caler un moment précis sur la musique)
// (par la vraie fonction de dégâts du jeu, pour que la mort se déclenche normalement)
function capHp(g, e, hp) {
  if (!e || !e.alive || e.hp <= hp) return;
  const flash = e.hitFlash, shake = e.shake;
  g.dealDamage('player', e, e.hp - Math.max(0, hp) + (hp <= 0 ? 1 : 0), false, true);
  e.hitFlash = flash; if (shake !== undefined) e.shake = shake;   // ni clignotement ni tremblement dus à ce réglage
}

// ---------- Les plans ----------
const SHOTS = {
  // 1) La horde fonce sur le fort ; tireurs, Kane et mitrailleuse tiennent la ligne
  defense: {
    level: 6, seed: 7, warm: 2.5, upg: 6, hero: 'kane',
    setup(g) {
      for (let i = 0; i < 5; i++) spawn(g, 'player', 'tireur', 250 + i * 22);
      for (let i = 0; i < 4; i++) spawn(g, 'player', 'pillard', 380 + i * 18);
      spawn(g, 'player', 'lanceFlammes', 340);
      g.deployHero();
      for (let i = 0; i < 16; i++) spawn(g, 'enemy', pick(['goule', 'goule', 'chien', 'cracheur']), R(780, 1350), 0.8);
    },
    direct(g, t, s) {
      if ((s.e = (s.e || 0) - STEP) <= 0) { s.e = 0.28; spawn(g, 'enemy', pick(['goule', 'goule', 'goule', 'chien', 'cracheur', 'brute']), 1420 + R(0, 160), 0.7); }
      if ((s.p = (s.p || 0) - STEP) <= 0) { s.p = 1.1; spawn(g, 'player', pick(['tireur', 'pillard', 'tireur']), 230); }
      if (s.once(5.5)) g.spells.cast('mortar', 760);
      if (s.once(8.2)) g.explode('player', 900, 60, 150, null, false, 'big');
    },
    camera(g, t) { return Math.min(220, t * 14); },
  },
  // 2) La contre-attaque, dans la neige : l'armée avance en ligne
  push: {
    level: 20, seed: 21, warm: 3, upg: 7, hero: 'vasquez', startCam: 0,
    setup(g) {
      const army = ['tireur', 'tireur', 'tireur', 'pillard', 'pillard', 'pillard', 'lanceFlammes', 'lanceFlammes', 'mitrailleur', 'lanceRoquettes', 'motard', 'motard'];
      army.forEach((id, i) => spawn(g, 'player', id, 600 + i * 34));
      spawn(g, 'player', 'blinde', 560); spawn(g, 'player', 'blinde', 720);
      g.deployHero(); g.hero.unit.x = 640;
      for (let i = 0; i < 18; i++) spawn(g, 'enemy', pick(['goule', 'goule', 'carapace', 'chien', 'epineux']), R(1150, 1750), 0.5);
      g.bases.enemy.turret.range = 0;
    },
    direct(g, t, s) {
      if ((s.e = (s.e || 0) - STEP) <= 0) { s.e = 0.45; spawn(g, 'enemy', pick(['goule', 'goule', 'chien', 'carapace', 'charognard']), s.cam + W + R(60, 200), 0.45); }
      if ((s.p = (s.p || 0) - STEP) <= 0) { s.p = 0.8; spawn(g, 'player', pick(['tireur', 'pillard', 'mitrailleur', 'lanceFlammes', 'motard']), s.cam - 40); }
      if (s.once(4.2)) g.spells.cast('mortar', s.cam + 900);
      if (s.once(7.4)) g.explode('player', s.cam + 1000, 60, 150, null, false, 'big');
      if (s.once(9.0)) g.explode('player', s.cam + 1120, 60, 150, null, false, 'big');
    },
    camera(g, t, s) {
      // suit la ligne de front, en douceur
      let front = 0;
      for (const u of g.byX.player) if (u.alive && !u.def.flying) front = Math.max(front, u.x);
      const want = Math.max(300, front - 760);
      return s.cam + (want - s.cam) * Math.min(1, STEP * 1.5);
    },
  },
  // 3) Assaut final : l'Abomination sort, puis le Nid s'effondre
  nest: {
    level: 9, seed: 42, warm: 2, upg: 8, hero: 'rosa',
    setup(g) {
      const army = ['blinde', 'lanceRoquettes', 'lanceRoquettes', 'tireur', 'tireur', 'mitrailleur', 'pillard', 'pillard', 'pillard', 'lanceFlammes', 'tireur', 'blinde'];
      army.forEach((id, i) => spawn(g, 'player', id, 2160 + i * 30));
      g.deployHero(); g.hero.unit.x = 2250;
      for (let i = 0; i < 10; i++) spawn(g, 'enemy', pick(['goule', 'chien', 'couveuse', 'hurleur']), R(2650, 2950), 0.5);
      g.bases.enemy.hp = g.bases.enemy.maxHp * 0.62;
      g.level.bosses = []; g.bossDone = [];     // pas de boss automatiques : la mise en scène gère l'Abomination
    },
    direct(g, t, s) {
      if (s.once(2.6)) { s.boss = spawn(g, 'enemy', 'abomination', 2990, 0.55); g.banner = null; }
      if ((s.p = (s.p || 0) - STEP) <= 0) { s.p = 0.7; spawn(g, 'player', pick(['tireur', 'lanceRoquettes', 'blinde', 'pillard', 'mitrailleur']), 1960); }
      if ((s.e = (s.e || 0) - STEP) <= 0) { s.e = 0.9; spawn(g, 'enemy', pick(['goule', 'chien', 'larve']), 3000, 0.5); }
      // calage sur la musique (le plan est visible à partir de t = 2 s) :
      // l'Abomination tombe à t = 7 s, le Nid s'effondre à t = 8 s (impact sonore à 28,5 s de la vidéo)
      if (s.boss) capHp(g, s.boss, s.boss.maxHp * Math.max(0, (7 - t) / 4.4));
      const nb = g.bases.enemy;
      if (t > 3) capHp(g, nb, nb.maxHp * 0.62 * Math.max(0, (8 - t) / 5));
      if (s.once(6.0)) g.spells.cast('mortar', 2860);
      // effondrement du Nid : chapelet d'explosions
      for (const [at, x] of [[8.0, 3060], [8.25, 2990], [8.5, 3120], [8.8, 3020], [9.2, 3080]]) {
        if (s.once(at)) g.explode('player', x, 70, 0, null, false, 'big');
      }
    },
    camera() { return CONFIG.world.width - W; },
  },
};

// ---------- Simulation d'un plan, rejouée à l'identique si besoin ----------
class Shot {
  constructor(def) { this.def = def; this.reset(); }
  reset() {
    const d = this.def;
    seed = d.seed;
    const p = normalizeProgress({ unlocked: 30 });
    for (const id in p.upgrades) p.upgrades[id] = d.upg;
    this.g = new Game(d.level, { mods: playerMods(p), unlockedUpTo: 30, hero: { id: d.hero, level: 8 } });
    this.g.ai.update = () => {};          // la mise en scène remplace l'IA
    this.t = 0; this.frame = -1; this.fired = new Set();
    this.cam = d.startCam || 0;
    this.cam = d.camera(this.g, 0, this);
    d.setup(this.g, this);
    for (let i = 0; i < d.warm * 60; i++) this.step();
  }
  once(time) {                             // vrai une seule fois, quand le temps du plan dépasse « time »
    if (this.t < time || this.fired.has(time)) return false;
    this.fired.add(time); return true;
  }
  step() {
    this.def.direct(this.g, this.t, this);
    this.g.update(STEP);
    this.g.events.length = 0;
    for (const t of this.g.fx.texts) t.active = false;   // pas de chiffres de dégâts dans la vidéo
    this.t += STEP;
    this.cam = Math.max(0, Math.min(CONFIG.world.width - W, this.def.camera(this.g, this.t, this)));
  }
  advanceTo(frame, fps) {
    if (frame < this.frame) this.reset();
    while (this.frame < frame) { for (let k = 0; k < 60 / fps; k++) this.step(); this.frame++; }
  }
}

const shots = {};
const renderer = new Renderer();

// Dessine l'image « frame » du plan « name » dans le canvas (1920 × 1080)
export function drawShot(name, frame, fps, canvas) {
  const s = shots[name] || (shots[name] = new Shot(SHOTS[name]));
  s.advanceTo(frame, fps);
  const k = canvas.width / W;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(k, 0, 0, k, 0, 0);
  renderer.prepare(s.g.level.id, k);
  renderer.draw(ctx, s.g, { x: s.cam }, s.t);
}

// Décor seul (intro et fin) : la caméra glisse lentement
export function drawBackdrop(levelId, time, canvas) {
  const k = canvas.width / W;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(k, 0, 0, k, 0, 0);
  renderer.prepare(levelId, k);
  renderer.drawBackdrop(ctx, 400 + time * 30, time);
}
