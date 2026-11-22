import { CONFIG } from '../config.js?v=20';

// Mode Survie : vagues de mutants infinies et de plus en plus fortes, sans pause.
// Le nid ne peut pas être détruit ; la partie s'arrête quand ta base tombe.
// Après chaque vague de boss vaincue, 3 cartes bonus sont proposées (le jeu attend ton choix).

// « Niveau » utilisé par la partie en Survie (décor de nuit : thème n°99)
export function survivalLevel() {
  const S = CONFIG.survival;
  return {
    id: 99, name: 'Survie', mode: 'survival', enemyBaseHp: 99999, aiIncomeMult: 0, aiStartScrap: 0,
    enemyTurret: { damage: S.turret.damage, interval: S.turret.interval, range: S.turret.range },
    ai: { decisionInterval: 1, firstDelay: 9999, buyChance: 0, weights: {}, waves: { chance: 0, min: 1, max: 1 }, defenseDistance: 0, incomeUpgrades: 'none' },
    bosses: [], objectives: [],
  };
}

// Noms au pluriel pour l'annonce des vagues (sinon : nom de l'unité + « s »)
const PLURAL = { chien: 'Chiens', charognard: 'Charognards', abomination: 'Abominations', matriarche: 'Matriarches', fleau: 'Fléaux', epineux: 'Épineux' };
const isBoss = (id) => CONFIG.units[id].tags.includes('boss');
const shortName = (id) => CONFIG.units[id].name.replace(/ (muté|ailé)$/, '').replace(/^Le /, '');
const label = (id, n) => (n > 1 ? n + ' ' + (PLURAL[id] || shortName(id) + 's') : shortName(id));

export class Survival {
  constructor(game) {
    this.game = game;
    this.wave = 0;                 // vague en cours (0 = pas encore commencé)
    this.timer = CONFIG.survival.firstWaveDelay;   // temps avant la prochaine vague
    this.queue = [];               // mutants de la vague à faire apparaître : { id, at }
    this.waveTime = 0;
    this.bossesAlive = 0;
    this.offer = null;             // cartes proposées (ids) ou null
    this.cards = [];               // cartes déjà choisies
    this.bountyMult = 1;
    this.thorns = 0;               // dégâts par seconde des barbelés électrifiés
    this.regen = 0;                // soin par seconde de toutes tes unités
  }

  get score() {
    const s = CONFIG.survival.score;
    return Math.max(0, this.wave - 1) * s.perWave + this.game.stats.killed * s.perKill;
  }

  // Composition d'une vague (liste d'ids)
  composition(n) {
    const S = CONFIG.survival;
    const avail = Object.keys(S.unitsFromWave).filter((id) => S.unitsFromWave[id] <= n);
    let count = Math.round(S.baseCount + S.countPerWave * (n - 1));
    const list = [];
    if (n % S.bossEvery === 0) {
      // boss du cycle (Abomination, Matriarche, Fléau), un de plus à chaque tour du cycle
      const k = n / S.bossEvery - 1, cyc = S.bossCycle;
      for (let i = 0; i <= Math.floor(k / cyc.length); i++) list.push(cyc[k % cyc.length]);
      count = Math.round(count * 0.6);
    } else if (n % S.specialEvery === 0) {
      // vague spéciale : une seule espèce, plus nombreuse
      const special = ['goule', 'chien', 'rouilleur', 'charognard', 'carapace', 'couveuse'].filter((id) => avail.includes(id));
      const id = special[Math.floor(Math.random() * special.length)];
      for (let i = 0; i < Math.round(count * 1.4); i++) list.push(id);
      return list;
    }
    let total = 0;
    for (const id of avail) total += S.weights[id];
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total;
      for (const id of avail) { r -= S.weights[id]; if (r <= 0) { list.push(id); break; } }
    }
    return list;
  }

  _startWave() {
    const S = CONFIG.survival, g = this.game;
    this.wave++;
    this.waveTime = 0;
    this.timer = S.waveDuration;
    const list = this.composition(this.wave);
    // les boss d'abord, le reste réparti dans le temps
    const spread = S.waveDuration * S.spawnWindow;
    list.sort((a, b) => isBoss(b) - isBoss(a));
    list.forEach((id, i) => this.queue.push({ id, at: (i / Math.max(1, list.length)) * spread }));
    // tentacule du nid plus fort à chaque vague
    g.bases.enemy.turret.damage = S.turret.damage + S.turret.perWave * (this.wave - 1);
    // annonce
    const counts = {};
    for (const id of list) counts[id] = (counts[id] || 0) + 1;
    const desc = Object.entries(counts).map(([id, n]) => label(id, n)).join(', ');
    g.banner = { text: 'VAGUE ' + this.wave + ' : ' + desc, time: 3.5, color: this.wave % S.bossEvery === 0 ? null : '#f2c230' };
    g.emit(this.wave % S.bossEvery === 0 ? 'boss' : 'wave', g.bases.enemy.faceX);
  }

  _spawn(id) {
    const S = CONFIG.survival, g = this.game;
    if (g.pop('enemy') >= CONFIG.combat.populationMax) return false;
    const u = g.spawnUnit('enemy', id);
    const k = this.wave - 1;
    u.maxHp *= 1 + S.hpPerWave * k; u.hp = u.maxHp;
    u.damage *= 1 + S.damagePerWave * k;
    if (isBoss(id)) { u.survivalBoss = true; this.bossesAlive++; }
    return true;
  }

  update(dt) {
    const g = this.game;
    if (this.offer) return;                 // en attente du choix d'une carte
    this.timer -= dt;
    if (this.timer <= 0) this._startWave();
    this.waveTime += dt;
    // apparitions programmées de la vague (et des précédentes en retard)
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      q.at -= dt;
      if (q.at <= 0 && this._spawn(q.id)) { this.queue.splice(i, 1); i--; }
    }
    // effets des cartes
    if (this.thorns > 0) {
      const face = g.bases.player.faceX;
      for (const u of g.byX.enemy) if (u.alive && u.x - face < 160) g.dealDamage('player', u, this.thorns * dt, false, true);
    }
    if (this.regen > 0) for (const u of g.byX.player) if (u.alive && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + this.regen * dt);
  }

  // Appelé quand un mutant meurt
  onEnemyKilled(u) {
    if (u.survivalBoss && --this.bossesAlive <= 0 && !this.queue.some((q) => isBoss(q.id))) {
      this.bossesAlive = 0;
      this._offerCards();
    }
  }

  _offerCards() {
    const C = CONFIG.survival.cards;
    // pas de carte pour une unité pas encore débloquée dans la campagne
    const ids = Object.keys(C).filter((id) => !this.cards.includes(id) && (!C[id].needs || this.game.isUnlocked('player', C[id].needs)));
    const pick = [];
    while (pick.length < CONFIG.survival.cardChoices && ids.length) pick.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]);
    if (pick.length) { this.offer = pick; this.game.emit('cards', 0); }
  }

  // Applique la carte choisie
  choose(id) {
    if (!this.offer || !this.offer.includes(id)) return;
    const g = this.game, mods = g.sides.player.mods;
    const unitMult = (ids, key, k) => {
      for (const uid of ids) {
        const m = mods.units[uid] = Object.assign({ hp: 1, damage: 1 }, mods.units[uid]);
        m[key] *= k;
        for (const u of g.units) {
          if (u.side !== 'player' || u.defId !== uid || !u.alive) continue;
          if (key === 'hp') { u.maxHp *= k; u.hp *= k; } else u.damage *= k;
        }
      }
    };
    const all = CONFIG.roster.player.concat(Object.keys(CONFIG.units).filter((k) => CONFIG.units[k].hero));
    switch (id) {
      case 'perforant': unitMult(['tireur'], 'damage', 1.25); break;
      case 'gilets': unitMult(['pillard', 'motard'], 'hp', 1.3); break;
      case 'napalm': unitMult(['lanceFlammes'], 'damage', 1.3); break;
      case 'blindage': unitMult(['blinde'], 'hp', 1.35); break;
      case 'ogives': unitMult(['lanceRoquettes'], 'damage', 1.3); break;
      case 'bandes': unitMult(['mitrailleur'], 'damage', 1.25); break;
      case 'veterans': unitMult(all, 'damage', 1.15); break;
      case 'recup': this.bountyMult *= 1.5; break;
      case 'revenu': mods.income += 4; break;
      case 'barbeles': this.thorns += 15; break;
      case 'tourelle': g.bases.player.turret.damage *= 1.5; break;
      case 'ravitaillement': mods.spellCooldown *= 0.75; break;
      case 'medecine': this.regen += 2; break;
      case 'remparts': { const b = g.bases.player; b.maxHp += 400; b.hp = Math.min(b.maxHp, b.hp + 400); break; }
    }
    this.cards.push(id);
    this.offer = null;
    g.emit('upgrade', 0);
  }
}
