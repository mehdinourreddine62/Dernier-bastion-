import { CONFIG } from './config.js?v=8';

// Progression de la campagne : niveaux débloqués, étoiles, pièces détachées, atelier.
// L'objet `progress` vit dans la sauvegarde (save.js) ; ces fonctions le lisent et le modifient.

export function normalizeProgress(p) {
  p.unlocked = Math.max(1, Math.min(CONFIG.levels.length, p.unlocked || 1));  // plus haut niveau jouable (id)
  p.stars = p.stars || {};          // meilleures étoiles par niveau : { "1": 3, ... }
  p.won = p.won || {};              // niveaux déjà gagnés au moins une fois
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
    res.messages.push('Niveau ' + next.id + ' débloqué : ' + next.name);
    res.messages.push(...unlocksAt(next.id));
  }
  return res;
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
    wallHp: w.wallHpBonus * u.walls,
    turretDamage: 1 + w.turretDamageBonus * u.turret,
    turretRange: 1 + w.turretRangeBonus * u.turret,
    income: w.incomeBonus * u.salvage,
    spellCooldown: Math.max(0.1, 1 - w.spellCooldownReduction * u.spells),
  };
}
