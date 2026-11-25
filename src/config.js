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
    speeds: [1, 2, 3],    // vitesses de jeu disponibles (bouton x1 / x2 / x3)
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

  // ---------- Ordre des boutons de recrutement (touches 1 à 7) ----------
  roster: {
    player: ['pillard', 'tireur', 'motard', 'lanceFlammes', 'blinde', 'lanceRoquettes', 'mitrailleur'],
  },

  // ---------- Unités ----------
  // attackInterval : secondes entre deux attaques (pour le lance-flammes : durée d'un « tick »)
  // recruitCooldown : recharge entre deux sorties de cette unité (s)
  // attack.kind : 'melee'      coup au contact (knockback = recul infligé, splashRadius = zone)
  //               'projectile' tir à distance
  //               'flame'      touche tous les ennemis devant, jusqu'à la portée
  //               'cannon'     obus qui explose (splashRadius)
  // resist : { typeAttaquant: multiplicateur } dégâts reçus réduits (ex. Carapace contre les tirs)
  // pierce : true = ignore les résistances (Lance-roquettes)
  // spawnOnDeath : { unit, count } libère des unités à sa mort (Couveuse)
  // howl : { radius, speed, damage } accélère et renforce les alliés proches (Hurleur)
  // summon : { unit, count, every } fait apparaître des unités régulièrement (boss)
  // phases : seuils de PV où le boss enrage (plus rapide, plus fort, renforts)
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
    lanceRoquettes: {
      side: 'player', name: 'Lance-roquettes', role: 'Anti-blindage',
      cost: 160, hp: 90, damage: 60, attackInterval: 3.0, range: 250, speed: 45,
      recruitCooldown: 6, tags: ['ranged'], bonuses: { heavy: 2.5, boss: 2 }, pierce: true,
      attack: { kind: 'cannon', splashRadius: 30, projectile: { shape: 'rocket', speed: 620, color: '#ffcf7a', length: 0, width: 4, arcHeight: 18 } },
      unlockLevel: 11, bodyWidth: 32, bodyHeight: 68,
      strengths: 'Perce les Carapaces, ravage Brutes et boss', weaknesses: 'Tire lentement, très fragile',
    },
    mitrailleur: {
      side: 'player', name: 'Mitrailleur lourd', role: 'Tir de barrage',
      cost: 200, hp: 260, damage: 5, attackInterval: 0.15, range: 190, speed: 38,
      recruitCooldown: 8, tags: ['ranged'], bonuses: { swarm: 1.6, fast: 1.3, flying: 1.3 }, antiAir: true, rapidFire: true,
      attack: { kind: 'projectile', projectile: { shape: 'tracer', speed: 1150, color: '#ffe9a0', length: 16, width: 1.6, arcHeight: 0 } },
      unlockLevel: 13, bodyWidth: 40, bodyHeight: 70,
      strengths: 'Fauche les nuées, les larves et les volants', weaknesses: 'Lent, inutile contre les Carapaces',
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
      side: 'enemy', name: 'Abomination', role: 'Boss', banner: "L'ABOMINATION SORT DU NID !",
      cost: 600, hp: 2500, damage: 60, attackInterval: 2.5, range: 60, speed: 20,
      recruitCooldown: 0, tags: ['boss'], bonuses: {},
      attack: { kind: 'melee', splashRadius: 60 }, bodyWidth: 120, bodyHeight: 160,
    },
    // ----- Chapitre 2 -----
    // Carapace : mutant cuirassé, les balles ricochent (Lance-roquettes, Blindé, mêlée et flammes conseillés)
    carapace: {
      side: 'enemy', name: 'Carapace', role: 'Cuirassé',
      cost: 160, hp: 650, damage: 22, attackInterval: 1.4, range: 35, speed: 32,
      recruitCooldown: 8, tags: ['heavy'], bonuses: { melee: 1.3 }, resist: { ranged: 0.4 },
      attack: { kind: 'melee' }, bodyWidth: 64, bodyHeight: 62,
    },
    // Couveuse : sac de chair lent qui libère des larves à sa mort
    couveuse: {
      side: 'enemy', name: 'Couveuse', role: 'Pondeuse',
      cost: 150, hp: 320, damage: 12, attackInterval: 1.2, range: 30, speed: 28,
      recruitCooldown: 7, tags: ['swarm'], bonuses: {}, spawnOnDeath: { unit: 'larve', count: 4 },
      attack: { kind: 'melee' }, bodyWidth: 60, bodyHeight: 54,
    },
    larve: {
      side: 'enemy', name: 'Larve', role: 'Nuée',
      cost: 0, hp: 40, damage: 7, attackInterval: 0.8, range: 25, speed: 110,
      recruitCooldown: 0, tags: ['swarm', 'fast'], bonuses: {},
      attack: { kind: 'melee' }, bodyWidth: 26, bodyHeight: 20,
    },
    // Hurleur : son cri accélère et renforce les mutants autour de lui
    hurleur: {
      side: 'enemy', name: 'Hurleur', role: 'Soutien',
      cost: 130, hp: 170, damage: 10, attackInterval: 1.5, range: 140, speed: 45,
      recruitCooldown: 6, tags: ['ranged'], bonuses: {}, howl: { radius: 170, speed: 0.3, damage: 0.25 },
      attack: { kind: 'projectile', projectile: { shape: 'sonic', speed: 500, color: '#d070ff', length: 0, width: 8, arcHeight: 0 } },
      bodyWidth: 40, bodyHeight: 76,
    },
    // Épineux : lance des épines d'os de très loin (plus loin que les Tireurs)
    epineux: {
      side: 'enemy', name: 'Épineux', role: 'Artilleur',
      cost: 120, hp: 110, damage: 24, attackInterval: 2.4, range: 330, speed: 36,
      recruitCooldown: 5, tags: ['ranged'], bonuses: { ranged: 1.5 },
      attack: { kind: 'projectile', projectile: { shape: 'spine', speed: 560, color: '#e8dcb8', length: 0, width: 3, arcHeight: 60 } },
      bodyWidth: 46, bodyHeight: 64,
    },
    matriarche: {
      side: 'enemy', name: 'Matriarche', role: 'Boss', banner: 'LA MATRIARCHE SORT DU NID !',
      cost: 800, hp: 5000, damage: 55, attackInterval: 2.2, range: 70, speed: 16,
      recruitCooldown: 0, tags: ['boss'], bonuses: {}, summon: { unit: 'larve', count: 3, every: 6 },
      attack: { kind: 'melee', splashRadius: 60 }, bodyWidth: 130, bodyHeight: 150,
    },
    fleau: {
      side: 'enemy', name: 'Le Fléau', role: 'Boss final', banner: 'LE FLÉAU SE RÉVEILLE !',
      cost: 1200, hp: 9000, damage: 80, attackInterval: 2.4, range: 80, speed: 18,
      recruitCooldown: 0, tags: ['boss'], bonuses: {},
      phases: { at: [0.66, 0.33], speed: 1.25, damage: 1.25, reinforcements: ['brute', 'chien', 'chien', 'hurleur'],
                banner: 'LE FLÉAU ENRAGE !' },
      attack: { kind: 'melee', splashRadius: 80 }, bodyWidth: 150, bodyHeight: 190,
    },
  },

  // ---------- Défi du jour (bouton sur la carte) ----------
  // Chaque jour (date de l'appareil) : un niveau déjà gagné, tiré au hasard, avec « count » règles imposées.
  // Récompense une fois par jour : reward + perLevel × numéro du niveau, + streakBonus par jour consécutif.
  daily: {
    count: 2,
    reward: 60, perLevel: 4,
    streakBonus: 15, streakMax: 5,
    // group : deux règles du même groupe ne sont jamais tirées ensemble ; needs : unité qui doit être débloquée
    modifiers: {
      noTank:   { text: 'Pas de Blindés', rules: { banned: ['blinde'] }, group: 'ban', needs: 'blinde' },
      noRifle:  { text: 'Pas de Tireurs', rules: { banned: ['tireur'] }, group: 'ban' },
      noFlame:  { text: 'Pas de Lance-flammes', rules: { banned: ['lanceFlammes'] }, group: 'ban', needs: 'lanceFlammes' },
      poor:     { text: 'Ton revenu −20 %', rules: { playerIncome: 0.8 }, group: 'eco' },
      broke:    { text: 'Départ sans ferraille', rules: { startScrap: 0 }, group: 'eco' },
      tough:    { text: 'Mutants +25 % de PV', rules: { enemyHp: 1.25 }, group: 'mut' },
      fast:     { text: 'Mutants 25 % plus rapides', rules: { enemySpeed: 1.25 }, group: 'mut' },
      horde:    { text: 'Le Nid produit 30 % de mutants en plus', rules: { aiIncome: 1.3 }, group: 'mut' },
      noSpells: { text: 'Pas de sorts (mortier, soins)', rules: { noSpells: true } },
      noHero:   { text: 'Sans commandant', rules: { noHero: true } },
    },
  },

  // ---------- Bestiaire (écran titre) ----------
  // Mutants dans l'ordre d'affichage, avec leur description et comment les contrer.
  bestiary: {
    goule: { desc: 'Mutant de base, arrive en nombre.', weak: 'Lance-flammes (×2 contre les nuées), Mitrailleur.' },
    cracheur: { desc: 'Crache de l’acide de loin ; ronge les blindages (×2 contre les lourds).', weak: 'Pillards et Motards (×1,5 contre les unités à distance).' },
    chien: { desc: 'Très rapide, fonce sur les tireurs (×1,5).', weak: 'Tireurs (×1,5 contre les rapides).' },
    brute: { desc: 'Colosse de mêlée qui repousse et écrase les blindés (×1,5).', weak: 'Lance-roquettes, Tireurs en nombre derrière une ligne de Pillards.' },
    rouilleur: { desc: 'Kamikaze : explose au contact, ×3 contre les blindés.', weak: 'Tireurs et tourelle, avant qu’il n’arrive au contact.' },
    charognard: { desc: 'Volant : survole la mêlée et attaque les unités à distance (×2).', weak: 'Seuls Tireurs, Mitrailleurs, tourelle, mortier et Vasquez l’atteignent.' },
    carapace: { desc: 'Cuirassé : les balles ne lui font que 40 % des dégâts.', weak: 'Lance-roquettes, Blindé, mêlée et lance-flammes.' },
    epineux: { desc: 'Artilleur : tire plus loin que les Tireurs, ×1,5 contre eux.', weak: 'Motards et unités rapides qui foncent dessus, Vasquez.' },
    couveuse: { desc: 'Lente ; libère 4 larves à sa mort.', weak: 'Lance-flammes et Mitrailleur pour les larves.' },
    larve: { desc: 'Petite et rapide, sort des Couveuses et de la Matriarche.', weak: 'Lance-flammes, Mitrailleur.' },
    hurleur: { desc: 'Son cri accélère (+30 %) et renforce (+25 %) les mutants proches (zone violette).', weak: 'À abattre en priorité : Tireurs, Vasquez, mortier.' },
    abomination: { desc: 'Boss : ses coups frappent toute une zone.', weak: 'Lance-roquettes (×2 contre les boss), Blindés, tir de précision de Vasquez.' },
    matriarche: { desc: 'Boss : pond 3 larves toutes les 6 s.', weak: 'Lance-roquettes sur elle, Lance-flammes pour les larves.' },
    fleau: { desc: 'Boss final : enrage à 66 % et à 33 % de ses PV et appelle des renforts.', weak: 'Lance-roquettes, Vasquez, mortier sur les renforts.' },
  },

  // ---------- Commandants (héros) ----------
  // Un seul par partie, choisi dans l'onglet HÉROS. C'est toi qui le déploies (portrait / touche E) :
  // possible après deployDelay secondes en début de partie, puis respawnTime secondes après sa mort.
  // Une fois sur le terrain, le même bouton lance sa capacité.
  // Amélioration : on dépense des étoiles (toutes celles gagnées dans la campagne).
  heroes: {
    deployDelay: 0,
    respawnTime: 45,
    maxLevel: 10,
    costs: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],   // étoiles par niveau (30 pour un héros au maximum)
    perLevel: { hp: 0.12, damage: 0.10, ability: 0.10, cooldown: 0.04 },   // gains par niveau
    // Au niveau maximum : un talent propre à chaque commandant
    order: ['kane', 'rosa', 'vasquez'],
    list: {
      kane: {
        name: 'Sergent Kane', title: 'Ligne de front', unlockLevel: 1,
        aura: { kind: 'armor', radius: 170, value: 0.2,
                text: 'Les unités de corps à corps proches subissent 20 % de dégâts en moins' },
        ability: { kind: 'rally', name: 'Cri de ralliement', cooldown: 40, duration: 8, bonus: 0.3,
                   text: 'Toutes tes unités : +30 % de vitesse et de dégâts pendant 8 s' },
        talent: { name: 'Second souffle', heal: 0.5,
                  text: 'La première fois qu’il devrait tomber, il se relève avec 50 % de ses PV (une fois par déploiement)' },
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
        talent: { name: 'Atelier de campagne', turrets: 2,
                  text: 'Sa capacité pose deux tourelles au lieu d’une' },
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
        talent: { name: 'Tir en rafale', targets: 3,
                  text: 'Son tir de précision vise les trois mutants les plus résistants' },
        unit: { name: 'Doc Vasquez', role: 'Commandant, fusil de précision', cost: 0, hp: 400, damage: 38,
                attackInterval: 1.8, range: 300, speed: 50, tags: ['ranged'], bonuses: { flying: 1.5, heavy: 1.3 }, antiAir: true,
                attack: { kind: 'projectile', projectile: { shape: 'tracer', speed: 1400, color: '#fff6c0', length: 34, width: 3, arcHeight: 0 } },
                bodyWidth: 32, bodyHeight: 76 },
      },
    },
  },

  // ---------- Mode Survie ----------
  // Vagues infinies, sans pause : une nouvelle vague part toutes les waveDuration secondes,
  // même si la précédente n'est pas finie. Le nid est indestructible. Fin quand ta base tombe.
  survival: {
    unlockAfterLevel: 5,          // finir ce niveau en Normal débloque la Survie
    firstWaveDelay: 8,            // secondes avant la vague 1
    waveDuration: 30,             // une vague toutes les 30 s
    spawnWindow: 0.7,             // les mutants d'une vague arrivent pendant 70 % de sa durée
    baseCount: 5, countPerWave: 1.4,          // nombre de mutants : 5 + 1,4 × (vague - 1)
    hpPerWave: 0.08, damagePerWave: 0.05,     // renforcement des mutants à chaque vague
    unitsFromWave: { goule: 1, cracheur: 1, chien: 3, rouilleur: 4, brute: 5, charognard: 6,
                     carapace: 8, epineux: 9, couveuse: 11, hurleur: 13 },
    weights: { goule: 4, cracheur: 3, chien: 2, rouilleur: 1.5, brute: 1, charognard: 1.5,
               carapace: 1, epineux: 1, couveuse: 1, hurleur: 0.7 },
    specialEvery: 5,              // vague spéciale (une seule espèce, en nombre)
    bossEvery: 10,                // vague de boss toutes les 10 vagues
    bossCycle: ['abomination', 'matriarche', 'fleau'],   // boss des vagues 10, 20, 30, puis on recommence (×2…)
    turret: { damage: 10, perWave: 0.6, interval: 0.6, range: 300 },
    score: { perWave: 500, perKill: 10 },
    rewards: { perWave: 3, milestoneEvery: 5, milestonePieces: 25 },   // pièces : 3 par vague + paliers
    cardChoices: 3,               // cartes proposées après chaque vague de boss
    cards: {
      perforant:  { name: 'Munitions perforantes', desc: 'Tireurs : +25 % de dégâts', icon: 'tireur' },
      gilets:     { name: 'Gilets renforcés', desc: 'Pillards et Motards : +30 % de PV', icon: 'pillard' },
      napalm:     { name: 'Napalm', desc: 'Lance-flammes : +30 % de dégâts', icon: 'lanceFlammes', needs: 'lanceFlammes' },
      blindage:   { name: 'Blindage lourd', desc: 'Blindés : +35 % de PV', icon: 'blinde', needs: 'blinde' },
      ogives:     { name: 'Ogives perforantes', desc: 'Lance-roquettes : +30 % de dégâts', icon: 'lanceRoquettes', needs: 'lanceRoquettes' },
      bandes:     { name: 'Bandes de munitions', desc: 'Mitrailleurs : +25 % de dégâts', icon: 'mitrailleur', needs: 'mitrailleur' },
      recup:      { name: 'Récupération', desc: 'Ferraille des ennemis tués : +50 %', icon: 'income' },
      revenu:     { name: 'Raffinerie de fortune', desc: '+4 ferraille par seconde', icon: 'income' },
      barbeles:   { name: 'Barbelés électrifiés', desc: 'Les mutants près du fort perdent 15 PV/s', icon: 'walls' },
      tourelle:   { name: 'Tourelle lourde', desc: 'Tourelle du fort : +50 % de dégâts', icon: 'turret' },
      ravitaillement: { name: 'Ravitaillement', desc: 'Recharge des sorts : -25 %', icon: 'mortar' },
      medecine:   { name: 'Médecine de terrain', desc: 'Toutes tes unités : +2 PV/s', icon: 'heal' },
      veterans:   { name: 'Vétérans', desc: 'Toutes tes unités : +15 % de dégâts', icon: 'pillard' },
      remparts:   { name: 'Remparts', desc: 'Ta base récupère 400 PV et +400 PV max', icon: 'walls' },
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
    order: ['pillard', 'tireur', 'motard', 'lanceFlammes', 'blinde', 'lanceRoquettes', 'mitrailleur', 'walls', 'turret', 'salvage', 'spells'],
    names: { walls: 'Murailles', turret: 'Tourelle', salvage: 'Récupération', spells: 'Sorts' },
    maxLevel: 10,
    costs: [25, 40, 55, 70, 90, 115, 150, 200, 260, 330],   // pièces détachées par niveau (1 335 pour un niveau 10)
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
      carapace: ['ranged'],
      couveuse: ['heavy'],
      epineux: ['ranged', 'heavy'],
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

  // ---------- Chapitres de la campagne (onglets de la carte) ----------
  chapters: [
    { name: 'CHAPITRE 1', title: 'Les Terres mortes', first: 1, last: 10 },
    { name: 'CHAPITRE 2', title: 'Le Fléau', first: 11, last: 20, mapTint: 'rgba(90,20,40,0.22)' },
    { name: 'CHAPITRE 3', title: 'La Reconquête', first: 21, last: 30, mapTint: 'rgba(60,90,130,0.22)' },
  ],

  // ---------- Niveaux ----------
  // ai.weights      : poids de tirage de chaque unité ennemie (= unités disponibles)
  // ai.buyChance    : probabilité d'acheter à chaque décision (1 décision / s)
  // ai.waves.chance : probabilité qu'un achat devienne une vague (économie puis 4-6 unités)
  // ai.defenseDistance : si mes unités sont à moins de ça de sa base, l'IA dépense tout
  // bosses          : boss lancés quand la base ennemie descend sous un % de PV
  // aiStartScrap    : ferraille de l'IA au début de la partie
  // bosses[].unit   : abomination, matriarche ou fleau
  // rules (facultatif) : règle spéciale du niveau
  //   banned: ['blinde']  unités interdites · playerIncome: 0.85  revenu du joueur ×0,85
  //   enemyHp: 1.15       PV des mutants ×1,15 · text: phrase affichée sur la fiche du niveau
  // Difficulté : niveaux 1-5 gagnables sans atelier ; à partir du 7-8 l'atelier devient
  // nécessaire, et le chapitre 2 demande de l'améliorer régulièrement.
  // Le revenu de l'IA (aiIncomeMult) est le levier principal.
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

    // ===== Chapitre 2 : le Fléau =====
    { id: 11, name: 'Faubourgs brûlés', enemyBaseHp: 4200, aiIncomeMult: 4.0, aiStartScrap: 750,
      enemyTurret: { damage: 54, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 3, chien: 2, brute: 1, rouilleur: 2, charognard: 1, carapace: 2 },
            waves: { chance: 0.5, min: 8, max: 12 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 600 }, { type: 'losses', max: 90 }],
      bosses: [] },
    { id: 12, name: 'Barrage fissuré', enemyBaseHp: 4600, aiIncomeMult: 4.4, aiStartScrap: 800,
      enemyTurret: { damage: 57, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 2, brute: 1, rouilleur: 2, charognard: 1, carapace: 2, epineux: 2 },
            waves: { chance: 0.5, min: 8, max: 12 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 600 }, { type: 'losses', max: 100 }],
      bosses: [] },
    { id: 13, name: 'Couvoir', enemyBaseHp: 5000, aiIncomeMult: 5.0, aiStartScrap: 850,
      enemyTurret: { damage: 60, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 2, brute: 1, rouilleur: 1, charognard: 1, carapace: 1, epineux: 1, couveuse: 3 },
            waves: { chance: 0.55, min: 8, max: 13 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 630 }, { type: 'losses', max: 110 }],
      bosses: [] },
    { id: 14, name: 'Base aérienne', enemyBaseHp: 5400, aiIncomeMult: 5.5, aiStartScrap: 900,
      enemyTurret: { damage: 63, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 2, brute: 1, rouilleur: 2, charognard: 3, carapace: 2, epineux: 2, couveuse: 1 },
            waves: { chance: 0.55, min: 9, max: 13 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 660 }, { type: 'losses', max: 120 }],
      bosses: [] },
    { id: 15, name: 'Antre de la Matriarche', enemyBaseHp: 5800, aiIncomeMult: 6.3, aiStartScrap: 950,
      enemyTurret: { damage: 66, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 2, brute: 1, rouilleur: 1, charognard: 2, carapace: 1, epineux: 1, couveuse: 3 },
            waves: { chance: 0.55, min: 9, max: 13 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 780 }, { type: 'losses', max: 150 }],
      bosses: [{ unit: 'matriarche', atBaseHpRatio: 0.5 }] },
    { id: 16, name: 'Gare de triage', enemyBaseHp: 6200, aiIncomeMult: 7.4, aiStartScrap: 1000,
      enemyTurret: { damage: 69, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 2, brute: 2, rouilleur: 2, charognard: 2, carapace: 2, epineux: 1, couveuse: 1, hurleur: 2 },
            waves: { chance: 0.6, min: 9, max: 14 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 720 }, { type: 'losses', max: 140 }],
      bosses: [] },
    { id: 17, name: 'Désert de verre', enemyBaseHp: 6600, aiIncomeMult: 8.0, aiStartScrap: 1050,
      enemyTurret: { damage: 72, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 3, brute: 2, rouilleur: 2, charognard: 2, carapace: 2, epineux: 2, couveuse: 1, hurleur: 2 },
            waves: { chance: 0.6, min: 10, max: 14 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 750 }, { type: 'losses', max: 150 }],
      bosses: [] },
    { id: 18, name: 'Observatoire', enemyBaseHp: 7000, aiIncomeMult: 8.8, aiStartScrap: 1100,
      enemyTurret: { damage: 76, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 2, brute: 2, rouilleur: 2, charognard: 2, carapace: 2, epineux: 2, couveuse: 2, hurleur: 2 },
            waves: { chance: 0.6, min: 10, max: 15 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 840 }, { type: 'losses', max: 170 }],
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.5 }] },
    { id: 19, name: 'Cratère', enemyBaseHp: 7600, aiIncomeMult: 9.4, aiStartScrap: 1200,
      enemyTurret: { damage: 80, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 2, brute: 2, rouilleur: 2, charognard: 2, carapace: 3, epineux: 2, couveuse: 2, hurleur: 2 },
            waves: { chance: 0.65, min: 10, max: 15 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 840 }, { type: 'losses', max: 180 }],
      bosses: [] },
    { id: 20, name: 'Cœur du Fléau', enemyBaseHp: 8500, aiIncomeMult: 9.6, aiStartScrap: 1300,
      enemyTurret: { damage: 85, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 2, brute: 2, rouilleur: 2, charognard: 2, carapace: 3, epineux: 2, couveuse: 2, hurleur: 2 },
            waves: { chance: 0.65, min: 11, max: 16 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 1200 }, { type: 'losses', max: 300 }],
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.75 }, { unit: 'matriarche', atBaseHpRatio: 0.5 }, { unit: 'fleau', atBaseHpRatio: 0.25 }] },
    // ===== Chapitre 3 : la Reconquête (mêmes troupes, armées et règles différentes) =====
    { id: 21, name: 'Route du Nord', enemyBaseHp: 8000, aiIncomeMult: 9.0, aiStartScrap: 1300,
      enemyTurret: { damage: 85, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 2, brute: 2, rouilleur: 2, charognard: 2, carapace: 2, epineux: 2, couveuse: 1, hurleur: 1 },
            waves: { chance: 0.6, min: 10, max: 15 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 840 }, { type: 'losses', max: 170 }],
      bosses: [] },
    { id: 22, name: 'Forêt pétrifiée', enemyBaseHp: 8300, aiIncomeMult: 9.6, aiStartScrap: 1300,
      enemyTurret: { damage: 86, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 5, chien: 3, couveuse: 4, rouilleur: 2, hurleur: 1, cracheur: 1 },
            waves: { chance: 0.65, min: 12, max: 18 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 840 }, { type: 'losses', max: 180 }],
      bosses: [] },
    { id: 23, name: 'Port gelé', enemyBaseHp: 8600, aiIncomeMult: 10.2, aiStartScrap: 1350,
      enemyTurret: { damage: 88, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { charognard: 5, cracheur: 2, goule: 2, epineux: 2, carapace: 1, brute: 1 },
            waves: { chance: 0.6, min: 10, max: 15 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      rules: { banned: ['motard'], text: 'Verglas : pas de Motards' },
      objectives: [{ type: 'time', max: 870 }, { type: 'losses', max: 180 }],
      bosses: [] },
    { id: 24, name: 'Usine d’armement', enemyBaseHp: 9000, aiIncomeMult: 10.8, aiStartScrap: 1400,
      enemyTurret: { damage: 95, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { carapace: 4, brute: 3, rouilleur: 3, goule: 2, cracheur: 1 },
            waves: { chance: 0.6, min: 9, max: 13 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 900 }, { type: 'losses', max: 180 }],
      bosses: [] },
    { id: 25, name: 'Les Arènes', enemyBaseHp: 9400, aiIncomeMult: 11.2, aiStartScrap: 1400,
      enemyTurret: { damage: 92, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 2, brute: 2, rouilleur: 2, charognard: 2, carapace: 2, epineux: 1, couveuse: 1, hurleur: 1 },
            waves: { chance: 0.6, min: 10, max: 15 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 1020 }, { type: 'losses', max: 220 }],
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.8 }, { unit: 'abomination', atBaseHpRatio: 0.6 }, { unit: 'matriarche', atBaseHpRatio: 0.35 }] },
    { id: 26, name: 'Tunnel effondré', enemyBaseHp: 8800, aiIncomeMult: 9.0, aiStartScrap: 1450,
      enemyTurret: { damage: 96, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { epineux: 2, cracheur: 2, goule: 3, chien: 2, hurleur: 1, carapace: 1, brute: 1 },
            waves: { chance: 0.6, min: 10, max: 15 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      rules: { banned: ['blinde'], text: 'Tunnel trop étroit : pas de Blindés' },
      objectives: [{ type: 'time', max: 930 }, { type: 'losses', max: 190 }],
      bosses: [] },
    { id: 27, name: 'Ville fantôme', enemyBaseHp: 10000, aiIncomeMult: 13.2, aiStartScrap: 1500,
      enemyTurret: { damage: 98, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { chien: 4, hurleur: 3, goule: 3, rouilleur: 2, charognard: 2, brute: 1 },
            waves: { chance: 0.65, min: 12, max: 18 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 930 }, { type: 'losses', max: 200 }],
      bosses: [] },
    { id: 28, name: 'Raffinerie en feu', enemyBaseHp: 10400, aiIncomeMult: 12.8, aiStartScrap: 1550,
      enemyTurret: { damage: 100, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 3, cracheur: 2, chien: 2, brute: 2, rouilleur: 2, charognard: 2, carapace: 2, epineux: 2, couveuse: 2, hurleur: 2 },
            waves: { chance: 0.65, min: 11, max: 16 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      rules: { playerIncome: 0.85, text: 'Dépôts en feu : ton revenu −15 %' },
      objectives: [{ type: 'time', max: 960 }, { type: 'losses', max: 210 }],
      bosses: [{ unit: 'matriarche', atBaseHpRatio: 0.5 }] },
    { id: 29, name: 'Mur du Nid', enemyBaseHp: 11200, aiIncomeMult: 13.4, aiStartScrap: 1600,
      enemyTurret: { damage: 105, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 2, brute: 3, rouilleur: 2, charognard: 2, carapace: 3, epineux: 2, couveuse: 2, hurleur: 2 },
            waves: { chance: 0.65, min: 11, max: 16 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      rules: { enemyHp: 1.15, text: 'Mutants endurcis : PV +15 %' },
      objectives: [{ type: 'time', max: 1020 }, { type: 'losses', max: 230 }],
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.6 }, { unit: 'matriarche', atBaseHpRatio: 0.3 }] },
    { id: 30, name: 'Le Grand Nid', enemyBaseHp: 12500, aiIncomeMult: 14.0, aiStartScrap: 1800,
      enemyTurret: { damage: 110, interval: 0.45, range: 370 },
      ai: { decisionInterval: 1, firstDelay: 3, buyChance: 1, weights: { goule: 2, cracheur: 2, chien: 2, brute: 2, rouilleur: 2, charognard: 2, carapace: 3, epineux: 2, couveuse: 2, hurleur: 2 },
            waves: { chance: 0.7, min: 12, max: 17 }, defenseDistance: 600, incomeUpgrades: 'fast' },
      objectives: [{ type: 'time', max: 1500 }, { type: 'losses', max: 350 }],
      bosses: [{ unit: 'abomination', atBaseHpRatio: 0.85 }, { unit: 'matriarche', atBaseHpRatio: 0.65 }, { unit: 'fleau', atBaseHpRatio: 0.45 }, { unit: 'fleau', atBaseHpRatio: 0.2 }] },
  ],

  // ---------- Performance ----------
  pools: { projectiles: 160, particles: 700, floatingTexts: 64, decals: 28, shells: 12 },
};

// Les commandants deviennent des unités du jeu, nommées « hero_<id> » (ne pas modifier)
for (const [id, h] of Object.entries(CONFIG.heroes.list)) {
  CONFIG.units['hero_' + id] = Object.assign({ side: 'player', recruitCooldown: 0, unlockLevel: 999, hero: id }, h.unit);
}
