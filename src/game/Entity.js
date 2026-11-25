import { CONFIG } from '../config.js?v=27';

// Classe de base : tout ce qui a des PV et peut être attaqué (unités, bases).
export class Entity {
  constructor(side, x, y, maxHp) {
    this.side = side;       // 'player' ou 'enemy'
    this.x = x;
    this.y = y;             // position des pieds
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.hitFlash = 0;      // temps restant du flash blanc
  }

  get alive() { return this.hp > 0; }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = CONFIG.combat.hitFlashTime;
  }
}
