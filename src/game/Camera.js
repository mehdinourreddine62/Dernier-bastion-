import { CONFIG } from '../config.js?v=15';

// Caméra à défilement horizontal. x = bord gauche de la vue, en unités du monde.
export class Camera {
  constructor() {
    this.viewW = CONFIG.display.width;
    this.maxX = CONFIG.world.width - this.viewW;
    this.x = 0;
  }

  reset() { this.x = 0; }

  move(dx) {
    this.x = Math.max(0, Math.min(this.maxX, this.x + dx));
  }

  // Défilement au clavier et en poussant la souris contre les bords.
  update(dt, input, enabled) {
    if (!enabled) return;
    const c = CONFIG.camera;
    let v = 0;
    if (input.keys.has('arrowleft') || input.keys.has('a')) v -= c.keyScrollSpeed;
    if (input.keys.has('arrowright') || input.keys.has('d')) v += c.keyScrollSpeed;
    const m = input.mouse;
    if (m.inside && input.pointers.size === 0) {
      if (m.x < c.edgeZone) v -= c.edgeScrollSpeed;
      else if (m.x > CONFIG.display.width - c.edgeZone) v += c.edgeScrollSpeed;
    }
    if (v) this.move(v * dt);
  }
}
