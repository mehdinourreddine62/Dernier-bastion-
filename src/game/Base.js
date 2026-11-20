import { CONFIG } from '../config.js?v=9';
import { Entity } from './Entity.js?v=9';

// Une base (fort des Survivants ou nid des Mutants), avec sa tourelle automatique :
// mitrailleuse pour le fort, tentacule cracheur pour le nid.
export class Base extends Entity {
  constructor(side, level, mods) {
    const cfg = CONFIG.bases;
    const hp = side === 'player' ? cfg.player.hp + (mods.wallHp || 0) : level.enemyBaseHp;
    super(side, cfg[side].centerX, CONFIG.world.groundY, hp);
    this.isBase = true;
    this.width = cfg.width;
    this.height = cfg.height;
    this.dir = side === 'player' ? 1 : -1;
    // Côté tourné vers le champ de bataille : c'est là qu'on frappe la base
    this.faceX = this.x + this.dir * this.width / 2;
    this.shake = 0;         // secousse (s)
    this.smokeTimer = 0;

    // Tourelle
    if (side === 'player') {
      const t = cfg.player.turret;
      this.turret = {
        damage: t.damage * (mods.turretDamage || 1),
        interval: t.interval,
        range: t.range * (mods.turretRange || 1),
        projectile: t.projectile,
      };
      this.pivot = { x: this.x - 14, y: this.y - 182 };   // position du canon (dessin)
    } else {
      const t = level.enemyTurret;
      this.turret = { damage: t.damage, interval: t.interval, range: t.range, projectile: cfg.enemy.turretProjectile };
      this.pivot = { x: this.x - 46, y: this.y - 180 };   // bout du tentacule (dessin)
    }
    this.turretCd = 1;
    this.turretAngle = side === 'player' ? 0 : Math.PI;
    this.turretFlash = 0;
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
    this.turretFlash = Math.max(0, this.turretFlash - dt);

    // Fumée continue quand la base est abîmée
    if (this.damageState > 0 && this.alive) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = this.damageState === 2 ? 0.1 : 0.25;
        const x = this.x + (Math.random() - 0.5) * this.width * 0.6;
        game.fx.smoke(x, this.y - this.height * (0.5 + Math.random() * 0.4));
        if (Math.random() < 0.5) game.fx.ember(x, this.y - this.height * 0.5);
      }
    }

    if (!this.alive || game.result) return;
    this._updateTurret(dt, game);
  }

  _updateTurret(dt, game) {
    const t = this.turret;
    this.turretCd = Math.max(0, this.turretCd - dt);

    // Ennemi le plus proche de l'avant de la base, à portée
    // (liste triée par position : l'ennemi le plus proche est à une extrémité)
    const L = game.byX[this.side === 'player' ? 'enemy' : 'player'];
    let target = null;
    if (this.dir > 0) { for (let i = 0; i < L.length; i++) if (L[i].alive) { target = L[i]; break; } }
    else { for (let i = L.length - 1; i >= 0; i--) if (L[i].alive) { target = L[i]; break; } }
    if (!target || (target.x - this.faceX) * this.dir > t.range) return;

    this.turretAngle = Math.atan2(target.aimY - this.pivot.y, target.x - this.pivot.x);
    if (this.turretCd > 0) return;
    this.turretCd = t.interval;
    this.turretFlash = 0.08;
    game.emit('turret', this.pivot.x, { side: this.side });
    game.projectiles.spawn({
      side: this.side,
      x: this.pivot.x + Math.cos(this.turretAngle) * 24,
      y: this.pivot.y + Math.sin(this.turretAngle) * 24,
      target, damage: t.damage, attackerDef: null, cfg: t.projectile, splash: 0,
    });
  }
}
