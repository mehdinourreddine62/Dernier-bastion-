// Entrées unifiées souris + tactile (Pointer Events) + clavier.
// Un toucher qui commence sur un bouton déclenche le bouton s'il se termine dessus.
// Un toucher qui commence ailleurs fait défiler la caméra.
export class Input {
  constructor(canvas, view) {
    this.canvas = canvas;
    this.view = view;                 // { scale, ox, oy } mis à jour par main.js
    this.pointers = new Map();        // pointeurs actifs
    this.keys = new Set();            // touches maintenues (minuscules)
    this.mouse = { x: 0, y: 0, inside: false };
    this.pressed = new Set();         // ids des boutons actuellement enfoncés (retour visuel)

    // Branchés par main.js
    this.hitTest = () => null;
    this.onButton = () => {};
    this.onDrag = () => {};           // dx logique (positif = doigt vers la droite)
    this.onWheel = () => {};
    this.onKey = () => {};
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

  _down(e) {
    e.preventDefault();
    this.onInteract();
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ }
    const p = this._pos(e);
    const btn = this.hitTest(p.x, p.y);
    this.pointers.set(e.pointerId, { x: p.x, y: p.y, btn: btn ? btn.id : null });
    if (btn && btn.enabled !== false) this.pressed.add(btn.id);
    if (e.pointerType === 'mouse') { this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true; }
  }

  _move(e) {
    const p = this._pos(e);
    if (e.pointerType === 'mouse') { this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true; }
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    if (ptr.btn) {
      // Si on sort du bouton, il n'est plus « enfoncé »
      const hit = this.hitTest(p.x, p.y);
      if (hit && hit.id === ptr.btn) { if (hit.enabled !== false) this.pressed.add(ptr.btn); }
      else this.pressed.delete(ptr.btn);
    } else {
      this.onDrag(p.x - ptr.x);
    }
    ptr.x = p.x; ptr.y = p.y;
  }

  _up(e, cancelled) {
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    this.pointers.delete(e.pointerId);
    if (ptr.btn) {
      this.pressed.delete(ptr.btn);
      if (!cancelled) {
        const p = this._pos(e);
        const hit = this.hitTest(p.x, p.y);
        if (hit && hit.id === ptr.btn && hit.enabled !== false) this.onButton(hit);
      }
    }
  }
}
