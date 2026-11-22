import { CONFIG } from './config.js?v=14';

// Progression de la campagne : niveaux débloqués, étoiles, pièces détachées, atelier.
// L'objet `progress` vit dans la sauvegarde (save.js) ; ces fonctions le lisent et le modifient.

// La campagne se joue dans plusieurs modes (Normal, Difficile, Cauchemar) : chaque mode a
// ses propres niveaux débloqués et ses étoiles (p.modes[mode]). Les pièces et l'atelier sont communs.
// p.unlocked = niveau atteint en Normal : il débloque les unités et les sorts.
export function normalizeProgress(p) {
  if (!p.modes) {
    // Ancienne sauvegarde (une seule campagne) : elle devient le mode Normal
    p.modes = { normal: { unlocked: p.unlocked || 1, stars: p.stars || {}, won: p.won || {} } };
    delete p.stars; delete p.won;
  }
  for (const m of CONFIG.modeOrder) {
    const mp = p.modes[m] = p.modes[m] || {};
    mp.unlocked = Math.max(1, Math.min(CONFIG.levels.length, mp.unlocked || 1));
    mp.stars = mp.stars || {};
    mp.won = mp.won || {};
  }
  p.unlocked = Math.max(p.unlocked || 1, p.modes.normal.unlocked);
  if (!CONFIG.modes[p.mode]) p.mode = 'normal';   // mode choisi sur la carte
  p.parts = p.parts || 0;           // pièces détachées disponibles
  p.upgrades = p.upgrades || {};    // niveau de chaque amélioration de l'atelier
  for (const id of CONFIG.workshop.order) p.upgrades[id] = p.upgrades[id] || 0;
  return p;
}

export function totalStars(p) {
  let n = 0;
  for (const m of CONFIG.modeOrder) for (const k in p.modes[m].stars) n += p.modes[m].stars[k];
  return n;
}
export const maxStars = () => CONFIG.levels.length * 3 * CONFIG.modeOrder.length;

// Un mode est débloqué quand le mode précédent a été terminé (dernier niveau gagné)
export function isModeUnlocked(p, mode) {
  const after = CONFIG.modes[mode].unlockAfter;
  if (!after) return true;
  return !!p.modes[after].won[CONFIG.levels[CONFIG.levels.length - 1].id];
}

// Niveau tel qu'il se joue dans un mode : ennemi renforcé, mutants et boss en plus
export function effectiveLevel(index, mode = 'normal') {
  const base = CONFIG.levels[index];
  const m = CONFIG.modes[mode] || CONFIG.modes.normal;
  const lv = JSON.parse(JSON.stringify(base));
  lv.mode = mode;
  lv.enemyBaseHp = Math.round(base.enemyBaseHp * m.enemyBaseHp);
  lv.aiIncomeMult = +(base.aiIncomeMult * m.aiIncomeMult).toFixed(2);
  lv.aiStartScrap = (base.aiStartScrap || CONFIG.economy.startScrap) + m.aiStartScrap;
  lv.enemyTurret.damage = Math.round(base.enemyTurret.damage * m.turretDamage);
  for (const id in m.extraWeights) lv.ai.weights[id] = (lv.ai.weights[id] || 0) + m.extraWeights[id];
  if (m.extraBosses.includes(base.id) && !lv.bosses.length) lv.bosses = [{ unit: 'abomination', atBaseHpRatio: 0.5 }];
  return lv;
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

// Pièces gagnées par étoile / à la première victoire dans un mode
export function partsFor(mode) {
  const k = CONFIG.modes[mode].partsMult;
  return { star: Math.round(CONFIG.stars.partsPerStar * k), firstWin: Math.round(CONFIG.stars.firstWinBonus * k) };
}

// Enregistre le résultat d'une partie. Renvoie ce qui a été gagné (pour l'écran de fin).
export function recordResult(p, mode, levelIndex, won, stars) {
  const id = CONFIG.levels[levelIndex].id;
  const mp = p.modes[mode];
  const pay = partsFor(mode);
  const res = { parts: 0, newStars: 0, firstWin: false, messages: [] };
  if (!won) return res;
  const before = mp.stars[id] || 0;
  if (stars > before) {
    res.newStars = stars - before;
    mp.stars[id] = stars;
  }
  res.parts += res.newStars * pay.star;
  if (!mp.won[id]) {
    mp.won[id] = true;
    res.firstWin = true;
    res.parts += pay.firstWin;
  }
  p.parts += res.parts;
  // Débloque le niveau suivant dans ce mode
  const next = CONFIG.levels[levelIndex + 1];
  if (next && mp.unlocked < next.id) {
    mp.unlocked = next.id;
    res.messages.push('Niveau ' + next.id + ' débloqué : ' + next.name);
    if (mode === 'normal') {
      p.unlocked = Math.max(p.unlocked, next.id);
      res.messages.push(...unlocksAt(next.id));
    }
  }
  // Dernier niveau gagné : le mode suivant s'ouvre
  if (!next && res.firstWin) {
    const nextMode = CONFIG.modeOrder[CONFIG.modeOrder.indexOf(mode) + 1];
    if (nextMode) res.messages.push('Mode ' + CONFIG.modes[nextMode].name + ' débloqué ! (sur la carte)');
    else res.messages.push('Campagne terminée dans tous les modes. Bravo, commandant !');
  }
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
