import { CONFIG } from '../config.js?v=15';

// Sorts du joueur : Frappe de mortier et Kit de soins.
export class Spells {
  constructor(game) {
    this.game = game;
    this.cooldowns = {};
    for (const id in CONFIG.spells) this.cooldowns[id] = 0;
    // Obus en train de tomber (pool)
    this.shells = Array.from({ length: CONFIG.pools.shells }, () => ({ active: false }));
  }

  // Sorts disponibles à ce niveau, dans l'ordre de la config
  get available() {
    return Object.keys(CONFIG.spells).filter((id) => CONFIG.spells[id].unlockLevel <= this.game.unlockId);
  }

  cooldownOf(id) {
    return CONFIG.spells[id].cooldown * (this.game.sides.player.mods.spellCooldown || 1);
  }

  isReady(id) {
    return !this.game.result && this.available.includes(id) && this.cooldowns[id] <= 0;
  }

  // Lance le sort au point x du monde. Renvoie true si lancé.
  cast(id, x) {
    if (!this.isReady(id)) return false;
    const cfg = CONFIG.spells[id];
    this.cooldowns[id] = this.cooldownOf(id);
    this.game.stats.spells[id] = (this.game.stats.spells[id] || 0) + 1;
    if (id === 'mortar') {
      for (let i = 0; i < cfg.shells; i++) {
        const s = this.shells.find((o) => !o.active);
        if (!s) break;
        s.active = true;
        s.x = x + (Math.random() * 2 - 1) * cfg.radius * 0.7;
        s.delay = i * cfg.shellDelay;   // attente avant le départ
        s.t = 0;                        // progression de la chute (0 -> 1)
      }
    } else if (id === 'heal') {
      const g = this.game;
      for (const u of g.units) {
        if (u.side !== 'player' || !u.alive || Math.abs(u.x - x) > cfg.radius) continue;
        const amount = Math.min(u.maxHp - u.hp, u.maxHp * cfg.healRatio);
        u.hp += amount;
        if (amount >= 1) g.fx.text(u.x, u.y - u.def.bodyHeight - 10, '+' + Math.round(amount), '#7ee05a', 14);
        g.fx.heal(u.x, u.y - u.def.bodyHeight * 0.5);
      }
      g.fx.healRing(x, CONFIG.world.groundY, cfg.radius);
      g.emit('heal', x);
    }
    return true;
  }

  update(dt) {
    for (const id in this.cooldowns) this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
    const cfg = CONFIG.spells.mortar;
    for (const s of this.shells) {
      if (!s.active) continue;
      if (s.delay > 0) { s.delay -= dt; continue; }
      if (s.t === 0) this.game.emit('shellFall', s.x);   // sifflement de l'obus
      s.t += dt / cfg.fallTime;
      if (s.t >= 1) {
        s.active = false;
        this.game.src = 'mortar';
        this.game.explode('player', s.x, cfg.shellBlastRadius, cfg.damagePerShell, null, cfg.hitsBases, 'big');
        this.game.addDecal('crater', s.x, cfg.shellBlastRadius * 0.8, cfg.craterTime);
      }
    }
  }
}
