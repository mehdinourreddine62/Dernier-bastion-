import { CONFIG } from '../config.js?v=3';

// L'ordinateur (Mutants). Une décision par seconde (réglable par niveau) :
//  1. améliore son revenu selon le profil du niveau ;
//  2. défense : si mes unités approchent de sa base, il dépense tout ;
//  3. vague : parfois il économise pour lancer 4 à 6 unités d'un coup ;
//  4. sinon il achète une unité, en privilégiant celles qui contrent mon armée
//     (tirage pondéré, donc jamais totalement prévisible).
// Il suit les mêmes règles que le joueur : ferraille, file, recharges, population.
export class AI {
  constructor(game) {
    this.game = game;
    this.cfg = game.level.ai;
    this.timer = this.cfg.firstDelay;
    this.wavePlan = null;     // unités prévues pour la prochaine vague
    this.saveTime = 0;        // temps passé à économiser
    this.pending = [];        // vague payable, en attente de place dans la file
    this.mode = 'normal';     // pour l'affichage/débogage : 'normal' | 'saving' | 'defense' | 'wave'
  }

  update(dt) {
    if (this.wavePlan) this.saveTime += dt;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += this.cfg.decisionInterval;
    this.decide();
  }

  decide() {
    const g = this.game;
    this._maybeUpgradeIncome();

    // Une vague est en cours de lancement : on remplit la file au fur et à mesure
    if (this.pending.length) {
      this.mode = 'wave';
      while (this.pending.length && g.recruit('enemy', this.pending[0])) this.pending.shift();
      // Plus assez de ferraille alors que la file a de la place : on abandonne le reste
      if (this.pending.length && g.sides.enemy.queue.length < CONFIG.combat.recruitQueueMax) this.pending.length = 0;
      return;
    }

    // Défense : on dépense tout immédiatement
    if (this._threatened()) {
      this.mode = 'defense';
      this.wavePlan = null;
      for (let i = 0; i < CONFIG.combat.recruitQueueMax; i++) {
        const id = this._pickUnit(true);
        if (!id || !g.recruit('enemy', id)) break;
      }
      return;
    }

    // Économie pour une vague
    if (this.wavePlan) {
      this.mode = 'saving';
      const cost = this.wavePlan.reduce((sum, id) => sum + CONFIG.units[id].cost, 0);
      if (g.sides.enemy.scrap >= cost || this.saveTime > CONFIG.ai.maxSaveTime) {
        this.pending = this.wavePlan;
        this.wavePlan = null;
      }
      return;
    }

    this.mode = 'normal';
    if (Math.random() > this.cfg.buyChance) return;
    const w = this.cfg.waves;
    if (w.chance > 0 && Math.random() < w.chance) {
      const n = w.min + Math.floor(Math.random() * (w.max - w.min + 1));
      this.wavePlan = [];
      for (let i = 0; i < n; i++) this.wavePlan.push(this._pickUnit(false));
      this.saveTime = 0;
      return;
    }
    // Achat simple. Si l'unité tirée est trop chère, il économise jusqu'à la prochaine décision.
    const id = this._pickUnit(false);
    if (id) g.recruit('enemy', id);
  }

  // Mes unités sont-elles proches de sa base ?
  _threatened() {
    const base = this.game.bases.enemy;
    for (const u of this.game.units) {
      if (u.side === 'player' && u.alive && (u.x - base.faceX) * base.dir <= this.cfg.defenseDistance) return true;
    }
    return false;
  }

  // Tirage pondéré, poids augmentés pour les unités qui contrent mon armée
  _pickUnit(onlyAffordable) {
    const g = this.game;
    const counters = CONFIG.ai.counters;
    // Composition de mon armée : nombre d'unités par type
    let total = 0;
    const tagCount = {};
    for (const u of g.units) {
      if (u.side !== 'player' || !u.alive) continue;
      total++;
      for (const t of u.tags) tagCount[t] = (tagCount[t] || 0) + 1;
    }

    const ids = [];
    const weights = [];
    let sum = 0;
    for (const id in this.cfg.weights) {
      if (onlyAffordable && CONFIG.units[id].cost > g.sides.enemy.scrap) continue;
      let w = this.cfg.weights[id];
      if (total > 0 && counters[id]) {
        let n = 0;
        for (const t of counters[id]) n += tagCount[t] || 0;
        w *= 1 + CONFIG.ai.counterStrength * Math.min(1, n / total);
      }
      if (w <= 0) continue;
      ids.push(id); weights.push(w); sum += w;
    }
    if (!ids.length) return null;
    let r = Math.random() * sum;
    for (let i = 0; i < ids.length; i++) {
      r -= weights[i];
      if (r <= 0) return ids[i];
    }
    return ids[ids.length - 1];
  }

  _maybeUpgradeIncome() {
    const g = this.game;
    const p = CONFIG.ai.incomeUpgradeProfiles[this.cfg.incomeUpgrades];
    if (!p || p.chance <= 0 || g.time < p.notBefore) return;
    if (g.sides.enemy.incomeLevel >= p.maxLevel) return;
    const cost = g.incomeUpgradeCost('enemy');
    if (cost === null || g.sides.enemy.scrap < cost) return;
    if (Math.random() < p.chance) g.upgradeIncome('enemy');
  }
}
