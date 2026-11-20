import { CONFIG } from '../config.js';
import { drawIcon, drawSpellIcon } from '../render/sprites.js';
import { COL, FONT, drawPanel, drawButton, roundRectPath, text } from './widgets.js';

const W = CONFIG.display.width;
const H = CONFIG.display.height;

// Interface en partie : barres de PV, ressources, recrutement, sorts, revenu,
// pause, vitesse, infobulles. build() calcule les boutons de l'image courante
// (tailles tactiles comprises), draw() les dessine. Le même tableau sert aux clics.
export class HUD {
  constructor() {
    this.buttons = [];
    this.barY = H - 104;
  }

  // aim = sort en cours de visée (ou null)
  build(game, view, aim) {
    const minL = CONFIG.display.minButtonPx / view.scale;   // taille mini en unités logiques
    const btns = [];
    const s = game.sides.player;

    // Haut : pause et vitesse
    const m = Math.max(56, minL);
    btns.push({ id: 'pause', x: W / 2 - m - 6, y: 8, w: m, h: m, label: 'II', enabled: true });
    btns.push({ id: 'speed', x: W / 2 + 6, y: 8, w: m, h: m, label: 'x' + game.speed, enabled: true });
    if (aim) {
      const cw = Math.max(200, minL);
      btns.push({ id: 'cancelAim', x: W / 2 - cw / 2, y: 8 + m + 12, w: cw, h: Math.max(52, minL), label: 'ANNULER', enabled: true });
    }

    // Bas : on calcule la largeur des boutons pour que tout tienne
    const units = CONFIG.roster.player.filter((id) => game.isUnlocked('player', id));
    const spells = game.spells.available;
    const count = units.length + spells.length + 1;
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
    x += 8;
    const cost = game.incomeUpgradeCost('player');
    btns.push({
      id: 'income', kind: 'income', x, y, w: bw, h: bh,
      enabled: cost !== null && s.scrap >= cost && !game.result,
      cost, level: s.incomeLevel,
      tooltip: true,
    });

    this.buttons = btns;
    return btns;
  }

  draw(ctx, game, pressed, aim) {
    // Barres de PV des deux bases
    this._hpBar(ctx, 20, 14, 420, 30, game.bases.player, COL.good, 'MA BASE', false);
    this._hpBar(ctx, W - 20 - 420, 14, 420, 30, game.bases.enemy, COL.bad, 'NID MUTANT', true);

    // Barre du bas
    const barY = this.barY;
    drawPanel(ctx, 6, barY, W - 12, H - barY - 6, 12);
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
      else drawButton(ctx, b, b.label, p, { size: b.id === 'cancelAim' ? 24 : 28, primary: b.id === 'cancelAim' });
    }

    // Annonce (boss…)
    if (game.banner) {
      const a = Math.min(1, game.banner.time * 2);
      ctx.globalAlpha = a;
      ctx.lineJoin = 'round';
      ctx.font = `bold 40px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 8; ctx.strokeStyle = COL.dark;
      ctx.strokeText(game.banner.text, W / 2, 190);
      ctx.fillStyle = COL.bad;
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

  // ---------- Infobulle ----------
  drawTooltip(ctx, b, game) {
    const lines = [];
    let title = '';
    if (b.kind === 'unit') {
      const d = CONFIG.units[b.unit];
      const mods = game.sides.player.mods;
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
    } else if (b.kind === 'income') {
      const e = CONFIG.economy.incomeUpgrade;
      title = 'Amélioration du revenu';
      lines.push(`+${e.bonusPerLevel} ferraille/s par niveau (niveau ${b.level}/${e.costs.length})`);
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

  _incomeButton(ctx, b, pressed) {
    const dy = this._frame(ctx, b, pressed, false);
    drawSpellIcon(ctx, 'income', b.x + b.w / 2 - 6, b.y + dy + b.h * 0.38, b.h * 0.5, !b.enabled);
    const max = CONFIG.economy.incomeUpgrade.costs.length;
    // niveaux atteints
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < b.level ? COL.good : 'rgba(0,0,0,0.4)';
      ctx.fillRect(b.x + b.w / 2 - max * 7 + i * 14 + 2, b.y + dy + b.h - 36, 10, 6);
    }
    text(ctx, b.cost === null ? 'MAX' : '⚙ ' + b.cost, b.x + b.w / 2, b.y + dy + b.h - 9, 18,
      b.cost === null ? COL.good : b.enabled ? COL.yellow : COL.bad, 'center');
    text(ctx, 'REVENU', b.x + b.w / 2, b.y + dy + 16, 13, COL.dim, 'center');
  }
}
