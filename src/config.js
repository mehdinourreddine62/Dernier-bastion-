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
    populationMax: 100,       // unités max par camp sur le terrain
    recruitQueueMax: 5,       // recrutements en attente max (payés à l'ajout)
    yJitter: 18,              // décalage vertical aléatoire (visuel seulement)
    corpseTime: 2,            // durée de la dépouille (s)
    deathFadeTime: 0.5,       // fondu final de la dépouille (s)
    hitFlashTime: 0.1,        // flash blanc quand on est touché (s)
    attackAnimTime: 0.25,     // durée de l'animation d'attaque (s)
    meleeWaitRange: 60,       // une unité de portée <= à ça attend derrière un allié qui combat
    blockGap: 30,             // distance sous laquelle l'allié devant « bloque » (écart entre unités)
    meleeSupportReach: 45,    // portée en plus pour frapper derrière un allié (0 = file indienne)
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
  // 1 étoile pour la victoire + 1 étoile par objectif rempli (voir levels[].objectives).
  // Types d'objectif : { type: 'time', max: secondes }      gagner en moins de…
  //                    { type: 'losses', max: n }           perdre au plus n unités
  //                    { type: 'baseHp', min: 0.7 }         garder au moins 70 % des PV de ta base
  stars: {
    twoStarsAbove: 0.3,       // (secours si un niveau n'a pas d'objectifs) PV restants > 30 % => 2 étoiles
    threeStarsAbove: 0.7,     // > 70 % => 3 étoiles
    partsPerStar: 30,         // pièces détachées par NOUVELLE étoile obtenue
    firstWinBonus: 20,        // pièces en plus à la première victoire d'un niveau
  },

  // ---------- Types ----------
  // Un bonus s'écrit dans une unité :  bonuses: { typeCible: multiplicateur }
  // Pour ajouter un type : l'ajouter ici, puis dans les tags des unités.
  typeNames: {
    melee: 'corps à corps', ranged: 'à distance', fast: 'rapides', flying: 'volantes',
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
      cost: 50, hp: 140, damage: 12, attackInterval: 1.0, range: 30, speed: 60,
      recruitCooldown: 1.5, tags: ['melee'], bonuses: { ranged: 1.5 },
      attack: { kind: 'melee' }, unlockLevel: 1, bodyWidth: 30, bodyHeight: 68,
      strengths: 'Pas cher, bon contre les Cracheurs', weaknesses: 'Fragile face aux Brutes',
    },
    tireur: {
      side: 'player', name: 'Tireur', role: 'Fusil, à distance',
      cost: 90, hp: 70, damage: 13, attackInterval: 1.2, range: 220, speed: 50,
      recruitCooldown: 2, tags: ['ranged'], bonuses: { fast: 1.5 }, antiAir: true,
      attack: { kind: 'projectile', projectile: { shape: 'tracer', speed: 900, color: '#ffe9a0', length: 24, width: 2, arcHeight: 0 } },
      unlockLevel: 1, bodyWidth: 30, bodyHeight: 68,
      strengths: 'Longue portée, abat les Chiens et les volants', weaknesses: 'Très fragile au contact',
    },
    motard: {
      side: 'player', name: 'Motard', role: 'Rapide, harcèlement',
      cost: 100, hp: 150, damage: 18, attackInterval: 0.8, range: 35, speed: 140,
      recruitCooldown: 4, tags: ['fast'], bonuses: { ranged: 1.5 },
      attack: { kind: 'melee' }, unlockLevel: 2, bodyWidth: 50, bodyHeight: 62,
      strengths: 'Fonce sur les Cracheurs', weaknesses: 'Peu résistant',
    },
    lanceFlammes: {
      side: 'player', name: 'Lance-flammes', role: 'Dégâts de zone',
      cost: 150, hp: 230, damage: 10, attackInterval: 0.25, range: 90, speed: 45,
      recruitCooldown: 6, tags: ['melee'], bonuses: { swarm: 2 },
      attack: { kind: 'flame' }, unlockLevel: 3, bodyWidth: 34, bodyHeight: 70,
      strengths: 'Brûle tous les ennemis devant lui, ravage les Goules', weaknesses: 'Portée courte, lent',
    },
    blinde: {
      side: 'player', name: 'Blindé bricolé', role: 'Char lourd, canon',
      cost: 400, hp: 900, damage: 40, attackInterval: 2.0, range: 160, speed: 25,
      recruitCooldown: 20, tags: ['heavy'], bonuses: { base: 2 },
      attack: { kind: 'cannon', splashRadius: 50, projectile: { shape: 'shell', speed: 500, color: '#ffb347', length: 0, width: 5, arcHeight: 70 } },
      unlockLevel: 5, bodyWidth: 96, bodyHeight: 72,
      strengths: 'Énorme blindage, détruit les bases', weaknesses: 'Très lent et cher, l’acide le ronge',
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
      cost: 75, hp: 65, damage: 14, attackInterval: 1.3, range: 235, speed: 50,
      recruitCooldown: 2, tags: ['ranged'], bonuses: { heavy: 2 },   // l'acide ronge les blindages
      attack: { kind: 'projectile', projectile: { shape: 'glob', speed: 420, color: '#9be22b', length: 0, width: 5, arcHeight: 40 } },
      bodyWidth: 34, bodyHeight: 60,
    },
    chien: {
      side: 'enemy', name: 'Chien muté', role: 'Rapide',
      cost: 90, hp: 130, damage: 16, attackInterval: 0.7, range: 30, speed: 160,
      recruitCooldown: 4, tags: ['fast'], bonuses: { ranged: 1.5 },   // fonce sur les tireurs
      attack: { kind: 'melee' }, bodyWidth: 52, bodyHeight: 38,
    },
    brute: {
      side: 'enemy', name: 'Brute', role: 'Tank de mêlée',
      cost: 220, hp: 700, damage: 35, attackInterval: 1.8, range: 40, speed: 30,
      recruitCooldown: 12, tags: ['heavy'], bonuses: { heavy: 1.5 },  // écrase les blindés
      attack: { kind: 'melee', knockback: 14 }, bodyWidth: 54, bodyHeight: 104,
    },
    // Tourelle de campagne : posée par Mécano Rosa (n'est pas recrutable)
    tourelleCampagne: {
      side: 'player', name: 'Tourelle de campagne', role: 'Mitrailleuse fixe',
      cost: 0, hp: 350, damage: 9, attackInterval: 0.3, range: 320, speed: 0,
      recruitCooldown: 0, tags: ['ranged'], bonuses: {}, antiAir: true, unlockLevel: 999, lifetime: 25,
      attack: { kind: 'projectile', projectile: { shape: 'tracer', speed: 1100, color: '#fff0b0', length: 18, width: 2, arcHeight: 0 } },
      bodyWidth: 40, bodyHeight: 42,
    },

    // Rouilleur : petit mutant kamikaze qui se jette sur les blindés et explose
    rouilleur: {
      side: 'enemy', name: 'Rouilleur', role: 'Kamikaze anti-blindé',
      cost: 60, hp: 80, damage: 90, attackInterval: 1, range: 25, speed: 140,
      recruitCooldown: 3, tags: ['fast'], bonuses: { heavy: 3 },
      attack: { kind: 'suicide', splashRadius: 45 }, bodyWidth: 32, bodyHeight: 36,
    },
    // Charognard ailé : vole au-dessus de la mêlée et attaque les tireurs à l'arrière.
    // Seuls les Tireurs, la tourelle et le mortier peuvent le toucher.
    charognard: {
      side: 'enemy', name: 'Charognard ailé', role: 'Volant',
      cost: 85, hp: 110, damage: 20, attackInterval: 0.9, range: 30, speed: 85,
      recruitCooldown: 3, tags: ['flying'], bonuses: { ranged: 2 }, flying: true,
      attack: { kind: 'melee' }, bodyWidth: 64, bodyHeight: 40,
    },
    abomination: {
      side: 'enemy', name: 'Abomination', role: 'Boss',
      cost: 600, hp: 2500, damage: 60, attackInterval: 2.5, range: 60, speed: 20,
      recruitCooldown: 0, tags: ['boss'], bonuses: {},
      attack: { kind: 'melee', splashRadius: 60 }, bodyWidth: 120, bodyHeight: 160,
    },
  },

  // ---------- Commandants (héros) ----------
  // Un seul par partie, choisi dans l'onglet HÉROS. Il arrive seul après deployDelay secondes,
  // revient respawnTime secondes après sa mort, et a une capacité (bouton portrait / touche E).
  // Amélioration : on dépense des étoiles (toutes celles gagnées dans la campagne, tous modes).
  heroes: {
    deployDelay: 10,
    respawnTime: 45,
    maxLevel: 10,
    costs: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],   // étoiles par niveau (30 pour un héros au maximum)
    perLevel: { hp: 0.12, damage: 0.10, ability: 0.10, cooldown: 0.04 },   // gains par niveau
    order: ['kane', 'rosa', 'vasquez'],
    list: {
      kane: {
        name: 'Sergent Kane', title: 'Ligne de front', unlockLevel: 1,
        aura: { kind: 'armor', radius: 170, value: 0.2,
                text: 'Les unités de corps à corps proches subissent 20 % de dégâts en moins' },
        ability: { kind: 'rally', name: 'Cri de ralliement', cooldown: 40, duration: 8, bonus: 0.3,
                   text: 'Toutes tes unités : +30 % de vitesse et de dégâts pendant 8 s' },
        unit: { name: 'Sergent Kane', role: 'Commandant, fusil à pompe', cost: 0, hp: 650, damage: 22,
                attackInterval: 0.9, range: 55, speed: 60, tags: ['melee'], bonuses: { swarm: 1.5 },
                attack: { kind: 'shotgun', targets: 3 }, bodyWidth: 36, bodyHeight: 78 },
      },
      rosa: {
        name: 'Mécano Rosa', title: 'Soutien et blindés', unlockLevel: 4,
        aura: { kind: 'repair', radius: 170, value: 14,
                text: 'Répare les Blindés et la tourelle proches (14 PV/s)' },
        ability: { kind: 'turret', name: 'Tourelle de campagne', cooldown: 40, duration: 25,
                   text: 'Pose une mitrailleuse fixe sur le terrain pendant 25 s' },
        unit: { name: 'Mécano Rosa', role: 'Commandante, lance-grenades', cost: 0, hp: 480, damage: 26,
                attackInterval: 1.6, range: 170, speed: 55, tags: ['ranged'], bonuses: { heavy: 1.5 },
                attack: { kind: 'cannon', splashRadius: 40, projectile: { shape: 'shell', speed: 450, color: '#ffb347', length: 0, width: 4, arcHeight: 60 } },
                bodyWidth: 34, bodyHeight: 74 },
      },
      vasquez: {
        name: 'Doc Vasquez', title: 'Tireur d\'élite et soins', unlockLevel: 7,
        aura: { kind: 'heal', radius: 160, value: 6,
                text: 'Soigne les unités proches (6 PV/s)' },
        ability: { kind: 'snipe', name: 'Tir de précision', cooldown: 40, damage: 700,
                   text: 'Un tir dévastateur sur le mutant le plus résistant (Brute, boss…)' },
        unit: { name: 'Doc Vasquez', role: 'Commandant, fusil de précision', cost: 0, hp: 400, damage: 38,
                attackInterval: 1.8, range: 300, speed: 50, tags: ['ranged'], bonuses: { flying: 1.5, heavy: 1.3 }, antiAir: true,
                attack: { kind: 'projectile', projectile: { shape: 'tracer', speed: 1400, color: '#fff6c0', length: 34, width: 3, arcHeight: 0 } },
                bodyWidth: 32, bodyHeight: 76 },
      },
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

  // ---------- Atelier ----------
  // Chaque amélioration a 5 niveaux. Les unités sont améliorées séparément.
  workshop: {
    order: ['pillard', 'tireur', 'motard', 'lanceFlammes', 'blinde', 'walls', 'turret', 'salvage', 'spells'],
    names: { walls: 'Murailles', turret: 'Tourelle', salvage: 'Récupération', spells: 'Sorts' },
    maxLevel: 10,
    costs: [10, 20, 35, 55, 80, 110, 150, 200, 260, 330],   // pièces détachées par niveau
    unitHpBonus: 0.10,               // par niveau, pour chaque unité séparément
    unitDamageBonus: 0.10,
    wallHpBonus: 300,
    turretDamageBonus: 0.20,
    turretRangeBonus: 0.05,
    incomeBonus: 1,                  // ferraille/s de revenu de départ
    spellCooldownReduction: 0.06,    // max -60 % au niveau 10
  },

  // ---------- IA : réglages communs à tous les niveaux ----------
  ai: {
    // Contres : pour chaque unité mutante, les types de Survivants qu'elle contre.
    // Plus le joueur aligne ces types, plus l'IA choisit cette unité.
    counters: {
      goule: ['ranged'],
      cracheur: ['melee', 'heavy'],
      chien: ['ranged'],
      brute: ['melee', 'fast', 'heavy'],
      rouilleur: ['heavy'],
      charognard: ['ranged'],
    },
    counterStrength: 3,       // 0 = ignore la composition du joueur
    maxSaveTime: 40,          // durée max d'économie pour une vague (s)
    // Profils d'achat d'amélioration du revenu (référencés par levels[].ai.incomeUpgrades)
    incomeUpgradeProfiles: {
      none:   { chance: 0,    notBefore: 0,  maxLevel: 0 },
      slow:   { chance: 0.15, notBefore: 120, maxLevel: 2 },
      normal: { chance: 0.25, notBefore: 75, maxLevel: 3 },
      fast:   { chance: 0.35, notBefore: 45, maxLevel: 5 },
    },
  },

  // ---------- Modes de difficulté ----------
  // Chaque mode rejoue la campagne avec un ennemi plus fort. Multiplicateurs appliqués aux niveaux.
  // unlockAfter : mode à terminer (dernier niveau gagné) pour débloquer celui-ci.
  // extraWeights : unités ajoutées à l'IA dans tous les niveaux ; extraBosses : boss en plus (id de niveau).
  modes: {
    normal: { name: 'Normal', unlockAfter: null, aiIncomeMult: 1, aiStartScrap: 0, enemyBaseHp: 1, turretDamage: 1,
              extraWeights: {}, extraBosses: [], partsMult: 1, mapTint: null },
    hard: { name: 'Difficile', unlockAfter: 'normal', aiIncomeMult: 1.6, aiStartScrap: 250, enemyBaseHp: 1.5, turretDamage: 1.5,
            extraWeights: { rouilleur: 1, charognard: 1 }, extraBosses: [8], partsMult: 1.5, mapTint: 'rgba(140,40,20,0.22)' },
    nightmare: { name: 'Cauchemar', unlockAfter: 'hard', aiIncomeMult: 2.4, aiStartScrap: 500, enemyBaseHp: 2, turretDamage: 2,
                 extraWeights: { rouilleur: 2, charognard: 2, brute: 1 }, extraBosses: [3, 7, 8, 9], partsMult: 2, mapTint: 'rgba(60,10,60,0.35)' },
  },
  modeOrder: ['normal', 'hard', 'nightmare'],

  // ---------- Niveaux ----------
  // ai.weights      : poids de tirage de chaque unité ennemie (= unités disponibles)
  // ai.buyChance    : probabilité d'acheter à chaque décision (1 décision / s)
  // ai.waves.chance : probabilité qu'un achat devienne une vague (économie puis 4-6 unités)
  // ai.defenseDistance : si mes unités sont à moins de ça de sa base, l'IA dépense tout
  // bosses          : boss lancés quand la base ennemie descend sous un % de PV
  // aiStartScrap    : ferraille de l'IA au début de la partie
  // Difficulté (étape 5) : niveaux 1-5 gagnables sans atelier ; à partir du 7-8,
  // l'atelier devient nécessaire. Le revenu de l'IA (aiIncomeMult) est le levier principal.
  levels: [
    { id: 1, name: 'Banlieue morte', enemyBaseHp: 1000, aiIncomeMult: 0.9, aiStartScrap: 150,
      enemyTurret: { damage: 8, interval: 0.6, range: 300 },
      ai: { decisionInterval: 1, firstDelay: 6, buyChance: 0.8, weights: { goule: 3, cracheur: 2 },
            waves: { chance: 0, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'none' },
      objectives: [{ type: 'time', max: 240 }, { type: 'losses', max: 10 }],
      bosses: [] },
    { id: 2, name: 'Autoroute effondrée', enemyBaseHp: 1200, aiIncomeMult: 1.0, aiStartScrap: 200,
      enemyTurret: { damage: 9, interval: 0.6, range: 310 },
      ai: { decisionInterval: 1, firstDelay: 5, buyChance: 0.9, weights: { goule: 3, cracheur: 2, chien: 1 },
            waves: { chance: 0.15, min: 4, max: 6 }, defenseDistance: 600, incomeUpgrades: 'slow' },
      objectives: [{ type: 'time', max: 240 }, { type: 'losses', max: 14 }],
      bosses: [] },
    { id: 3, name: 'Centrale', enemyBaseHp: 1400, aiIncomeMult: 1.2, aiStartScrap: 250,
      enemyTurret: { damage: 11, interval: 0.6, range: 320 },
      ai: { decisionInterval: 1, firstDelay: 5, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 1 },
            waves: { chance: 0.2, min: 4, max: 7 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      objectives: [{ type: 'time', max: 270 }, { type: 'losses', max: 15 }],
      bosses: [] },
    { id: 4, name: 'Port rouillé', enemyBaseHp: 1700, aiIncomeMult: 1.45, aiStartScrap: 300,
      enemyTurret: { damage: 14, interval: 0.55, range: 330 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 1, brute: 1, rouilleur: 1 },
            waves: { chance: 0.25, min: 5, max: 8 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      objectives: [{ type: 'time', max: 300 }, { type: 'losses', max: 20 }],
      bosses: [] },
    { id: 5, name: 'Zone irradiée', enemyBaseHp: 2100, aiIncomeMult: 1.75, aiStartScrap: 350,
      enemyTurret: { damage: 17, interval: 0.55, range: 340 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1, rouilleur: 1 },
            waves: { chance: 0.3, min: 5, max: 8 }, defenseDistance: 600, incomeUpgrades: 'normal' },
      objectives: [{ type: 'time', max: 420 }, { type: 'losses', max: 35 }],
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.5 }] },
    { id: 6, name: 'Cité effondrée', enemyBaseHp: 2300, aiIncomeMult: 2.1, aiStartScrap: 400,
      enemyTurret: { damage: 19, interval: 0.5, range: 340 },
      ai: { decisionInterval: 1, firstDelay: 4, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1, rouilleur: 1, charognard: 1 },
            waves: { chance: 0.35, min: 6, max: 9 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 450 }, { type: 'losses', max: 45 }],
      bosses: [] },
    { id: 7, name: 'Raffinerie', enemyBaseHp: 2700, aiIncomeMult: 2.6, aiStartScrap: 450,
      enemyTurret: { damage: 25, interval: 0.5, range: 350 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1, rouilleur: 2, charognard: 1 },
            waves: { chance: 0.4, min: 6, max: 10 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 480 }, { type: 'losses', max: 55 }],
      bosses: [] },
    { id: 8, name: 'Marais toxique', enemyBaseHp: 3000, aiIncomeMult: 3.4, aiStartScrap: 500,
      enemyTurret: { damage: 32, interval: 0.5, range: 350 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 3, chien: 2, brute: 1, rouilleur: 2, charognard: 2 },
            waves: { chance: 0.45, min: 7, max: 11 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 540 }, { type: 'losses', max: 80 }],
      bosses: [] },
    { id: 9, name: 'Dernier rempart', enemyBaseHp: 3600, aiIncomeMult: 4.3, aiStartScrap: 600,
      enemyTurret: { damage: 42, interval: 0.45, range: 360 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 3, chien: 2, brute: 2, rouilleur: 2, charognard: 2 },
            waves: { chance: 0.5, min: 8, max: 12 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 480 }, { type: 'losses', max: 55 }],
      bosses: [] },
    { id: 10, name: 'Le Nid', enemyBaseHp: 4300, aiIncomeMult: 5.0, aiStartScrap: 700,
      enemyTurret: { damage: 51, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 3, chien: 2, brute: 2, rouilleur: 2, charognard: 2 },
            waves: { chance: 0.55, min: 8, max: 13 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 900 }, { type: 'losses', max: 180 }],
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.6 }, { unit: 'abomination', atBaseHpRatio: 0.3 }] },
  ],

  // ---------- Performance ----------
  pools: { projectiles: 160, particles: 700, floatingTexts: 64, decals: 28, shells: 12 },
};

// Les commandants deviennent des unités du jeu, nommées « hero_<id> » (ne pas modifier)
for (const [id, h] of Object.entries(CONFIG.heroes.list)) {
  CONFIG.units['hero_' + id] = Object.assign({ side: 'player', recruitCooldown: 0, unlockLevel: 999, hero: id }, h.unit);
}
