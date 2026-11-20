import { CONFIG } from '../config.js';

// L'ordinateur (Mutants). Étape 1 : IA simple.
// Toutes les secondes, il tire une unité au hasard (selon les poids du niveau)
// et l'achète si il peut. Contres, vagues et défense : étape 2.
export class AI {
  constructor(game) {
    this.game = game;
    this.cfg = game.level.ai;
    this.timer = this.cfg.firstDelay;
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += this.cfg.decisionInterval;
    this.decide();
  }

  decide() {
    const g = this.game;
    if (g.pop('enemy') >= CONFIG.combat.populationMax) return;
    if (Math.random() > this.cfg.buyChance) return;

    // Unités disponibles : pas en recharge
    const s = g.sides.enemy;
    const ids = Object.keys(this.cfg.weights).filter((id) => !(s.cooldowns[id] > 0));
    if (ids.length === 0) return;

    // Tirage pondéré
    let total = 0;
    for (const id of ids) total += this.cfg.weights[id];
    let r = Math.random() * total;
    let pick = ids[ids.length - 1];
    for (const id of ids) {
      r -= this.cfg.weights[id];
      if (r <= 0) { pick = id; break; }
    }
    // Si trop cher : on économise (pas d'achat moins cher à la place)
    g.recruit('enemy', pick);
  }
}
