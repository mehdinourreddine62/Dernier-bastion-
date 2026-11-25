import { CONFIG } from '../config.js?v=32';

// Entrées unifiées souris + tactile (Pointer Events) + clavier.
// - Un toucher qui commence sur un bouton déclenche le bouton s'il se termine dessus
//   (sauf appui long sur téléphone : il affiche l'infobulle à la place).
// - Un toucher qui commence ailleurs fait défiler la caméra,
//   ou déplace le cercle de visée si un sort est en cours de visée.
export class Input {
  constructor(canvas, view) {
    this.canvas = canvas;
    this.view = view;                 // { scale, ox, oy } mis à jour par main.js
    this.pointers = new Map();        // pointeurs actifs
    this.keys = new Set();            // touches maintenues (minuscules)
    this.mouse = { x: 0, y: 0, inside: false };
    this.pressed = new Set();         // ids des boutons actuellement enfoncés (retour visuel)
    this.aiming = false;              // mis à jour par main.js

    // Branchés par main.js
    this.hitTest = () => null;
    this.onButton = () => {};
    this.onDrag = () => {};           // dx logique (positif = doigt vers la droite)
    this.onWheel = () => {};
    this.onKey = () => {};
    this.onAim = () => {};            // (x, y, phase) phase = 'down' | 'move' | 'up'
    this.onCancel = () => {};         // clic droit
    this.onButtonDrag = () => {};     // (id, x, y) zone glissable (mini-carte)
    this.onInteract = () => {};

    const c = canvas;
    c.addEventListener('pointerdown', (e) => this._down(e));
    c.addEventListener('pointermove', (e) => this._move(e));
    c.addEventListener('pointerup', (e) => this._up(e, false));
    c.addEventListener('pointercancel', (e) => this._up(e, true));
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.mouse.inside = false; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.onWheel(e.deltaX + e.deltaY); }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (['arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!e.repeat) { this.onInteract(); this.onKey(e); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); this.pressed.clear(); });
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const v = this.view;
    return { x: (e.clientX - r.left - v.ox) / v.scale, y: (e.clientY - r.top - v.oy) / v.scale };
  }

  // Bouton maintenu longtemps au doigt (pour l'infobulle), ou null
  longPressedButton() {
    const now = performance.now();
    for (const p of this.pointers.values()) {
      if (p.btn && p.type !== 'mouse' && now - p.t0 >= CONFIG.display.longPressTime * 1000) return p.btn;
    }
    return null;
  }

  _down(e) {
    e.preventDefault();
    this.onInteract();
    const p = this._pos(e);
    if (e.pointerType === 'mouse') { this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true; }
    if (e.button === 2) { this.onCancel(); return; }
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ }
    const btn = this.hitTest(p.x, p.y);
    const ptr = { x: p.x, y: p.y, btn: btn ? btn.id : null, type: e.pointerType, t0: performance.now(), aim: false, drag: null };
    this.pointers.set(e.pointerId, ptr);
    if (btn && btn.drag) {
      // Zone « glissable » (mini-carte) : suit le doigt tant qu'il est posé
      ptr.btn = null;
      ptr.drag = btn.id;
      this.onButtonDrag(btn.id, p.x, p.y);
    } else if (btn) {
      if (btn.enabled !== false) this.pressed.add(btn.id);
    } else if (this.aiming) {
      ptr.aim = true;
      this.onAim(p.x, p.y, 'down', e.pointerType);
    }
  }

  _move(e) {
    const p = this._pos(e);
    if (e.pointerType === 'mouse') { this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true; }
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) {
      // Souris qui survole : le cercle de visée la suit
      if (e.pointerType === 'mouse' && this.aiming) this.onAim(p.x, p.y, 'move', 'mouse');
      return;
    }
    if (ptr.drag) {
      this.onButtonDrag(ptr.drag, p.x, p.y);
    } else if (ptr.btn) {
      // Si on sort du bouton, il n'est plus « enfoncé »
      const hit = this.hitTest(p.x, p.y);
      if (hit && hit.id === ptr.btn) { if (hit.enabled !== false) this.pressed.add(ptr.btn); }
      else this.pressed.delete(ptr.btn);
    } else if (ptr.aim) {
      this.onAim(p.x, p.y, 'move', ptr.type);
    } else {
      this.onDrag(p.x - ptr.x);
    }
    ptr.x = p.x; ptr.y = p.y;
  }

  _up(e, cancelled) {
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    this.pointers.delete(e.pointerId);
    const p = this._pos(e);
    if (ptr.btn) {
      this.pressed.delete(ptr.btn);
      if (cancelled) return;
      // Appui long au doigt = infobulle seulement
      const long = ptr.type !== 'mouse' && performance.now() - ptr.t0 >= CONFIG.display.longPressTime * 1000;
      const hit = this.hitTest(p.x, p.y);
      if (hit && hit.id === ptr.btn && hit.enabled !== false && !(long && hit.tooltip)) this.onButton(hit);
    } else if (ptr.aim) {
      this.onAim(p.x, p.y, cancelled ? 'cancel' : 'up', ptr.type);
    }
  }
}
