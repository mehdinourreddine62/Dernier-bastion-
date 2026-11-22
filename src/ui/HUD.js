import { CONFIG } from '../config.js?v=21';
import { drawIcon, drawSpellIcon } from '../render/sprites.js?v=21';
import { COL, FONT, drawPanel, drawButton, drawStar, roundRectPath, text } from './widgets.js?v=21';

const W = CONFIG.display.width;
const H = CONFIG.display.height;
const BAR_W = 396;                                   // barres de PV
const MAP = { x: 16 + BAR_W + 16, y: 12, w: W - 2 * (16 + BAR_W + 16), h: 40 };   // mini-carte

// Interface en partie : barres de PV, ressources, recrutement, sorts, revenu,
// pause, vitesse, infobulles. build() calcule les boutons de l'image courante
// (tailles tactiles comprises), draw() les dessine. Le même tableau sert aux clics.
export class HUD {
  constructor() {
    this.buttons = [];
    this.barY = H - 104;
  }

  // aim = sort en cours de visée (ou null) ; settings = réglages (son…)
  build(game, view, aim, settings) {
    const minL = CONFIG.display.minButtonPx / view.scale;   // taille mini en unités logiques
    const btns = [];
    const s = game.sides.player;

    // Haut : mini-carte au centre (toucher/glisser dessus déplace la caméra)
    const mapH = Math.max(44, minL);
    btns.push({ id: 'minimap', kind: 'minimap', drag: true, x: MAP.x, y: MAP.y - 2, w: MAP.w, h: mapH, enabled: true });
    // 4 boutons sous la barre de PV ennemie
    const m = Math.max(50, minL);
    const gap = 8;
    let bx = W - 16 - 4 * m - 3 * gap;
    const by = 56;
    for (const [id, icon, label] of [
      ['pause', null, 'II'], ['speed', null, 'x' + game.speed],
      ['sound', settings.sound ? 'sound' : 'mute', ''], ['fullscreen', 'fullscreen', ''],
    ]) {
      btns.push({ id, kind: 'top', icon, label, x: bx, y: by, w: m, h: m, enabled: true });
      bx += m + gap;
    }
    if (aim) {
      const cw = Math.max(200, minL);
      btns.push({ id: 'cancelAim', x: W / 2 - cw / 2, y: MAP.y + mapH + 40, w: cw, h: Math.max(52, minL), label: 'ANNULER', enabled: true });
    }

    // Bas : on calcule la largeur des boutons pour que tout tienne
    const units = CONFIG.roster.player.filter((id) => game.isUnlocked('player', id));
    const spells = game.spells.available;
    const count = units.length + spells.length + 1 + (game.hero ? 1 : 0);
    const gaps = (count - 1) * 6 + 2 * 14;
    const left = 196;
    const bw = Math.max(minL, Math.min(110, (W - left - 12 - gaps) / count));
    const bh = Math.max(88, minL);
    const barY = H - bh - 16;
    this.barY = barY;
    const y = barY + 8;
    let x = left;

    units.forEach((id, i) => {
      const def = CONFIG.units[id];
      const cd = s.cooldowns[id] || 0;
      btns.push({
        id: 'recruit:' + id, kind: 'unit', unit: id, key: String(i + 1),
        x, y, w: bw, h: bh,
        enabled: game.canRecruit('player', id),
        cdRatio: def.recruitCooldown > 0 ? cd / def.recruitCooldown : 0,
        afford: s.scrap >= def.cost,
        queued: game.queuedCount('player', id),
        tooltip: true,
      });
      x += bw + 6;
    });
    x += 8;
    spells.forEach((id) => {
      const cd = game.spells.cooldowns[id];
      btns.push({
        id: 'spell:' + id, kind: 'spell', spell: id, key: CONFIG.spells[id].key,
        x, y, w: bw, h: bh,
        enabled: game.spells.isReady(id),
        cdRatio: cd / game.spells.cooldownOf(id),
        cdLeft: cd,
        active: aim === id,
        tooltip: true,
      });
      x += bw + 6;
    });
    // Commandant : portrait (arrivée / retour / capacité)
    if (game.hero) {
      const h = game.hero;
      const alive = !!h.unit && h.unit.alive;
      btns.push({
        id: 'hero', kind: 'hero', key: 'E', x, y, w: bw, h: bh,
        enabled: game.heroAbilityReady() || game.heroDeployReady(), alive, deploy: game.heroDeployReady(), hero: h,
        cdRatio: alive ? h.abilityCd / h.cooldown : 0,
        tooltip: true,
      });
      x += bw + 6;
    }
    x += 8;
    const cost = game.incomeUpgradeCost('player');
    btns.push({
      id: 'income', kind: 'income', x, y, w: bw, h: bh,
      enabled: cost !== null && s.scrap >= cost && !game.result,
      cost, incomeLevel: s.incomeLevel,
      tooltip: true,
    });

    this.buttons = btns;
    return btns;
  }

  draw(ctx, game, pressed, aim, camera) {
    // Barres de PV des deux bases
    this._hpBar(ctx, 16, 12, BAR_W, 34, game.bases.player, COL.good, 'MA BASE', false);
    if (game.survival) this._waveBox(ctx, game);
    else this._hpBar(ctx, W - 16 - BAR_W, 12, BAR_W, 34, game.bases.enemy, COL.bad, 'NID MUTANT', true);
    this._minimap(ctx, game, camera);
    this._bossBar(ctx, game);
    this._objectives(ctx, game);

    // Barre du bas : panneau de tôle ondulée
    const barY = this.barY;
    drawPanel(ctx, 6, barY, W - 12, H - barY - 6, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 14; x < W - 14; x += 10) ctx.fillRect(x, barY + 4, 3, H - barY - 14);
    ctx.fillStyle = 'rgba(150,70,30,0.18)';
    ctx.fillRect(300, barY + 6, 60, 10); ctx.fillRect(900, H - 30, 80, 12);
    const s = game.sides.player;
    text(ctx, '⚙ ' + Math.floor(s.scrap), 22, barY + 42, 36, COL.yellow);
    text(ctx, '+' + Number(game.income('player').toFixed(1)) + '/s', 24, barY + 68, 19, COL.dim);
    const pop = game.pop('player');
    const full = pop >= CONFIG.combat.populationMax;
    text(ctx, 'Armée ' + pop + '/' + CONFIG.combat.populationMax, 24, barY + 92, 18, full ? COL.bad : COL.text);
    if (s.queue.length) text(ctx, 'File ' + s.queue.length + '/' + CONFIG.combat.recruitQueueMax, 120, barY + 68, 17, COL.text);

    for (const b of this.buttons) {
      const p = pressed.has(b.id);
      if (b.kind === 'unit') this._unitButton(ctx, b, p);
      else if (b.kind === 'spell') this._spellButton(ctx, b, p);
      else if (b.kind === 'income') this._incomeButton(ctx, b, p);
      else if (b.kind === 'hero') this._heroButton(ctx, b, p, game);
      else if (b.kind === 'minimap') continue;
      else if (b.kind === 'top') {
        drawButton(ctx, b, b.icon ? '' : b.label, p, { size: Math.min(26, b.h * 0.45) });
        if (b.icon) drawSpellIcon(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2 + (p ? 2 : 0), b.h * 0.62);
      } else drawButton(ctx, b, b.label, p, { size: 24, primary: true });
    }

    // Annonce (boss…)
    if (game.banner) {
      const a = Math.min(1, game.banner.time * 2);
      ctx.globalAlpha = a;
      ctx.lineJoin = 'round';
      let size = 40;
      ctx.font = `bold ${size}px ${FONT}`;
      while (size > 20 && ctx.measureText(game.banner.text).width > W - 80) { size -= 2; ctx.font = `bold ${size}px ${FONT}`; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 8; ctx.strokeStyle = COL.dark;
      ctx.strokeText(game.banner.text, W / 2, 190);
      ctx.fillStyle = game.banner.color || COL.bad;
      ctx.fillText(game.banner.text, W / 2, 190);
      ctx.globalAlpha = 1;
    }

    // Consigne de visée
    if (aim) {
      const msg = 'Touche le champ de bataille pour lancer : ' + CONFIG.spells[aim].name;
      ctx.font = `bold 20px ${FONT}`;
      const tw = ctx.measureText(msg).width + 30;
      roundRectPath(ctx, W / 2 - tw / 2, barY - 46, tw, 36, 8);
      ctx.fillStyle = 'rgba(25,15,8,0.8)'; ctx.fill();
      text(ctx, msg, W / 2, barY - 27, 20, COL.text, 'center', 'middle');
    }
  }

  // Objectifs d'étoiles, sous ma barre de PV : vert si encore rempli, rouge si raté
  // Survie : vague en cours, temps avant la suivante, score et record
  _waveBox(ctx, game) {
    const sv = game.survival;
    const x = W - 16 - BAR_W, y = 12, w = BAR_W, h = 34;
    roundRectPath(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(40,10,14,0.85)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = COL.dark; ctx.stroke();
    const next = sv.wave === 0 ? 'début dans ' : 'suivante dans ';
    text(ctx, (sv.wave ? 'VAGUE ' + sv.wave + ' · ' : '') + next + Math.ceil(Math.max(0, sv.timer)) + ' s',
      x + w / 2, y + h / 2 + 1, 17, '#fff', 'center', 'middle');
    roundRectPath(ctx, 16, 52, 250, 58, 8);
    ctx.fillStyle = 'rgba(25,15,8,0.65)'; ctx.fill();
    text(ctx, 'Score : ' + sv.score, 30, 70, 17, COL.yellow, 'left', 'middle');
    text(ctx, 'Record : vague ' + (game.survivalBest || 0), 30, 96, 15, COL.dim, 'left', 'middle');
  }

  _objectives(ctx, game) {
    const objs = game.objectives;
    if (!objs.length) return;
    const x = 16, y = 52, w = 250, lh = 26;
    roundRectPath(ctx, x, y, w, 10 + objs.length * lh, 8);
    ctx.fillStyle = 'rgba(25,15,8,0.65)'; ctx.fill();
    objs.forEach(({ obj, ok }, i) => {
      const cy = y + 5 + lh / 2 + i * lh;
      drawStar(ctx, x + 16, cy, 8, ok);
      let label = '';
      if (obj.type === 'time') {
        const left = Math.max(0, obj.max - game.time);
        label = ok ? 'Victoire avant ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0') : 'Temps dépassé';
      } else if (obj.type === 'losses') label = 'Pertes : ' + game.stats.lost + ' / ' + obj.max;
      else if (obj.type === 'baseHp') label = 'Base ≥ ' + Math.round(obj.min * 100) + ' %';
      text(ctx, label, x + 32, cy + 1, 16, ok ? COL.text : COL.bad, 'left', 'middle');
    });
  }

  // Barre de vie du boss, sous la mini-carte, tant qu'il est vivant
  _bossBar(ctx, game) {
    let boss = null;
    for (const u of game.units) if (u.alive && u.tags.includes('boss')) { boss = u; break; }
    if (!boss) return;
    const w = MAP.w, h = 24, x = MAP.x, y = MAP.y + MAP.h + 8;
    roundRectPath(ctx, x, y, w, h, 7);
    ctx.fillStyle = 'rgba(25,8,12,0.88)'; ctx.fill();
    ctx.fillStyle = '#a0204a';
    ctx.fillRect(x + 3, y + 3, (w - 6) * (boss.hp / boss.maxHp), h - 6);
    roundRectPath(ctx, x, y, w, h, 7);
    ctx.lineWidth = 2.5; ctx.strokeStyle = COL.dark; ctx.stroke();
    text(ctx, boss.def.name.toUpperCase() + '  ' + Math.ceil(boss.hp) + ' / ' + Math.round(boss.maxHp),
      x + w / 2, y + h / 2 + 1, 15, '#fff', 'center', 'middle');
  }

  // ---------- Mini-carte ----------
  _minimap(ctx, game, camera) {
    const { x, y, w, h } = MAP;
    const k = w / CONFIG.world.width;
    roundRectPath(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(25,15,8,0.82)'; ctx.fill();
    ctx.save();
    roundRectPath(ctx, x, y, w, h, 8); ctx.clip();
    // sol
    ctx.fillStyle = 'rgba(140,100,60,0.35)';
    ctx.fillRect(x, y + h - 12, w, 12);
    // bases
    const pb = game.bases.player, eb = game.bases.enemy;
    ctx.fillStyle = COL.good; ctx.fillRect(x + 3, y + h - 24, (pb.faceX) * k - 3, 14);
    ctx.fillStyle = COL.bad; ctx.fillRect(x + eb.faceX * k, y + h - 24, w - eb.faceX * k - 3, 14);
    // unités
    for (const u of game.units) {
      if (!u.alive) continue;
      const big = u.def.bodyHeight > 90 ? 3 : 0;
      ctx.fillStyle = u.side === 'player' ? '#9cf07a' : '#ff6a4a';
      ctx.fillRect(x + u.x * k - 1.5 - big / 2, y + h - 18 - (u.side === 'player' ? 4 : 0) - big, 3 + big, 3 + big);
    }
    // cadre de la caméra
    ctx.strokeStyle = COL.yellow; ctx.lineWidth = 2;
    ctx.strokeRect(x + camera.x * k, y + 3, CONFIG.display.width * k, h - 6);
    ctx.restore();
    roundRectPath(ctx, x, y, w, h, 8);
    ctx.lineWidth = 3; ctx.strokeStyle = COL.dark; ctx.stroke();
  }

  // Position du monde correspondant à un x de la mini-carte
  minimapToWorld(px) {
    return ((px - MAP.x) / MAP.w) * CONFIG.world.width;
  }

  // Message temporaire (ex. plein écran indisponible)
  drawToast(ctx, msg) {
    ctx.font = `bold 20px ${FONT}`;
    const lines = msg.split('\n');
    let w = 0;
    for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
    w += 40;
    const h = 24 + lines.length * 28;
    const x = W / 2 - w / 2, y = 250;
    roundRectPath(ctx, x, y, w, h, 12);
    ctx.fillStyle = 'rgba(25,15,8,0.92)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a48'; ctx.stroke();
    lines.forEach((l, i) => text(ctx, l, W / 2, y + 30 + i * 28, 20, COL.text, 'center', 'middle'));
  }

  // ---------- Infobulle ----------
  drawTooltip(ctx, b, game) {
    const lines = [];
    let title = '';
    if (b.kind === 'unit') {
      const d = CONFIG.units[b.unit];
      const mods = game.sides.player.mods.units[b.unit] || { hp: 1, damage: 1 };
      title = d.name + ' — ' + d.role;
      lines.push(`PV ${Math.round(d.hp * mods.hp)}   Dégâts ${Math.round(d.damage * mods.damage)}${d.attack.kind === 'flame' ? ' / 0,25 s (zone)' : d.attack.splashRadius ? ' (zone)' : ''}`);
      lines.push(`Portée ${d.range}   Cadence ${String(d.attackInterval).replace('.', ',')} s   Vitesse ${d.speed}`);
      const bonus = Object.entries(d.bonuses || {}).map(([t, m]) => 'x' + String(m).replace('.', ',') + ' contre les ' + (CONFIG.typeNames[t] || t));
      if (bonus.length) lines.push('Bonus : ' + bonus.join(', '));
      if (d.strengths) lines.push('+ ' + d.strengths);
      if (d.weaknesses) lines.push('– ' + d.weaknesses);
      lines.push(`Coût ⚙ ${d.cost}   Recharge ${String(d.recruitCooldown).replace('.', ',')} s`);
    } else if (b.kind === 'spell') {
      const c = CONFIG.spells[b.spell];
      title = c.name;
      if (b.spell === 'mortar') lines.push(`${c.shells} obus de ${c.damagePerShell} dégâts dans une zone de rayon ${c.radius}`);
      else lines.push(`Soigne ${Math.round(c.healRatio * 100)} % des PV de tes unités dans un rayon de ${c.radius}`);
      lines.push(`Recharge ${Math.round(game.spells.cooldownOf(b.spell))} s   Touche ${c.key}`);
      lines.push('Touche le bouton, puis vise sur le champ de bataille');
    } else if (b.kind === 'hero') {
      const c = b.hero.cfg;
      title = c.name + ' — niv. ' + b.hero.level;
      lines.push('Capacité : ' + c.ability.name + ' (touche E)');
      lines.push(c.ability.text);
      lines.push('Aura : ' + c.aura.text);
      lines.push(b.alive ? `Après sa mort, redéployable au bout de ${CONFIG.heroes.respawnTime} s`
        : b.deploy ? 'Touche le portrait pour le déployer' : 'Redéployable dans ' + Math.ceil(b.hero.timer) + ' s');
    } else if (b.kind === 'income') {
      const e = CONFIG.economy.incomeUpgrade;
      title = 'Amélioration du revenu';
      lines.push(`+${e.bonusPerLevel} ferraille/s par niveau (niveau ${b.incomeLevel}/${e.costs.length})`);
      lines.push(b.cost === null ? 'Niveau maximum atteint' : `Prochain niveau : ⚙ ${b.cost}`);
    }

    ctx.font = `bold 17px ${FONT}`;
    let w = 0;
    for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
    ctx.font = `bold 20px ${FONT}`;
    w = Math.max(w, ctx.measureText(title).width) + 28;
    const h = 40 + lines.length * 24;
    const x = Math.max(8, Math.min(W - w - 8, b.x + b.w / 2 - w / 2));
    const y = b.y - h - 10;
    roundRectPath(ctx, x, y, w, h, 10);
    ctx.fillStyle = 'rgba(25,15,8,0.94)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a48'; ctx.stroke();
    text(ctx, title, x + 14, y + 28, 20, COL.yellow);
    lines.forEach((l, i) => text(ctx, l, x + 14, y + 54 + i * 24, 17,
      l.startsWith('+ ') ? COL.good : l.startsWith('– ') ? '#e88a6a' : COL.text));
  }

  // ---------- Éléments ----------
  _hpBar(ctx, x, y, w, h, base, color, label, rtl) {
    // la barre clignote quand la base prend des coups
    if (base.hitFlash > 0) { roundRectPath(ctx, x - 3, y - 3, w + 6, h + 6, 10); ctx.fillStyle = 'rgba(255,220,180,0.5)'; ctx.fill(); }
    roundRectPath(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(25,15,8,0.8)';
    ctx.fill();
    const r = Math.max(0, base.hp / base.maxHp);
    ctx.save();
    roundRectPath(ctx, x + 3, y + 3, w - 6, h - 6, 6);
    ctx.clip();
    ctx.fillStyle = color;
    const fw = (w - 6) * r;
    ctx.fillRect(rtl ? x + 3 + (w - 6) - fw : x + 3, y + 3, fw, h - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 3, y + 3, w - 6, (h - 6) / 2);
    ctx.restore();
    roundRectPath(ctx, x, y, w, h, 8);
    ctx.lineWidth = 3; ctx.strokeStyle = COL.dark; ctx.stroke();
    text(ctx, label + '  ' + Math.ceil(base.hp) + ' / ' + base.maxHp, x + w / 2, y + h / 2 + 1, 17, '#fff', 'center', 'middle');
  }

  _frame(ctx, b, pressed, highlight) {
    const dy = pressed && b.enabled ? 2 : 0;
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, pressed && b.enabled ? '#4a3a2e' : '#6b5440');
    g.addColorStop(1, pressed && b.enabled ? '#6b5440' : '#43332a');
    roundRectPath(ctx, b.x, b.y + dy, b.w, b.h, 10);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = highlight ? 4 : 3;
    ctx.strokeStyle = highlight ? COL.yellow : COL.dark;
    ctx.stroke();
    return dy;
  }

  // Cadran de recharge qui se remplit
  _dial(ctx, b, dy, ratio) {
    if (ratio <= 0) return;
    ctx.save();
    roundRectPath(ctx, b.x, b.y + dy, b.w, b.h, 10);
    ctx.clip();
    const cx = b.x + b.w / 2, cy = b.y + dy + b.h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, b.w + b.h, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _unitButton(ctx, b, pressed) {
    const def = CONFIG.units[b.unit];
    const dy = this._frame(ctx, b, pressed, false);
    drawIcon(ctx, b.unit, b.x + b.w / 2, b.y + dy + b.h * 0.38, b.h * 0.58, !b.enabled);
    this._dial(ctx, b, dy, b.cdRatio);
    text(ctx, '⚙ ' + def.cost, b.x + b.w / 2, b.y + dy + b.h - 9, 19, b.afford ? COL.yellow : COL.bad, 'center');
    text(ctx, b.key, b.x + 8, b.y + dy + 19, 15, COL.dim);
    if (b.queued) {
      ctx.fillStyle = COL.yellow;
      ctx.beginPath(); ctx.arc(b.x + b.w - 14, b.y + dy + 14, 12, 0, Math.PI * 2); ctx.fill();
      text(ctx, String(b.queued), b.x + b.w - 14, b.y + dy + 15, 16, COL.dark, 'center', 'middle');
    }
  }

  _spellButton(ctx, b, pressed) {
    const dy = this._frame(ctx, b, pressed, b.active);
    drawSpellIcon(ctx, b.spell, b.x + b.w / 2, b.y + dy + b.h * 0.42, b.h * 0.6, !b.enabled && !b.active);
    this._dial(ctx, b, dy, b.cdRatio);
    if (b.cdLeft > 0) text(ctx, Math.ceil(b.cdLeft) + ' s', b.x + b.w / 2, b.y + dy + b.h / 2, 24, COL.text, 'center', 'middle');
    text(ctx, b.active ? 'VISE…' : CONFIG.spells[b.spell].name.split(' ').pop().toUpperCase(),
      b.x + b.w / 2, b.y + dy + b.h - 9, 14, b.active ? COL.yellow : COL.dim, 'center');
    text(ctx, b.key, b.x + 8, b.y + dy + 19, 15, COL.dim);
  }

  _heroButton(ctx, b, pressed, game) {
    const h = b.hero;
    const dy = this._frame(ctx, b, pressed, b.enabled);
    drawIcon(ctx, h.unitId, b.x + b.w / 2, b.y + dy + b.h * 0.4, b.h * 0.6, !b.alive && !b.deploy);
    if (b.deploy) {
      // prêt : le joueur choisit le moment du déploiement (bouton qui pulse)
      const k = 0.5 + Math.sin(game.time * 5) * 0.5;
      ctx.save(); roundRectPath(ctx, b.x + 2, b.y + dy + 2, b.w - 4, b.h - 4, 9);
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(242,194,48,${0.4 + 0.6 * k})`; ctx.stroke(); ctx.restore();
      text(ctx, 'DÉPLOYER', b.x + b.w / 2, b.y + dy + b.h - 9, 13, COL.yellow, 'center');
    } else if (!b.alive) {
      ctx.save(); roundRectPath(ctx, b.x, b.y + dy, b.w, b.h, 10); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); ctx.restore();
      text(ctx, Math.ceil(Math.max(0, h.timer)) + ' s', b.x + b.w / 2, b.y + dy + b.h * 0.42, 24, COL.text, 'center', 'middle');
      text(ctx, 'RETOUR', b.x + b.w / 2, b.y + dy + b.h - 9, 14, COL.dim, 'center');
    } else {
      this._dial(ctx, b, dy, b.cdRatio);
      if (h.abilityCd > 0) text(ctx, Math.ceil(h.abilityCd) + ' s', b.x + b.w / 2, b.y + dy + b.h / 2, 24, COL.text, 'center', 'middle');
      // vie du commandant
      const r = h.unit.hp / h.unit.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(b.x + 10, b.y + dy + b.h - 30, b.w - 20, 6);
      ctx.fillStyle = r > 0.5 ? COL.good : r > 0.25 ? '#e0a82e' : COL.bad;
      ctx.fillRect(b.x + 10, b.y + dy + b.h - 30, (b.w - 20) * r, 6);
      text(ctx, b.enabled ? 'CAPACITÉ !' : h.cfg.ability.name.split(' ')[0].toUpperCase(), b.x + b.w / 2, b.y + dy + b.h - 9, 13,
        b.enabled ? COL.yellow : COL.dim, 'center');
    }
    text(ctx, b.key, b.x + 8, b.y + dy + 19, 15, COL.dim);
  }

  _incomeButton(ctx, b, pressed) {
    const dy = this._frame(ctx, b, pressed, false);
    drawSpellIcon(ctx, 'income', b.x + b.w / 2 - 6, b.y + dy + b.h * 0.38, b.h * 0.5, !b.enabled);
    const max = CONFIG.economy.incomeUpgrade.costs.length;
    // niveaux atteints
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < b.incomeLevel ? COL.good : 'rgba(0,0,0,0.4)';
      ctx.fillRect(b.x + b.w / 2 - max * 7 + i * 14 + 2, b.y + dy + b.h - 36, 10, 6);
    }
    text(ctx, b.cost === null ? 'MAX' : '⚙ ' + b.cost, b.x + b.w / 2, b.y + dy + b.h - 9, 18,
      b.cost === null ? COL.good : b.enabled ? COL.yellow : COL.bad, 'center');
    text(ctx, 'REVENU', b.x + b.w / 2, b.y + dy + 16, 13, COL.dim, 'center');
  }
}
