import { CONFIG } from '../config.js?v=25';
import { COL, FONT, drawPanel, drawButton, roundRectPath, text } from './widgets.js?v=25';

// Tutoriel guidé du niveau 1. Chaque bulle met le jeu en pause et montre un élément.
// Certaines attendent une action (recruter, viser…), d'autres un simple « OK ».

const W = CONFIG.display.width;
const H = CONFIG.display.height;

// when(game, camera) : la bulle s'affiche quand la condition est vraie
// target : élément montré ; wait : 'ok' | 'recruit:<id>' | 'scroll' | 'cast' | 'income'
const STEPS = [
  { when: () => true, target: 'scrap', wait: 'ok',
    text: 'Bienvenue, commandant !\nLa ferraille ⚙ arrive toute seule, chaque seconde.\nElle sert à recruter tes unités.' },
  { when: () => true, target: 'recruit:pillard', wait: 'recruit:pillard',
    text: 'Recrute un Pillard : touche ce bouton.\nIl se bat au corps à corps et coûte peu.' },
  { when: () => true, target: 'recruit:tireur', wait: 'recruit:tireur',
    text: 'Le Tireur attaque de loin.\nRecrute-en un : ton Pillard le protégera.' },
  { when: (g) => g.time > 7, skip: (g, cam) => cam.x > 250, target: 'minimap', wait: 'scroll',
    text: 'Tes troupes avancent toutes seules.\nGlisse le doigt sur le champ de bataille\n(ou touche la mini-carte) pour les suivre.' },
  { when: (g) => g.spells.isReady('mortar') && !!frontEnemy(g) && frontEnemy(g).x < frontPlayer(g) + 700,
    skip: (g) => g.spells.cooldowns.mortar > 0,
    // la caméra se place sur les mutants pour pouvoir viser
    onShow: (g, cam) => cam.move(frontEnemy(g).x - W / 2 - cam.x),
    target: 'spell:mortar', wait: 'cast',
    text: 'Des mutants arrivent !\nTouche MORTIER, puis touche les mutants\nsur le champ de bataille pour les bombarder.' },
  { when: (g) => g.sides.player.scrap >= (g.incomeUpgradeCost('player') || 0),
    skip: (g) => g.sides.player.incomeLevel > 0, target: 'income', wait: 'income',
    text: 'Améliore ton revenu :\ntu gagneras plus de ferraille chaque seconde.' },
  { when: () => true, target: 'enemyHp', wait: 'ok',
    text: 'Ton objectif : détruire le nid mutant, tout à droite.\nNe laisse pas les mutants détruire ta base.\nBonne chance !' },
];

// Mutant le plus avancé / position de mon unité la plus avancée
function frontEnemy(g) {
  let best = null;
  for (const u of g.units) if (u.side === 'enemy' && u.alive && (!best || u.x < best.x)) best = u;
  return best;
}
function frontPlayer(g) {
  let x = g.bases.player.faceX;
  for (const u of g.units) if (u.side === 'player' && u.alive && u.x > x) x = u.x;
  return x;
}

export class Tutorial {
  constructor() {
    this.index = 0;
    this.showing = false;
    this.done = false;
  }

  get step() { return STEPS[this.index]; }

  // Vérifie si la prochaine bulle doit s'afficher (le jeu se met alors en pause)
  update(game, camera) {
    if (this.done || this.showing) return;
    // Action déjà faite par le joueur avant la bulle : on saute l'étape
    while (!this.done && this.step.skip && this.step.skip(game, camera)) this.next();
    if (this.done) return;
    if (this.step.when(game, camera)) {
      this.showing = true;
      if (this.step.onShow) this.step.onShow(game, camera);
    }
  }

  // Le joueur a fait quelque chose : si c'est l'action attendue, on passe à la suite
  notify(action) {
    if (this.showing && this.step.wait === action) this.next();
  }

  next() {
    this.showing = false;
    this.index++;
    if (this.index >= STEPS.length) this.done = true;
  }

  skip() { this.showing = false; this.done = true; }

  // Boutons du HUD encore utilisables pendant la bulle
  allowedIds() {
    const s = this.step;
    if (s.wait.startsWith('recruit:')) return [s.wait];
    if (s.wait === 'cast') return ['spell:mortar', 'cancelAim'];
    if (s.wait === 'income') return ['income'];
    if (s.wait === 'scroll') return ['minimap'];
    return [];
  }

  // Zone mise en évidence
  targetRect(hudButtons, hud) {
    const t = this.step.target;
    if (t === 'scrap') return { x: 12, y: hud.barY + 4, w: 176, h: H - hud.barY - 14 };
    if (t === 'enemyHp') return { x: W - 16 - 396, y: 12, w: 396, h: 34 };
    const b = hudButtons.find((o) => o.id === t);
    return b ? { x: b.x, y: b.y, w: b.w, h: b.h } : null;
  }

  // Boutons de la bulle (OK / passer)
  buttons(view, rect) {
    const minL = CONFIG.display.minButtonPx / view.scale;
    const h = Math.max(54, minL);
    this._btnH = h;
    const box = this._box(rect);
    const out = [];
    out.push({ id: 'tutoSkip', label: 'Passer le tutoriel', small: true, enabled: true,
      x: box.x + 16, y: box.y + box.h - h - 14, w: Math.max(200, minL), h });
    if (this.step.wait === 'ok') {
      out.push({ id: 'tutoOk', label: 'OK', primary: true, enabled: true,
        x: box.x + box.w - Math.max(140, minL) - 16, y: box.y + box.h - h - 14, w: Math.max(140, minL), h });
    }
    return out;
  }

  // Position de la bulle : au-dessus de la cible si elle est en bas, sinon en dessous
  _box(rect) {
    const lines = this.step.text.split('\n').length;
    const h = 40 + lines * 32 + (this._btnH || 60) + 24;
    const w = 640;
    let y;
    if (!rect) y = (H - h) / 2;
    else if (rect.y > H / 2) y = rect.y - h - 26;
    else y = rect.y + rect.h + 26;
    y = Math.max(10, Math.min(H - h - 10, y));
    const cx = rect ? rect.x + rect.w / 2 : W / 2;
    const x = Math.max(10, Math.min(W - w - 10, cx - w / 2));
    return { x, y, w, h };
  }

  draw(ctx, rect, buttons, pressed, time) {
    // voile sombre avec un « trou » autour de l'élément montré
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    if (rect) {
      const m = 8;
      roundRectPath(ctx, rect.x - m, rect.y - m, rect.w + 2 * m, rect.h + 2 * m, 12);
    }
    ctx.fillStyle = 'rgba(10,5,2,0.55)';
    ctx.fill('evenodd');
    ctx.restore();
    if (rect) {
      const p = 0.5 + Math.sin(time * 5) * 0.5;
      roundRectPath(ctx, rect.x - 8, rect.y - 8, rect.w + 16, rect.h + 16, 12);
      ctx.lineWidth = 4; ctx.strokeStyle = `rgba(242,194,48,${0.6 + 0.4 * p})`; ctx.stroke();
    }

    // bulle
    const box = this._box(rect);
    if (rect) {
      // flèche vers la cible
      const cx = Math.max(box.x + 30, Math.min(box.x + box.w - 30, rect.x + rect.w / 2));
      const below = box.y > rect.y;
      ctx.fillStyle = '#5a4636';
      ctx.beginPath();
      if (below) { ctx.moveTo(cx - 16, box.y + 2); ctx.lineTo(cx, box.y - 20); ctx.lineTo(cx + 16, box.y + 2); }
      else { ctx.moveTo(cx - 16, box.y + box.h - 2); ctx.lineTo(cx, box.y + box.h + 20); ctx.lineTo(cx + 16, box.y + box.h - 2); }
      ctx.fill();
    }
    drawPanel(ctx, box.x, box.y, box.w, box.h, 14);
    ctx.font = `bold 22px ${FONT}`;
    this.step.text.split('\n').forEach((l, i) => text(ctx, l, box.x + box.w / 2, box.y + 38 + i * 32, 22, i === 0 ? COL.yellow : COL.text, 'center', 'middle'));
    const hint = { 'recruit:pillard': 'Touche le bouton en surbrillance', 'recruit:tireur': 'Touche le bouton en surbrillance',
      scroll: 'Fais défiler pour continuer', cast: 'Lance la frappe pour continuer', income: 'Touche REVENU pour continuer' }[this.step.wait];
    if (hint) text(ctx, hint, box.x + box.w - 20, box.y + box.h - 14 - (this._btnH || 54) / 2, 16, COL.dim, 'right', 'middle');
    for (const b of buttons) drawButton(ctx, b, b.label, pressed.has(b.id), { primary: b.primary, size: b.small ? 17 : 24 });
  }
}
