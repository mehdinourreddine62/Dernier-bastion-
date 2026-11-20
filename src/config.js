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
    longPressTime: 0.45,  // appui long (s) pour afficher une infobulle sur téléphone
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
    edgeScrollSpeed: 700, // px/s quand la souris (ou le doigt qui vise) touche le bord
    edgeZone: 24,         // largeur de la zone de bord pour la souris (px logiques)
    aimEdgeZone: 90,      // largeur de la zone de bord quand on vise un sort au doigt
    wheelFactor: 1,       // sensibilité de la molette
  },

  // ---------- Économie ----------
  economy: {
    startScrap: 150,          // ferraille au début de la partie
    baseIncomePerSec: 8,      // revenu passif par seconde
    killBountyRatio: 0.25,    // prime = 25 % du coût de l'unité tuée
    incomeUpgrade: {          // amélioration du revenu en partie
      costs: [150, 300, 500, 800, 1200],
      bonusPerLevel: 3,       // +3 ferraille/s par niveau
    },
  },

  // ---------- Règles de combat ----------
  combat: {
    populationMax: 20,        // unités max par camp sur le terrain
    recruitQueueMax: 5,       // recrutements en attente max (payés à l'ajout)
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
    bossBannerTime: 3,        // durée de l'annonce du boss (s)
    screenShake: true,        // secousses d'écran (étape 3)
  },

  // ---------- Bases et tourelles ----------
  bases: {
    width: 190,
    height: 170,
    tags: ['base'],           // type de cible « base » (bonus du Blindé)
    damageStates: [0.5, 0.25],// seuils d'apparence dégradée
    player: {
      centerX: 105,
      hp: 1500,
      // Tourelle-mitrailleuse. Portée mesurée depuis l'avant de la base.
      turret: {
        damage: 10, interval: 0.5, range: 350,
        projectile: { shape: 'tracer', speed: 1100, color: '#fff0b0', length: 20, width: 2, arcHeight: 0 },
      },
    },
    enemy: {
      centerX: 3095,
      // PV et puissance du tentacule : voir levels[].enemyBaseHp / enemyTurret
      turretProjectile: { shape: 'glob', speed: 450, color: '#9be22b', length: 0, width: 6, arcHeight: 50 },
    },
  },

  // ---------- Étoiles et récompenses ----------
  stars: {
    twoStarsAbove: 0.3,       // PV de ma base restants > 30 % => 2 étoiles
    threeStarsAbove: 0.7,     // > 70 % => 3 étoiles
    partsPerStar: 10,         // étape 4 : pièces détachées par étoile
  },

  // ---------- Types ----------
  // Un bonus s'écrit dans une unité :  bonuses: { typeCible: multiplicateur }
  // Pour ajouter un type : l'ajouter ici, puis dans les tags des unités.
  typeNames: {
    melee: 'corps à corps', ranged: 'à distance', fast: 'rapides',
    swarm: 'nuées', heavy: 'lourdes', boss: 'boss', base: 'bases',
  },

  // ---------- Ordre des boutons de recrutement (touches 1 à 5) ----------
  roster: {
    player: ['pillard', 'tireur', 'motard', 'lanceFlammes', 'blinde'],
  },

  // ---------- Unités ----------
  // attackInterval : secondes entre deux attaques (pour le lance-flammes : durée d'un « tick »)
  // recruitCooldown : recharge entre deux sorties de cette unité (s)
  // attack.kind : 'melee'      coup au contact (knockback = recul infligé, splashRadius = zone)
  //               'projectile' tir à distance
  //               'flame'      touche tous les ennemis devant, jusqu'à la portée
  //               'cannon'     obus qui explose (splashRadius)
  // bodyWidth / bodyHeight : taille visuelle (visée des tirs, barre de vie)
  units: {
    // ===== SURVIVANTS =====
    pillard: {
      side: 'player', name: 'Pillard', role: 'Corps à corps, pas cher',
      cost: 50, hp: 120, damage: 12, attackInterval: 1.0, range: 30, speed: 60,
      recruitCooldown: 1.5, tags: ['melee'], bonuses: { ranged: 1.5 },
      attack: { kind: 'melee' }, unlockLevel: 1, bodyWidth: 30, bodyHeight: 68,
      strengths: 'Pas cher, bon contre les Cracheurs', weaknesses: 'Fragile face aux Brutes',
    },
    tireur: {
      side: 'player', name: 'Tireur', role: 'Fusil, à distance',
      cost: 75, hp: 70, damage: 15, attackInterval: 1.2, range: 220, speed: 50,
      recruitCooldown: 2, tags: ['ranged'], bonuses: { fast: 1.5 },
      attack: { kind: 'projectile', projectile: { shape: 'tracer', speed: 900, color: '#ffe9a0', length: 24, width: 2, arcHeight: 0 } },
      unlockLevel: 1, bodyWidth: 30, bodyHeight: 68,
      strengths: 'Longue portée, abat les Chiens mutés', weaknesses: 'Très fragile au contact',
    },
    motard: {
      side: 'player', name: 'Motard', role: 'Rapide, harcèlement',
      cost: 100, hp: 110, damage: 18, attackInterval: 0.8, range: 35, speed: 140,
      recruitCooldown: 4, tags: ['fast'], bonuses: { ranged: 1.5 },
      attack: { kind: 'melee' }, unlockLevel: 2, bodyWidth: 50, bodyHeight: 62,
      strengths: 'Fonce sur les Cracheurs', weaknesses: 'Peu résistant',
    },
    lanceFlammes: {
      side: 'player', name: 'Lance-flammes', role: 'Dégâts de zone',
      cost: 150, hp: 160, damage: 8, attackInterval: 0.25, range: 90, speed: 45,
      recruitCooldown: 6, tags: ['melee'], bonuses: { swarm: 2 },
      attack: { kind: 'flame' }, unlockLevel: 3, bodyWidth: 34, bodyHeight: 70,
      strengths: 'Brûle tous les ennemis devant lui, ravage les Goules', weaknesses: 'Portée courte, lent',
    },
    blinde: {
      side: 'player', name: 'Blindé bricolé', role: 'Char lourd, canon',
      cost: 300, hp: 900, damage: 40, attackInterval: 2.0, range: 160, speed: 25,
      recruitCooldown: 15, tags: ['heavy'], bonuses: { base: 2 },
      attack: { kind: 'cannon', splashRadius: 50, projectile: { shape: 'shell', speed: 500, color: '#ffb347', length: 0, width: 5, arcHeight: 70 } },
      unlockLevel: 5, bodyWidth: 96, bodyHeight: 72,
      strengths: 'Énorme blindage, détruit les bases', weaknesses: 'Très lent et cher',
    },

    // ===== MUTANTS =====
    goule: {
      side: 'enemy', name: 'Goule', role: 'Corps à corps (nuée)',
      cost: 45, hp: 100, damage: 11, attackInterval: 1.0, range: 30, speed: 65,
      recruitCooldown: 1.5, tags: ['swarm'], bonuses: {},
      attack: { kind: 'melee' }, bodyWidth: 34, bodyHeight: 58,
    },
    cracheur: {
      side: 'enemy', name: 'Cracheur', role: 'Distance, acide',
      cost: 75, hp: 65, damage: 14, attackInterval: 1.3, range: 200, speed: 50,
      recruitCooldown: 2, tags: ['ranged'], bonuses: {},
      attack: { kind: 'projectile', projectile: { shape: 'glob', speed: 420, color: '#9be22b', length: 0, width: 5, arcHeight: 40 } },
      bodyWidth: 34, bodyHeight: 60,
    },
    chien: {
      side: 'enemy', name: 'Chien muté', role: 'Rapide',
      cost: 90, hp: 90, damage: 16, attackInterval: 0.7, range: 30, speed: 160,
      recruitCooldown: 4, tags: ['fast'], bonuses: {},
      attack: { kind: 'melee' }, bodyWidth: 52, bodyHeight: 38,
    },
    brute: {
      side: 'enemy', name: 'Brute', role: 'Tank de mêlée',
      cost: 220, hp: 700, damage: 35, attackInterval: 1.8, range: 40, speed: 30,
      recruitCooldown: 12, tags: ['heavy'], bonuses: {},
      attack: { kind: 'melee', knockback: 14 }, bodyWidth: 54, bodyHeight: 104,
    },
    abomination: {
      side: 'enemy', name: 'Abomination', role: 'Boss',
      cost: 600, hp: 2500, damage: 60, attackInterval: 2.5, range: 60, speed: 20,
      recruitCooldown: 0, tags: ['boss'], bonuses: {},
      attack: { kind: 'melee', splashRadius: 60 }, bodyWidth: 120, bodyHeight: 160,
    },
  },

  // ---------- Sorts du joueur ----------
  spells: {
    mortar: {
      name: 'Frappe de mortier', key: 'Q', unlockLevel: 1, cooldown: 30,
      shells: 3,              // nombre d'obus
      radius: 80,             // zone où tombent les obus (cercle de visée)
      shellBlastRadius: 45,   // rayon d'explosion de chaque obus
      damagePerShell: 120,
      shellDelay: 0.25,       // décalage entre deux obus (s)
      fallTime: 0.45,         // durée de chute d'un obus (s)
      hitsBases: false,       // le mortier abîme-t-il la base ennemie ?
      craterTime: 6,          // durée des cratères au sol (s)
    },
    heal: {
      name: 'Kit de soins', key: 'W', unlockLevel: 2, cooldown: 40,
      radius: 150,
      healRatio: 0.4,         // soigne 40 % des PV max
    },
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

  // ---------- IA : réglages communs à tous les niveaux ----------
  ai: {
    // Contres : pour chaque unité mutante, les types de Survivants qu'elle contre.
    // Plus le joueur aligne ces types, plus l'IA choisit cette unité.
    counters: {
      goule: ['ranged'],
      cracheur: ['melee', 'heavy'],
      chien: ['ranged'],
      brute: ['melee', 'fast'],
    },
    counterStrength: 2,       // 0 = ignore la composition du joueur
    maxSaveTime: 40,          // durée max d'économie pour une vague (s)
    // Profils d'achat d'amélioration du revenu (référencés par levels[].ai.incomeUpgrades)
    incomeUpgradeProfiles: {
      none:   { chance: 0,    notBefore: 0,  maxLevel: 0 },
      slow:   { chance: 0.15, notBefore: 120, maxLevel: 2 },
      normal: { chance: 0.25, notBefore: 75, maxLevel: 3 },
      fast:   { chance: 0.35, notBefore: 45, maxLevel: 5 },
    },
  },

  // ---------- Niveaux ----------
  // ai.weights      : poids de tirage de chaque unité ennemie (= unités disponibles)
  // ai.buyChance    : probabilité d'acheter à chaque décision (1 décision / s)
  // ai.waves.chance : probabilité qu'un achat devienne une vague (économie puis 4-6 unités)
  // ai.defenseDistance : si mes unités sont à moins de ça de sa base, l'IA dépense tout
  // bosses          : boss lancés quand la base ennemie descend sous un % de PV
  levels: [
    { id: 1, name: 'Banlieue morte', enemyBaseHp: 1000, aiIncomeMult: 0.7,
      enemyTurret: { damage: 8, interval: 0.6, range: 300 },
      ai: { decisionInterval: 1, firstDelay: 6, buyChance: 0.8, weights: { goule: 3, cracheur: 2 },
            waves: { chance: 0, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'none' },
      bosses: [] },
    { id: 2, name: 'Autoroute effondrée', enemyBaseHp: 1200, aiIncomeMult: 0.8,
      enemyTurret: { damage: 9, interval: 0.6, range: 310 },
      ai: { decisionInterval: 1, firstDelay: 5, buyChance: 0.85, weights: { goule: 3, cracheur: 2, chien: 1 },
            waves: { chance: 0.05, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'slow' },
      bosses: [] },
    { id: 3, name: 'Centrale', enemyBaseHp: 1400, aiIncomeMult: 0.9,
      enemyTurret: { damage: 10, interval: 0.6, range: 320 },
      ai: { decisionInterval: 1, firstDelay: 5, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 1 },
            waves: { chance: 0.06, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'slow' },
      bosses: [] },
    { id: 4, name: 'Port rouillé', enemyBaseHp: 1600, aiIncomeMult: 1.0,
      enemyTurret: { damage: 11, interval: 0.55, range: 330 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 1, brute: 1 },
            waves: { chance: 0.08, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      bosses: [] },
    { id: 5, name: 'Zone irradiée', enemyBaseHp: 2000, aiIncomeMult: 1.0,
      enemyTurret: { damage: 12, interval: 0.55, range: 340 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1 },
            waves: { chance: 0.08, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.5 }] },
    { id: 6, name: 'Cité effondrée', enemyBaseHp: 2000, aiIncomeMult: 1.1,
      enemyTurret: { damage: 12, interval: 0.5, range: 340 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1 },
            waves: { chance: 0.1, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      bosses: [] },
    { id: 7, name: 'Raffinerie', enemyBaseHp: 2200, aiIncomeMult: 1.2,
      enemyTurret: { damage: 13, interval: 0.5, range: 350 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 0.95, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1 },
            waves: { chance: 0.15, min: 5, max: 7 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      bosses: [] },
    { id: 8, name: 'Marais toxique', enemyBaseHp: 2400, aiIncomeMult: 1.3,
      enemyTurret: { damage: 14, interval: 0.5, range: 350 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 0.95, weights: { goule: 3, cracheur: 3, chien: 2, brute: 1 },
            waves: { chance: 0.15, min: 5, max: 7 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      bosses: [] },
    { id: 9, name: 'Dernier rempart', enemyBaseHp: 2600, aiIncomeMult: 1.4,
      enemyTurret: { damage: 15, interval: 0.45, range: 360 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1.0, weights: { goule: 3, cracheur: 3, chien: 2, brute: 2 },
            waves: { chance: 0.18, min: 5, max: 7 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      bosses: [] },
    { id: 10, name: 'Le Nid', enemyBaseHp: 3000, aiIncomeMult: 1.5,
      enemyTurret: { damage: 16, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1.0, weights: { goule: 3, cracheur: 3, chien: 2, brute: 2 },
            waves: { chance: 0.2, min: 5, max: 7 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.6 }, { unit: 'abomination', atBaseHpRatio: 0.3 }] },
  ],

  // ---------- Performance ----------
  pools: { projectiles: 160, particles: 700, floatingTexts: 64, decals: 28, shells: 12 },
};
