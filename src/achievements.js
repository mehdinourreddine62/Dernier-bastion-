import { CONFIG } from './config.js?v=27';

// Succès : défis qui rapportent des pièces détachées.
// - les succès « de partie » sont vérifiés à la fin de chaque partie (objet `ctx`) ;
// - les succès « cumulés » comptent sur toutes les parties (progress.totals).
// reward : pièces gagnées une seule fois. goal/total : pour afficher une progression.

const lastLevelId = () => CONFIG.levels[CONFIG.levels.length - 1].id;
const allStars = (p) => CONFIG.levels.every((l) => (p.stars[l.id] || 0) >= 3);

export const ACHIEVEMENTS = [
  { id: 'firstWin', name: 'Premier bastion', desc: 'Gagner une partie', reward: 20,
    check: (c) => c.won },
  { id: 'stars3', name: 'Stratège', desc: 'Obtenir 3 étoiles sur un niveau', reward: 30,
    check: (c) => c.won && c.game.stars === 3 },
  { id: 'untouched', name: 'Sans une égratignure', desc: 'Gagner sans que ta base perde un seul PV', reward: 40,
    check: (c) => c.won && c.game.stats.baseDamage === 0 },
  { id: 'noLoss', name: 'Aucun sacrifice', desc: 'Gagner sans perdre une seule unité', reward: 60,
    check: (c) => c.won && c.game.stats.lost === 0 },
  { id: 'lightning', name: 'Éclair', desc: 'Gagner un niveau en moins de 2 minutes', reward: 40,
    check: (c) => c.won && c.game.time < 120 },
  { id: 'noTank', name: 'Sans blindé', desc: 'Gagner un niveau 6 ou plus sans recruter de Blindé', reward: 50,
    check: (c) => c.won && c.game.level.id >= 6 && !c.game.stats.recruitedBy.blinde },
  { id: 'noRifle', name: 'Corps à corps', desc: 'Gagner un niveau 4 ou plus sans recruter de Tireur', reward: 50,
    check: (c) => c.won && c.game.level.id >= 4 && !c.game.stats.recruitedBy.tireur },
  { id: 'bossKill', name: 'Chasseur d’Abomination', desc: 'Vaincre une Abomination', reward: 40,
    check: (c) => (c.game.stats.killedEnemy.abomination || 0) > 0 },
  { id: 'shelling', name: 'Pluie d’obus', desc: 'Tuer 15 mutants au mortier en une partie', reward: 40,
    check: (c) => (c.game.stats.kills.mortar || 0) >= 15 },
  { id: 'purge', name: 'Purification', desc: 'Tuer 30 mutants au lance-flammes en une partie', reward: 40,
    check: (c) => (c.game.stats.kills.lanceFlammes || 0) >= 30 },
  { id: 'army', name: 'Armée de 50', desc: 'Avoir 50 unités en même temps sur le terrain', reward: 40,
    check: (c) => c.game.stats.maxPop >= 50 },
  { id: 'magnate', name: 'Magnat de la ferraille', desc: 'Améliorer le revenu au maximum dans une partie', reward: 30,
    check: (c) => c.game.sides.player.incomeLevel >= CONFIG.economy.incomeUpgrade.costs.length },
  { id: 'survive10', name: 'Tenir la ligne', desc: 'Tenir 10 vagues en mode Survie', reward: 60,
    check: (c) => !!c.game.survival && c.game.survival.wave - 1 >= 10 },
  { id: 'survive25', name: 'Dernier rempart', desc: 'Tenir 25 vagues en mode Survie', reward: 150,
    check: (c) => !!c.game.survival && c.game.survival.wave - 1 >= 25 },
  { id: 'exterminator', name: 'Exterminateur', desc: 'Tuer 1000 mutants au total', reward: 80,
    goal: 1000, total: (p) => p.totals.kills },
  { id: 'skyHunter', name: 'Chasseur de charognards', desc: 'Abattre 100 Charognards ailés au total', reward: 60,
    goal: 100, total: (p) => p.totals.charognard },
  { id: 'deminer', name: 'Démineur', desc: 'Abattre 50 Rouilleurs au total', reward: 50,
    goal: 50, total: (p) => p.totals.rouilleur },
  { id: 'engineer', name: 'Ingénieur en chef', desc: 'Monter une amélioration de l’atelier au niveau 10', reward: 80,
    check: (c) => Object.values(c.progress.upgrades).some((l) => l >= CONFIG.workshop.maxLevel) },
  { id: 'queenKill', name: 'Régicide', desc: 'Vaincre la Matriarche', reward: 60,
    check: (c) => (c.game.stats.killedEnemy.matriarche || 0) > 0 },
  { id: 'shellBreaker', name: 'Brise-carapace', desc: 'Abattre 50 Carapaces au total', reward: 50,
    goal: 50, total: (p) => p.totals.carapace },
  { id: 'survivor', name: 'Survivant', desc: 'Terminer le chapitre 1', reward: 100,
    check: (c) => !!c.progress.won[CONFIG.chapters[0].last] },
  { id: 'plagueSlayer', name: 'Tueur de Fléau', desc: 'Terminer le chapitre 2 en vainquant le Fléau', reward: 200,
    check: (c) => !!c.progress.won[CONFIG.chapters[1].last] },
  { id: 'legend', name: 'Légende du Bastion', desc: 'Terminer la campagne (Le Grand Nid)', reward: 400,
    check: (c) => !!c.progress.won[lastLevelId()] },
  { id: 'perfectionist', name: 'Perfectionniste', desc: 'Obtenir 3 étoiles sur les ' + CONFIG.levels.length + ' niveaux', reward: 300,
    check: (c) => allStars(c.progress) },
];

export function normalizeAchievements(p) {
  p.achievements = p.achievements || {};
  p.totals = Object.assign({ kills: 0, charognard: 0, rouilleur: 0, carapace: 0 }, p.totals || {});
}

export const unlockedCount = (p) => ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;

// Vérifie les succès. game = partie terminée (ou null hors partie, ex. après un achat).
// Renvoie la liste des succès nouvellement débloqués ; leurs pièces sont ajoutées.
export function checkAchievements(p, game) {
  normalizeAchievements(p);
  if (game) {
    // Compteurs cumulés
    const k = game.stats.killedEnemy;
    p.totals.kills += game.stats.killed;
    p.totals.charognard += k.charognard || 0;
    p.totals.rouilleur += k.rouilleur || 0;
    p.totals.carapace += k.carapace || 0;
  }
  const ctx = { progress: p, game, won: !!game && game.result === 'won' };
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (p.achievements[a.id]) continue;
    let ok = false;
    if (a.goal) ok = a.total(p) >= a.goal;
    else if (game || !a.check.length || a.id === 'engineer') {
      try { ok = !!a.check(ctx); } catch (e) { ok = false; }   // succès de partie sans partie : ignoré
    }
    if (ok) {
      p.achievements[a.id] = true;
      p.parts += a.reward;
      fresh.push(a);
    }
  }
  return fresh;
}
