import { CONFIG } from '../config.js';
import { Entity } from './Entity.js';

// Une base (fort des Survivants ou nid des Mutants).
export class Base extends Entity {
  constructor(side, level) {
    const cfg = CONFIG.bases;
    const hp = side === 'player' ? cfg.player.hp : level.enemyBaseHp;
    super(side, cfg[side].centerX, CONFIG.world.groundY, hp);
    this.isBase = true;
    this.width = cfg.width;
    this.height = cfg.height;
    this.dir = side === 'player' ? 1 : -1;
    // Côté tourné vers le champ de bataille : c'est là qu'on frappe la base
    this.faceX = this.x + this.dir * this.width / 2;
    this.shake = 0;         // secousse (s)
    this.smokeTimer = 0;
  }

  get tags() { return CONFIG.bases.tags; }
  get aimY() { return this.y - this.height * 0.4; }

  takeDamage(amount) {
    super.takeDamage(amount);
    this.shake = 0.25;
  }

  // 0 = intacte, 1 = < 50 % de PV, 2 = < 25 % de PV
  get damageState() {
    const r = this.hp / this.maxHp;
    const [a, b] = CONFIG.bases.damageStates;
    return r <= b ? 2 : r <= a ? 1 : 0;
  }

  update(dt, game) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.shake = Math.max(0, this.shake - dt);
    // Fumée continue quand la base est abîmée
    if (this.damageState > 0 && this.alive) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = this.damageState === 2 ? 0.12 : 0.3;
        game.fx.smoke(this.x + (Math.random() - 0.5) * this.width * 0.6, this.y - this.height * 0.8);
      }
    }
  }
}
