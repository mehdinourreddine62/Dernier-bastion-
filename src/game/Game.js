import { CONFIG } from '../config.js?v=23';
import { Unit, bonusMultiplier } from './Unit.js?v=23';
import { Base } from './Base.js?v=23';
import { ProjectilePool } from './Projectile.js?v=23';
import { Particles } from './Particles.js?v=23';
import { Spells } from './Spell.js?v=23';
import { AI } from './AI.js?v=23';
import { levelFor } from '../progress.js?v=23';
import { Survival, survivalLevel } from './Survival.js?v=23';

const SIDES = ['player', 'enemy'];
const byX = (a, b) => a.x - b.x;
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const MAX_EVENTS = 120;

// État d'une partie : bases, unités, ressources, file de recrutement, sorts, IA.
// Aucune dépendance au navigateur : la simulation peut tourner sans écran.
// Les sons et secousses d'écran sont pilotés par la liste `events`, vidée par main.js.
export class Game {
  // opts.mods : bonus de l'atelier pour le joueur
  // opts.unlockedUpTo : niveau atteint dans la campagne (débloque unités et sorts)
  constructor(levelIndex = 0, opts = {}) {
    this.levelIndex = levelIndex;
    this.mode = opts.survival ? 'survival' : 'campaign';
    this.level = opts.survival ? survivalLevel() : levelFor(levelIndex);
    this.unlockId = opts.survival ? opts.unlockedUpTo || 1 : Math.max(this.level.id, opts.unlockedUpTo || 0);
    this.time = 0;
    this.speed = 1;
    this.paused = false;
    this.result = null;       // null | 'won' | 'lost'
    this.resultTime = 0;      // temps écoulé depuis la fin de partie
    this.banner = null;       // annonce à l'écran { text, time }
    this.events = [];         // événements de l'image (sons, secousses)
    // Statistiques (objectifs d'étoiles, bilan de fin, succès)
    this.stats = {
      lost: 0, killed: 0, recruited: 0,        // totaux
      recruitedBy: {}, lostBy: {},             // par type d'unité du joueur
      damage: {}, kills: {},                   // dégâts / ennemis tués par source (unité, 'turret', 'mortar')
      killedEnemy: {},                         // mutants tués, par type
      scrapEarned: 0, baseDamage: 0, maxPop: 0, spells: {},
    };
    this.src = null;   // source des dégâts en cours (pour attribuer les statistiques)
    this.seen = {};    // mutants apparus pendant la partie (bestiaire)

    this.sides = {
      player: this._makeSide(1),
      enemy: this._makeSide(this.level.aiIncomeMult),
    };
    if (this.level.aiStartScrap !== undefined) this.sides.enemy.scrap = this.level.aiStartScrap;
    // Règle spéciale du niveau (chapitre 3) : unités interdites, revenu réduit, mutants endurcis
    this.rules = this.level.rules || {};
    if (this.rules.playerIncome) this.sides.player.incomeMult = this.rules.playerIncome;
    if (opts.mods) Object.assign(this.sides.player.mods, opts.mods);
    // Commandant (héros) : { id, level } ; ses bonus de niveau passent par les mods d'unité
    this.hero = null;
    this.rallyUntil = 0; this.rallyBonus = 0;
    if (opts.hero && CONFIG.heroes.list[opts.hero.id]) {
      const H = CONFIG.heroes, cfg = H.list[opts.hero.id], lvl = opts.hero.level || 0;
      this.sides.player.mods.units = Object.assign({}, this.sides.player.mods.units,
        { ['hero_' + opts.hero.id]: { hp: 1 + H.perLevel.hp * lvl, damage: 1 + H.perLevel.damage * lvl } });
      this.hero = {
        id: opts.hero.id, level: lvl, cfg, unitId: 'hero_' + opts.hero.id,
        unit: null, timer: H.deployDelay, abilityCd: 0,
        abilityMult: 1 + H.perLevel.ability * lvl,
        cooldown: cfg.ability.cooldown * Math.max(0.3, 1 - H.perLevel.cooldown * lvl),
      };
    }
    this.units = [];
    this.byX = { player: [], enemy: [] };   // unités vivantes de chaque camp, triées par position
    this.bases = {
      player: new Base('player', this.level, this.sides.player.mods),
      enemy: new Base('enemy', this.level, this.sides.enemy.mods),
    };
    this.projectiles = new ProjectilePool();
    this.fx = new Particles();
    this.spells = new Spells(this);
    // Traces au sol : cratères, brûlures, flaques d'acide, restes de mutants
    this.decals = Array.from({ length: CONFIG.pools.decals }, () => ({ active: false }));
    this.bossDone = this.level.bosses.map(() => false);
    this.ai = new AI(this);
    // Mode Survie : vagues à la place de l'IA, nid indestructible
    this.survival = opts.survival ? new Survival(this) : null;
    if (this.survival) this.bases.enemy.invulnerable = true;
    this._boomTimer = 0;
  }

  _makeSide(incomeMult) {
    return {
      scrap: CONFIG.economy.startScrap,
      incomeMult,
      incomeLevel: 0,         // niveau d'amélioration du revenu en partie
      cooldowns: {},          // recharge de chaque unité
      queue: [],              // recrutements payés en attente de sortie
      // Bonus de l'atelier : units[id] = { hp, damage } (multiplicateurs), le reste pour la base et les sorts
      mods: { units: {}, wallHp: 0, turretDamage: 1, turretRange: 1, spellCooldown: 1, income: 0 },
    };
  }

  emit(type, x, data) {
    if (this.events.length < MAX_EVENTS) this.events.push({ type, x, data });
  }

  // ---------- Économie ----------

  // Revenu de ferraille par seconde d'un camp
  income(side) {
    const e = CONFIG.economy;
    const s = this.sides[side];
    return (e.baseIncomePerSec + s.mods.income + s.incomeLevel * e.incomeUpgrade.bonusPerLevel) * s.incomeMult;
  }

  // Coût du prochain niveau d'amélioration du revenu (null si au maximum)
  incomeUpgradeCost(side) {
    const costs = CONFIG.economy.incomeUpgrade.costs;
    const lvl = this.sides[side].incomeLevel;
    return lvl < costs.length ? costs[lvl] : null;
  }

  upgradeIncome(side) {
    const cost = this.incomeUpgradeCost(side);
    const s = this.sides[side];
    if (this.result || cost === null || s.scrap < cost) return false;
    s.scrap -= cost;
    s.incomeLevel++;
    if (side === 'player') this.emit('upgrade', 0);
    return true;
  }

  // ---------- Recrutement ----------

  // Nombre d'unités vivantes d'un camp
  pop(side) {
    let n = 0;
    for (const u of this.units) if (u.side === side && u.alive) n++;
    return n;
  }

  isUnlocked(side, defId) {
    const def = CONFIG.units[defId];
    if (!def || def.side !== side) return false;
    if (side === 'player' && this.rules.banned && this.rules.banned.includes(defId)) return false;
    return side === 'enemy' || def.unlockLevel <= this.unlockId;
  }

  // Peut-on ajouter cette unité à la file ? (ferraille, place dans la file)
  canRecruit(side, defId) {
    const s = this.sides[side];
    return !this.result && this.isUnlocked(side, defId) &&
      s.scrap >= CONFIG.units[defId].cost &&
      s.queue.length < CONFIG.combat.recruitQueueMax;
  }

  // Paye l'unité et la met dans la file. Elle sort dès que sa recharge le permet.
  recruit(side, defId) {
    if (!this.canRecruit(side, defId)) return false;
    const s = this.sides[side];
    s.scrap -= CONFIG.units[defId].cost;
    s.queue.push(defId);
    if (side === 'player') this.emit('queue', 0);
    return true;
  }

  queuedCount(side, defId) {
    let n = 0;
    for (const id of this.sides[side].queue) if (id === defId) n++;
    return n;
  }

  // Fait sortir la première unité de la file dont la recharge est terminée
  _processQueue(side) {
    const s = this.sides[side];
    if (s.queue.length === 0 || this.pop(side) >= CONFIG.combat.populationMax) return;
    for (let i = 0; i < s.queue.length; i++) {
      const id = s.queue[i];
      if (s.cooldowns[id] > 0) continue;
      s.queue.splice(i, 1);
      s.cooldowns[id] = CONFIG.units[id].recruitCooldown;
      this.spawnUnit(side, id);
      return;
    }
  }

  // x : position d'apparition (par défaut devant la base du camp)
  spawnUnit(side, defId, x = null) {
    const base = this.bases[side];
    if (x === null) x = base.faceX + base.dir * CONFIG.combat.spawnOffset;
    const u = new Unit(defId, side, x, this.sides[side].mods);
    if (side === 'enemy' && this.rules.enemyHp) { u.maxHp *= this.rules.enemyHp; u.hp = u.maxHp; }
    this.units.push(u);
    const def = CONFIG.units[defId];
    if (side === 'player' && !def.hero && !def.lifetime) { this.stats.recruited++; inc(this.stats.recruitedBy, defId); }
    if (side === 'enemy') this.seen[defId] = true;
    this.fx.dust(x, u.y, 4);
    this.emit('spawn', x, { side, id: defId });
    return u;
  }

  // ---------- Combat ----------

  // Applique des dégâts, gère effets, mort et prime en ferraille.
  dealDamage(attackerSide, target, damage, bonus, quiet = false) {
    if (!target.alive || damage <= 0) return;
    if (target.invulnerable) { if (!quiet) this.fx.hit(target.faceX, target.aimY, 'base'); return; }
    // Aura de Kane : les unités de corps à corps proches encaissent moins
    if (target.side === 'player' && !target.isBase && target.def.range <= CONFIG.combat.meleeWaitRange) {
      const k = this.heroAura('armor', target.x);
      if (k) damage *= 1 - k;
    }
    const before = target.hp;
    target.takeDamage(damage);
    const dealt = before - target.hp;
    if (!target.isBase && target.def.phases && target.alive) this._bossPhase(target);
    const st = this.stats;
    if (attackerSide === 'player') inc(st.damage, this.src || 'autre', dealt);
    else if (target.isBase) st.baseDamage += dealt;
    const tx = target.isBase ? target.faceX : target.x;
    if (!quiet) {
      this.fx.text(tx, target.aimY - 30, String(Math.round(damage)),
        bonus ? '#ffd23f' : '#f3e3c3', bonus ? 18 : 14);
      this.fx.hit(tx, target.aimY, target.isBase ? 'base' : target.side === 'enemy' ? 'ichor' : 'blood');
    }
    if (target.isBase) this.emit('baseHit', tx, { side: target.side });

    if (!target.alive && !target.isBase) {
      target.die();
      if (target.side === 'player') {
        // les morts du commandant et de la tourelle posée ne comptent pas dans les pertes
        if (!target.def.hero && !target.def.lifetime) { st.lost++; inc(st.lostBy, target.defId); }
        if (target.def.hero) { st.heroDeaths = (st.heroDeaths || 0) + 1; this.emit('heroDown', target.x); }
      }
      else { st.killed++; inc(st.killedEnemy, target.defId); inc(st.kills, this.src || 'autre'); }
      const bounty = Math.round(target.def.cost * CONFIG.economy.killBountyRatio * (this.survival && attackerSide === 'player' ? this.survival.bountyMult : 1));
      if (this.survival && target.side === 'enemy') this.survival.onEnemyKilled(target);
      this.sides[attackerSide].scrap += bounty;
      if (attackerSide === 'player') st.scrapEarned += bounty;
      this.emit('death', target.x, { id: target.defId });
      // Couveuse : libère ses larves
      const sod = target.def.spawnOnDeath;
      if (sod) {
        for (let i = 0; i < sod.count; i++) this.spawnUnit(target.side, sod.unit, target.x + (i - (sod.count - 1) / 2) * 14);
        this.fx.hit(target.x, target.y - 20, 'ichor');
      }
      if (target.defId === 'blinde') {
        this.fx.explosion(target.x, target.y - 30, 60);
        this.addDecal('scorch', target.x, 60, 8);
        this.emit('explosion', target.x, { big: true });
      } else if (target.side === 'enemy') {
        this.addDecal('ichor', target.x, target.def.bodyWidth * 0.6, 5);
        this.fx.hit(target.x, target.y - 20, 'ichor');
      } else {
        this.fx.puff(target.x, target.y - 8, '#8a7a66');
      }
      if (attackerSide === 'player') this.fx.text(target.x, target.y - target.def.bodyHeight - 6, '+' + bounty, '#f2c230', 14);
    }
  }

  // Dégâts de zone autour du point x (obus, mortier, coup de l'Abomination).
  // attackerDef sert aux bonus de type (null = pas de bonus).
  explode(attackerSide, x, radius, damage, attackerDef, hitsBase, look = 'normal') {
    for (const u of this.units) {
      if (u.side === attackerSide || !u.alive) continue;
      if (Math.abs(u.x - x) > radius) continue;
      if (u.def.flying && look !== 'big') continue;   // seul le mortier atteint les volants
      const mult = attackerDef ? bonusMultiplier(attackerDef, u) : 1;
      this.dealDamage(attackerSide, u, damage * mult, mult > 1);
    }
    if (hitsBase) {
      const base = this.bases[attackerSide === 'player' ? 'enemy' : 'player'];
      // La base est touchée si l'explosion atteint sa façade (ou est dedans)
      if ((base.faceX - x) * base.dir >= -radius) {
        const mult = attackerDef ? bonusMultiplier(attackerDef, base) : 1;
        this.dealDamage(attackerSide, base, damage * mult, mult > 1);
      }
    }
    const gy = CONFIG.world.groundY;
    if (look === 'slam') {
      this.fx.slam(x, gy, radius);
      this.emit('slam', x);
    } else {
      this.fx.explosion(x, gy - 8, look === 'big' ? radius * 1.2 : radius);
      this.addDecal('scorch', x, radius * 0.9, 7);
      this.emit('explosion', x, { big: look === 'big' });
    }
  }

  // Lance-flammes : touche tous les ennemis devant lui jusqu'à sa portée
  // Fusil à pompe (Kane) : touche les n ennemis au sol les plus proches devant lui
  coneAttack(unit, n) {
    const def = unit.def;
    const tol = CONFIG.combat.targetBehindTolerance;
    const dmg = unit.damage * this.rallyMult(unit.side);
    const hits = [];
    for (const e of this.units) {
      if (e.side === unit.side || !e.alive || e.def.flying) continue;
      const d = (e.x - unit.x) * unit.dir;
      if (d >= -tol && d <= def.range + 20) hits.push([d, e]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    for (const [, e] of hits.slice(0, n)) {
      const mult = bonusMultiplier(def, e);
      this.dealDamage(unit.side, e, dmg * mult, mult > 1);
    }
    const base = this.bases[unit.side === 'player' ? 'enemy' : 'player'];
    if (hits.length < n && (base.faceX - unit.x) * unit.dir <= def.range) this.dealDamage(unit.side, base, dmg, false);
    this.fx.sparks(unit.x + unit.dir * 40, unit.aimY, '#ffe0a0', 6, 220);
  }

  // ---------- Commandant ----------
  // Multiplicateur du Cri de ralliement (vitesse et dégâts) pour un camp
  rallyMult(side) { return side === 'player' && this.time < this.rallyUntil ? 1 + this.rallyBonus : 1; }

  // Valeur de l'aura du commandant si le point x est dans sa zone (sinon 0)
  heroAura(kind, x) {
    const h = this.hero;
    if (!h || !h.unit || !h.unit.alive || h.cfg.aura.kind !== kind) return 0;
    return Math.abs(h.unit.x - x) <= h.cfg.aura.radius ? h.cfg.aura.value : 0;
  }

  // Le commandant peut-il être déployé (pas sur le terrain, attente terminée) ?
  heroDeployReady() {
    const h = this.hero;
    return !!h && !this.result && !h.unit && h.timer <= 0;
  }

  deployHero() {
    if (!this.heroDeployReady()) return false;
    const h = this.hero;
    h.unit = this.spawnUnit('player', h.unitId);
    this.fx.healRing(h.unit.x, CONFIG.world.groundY, 80);
    this.emit('heroSpawn', h.unit.x);
    return true;
  }

  // Bouton du commandant : le déployer s'il attend, sinon lancer sa capacité
  heroAction() { return this.deployHero() || this.useHeroAbility(); }

  heroAbilityReady() {
    const h = this.hero;
    return !!h && !this.result && !!h.unit && h.unit.alive && h.abilityCd <= 0;
  }

  // Capacité spéciale du commandant. Renvoie true si elle a été lancée.
  useHeroAbility() {
    if (!this.heroAbilityReady()) return false;
    const h = this.hero, u = h.unit, ab = h.cfg.ability;
    if (ab.kind === 'rally') {
      this.rallyBonus = ab.bonus * h.abilityMult;
      this.rallyUntil = this.time + ab.duration;
      this.fx.healRing(u.x, CONFIG.world.groundY, 260);
      this.fx.text(u.x, u.aimY - 50, 'EN AVANT !', '#f2c230', 22);
    } else if (ab.kind === 'turret') {
      const t = this.spawnUnit('player', 'tourelleCampagne');
      t.x = u.x + u.dir * 50;
      t.life = ab.duration * h.abilityMult;
      t.damage *= h.abilityMult;
      this.fx.dust(t.x, t.y, 6);
      this.fx.text(u.x, u.aimY - 50, 'TOURELLE !', '#f2c230', 20);
    } else if (ab.kind === 'snipe') {
      // le mutant le plus résistant devant lui (sinon le nid)
      let target = null;
      for (const e of this.byX.enemy) {
        if (!e.alive || e.x < u.x - 20 || e.x > u.x + 1300) continue;
        if (!target || e.hp > target.hp) target = e;
      }
      if (!target) target = this.bases.enemy;
      this.projectiles.spawn({
        side: 'player', x: u.x + u.dir * 30, y: u.aimY - 6, target,
        damage: ab.damage * h.abilityMult, attackerDef: null, source: h.unitId, splash: 0,
        cfg: { shape: 'tracer', speed: 2600, color: '#fffbe0', length: 70, width: 5, arcHeight: 0 },
      });
      this.fx.text(u.x, u.aimY - 50, 'DANS LE MILLE !', '#f2c230', 20);
    }
    h.abilityCd = h.cooldown;
    this.emit('ability', u.x, { kind: ab.kind });
    return true;
  }

  _updateHero(dt) {
    const h = this.hero;
    if (!h) return;
    if (h.unit && !h.unit.alive) { h.unit = null; h.timer = CONFIG.heroes.respawnTime; }
    if (!h.unit) {
      h.timer = Math.max(0, h.timer - dt);   // attend que le joueur le déploie
      return;
    }
    h.abilityCd = Math.max(0, h.abilityCd - dt);
    // Auras de soin / réparation
    const a = h.cfg.aura;
    if (a.kind === 'heal' || a.kind === 'repair') {
      for (const v of this.byX.player) {
        if (!v.alive || Math.abs(v.x - h.unit.x) > a.radius || v.hp >= v.maxHp) continue;
        if (a.kind === 'repair' && !v.tags.includes('heavy') && !v.def.lifetime) continue;
        v.hp = Math.min(v.maxHp, v.hp + a.value * dt);
      }
    }
  }

  flameAttack(unit) {
    this.src = unit.defId;
    const def = unit.def;
    const tol = CONFIG.combat.targetBehindTolerance;
    for (const e of this.units) {
      if (e.side === unit.side || !e.alive || e.def.flying) continue;
      const d = (e.x - unit.x) * unit.dir;
      if (d < -tol || d > def.range) continue;
      const mult = bonusMultiplier(def, e) * this.rallyMult(unit.side);
      this.dealDamage(unit.side, e, unit.damage * mult, mult > 1, Math.random() > 0.35);
    }
    const base = this.bases[unit.side === 'player' ? 'enemy' : 'player'];
    if ((base.faceX - unit.x) * unit.dir <= def.range) {
      const mult = bonusMultiplier(def, base);
      this.dealDamage(unit.side, base, unit.damage * mult, mult > 1, Math.random() > 0.35);
    }
    this.emit('flame', unit.x);
  }

  // Recul infligé par la Brute (sans passer derrière sa propre base)
  knockBack(target, dist) {
    const own = this.bases[target.side];
    target.x -= target.dir * dist;
    if ((target.x - own.faceX) * target.dir < 0) target.x = own.faceX;
  }

  // Trace au sol temporaire : 'crater' | 'scorch' | 'acid' | 'ichor'
  addDecal(kind, x, r, life) {
    let d = this.decals.find((o) => !o.active);
    if (!d) d = this.decals.reduce((a, b) => (a.life < b.life ? a : b));
    d.active = true; d.kind = kind; d.x = x; d.r = r; d.life = d.maxLife = life;
    d.seed = Math.random() * 1000;
  }

  // Boss : apparaissent quand la base ennemie passe sous un seuil de PV
  _checkBosses() {
    const ratio = this.bases.enemy.hp / this.bases.enemy.maxHp;
    this.level.bosses.forEach((b, i) => {
      if (this.bossDone[i] || ratio > b.atBaseHpRatio) return;
      this.bossDone[i] = true;
      this.spawnUnit('enemy', b.unit);
      this.banner = { text: CONFIG.units[b.unit].banner || 'UN BOSS SORT DU NID !', time: CONFIG.combat.bossBannerTime };
      this.emit('boss', this.bases.enemy.faceX);
    });
  }

  // Boss à phases (le Fléau) : sous chaque seuil de PV il enrage et appelle des renforts
  _bossPhase(u) {
    const ph = u.def.phases;
    u.phase = u.phase || 0;
    if (u.phase >= ph.at.length || u.hp / u.maxHp > ph.at[u.phase]) return;
    u.phase++;
    u.speedMult *= ph.speed;
    u.damage *= ph.damage;
    for (let i = 0; i < ph.reinforcements.length; i++) this.spawnUnit(u.side, ph.reinforcements[i], u.x + 40 + i * 25);
    this.banner = { text: ph.banner, time: CONFIG.combat.bossBannerTime };
    this.fx.slam(u.x, CONFIG.world.groundY, 140);
    this.emit('boss', u.x);
  }

  // Cri des Hurleurs : les alliés proches vont plus vite et frappent plus fort (recalculé à chaque pas)
  _applyHowls() {
    for (const side of SIDES) {
      const L = this.byX[side];
      let any = false;
      for (const u of L) { u.howled = 0; if (u.def.howl) any = true; }
      if (!any) continue;
      for (const h of L) {
        const cfg = h.def.howl;
        if (!cfg) continue;
        for (const u of L) if (u !== h && Math.abs(u.x - h.x) <= cfg.radius) u.howled = cfg;
      }
    }
  }

  // Listes triées par position (recherche de cible rapide, même avec 200 unités)
  _sortUnits() {
    const P = this.byX.player, E = this.byX.enemy;
    P.length = 0; E.length = 0;
    for (const u of this.units) if (u.alive) (u.side === 'player' ? P : E).push(u);
    P.sort(byX); E.sort(byX);
  }

  // ---------- Boucle ----------

  update(dt) {
    this.time += dt;
    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }
    for (const d of this.decals) if (d.active && (d.life -= dt) <= 0) d.active = false;

    // Après la fin de partie : la base vaincue explose, puis seuls les effets vivent
    if (this.result) {
      this.resultTime += dt;
      const b = this.result === 'won' ? this.bases.enemy : this.bases.player;
      this._boomTimer -= dt;
      if (this.resultTime < 1.6 && this._boomTimer <= 0) {
        this._boomTimer = 0.14;
        const x = b.x + (Math.random() - 0.5) * b.width;
        this.fx.explosion(x, b.y - Math.random() * b.height * 0.8, 40 + Math.random() * 30);
        if (Math.random() < 0.5) this.emit('explosion', x, { big: Math.random() < 0.4 });
      }
      for (const u of this.units) if (u.dying) u.deadTime += dt;
      this.fx.update(dt);
      this.bases.player.update(dt, this);
      this.bases.enemy.update(dt, this);
      return;
    }

    // Revenu + recharges + sorties de la file
    for (const side of SIDES) {
      const s = this.sides[side];
      s.scrap += this.income(side) * dt;
      if (side === 'player') this.stats.scrapEarned += this.income(side) * dt;
      for (const id in s.cooldowns) {
        if (s.cooldowns[id] > 0) s.cooldowns[id] = Math.max(0, s.cooldowns[id] - dt);
      }
      this._processQueue(side);
    }

    if (this.survival) this.survival.update(dt); else this.ai.update(dt);
    this.spells.update(dt);
    this._updateHero(dt);
    this._sortUnits();
    this._applyHowls();

    const n = this.units.length;
    for (let i = 0; i < n; i++) this.units[i].update(dt, this);
    this.projectiles.update(dt, this);
    this.bases.player.update(dt, this);
    this.bases.enemy.update(dt, this);
    this.fx.update(dt);
    this._checkBosses();
    this.stats.maxPop = Math.max(this.stats.maxPop, this.byX.player.length);

    // Retire les dépouilles anciennes
    const corpse = CONFIG.combat.corpseTime;
    let w = 0;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!(u.dying && u.deadTime >= corpse)) this.units[w++] = u;
    }
    this.units.length = w;

    // Victoire / défaite
    if (!this.bases.player.alive) this.result = 'lost';
    else if (!this.bases.enemy.alive) this.result = 'won';
    if (this.result) {
      this.resultTime = 0;
      this._boomTimer = 0;
      this.emit(this.result === 'won' ? 'win' : 'lose', 0);
      const b = this.result === 'won' ? this.bases.enemy : this.bases.player;
      this.emit('explosion', b.faceX, { big: true, huge: true });
    }
  }

  // Nombre d'étoiles (0 si défaite)
  // État de chaque objectif : { obj, ok (rempli pour l'instant), failed (raté définitivement) }
  get objectives() {
    return (this.level.objectives || []).map((obj) => {
      let ok = false, failed = false;
      if (obj.type === 'time') { ok = this.time <= obj.max; failed = !ok; }
      else if (obj.type === 'losses') { ok = this.stats.lost <= obj.max; failed = !ok; }
      else if (obj.type === 'baseHp') { ok = this.bases.player.hp / this.bases.player.maxHp >= obj.min; failed = !ok; }
      return { obj, ok, failed };
    });
  }

  // 1 étoile pour la victoire + 1 par objectif rempli (0 si défaite)
  get stars() {
    if (this.result !== 'won') return 0;
    const objs = this.objectives;
    if (objs.length) return Math.min(3, 1 + objs.filter((o) => o.ok).length);
    const r = this.bases.player.hp / this.bases.player.maxHp;
    const c = CONFIG.stars;
    return r > c.threeStarsAbove ? 3 : r > c.twoStarsAbove ? 2 : 1;
  }
}
