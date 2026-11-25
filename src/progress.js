import { CONFIG } from './config.js?v=26';

// Progression de la campagne : niveaux débloqués, étoiles, pièces détachées, atelier.
// L'objet `progress` vit dans la sauvegarde (save.js) ; ces fonctions le lisent et le modifient.

// Une seule campagne de 20 niveaux en 2 chapitres : p.unlocked (dernier niveau ouvert),
// p.stars[id] (meilleur nombre d'étoiles), p.won[id] (niveau déjà gagné).
export function normalizeProgress(p) {
  if (p.modes) {
    // Ancienne sauvegarde avec des modes de difficulté : seule la campagne Normal est gardée
    const n = p.modes.normal || {};
    p.stars = n.stars || {};
    p.won = n.won || {};
    p.unlocked = Math.max(p.unlocked || 1, n.unlocked || 1);
    delete p.modes; delete p.mode;
  }
  p.stars = p.stars || {};
  p.won = p.won || {};
  p.unlocked = Math.max(1, Math.min(CONFIG.levels.length, p.unlocked || 1));
  // Le niveau qui suit un niveau gagné est ouvert (ex. le 11 pour une campagne de 10 déjà finie)
  while (p.unlocked < CONFIG.levels.length && p.won[p.unlocked]) p.unlocked++;
  // Commandants : héros choisi, niveaux, étoiles déjà dépensées
  p.heroes = p.heroes || {};
  p.heroes.levels = p.heroes.levels || {};
  for (const id of CONFIG.heroes.order) p.heroes.levels[id] = p.heroes.levels[id] || 0;
  p.heroes.starsSpent = p.heroes.starsSpent || 0;
  if (!CONFIG.heroes.list[p.heroes.selected]) p.heroes.selected = CONFIG.heroes.order[0];
  // Étoiles des anciens modes disparues : si les héros en avaient coûté plus, ils sont remis à zéro
  if (p.heroes.starsSpent > totalStars(p)) resetHeroes(p);
  // Bestiaire : mutants déjà rencontrés et nombre tués (p.bestiary[id] = tués).
  // Ancienne sauvegarde : on considère rencontrés les mutants des niveaux déjà gagnés.
  if (!p.bestiary) {
    p.bestiary = {};
    for (const lv of CONFIG.levels) {
      if (!p.won[lv.id]) continue;
      const ids = Object.keys(lv.ai.weights).concat(lv.bosses.map((b) => b.unit));
      for (const id of ids) {
        p.bestiary[id] = 0;
        const s = CONFIG.units[id].spawnOnDeath || CONFIG.units[id].summon;
        if (s) p.bestiary[s.unit] = 0;
      }
    }
  }
  // Mode Survie : records et paliers déjà récompensés
  p.survival = Object.assign({ bestWave: 0, bestScore: 0, tier: 0 }, p.survival || {});
  p.parts = p.parts || 0;           // pièces détachées disponibles
  p.upgrades = p.upgrades || {};    // niveau de chaque amélioration de l'atelier
  for (const id of CONFIG.workshop.order) p.upgrades[id] = p.upgrades[id] || 0;
  return p;
}

export function totalStars(p) {
  let n = 0;
  for (const k in p.stars) n += p.stars[k];
  return n;
}
export const maxStars = () => CONFIG.levels.length * 3;

// Chapitre (index) qui contient ce niveau
export const chapterOf = (levelId) => Math.max(0, CONFIG.chapters.findIndex((c) => levelId >= c.first && levelId <= c.last));

// Copie du niveau (la partie peut la modifier sans toucher à la configuration)
export function levelFor(index) {
  return JSON.parse(JSON.stringify(CONFIG.levels[index]));
}

// Unités et sorts qui deviennent disponibles avec le niveau `levelId`
export function unlocksAt(levelId) {
  const out = [];
  for (const id of CONFIG.roster.player) {
    if (CONFIG.units[id].unlockLevel === levelId && levelId > 1) out.push('Nouvelle unité : ' + CONFIG.units[id].name);
  }
  for (const id in CONFIG.spells) {
    if (CONFIG.spells[id].unlockLevel === levelId && levelId > 1) out.push('Nouveau sort : ' + CONFIG.spells[id].name);
  }
  return out;
}

// Enregistre le résultat d'une partie. Renvoie ce qui a été gagné (pour l'écran de fin).
export function recordResult(p, levelIndex, won, stars) {
  const id = CONFIG.levels[levelIndex].id;
  const res = { parts: 0, newStars: 0, firstWin: false, messages: [] };
  if (!won) return res;
  const before = p.stars[id] || 0;
  if (stars > before) {
    res.newStars = stars - before;
    p.stars[id] = stars;
  }
  res.parts += res.newStars * CONFIG.stars.partsPerStar;
  if (!p.won[id]) {
    p.won[id] = true;
    res.firstWin = true;
    res.parts += CONFIG.stars.firstWinBonus;
  }
  p.parts += res.parts;
  // Débloque le niveau suivant
  const next = CONFIG.levels[levelIndex + 1];
  if (next && p.unlocked < next.id) {
    p.unlocked = next.id;
    const ch = CONFIG.chapters[chapterOf(next.id)];
    if (ch.first === next.id) res.messages.push(ch.name.charAt(0) + ch.name.slice(1).toLowerCase() + ' débloqué : ' + ch.title + ' !');
    res.messages.push('Niveau ' + next.id + ' débloqué : ' + next.name);
    res.messages.push(...unlocksAt(next.id));
  }
  if (!next && res.firstWin) res.messages.push('Campagne terminée. Bravo, commandant !');
  return res;
}

// Texte d'un objectif d'étoile
export function objectiveText(obj) {
  if (obj.type === 'time') {
    const m = Math.floor(obj.max / 60), s = obj.max % 60;
    return 'Gagner en moins de ' + m + ' min' + (s ? ' ' + String(s).padStart(2, '0') : '');
  }
  if (obj.type === 'losses') return 'Perdre ' + obj.max + ' unités maximum';
  if (obj.type === 'baseHp') return 'Garder ' + Math.round(obj.min * 100) + ' % des PV de ta base';
  return '';
}

// ---------- Atelier ----------

// Niveau de campagne qui débloque cette amélioration (1 pour la base, les sorts…)
export function upgradeUnlockLevel(id) {
  return CONFIG.units[id] ? CONFIG.units[id].unlockLevel : 1;
}

export function isUpgradeAvailable(p, id) {
  return upgradeUnlockLevel(id) <= p.unlocked;
}

// Coût du prochain niveau (null si au maximum)
export function upgradeCost(p, id) {
  const lvl = p.upgrades[id] || 0;
  const w = CONFIG.workshop;
  return lvl < w.maxLevel ? w.costs[lvl] : null;
}

export function buyUpgrade(p, id) {
  const cost = upgradeCost(p, id);
  if (cost === null || p.parts < cost || !isUpgradeAvailable(p, id)) return false;
  p.parts -= cost;
  p.upgrades[id]++;
  return true;
}

// Rembourse toutes les améliorations. Renvoie le nombre de pièces rendues.
export function resetUpgrades(p) {
  const w = CONFIG.workshop;
  let refund = 0;
  for (const id of w.order) {
    for (let i = 0; i < p.upgrades[id]; i++) refund += w.costs[i];
    p.upgrades[id] = 0;
  }
  p.parts += refund;
  return refund;
}

// Description de l'effet d'une amélioration à un niveau donné (texte affiché dans l'atelier)
export function upgradeEffect(id, lvl) {
  const w = CONFIG.workshop;
  const pct = (v) => '+' + Math.round(v * 100) + ' %';
  if (CONFIG.units[id]) return `PV ${pct(w.unitHpBonus * lvl)} · Dégâts ${pct(w.unitDamageBonus * lvl)}`;
  if (id === 'walls') return `PV de la base +${w.wallHpBonus * lvl}`;
  if (id === 'turret') return `Dégâts ${pct(w.turretDamageBonus * lvl)} · Portée ${pct(w.turretRangeBonus * lvl)}`;
  if (id === 'salvage') return `Revenu de départ +${w.incomeBonus * lvl}/s`;
  if (id === 'spells') return `Recharge des sorts -${Math.round(w.spellCooldownReduction * lvl * 100)} %`;
  return '';
}

// Bonus à appliquer en partie, calculés depuis l'atelier
export function playerMods(p) {
  const w = CONFIG.workshop;
  const u = p.upgrades;
  const units = {};
  for (const id of CONFIG.roster.player) {
    units[id] = { hp: 1 + w.unitHpBonus * u[id], damage: 1 + w.unitDamageBonus * u[id] };
  }
  return {
    units,
    wallLevel: u.walls, turretLevel: u.turret,   // pour l'apparence du fort
    wallHp: w.wallHpBonus * u.walls,
    turretDamage: 1 + w.turretDamageBonus * u.turret,
    turretRange: 1 + w.turretRangeBonus * u.turret,
    income: w.incomeBonus * u.salvage,
    spellCooldown: Math.max(0.1, 1 - w.spellCooldownReduction * u.spells),
  };
}

// ---------- Commandants ----------
// Les améliorations se paient en étoiles : toutes celles gagnées dans la campagne,
// moins celles déjà dépensées.
export const heroStarsAvailable = (p) => totalStars(p) - p.heroes.starsSpent;

export const heroUnlocked = (p, id) => CONFIG.heroes.list[id].unlockLevel <= p.unlocked;

export function heroCost(p, id) {
  const lvl = p.heroes.levels[id];
  return lvl < CONFIG.heroes.maxLevel ? CONFIG.heroes.costs[lvl] : null;
}

export function buyHeroLevel(p, id) {
  const cost = heroCost(p, id);
  if (cost === null || !heroUnlocked(p, id) || heroStarsAvailable(p) < cost) return false;
  p.heroes.levels[id]++;
  p.heroes.starsSpent += cost;
  return true;
}

export function resetHeroes(p) {
  const refund = p.heroes.starsSpent;
  for (const id of CONFIG.heroes.order) p.heroes.levels[id] = 0;
  p.heroes.starsSpent = 0;
  return refund;
}

// Héros à emmener en partie (null si aucun n'est débloqué)
export function heroForGame(p) {
  const id = p.heroes.selected;
  if (!id || !heroUnlocked(p, id)) return null;
  return { id, level: p.heroes.levels[id] };
}

// ---------- Mode Survie ----------
export const isSurvivalUnlocked = (p) => !!p.won[CONFIG.survival.unlockAfterLevel];

// Fin d'une partie de Survie : record, pièces (par vague + paliers atteints pour la 1re fois)
export function recordSurvival(p, game) {
  const S = CONFIG.survival, sv = game.survival;
  const waves = Math.max(0, sv.wave - 1);          // vagues entièrement tenues
  const score = sv.score;
  const res = { parts: waves * S.rewards.perWave, waves, wave: sv.wave, score, newRecord: false, messages: [], survival: true };
  const tier = Math.floor(waves / S.rewards.milestoneEvery);
  for (let t = p.survival.tier + 1; t <= tier; t++) {
    res.parts += S.rewards.milestonePieces * t;
    res.messages.push('Palier ' + t * S.rewards.milestoneEvery + ' vagues atteint pour la 1re fois : +' + S.rewards.milestonePieces * t + ' pièces');
  }
  p.survival.tier = Math.max(p.survival.tier, tier);
  if (score > p.survival.bestScore) { res.newRecord = p.survival.bestScore > 0; p.survival.bestScore = score; }
  p.survival.bestWave = Math.max(p.survival.bestWave, sv.wave);
  p.parts += res.parts;
  return res;
}

// ---------- Bestiaire ----------
// À la fin (ou à l'abandon) d'une partie : mutants rencontrés et tués
export function recordBestiary(p, game) {
  if (game.bestiaryDone) return;
  game.bestiaryDone = true;
  for (const id in game.seen) p.bestiary[id] = p.bestiary[id] || 0;
  for (const [id, n] of Object.entries(game.stats.killedEnemy)) p.bestiary[id] = (p.bestiary[id] || 0) + n;
}

// ---------- Code de sauvegarde (export / import) ----------
// Code = « DB1- » + progression en JSON encodée en base64 (lettres et chiffres, facile à copier).
export function exportCode(p) {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'DB1-' + btoa(bin);
}

// Renvoie la progression contenue dans le code, ou null si le code est invalide
export function parseCode(code) {
  try {
    const raw = String(code || '').replace(/\s+/g, '');
    if (!raw.startsWith('DB1-')) return null;
    const bin = atob(raw.slice(4));
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (!p || typeof p !== 'object' || typeof p.parts !== 'number') return null;
    return p;
  } catch (e) {
    return null;
  }
}
