// =====================================================================
//  DERNIER BASTION — CONFIGURATION CENTRALE
//  Toutes les valeurs d'équilibrage sont ici. Modifie un chiffre,
//  recharge la page : c'est pris en compte. Rien d'autre à toucher.
//  Les sections marquées « étape N » sont déjà prêtes mais ne seront
//  utilisées par le jeu qu'à l'étape indiquée.
// =====================================================================

export const CONFIG = {
  // ---------- Affichage ----------
  display: {
    width: 1280,          // résolution logique (16:9)
    height: 720,
    maxPixelRatio: 2,     // plafond de netteté (économise la batterie)
    minButtonPx: 48,      // taille minimale réelle d'un bouton tactile (px écran)
  },

  // ---------- Monde ----------
  world: {
    width: 3200,          // largeur du champ de bataille
    groundY: 570,         // ligne de sol (pieds des unités)
    horizonY: 515,        // début du sol à l'écran
  },

  // ---------- Boucle de jeu ----------
  loop: {
    fixedStep: 1 / 60,    // pas de simulation (secondes)
    maxDelta: 0.25,       // plafond du temps écoulé entre deux images
    speeds: [1, 2],       // vitesses de jeu disponibles
  },

  // ---------- Caméra ----------
  camera: {
    keyScrollSpeed: 900,  // px/s avec flèches ou A/D
    edgeScrollSpeed: 700, // px/s quand la souris touche le bord
    edgeZone: 24,         // largeur de la zone de bord (px logiques)
    wheelFactor: 1,       // sensibilité de la molette
  },

  // ---------- Économie ----------
  economy: {
    startScrap: 150,          // ferraille au début de la partie
    baseIncomePerSec: 8,      // revenu passif par seconde
    killBountyRatio: 0.25,    // prime = 25 % du coût de l'unité tuée
    incomeUpgrade: {          // étape 2 : amélioration du revenu en partie
      costs: [150, 300, 500, 800, 1200],
      bonusPerLevel: 3,
    },
  },

  // ---------- Règles de combat ----------
  combat: {
    populationMax: 20,        // unités max par camp
    recruitQueueMax: 5,       // étape 2 : file de recrutement
    yJitter: 18,              // décalage vertical aléatoire (visuel seulement)
    corpseTime: 2,            // durée de la dépouille (s)
    deathFadeTime: 0.5,       // fondu final de la dépouille (s)
    hitFlashTime: 0.1,        // flash blanc quand on est touché (s)
    attackAnimTime: 0.25,     // durée de l'animation d'attaque (s)
    meleeWaitRange: 60,       // une unité de portée <= à ça attend derrière un allié qui combat
    blockGap: 24,             // distance sous laquelle l'allié devant « bloque »
    spawnOffset: 12,          // distance de la porte où apparaissent les unités
    targetBehindTolerance: 12,// tolérance pour viser un ennemi quasi superposé
    resultOverlayDelay: 1.2,  // délai avant l'écran de victoire/défaite (s)
    screenShake: true,        // secousses d'écran (étape 3)
  },

  // ---------- Bases ----------
  bases: {
    width: 190,
    height: 170,
    tags: ['base'],           // type de cible « base » (bonus du Blindé)
    damageStates: [0.5, 0.25],// seuils d'apparence dégradée (étape 3)
    player: {
      centerX: 105,
      hp: 1500,
      turret: { damage: 10, interval: 0.5, range: 350 }, // étape 2
    },
    enemy: {
      centerX: 3095,
      // PV et tourelle : voir levels[].enemyBaseHp / enemyTurret
    },
  },

  // ---------- Étoiles et récompenses ----------
  stars: {
    twoStarsAbove: 0.3,       // PV de ma base restants > 30 % => 2 étoiles
    threeStarsAbove: 0.7,     // > 70 % => 3 étoiles
    partsPerStar: 10,         // étape 4 : pièces détachées par étoile
  },

  // ---------- Types ----------
  // melee, ranged, fast, swarm, heavy, boss  (+ « base » pour les bases)
  // Un bonus s'écrit  bonuses: { typeCible: multiplicateur }

  // ---------- Ordre des boutons de recrutement (touches 1 à 5) ----------
  roster: {
    player: ['pillard', 'tireur', 'motard', 'lanceFlammes', 'blinde'],
  },

  // ---------- Unités ----------
  // attackInterval : secondes entre deux attaques
  // recruitCooldown : recharge du bouton de recrutement (s)
  // attack.kind : 'melee' | 'projectile' (étape 1)
  //               'flame' | 'cannon' (étape 2)
  units: {
    // ===== SURVIVANTS =====
    pillard: {
      side: 'player', name: 'Pillard', role: 'Corps à corps, pas cher',
      cost: 50, hp: 120, damage: 12, attackInterval: 1.0, range: 30, speed: 60,
      recruitCooldown: 1.5, tags: ['melee'], bonuses: { ranged: 1.5 },
      attack: { kind: 'melee' }, unlockLevel: 1,
      strengths: 'Efficace contre les unités à distance', weaknesses: 'Fragile face aux brutes',
    },
    tireur: {
      side: 'player', name: 'Tireur', role: 'Fusil, à distance',
      cost: 75, hp: 70, damage: 15, attackInterval: 1.2, range: 220, speed: 50,
      recruitCooldown: 2, tags: ['ranged'], bonuses: { fast: 1.5 },
      attack: { kind: 'projectile', projectile: { shape: 'tracer', speed: 900, color: '#ffe9a0', length: 24, width: 2, arcHeight: 0 } },
      unlockLevel: 1,
      strengths: 'Efficace contre les unités rapides', weaknesses: 'Très fragile au corps à corps',
    },
    motard: {
      side: 'player', name: 'Motard', role: 'Rapide, harcèlement',
      cost: 100, hp: 110, damage: 18, attackInterval: 0.8, range: 35, speed: 140,
      recruitCooldown: 4, tags: ['fast'], bonuses: { ranged: 1.5 },
      attack: { kind: 'melee' }, unlockLevel: 2,
      strengths: 'Rattrape les tireurs', weaknesses: 'Peu de PV',
    },
    lanceFlammes: {
      side: 'player', name: 'Lance-flammes', role: 'Dégâts de zone',
      cost: 150, hp: 160, damage: 8, attackInterval: 0.25, range: 90, speed: 45,
      recruitCooldown: 6, tags: ['melee'], bonuses: { swarm: 2 },
      attack: { kind: 'flame' }, unlockLevel: 3,   // étape 2 : touche tous les ennemis dans la zone
      strengths: 'Ravage les nuées', weaknesses: 'Portée courte',
    },
    blinde: {
      side: 'player', name: 'Blindé bricolé', role: 'Char lourd, canon',
      cost: 300, hp: 900, damage: 40, attackInterval: 2.0, range: 160, speed: 25,
      recruitCooldown: 15, tags: ['heavy'], bonuses: { base: 2 },
      attack: { kind: 'cannon', splashRadius: 50, projectile: { shape: 'shell', speed: 500, color: '#ffb347', length: 0, width: 5, arcHeight: 70 } },
      unlockLevel: 5,                              // étape 2
      strengths: 'Détruit les bases', weaknesses: 'Très lent',
    },

    // ===== MUTANTS =====
    goule: {
      side: 'enemy', name: 'Goule', role: 'Corps à corps (nuée)',
      cost: 45, hp: 100, damage: 11, attackInterval: 1.0, range: 30, speed: 65,
      recruitCooldown: 1.5, tags: ['swarm'], bonuses: {},
      attack: { kind: 'melee' },
    },
    cracheur: {
      side: 'enemy', name: 'Cracheur', role: 'Distance, acide',
      cost: 75, hp: 65, damage: 14, attackInterval: 1.3, range: 200, speed: 50,
      recruitCooldown: 2, tags: ['ranged'], bonuses: {},
      attack: { kind: 'projectile', projectile: { shape: 'glob', speed: 420, color: '#9be22b', length: 0, width: 5, arcHeight: 40 } },
    },
    chien: {
      side: 'enemy', name: 'Chien muté', role: 'Rapide',
      cost: 90, hp: 90, damage: 16, attackInterval: 0.7, range: 30, speed: 160,
      recruitCooldown: 4, tags: ['fast'], bonuses: {},
      attack: { kind: 'melee' },
    },
    brute: {
      side: 'enemy', name: 'Brute', role: 'Tank de mêlée',
      cost: 220, hp: 700, damage: 35, attackInterval: 1.8, range: 40, speed: 30,
      recruitCooldown: 12, tags: ['heavy'], bonuses: {},
      attack: { kind: 'melee', knockback: 14 },    // étape 2 : repousse les cibles
    },
    abomination: {
      side: 'enemy', name: 'Abomination', role: 'Boss',
      cost: 600, hp: 2500, damage: 60, attackInterval: 2.5, range: 60, speed: 20,
      recruitCooldown: 0, tags: ['boss'], bonuses: {},
      attack: { kind: 'melee', splashRadius: 60 }, // étape 2 : dégâts de zone
    },
  },

  // ---------- Sorts (étape 2) ----------
  spells: {
    mortar: { name: 'Frappe de mortier', shells: 3, radius: 80, damagePerShell: 120, shellDelay: 0.25, cooldown: 30, unlockLevel: 1 },
    heal:   { name: 'Kit de soins', healRatio: 0.4, radius: 150, cooldown: 40, unlockLevel: 2 },
  },

  // ---------- Atelier (étape 4) ----------
  workshop: {
    maxLevel: 5,
    costs: [10, 20, 35, 55, 80],     // pièces détachées par niveau
    unitHpBonus: 0.10,               // par niveau, pour chaque unité séparément
    unitDamageBonus: 0.10,
    wallHpBonus: 300,
    turretDamageBonus: 0.25,
    turretRangeBonus: 0.10,
    incomeBonus: 1,                  // ferraille/s de revenu de départ
    spellCooldownReduction: 0.10,
  },

  // ---------- Niveaux ----------
  // ai.weights : poids de tirage de chaque unité ennemie
  // ai.buyChance : probabilité d'acheter à chaque décision (1 décision / s)
  // Champs des étapes suivantes : waves, defenseDistance, bosses, incomeUpgrades
  levels: [
    { id: 1, name: 'Banlieue morte', enemyBaseHp: 1000, aiIncomeMult: 0.7,
      enemyTurret: { damage: 8, interval: 0.6, range: 300 },
      ai: { decisionInterval: 1, firstDelay: 6, buyChance: 0.8, weights: { goule: 3, cracheur: 2 },
            waves: { chance: 0, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'none' },
      bosses: [] },
    { id: 2, name: 'Autoroute effondrée', enemyBaseHp: 1200, aiIncomeMult: 0.8,
      enemyTurret: { damage: 9, interval: 0.6, range: 310 },
      ai: { decisionInterval: 1, firstDelay: 5, buyChance: 0.85, weights: { goule: 3, cracheur: 2, chien: 1 },
            waves: { chance: 0.1, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'slow' },
      bosses: [] },
    { id: 3, name: 'Centrale', enemyBaseHp: 1400, aiIncomeMult: 0.9,
      enemyTurret: { damage: 10, interval: 0.6, range: 320 },
      ai: { decisionInterval: 1, firstDelay: 5, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 1 },
            waves: { chance: 0.15, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'slow' },
      bosses: [] },
    { id: 4, name: 'Port rouillé', enemyBaseHp: 1600, aiIncomeMult: 1.0,
      enemyTurret: { damage: 11, interval: 0.55, range: 330 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 1, brute: 1 },
            waves: { chance: 0.2, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      bosses: [] },
    { id: 5, name: 'Zone irradiée', enemyBaseHp: 2000, aiIncomeMult: 1.0,
      enemyTurret: { damage: 12, interval: 0.55, range: 340 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1 },
            waves: { chance: 0.2, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.5 }] },
    { id: 6, name: 'Cité effondrée', enemyBaseHp: 2000, aiIncomeMult: 1.1,
      enemyTurret: { damage: 12, interval: 0.5, range: 340 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1 },
            waves: { chance: 0.25, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      bosses: [] },
    { id: 7, name: 'Raffinerie', enemyBaseHp: 2200, aiIncomeMult: 1.2,
      enemyTurret: { damage: 13, interval: 0.5, range: 350 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 0.95, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1 },
            waves: { chance: 0.35, min: 5, max: 7 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      bosses: [] },
    { id: 8, name: 'Marais toxique', enemyBaseHp: 2400, aiIncomeMult: 1.3,
      enemyTurret: { damage: 14, interval: 0.5, range: 350 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 0.95, weights: { goule: 3, cracheur: 3, chien: 2, brute: 1 },
            waves: { chance: 0.35, min: 5, max: 7 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      bosses: [] },
    { id: 9, name: 'Dernier rempart', enemyBaseHp: 2600, aiIncomeMult: 1.4,
      enemyTurret: { damage: 15, interval: 0.45, range: 360 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1.0, weights: { goule: 3, cracheur: 3, chien: 2, brute: 2 },
            waves: { chance: 0.4, min: 5, max: 7 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      bosses: [] },
    { id: 10, name: 'Le Nid', enemyBaseHp: 3000, aiIncomeMult: 1.5,
      enemyTurret: { damage: 16, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1.0, weights: { goule: 3, cracheur: 3, chien: 2, brute: 2 },
            waves: { chance: 0.45, min: 5, max: 7 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.6 }, { unit: 'abomination', atBaseHpRatio: 0.3 }] },
  ],

  // ---------- Performance ----------
  pools: { projectiles: 128, particles: 400, floatingTexts: 64 },
};
