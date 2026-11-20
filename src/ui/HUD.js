import { CONFIG } from '../config.js';
import { drawIcon } from '../render/sprites.js';
import { COL, drawPanel, drawButton, roundRectPath, text } from './widgets.js';

// Interface en partie : barres de PV, ressources, recrutement, pause, vitesse.
// build() calcule les boutons de l'image courante (tailles tactiles comprises),
// draw() les dessine. Le même tableau sert aux clics/touchers.
export class HUD {
  constructor() {
    this.buttons = [];
    this.barY = CONFIG.display.height - 104;
  }

  build(game, view) {
    const W = CONFIG.display.width, H = CONFIG.display.height;
    const minL = CONFIG.display.minButtonPx / view.scale;   // taille mini en unités logiques
    const btns = [];

    // Boutons du haut : pause et vitesse
    const m = Math.max(56, minL);
    btns.push({ id: 'pause', x: W / 2 - m - 6, y: 8, w: m, h: m, label: 'II', enabled: true });
    btns.push({ id: 'speed', x: W / 2 + 6, y: 8, w: m, h: m, label: 'x' + game.speed, enabled: true });

    // Barre du bas
    const bh = Math.max(88, minL);
    const barH = bh + 16;
    const barY = H - barH;
    this.barY = barY;
    const ids = CONFIG.roster.player.filter((id) => CONFIG.units[id].unlockLevel <= game.level.id);
    const bw = Math.max(118, minL);
    let x = 250;
    ids.forEach((id, i) => {
      const def = CONFIG.units[id];
      const cd = game.sides.player.cooldowns[id] || 0;
      btns.push({
        id: 'recruit:' + id, unit: id, key: i + 1,
        x, y: barY + 8, w: bw, h: bh,
        enabled: game.canRecruit('player', id),
        cdRatio: def.recruitCooldown > 0 ? cd / def.recruitCooldown : 0,
        afford: game.sides.player.scrap >= def.cost,
      });
      x += bw + 8;
    });
    this.buttons = btns;
    return btns;
  }

  draw(ctx, game, pressed) {
    const W = CONFIG.display.width, H = CONFIG.display.height;

    // Barres de PV des deux bases
    this._hpBar(ctx, 20, 14, 420, 30, game.bases.player, COL.good, 'MA BASE', false);
    this._hpBar(ctx, W - 20 - 420, 14, 420, 30, game.bases.enemy, COL.bad, 'NID MUTANT', true);

    for (const b of this.buttons) {
      if (b.id === 'pause') drawButton(ctx, b, b.label, pressed.has(b.id), { size: 28 });
      else if (b.id === 'speed') drawButton(ctx, b, b.label, pressed.has(b.id), { size: 28 });
    }

    // Barre du bas
    const barY = this.barY;
    drawPanel(ctx, 6, barY, W - 12, H - barY - 6, 12);

    const s = game.sides.player;
    text(ctx, '⚙ ' + Math.floor(s.scrap), 26, barY + 46, 38, COL.yellow);
    text(ctx, '+' + Number(game.income('player').toFixed(1)) + '/s', 28, barY + 78, 22, COL.dim);

    const pop = game.pop('player');
    const full = pop >= CONFIG.combat.populationMax;
    text(ctx, 'ARMÉE', W - 30, barY + 34, 18, COL.dim, 'right');
    text(ctx, pop + ' / ' + CONFIG.combat.populationMax, W - 30, barY + 72, 34, full ? COL.bad : COL.text, 'right');

    for (const b of this.buttons) if (b.unit) this._recruitButton(ctx, b, pressed.has(b.id));
  }

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
    ctx.lineJoin = 'round';
    text(ctx, label + '  ' + Math.ceil(base.hp) + ' / ' + base.maxHp, x + w / 2, y + h / 2 + 1, 17, '#fff', 'center', 'middle');
  }

  _recruitButton(ctx, b, pressed) {
    const def = CONFIG.units[b.unit];
    const dy = pressed && b.enabled ? 2 : 0;
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, pressed && b.enabled ? '#4a3a2e' : '#6b5440');
    g.addColorStop(1, pressed && b.enabled ? '#6b5440' : '#43332a');
    roundRectPath(ctx, b.x, b.y + dy, b.w, b.h, 10);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = COL.dark; ctx.stroke();

    drawIcon(ctx, b.unit, b.x + b.w / 2, b.y + dy + b.h * 0.36, b.h * 0.62, !b.enabled);

    // Cadran de recharge
    if (b.cdRatio > 0) {
      ctx.save();
      roundRectPath(ctx, b.x, b.y + dy, b.w, b.h, 10);
      ctx.clip();
      const cx = b.x + b.w / 2, cy = b.y + dy + b.h / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, b.w, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.cdRatio);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    text(ctx, '⚙ ' + def.cost, b.x + b.w / 2, b.y + dy + b.h - 10, 20, b.afford ? COL.yellow : COL.bad, 'center');
    text(ctx, String(b.key), b.x + 9, b.y + dy + 20, 15, COL.dim);
  }
}
