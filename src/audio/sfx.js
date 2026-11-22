// Sons synthétisés avec la Web Audio API : aucun fichier audio.
// Le son ne démarre qu'après la première interaction (règle des navigateurs mobiles).
// Les sons « du monde » sont plus faibles et panoramiques selon leur position à l'écran.

// Délai minimum entre deux sons identiques (évite la cacophonie)
const MIN_GAP = {
  shot: 0.05, mg: 0.07, spit: 0.08, melee: 0.06, claw: 0.06, bite: 0.08, smash: 0.15,
  cannon: 0.1, explosion: 0.06, flame: 0.12, deathHuman: 0.08, deathMutant: 0.08,
  spawn: 0.08, baseHit: 0.25, splat: 0.1, shellFall: 0.1, slam: 0.2, bike: 0.2,
};
const MAX_VOICES = 28;

// Son d'attaque de chaque unité
const ATTACK_SOUND = {
  pillard: 'melee', tireur: 'shot', motard: 'melee', blinde: 'cannon',
  goule: 'claw', cracheur: 'spit', chien: 'bite', brute: 'smash', abomination: 'slam', charognard: 'claw',
  lanceRoquettes: 'cannon', mitrailleur: 'mg', carapace: 'smash', couveuse: 'claw', larve: 'bite',
  hurleur: 'spit', epineux: 'spit', matriarche: 'slam', fleau: 'slam',
};
const MUTANTS = ['goule', 'cracheur', 'chien', 'brute', 'abomination', 'rouilleur', 'charognard',
  'carapace', 'couveuse', 'larve', 'hurleur', 'epineux', 'matriarche', 'fleau'];

export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.cameraX = 0;
    this.viewW = 1280;
    this.last = {};
    this.voices = 0;
  }

  // À appeler à chaque interaction : crée/réveille le contexte audio
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this._build();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* audio indisponible : le jeu reste muet */ }
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
  }

  _build() {
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.enabled ? 0.8 : 0;
    // Compresseur : évite la saturation quand beaucoup de sons se superposent
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6;
    this.master.connect(comp).connect(c.destination);

    // Bruit blanc réutilisé par tous les sons
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this._ambient();
  }

  // Ambiance : vent qui souffle + grondement grave, en boucle
  _ambient() {
    const c = this.ctx;
    const amb = c.createGain();
    amb.gain.value = 0.9;
    amb.connect(this.master);

    const wind = c.createBufferSource();
    wind.buffer = this.noiseBuf; wind.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.7;
    const wg = c.createGain(); wg.gain.value = 0.05;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.13;
    const lfoG = c.createGain(); lfoG.gain.value = 0.035;
    lfo.connect(lfoG).connect(wg.gain);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.07;
    const lfo2G = c.createGain(); lfo2G.gain.value = 180;
    lfo2.connect(lfo2G).connect(wf.frequency);
    wind.connect(wf).connect(wg).connect(amb);

    const rumble = c.createOscillator(); rumble.type = 'sine'; rumble.frequency.value = 42;
    const rumble2 = c.createOscillator(); rumble2.type = 'triangle'; rumble2.frequency.value = 55;
    const rg = c.createGain(); rg.gain.value = 0.035;
    const rl = c.createOscillator(); rl.frequency.value = 0.05;
    const rlG = c.createGain(); rlG.gain.value = 0.02;
    rl.connect(rlG).connect(rg.gain);
    rumble.connect(rg); rumble2.connect(rg); rg.connect(amb);

    for (const n of [wind, lfo, lfo2, rumble, rumble2, rl]) n.start();
  }

  // ---------- Briques de base ----------

  _out(vol, pan) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.value = vol;
    if (c.createStereoPanner && pan) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      g.connect(p).connect(this.master);
    } else {
      g.connect(this.master);
    }
    return g;
  }

  // Bruit filtré avec enveloppe. f0 -> f1 : balayage du filtre
  _noise(out, t, dur, type, f0, f1, vol, q = 1, attack = 0.003) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * Math.max(0, 1.9 - dur));
    src.stop(t + dur + 0.02);
    this._track(src);
  }

  // Oscillateur avec glissement de fréquence f0 -> f1
  _tone(out, t, dur, type, f0, f1, vol, attack = 0.004) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
    this._track(o);
  }

  _track(node) {
    this.voices++;
    node.onended = () => { this.voices--; };
  }

  // ---------- Lecture ----------

  // name : nom du son ; x : position dans le monde (undefined = son d'interface)
  play(name, x) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = MIN_GAP[name] || 0.03;
    if (this.last[name] !== undefined && now - this.last[name] < gap) return;
    if (this.voices > MAX_VOICES && x !== undefined) return;
    this.last[name] = now;

    let vol = 1, pan = 0;
    if (x !== undefined) {
      const center = this.cameraX + this.viewW / 2;
      const d = x - center;
      pan = Math.max(-0.8, Math.min(0.8, d / this.viewW));
      const off = Math.max(0, Math.abs(d) - this.viewW / 2);
      vol = Math.max(0.12, 1 - off / 1100);
    }
    const fn = this['_' + name];
    if (fn) fn.call(this, now, vol, pan);
  }

  // Événement du jeu -> son
  playEvent(e) {
    switch (e.type) {
      case 'attack': { const s = ATTACK_SOUND[e.data.id]; if (s) this.play(s, e.x); break; }
      case 'turret': this.play(e.data.side === 'player' ? 'mg' : 'spit', e.x); break;
      case 'flame': this.play('flame', e.x); break;
      case 'explosion': this.play('explosion', e.x); if (e.data && e.data.huge) this.play('boom', e.x); break;
      case 'slam': this.play('slam', e.x); break;
      case 'death':
        if (e.data.id === 'blinde') break;
        this.play(MUTANTS.includes(e.data.id) ? 'deathMutant' : 'deathHuman', e.x);
        break;
      case 'spawn':
        if (e.data.side === 'player') this.play(e.data.id === 'motard' ? 'bike' : 'spawn', e.x);
        break;
      case 'queue': this.play('click'); break;
      case 'baseHit': this.play('baseHit', e.x); break;
      case 'splat': this.play('splat', e.x); break;
      case 'shellFall': this.play('shellFall', e.x); break;
      case 'heal': this.play('heal'); break;
      case 'ability': this.play(e.data.kind === 'snipe' ? 'cannon' : e.data.kind === 'rally' ? 'rally' : 'spawn', e.x); break;
      case 'heroSpawn': this.play('upgrade'); break;
      case 'wave': this.play('rally'); break;
      case 'cards': this.play('heal'); break;
      case 'upgrade': this.play('upgrade'); break;
      case 'boss': this.play('boss'); break;
      case 'win': this.play('win'); break;
      case 'lose': this.play('lose'); break;
    }
  }

  // ---------- Recettes ----------
  _shot(t, v, p) {
    const o = this._out(0.5 * v, p);
    this._noise(o, t, 0.12, 'highpass', 1800, 900, 0.9);
    this._tone(o, t, 0.08, 'triangle', 160, 60, 0.6);
  }
  _mg(t, v, p) {
    const o = this._out(0.28 * v, p);
    this._noise(o, t, 0.06, 'bandpass', 2400, 1200, 0.9, 0.8);
    this._tone(o, t, 0.05, 'square', 110, 60, 0.25);
  }
  _spit(t, v, p) {
    const o = this._out(0.4 * v, p);
    this._noise(o, t, 0.16, 'lowpass', 2200, 300, 0.7, 4);
    this._tone(o, t, 0.12, 'sine', 420, 140, 0.5);
  }
  _splat(t, v, p) {
    const o = this._out(0.22 * v, p);
    this._noise(o, t, 0.12, 'lowpass', 900, 200, 0.8, 2);
  }
  _melee(t, v, p) {
    const o = this._out(0.4 * v, p);
    this._tone(o, t, 0.09, 'sine', 200, 70, 0.8);
    this._noise(o, t, 0.05, 'bandpass', 1200, 600, 0.5);
  }
  _claw(t, v, p) {
    const o = this._out(0.32 * v, p);
    this._noise(o, t, 0.09, 'highpass', 3000, 5000, 0.7, 1, 0.02);
  }
  _bite(t, v, p) {
    const o = this._out(0.35 * v, p);
    this._noise(o, t, 0.07, 'bandpass', 1600, 800, 0.8, 2);
    this._tone(o, t, 0.1, 'sawtooth', 240, 120, 0.2);
  }
  _smash(t, v, p) {
    const o = this._out(0.55 * v, p);
    this._tone(o, t, 0.25, 'sine', 120, 40, 0.9);
    this._noise(o, t, 0.2, 'lowpass', 900, 200, 0.6);
  }
  _slam(t, v, p) {
    const o = this._out(0.7 * v, p);
    this._tone(o, t, 0.5, 'sine', 80, 28, 1);
    this._noise(o, t, 0.4, 'lowpass', 600, 120, 0.7);
  }
  _cannon(t, v, p) {
    const o = this._out(0.6 * v, p);
    this._noise(o, t, 0.35, 'lowpass', 1400, 200, 0.9);
    this._tone(o, t, 0.3, 'sine', 110, 35, 0.9);
  }
  _explosion(t, v, p) {
    const o = this._out(0.75 * v, p);
    this._noise(o, t, 0.8, 'lowpass', 1600, 120, 1, 0.8, 0.005);
    this._tone(o, t, 0.6, 'sine', 70, 25, 1);
  }
  _boom(t, v, p) {
    const o = this._out(0.9 * v, p);
    this._noise(o, t, 1.6, 'lowpass', 900, 60, 1, 0.7, 0.01);
    this._tone(o, t, 1.2, 'sine', 55, 20, 1);
  }
  _flame(t, v, p) {
    const o = this._out(0.22 * v, p);
    this._noise(o, t, 0.22, 'bandpass', 700, 500, 0.8, 0.6, 0.03);
  }
  _deathHuman(t, v, p) {
    const o = this._out(0.3 * v, p);
    const c = this.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    f.connect(o);
    this._tone(f, t, 0.3, 'sawtooth', 200, 90, 0.6, 0.01);
  }
  _deathMutant(t, v, p) {
    const o = this._out(0.35 * v, p);
    const c = this.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    f.connect(o);
    this._tone(f, t, 0.45, 'square', 150, 50, 0.5, 0.01);
    this._noise(o, t, 0.3, 'lowpass', 800, 200, 0.4, 3);
  }
  _spawn(t, v, p) {
    const o = this._out(0.22 * v, p);
    this._tone(o, t, 0.08, 'square', 520, 520, 0.4);
    this._tone(o, t + 0.06, 0.1, 'square', 780, 780, 0.35);
    this._noise(o, t, 0.04, 'highpass', 4000, 4000, 0.4);
  }
  _bike(t, v, p) {
    const o = this._out(0.3 * v, p);
    this._tone(o, t, 0.5, 'sawtooth', 70, 160, 0.5, 0.02);
    this._noise(o, t, 0.4, 'lowpass', 600, 1200, 0.3);
  }
  _baseHit(t, v, p) {
    const o = this._out(0.35 * v, p);
    this._tone(o, t, 0.2, 'sine', 90, 45, 0.8);
    this._noise(o, t, 0.15, 'bandpass', 500, 300, 0.4);
  }
  _shellFall(t, v, p) {
    const o = this._out(0.18 * v, p);
    this._tone(o, t, 0.45, 'sine', 1500, 500, 0.6, 0.05);
  }
  _click(t) {
    const o = this._out(0.2, 0);
    this._tone(o, t, 0.04, 'square', 900, 700, 0.4);
  }
  _deny(t) {
    const o = this._out(0.15, 0);
    this._tone(o, t, 0.12, 'square', 140, 110, 0.5);
  }
  _heal(t) {
    const o = this._out(0.25, 0);
    [660, 880, 1100, 1320].forEach((f, i) => this._tone(o, t + i * 0.07, 0.25, 'triangle', f, f, 0.5));
  }
  // Cri de ralliement : accord de cuivres
  _rally(t, v, p) {
    const o = this._out(0.4 * v, p);
    [220, 277, 330].forEach((f) => this._tone(o, t, 0.7, 'sawtooth', f, f * 1.02, 0.25, 0.05));
    this._tone(o, t + 0.25, 0.6, 'sawtooth', 440, 440, 0.2, 0.05);
  }
  _upgrade(t) {
    const o = this._out(0.25, 0);
    this._tone(o, t, 0.15, 'triangle', 1200, 1200, 0.5);
    this._tone(o, t + 0.08, 0.3, 'triangle', 1600, 1600, 0.5);
  }
  _boss(t) {
    const o = this._out(0.6, 0);
    this._tone(o, t, 1.4, 'sawtooth', 75, 45, 0.7, 0.1);
    this._tone(o, t, 1.4, 'sawtooth', 79, 48, 0.5, 0.1);
    this._noise(o, t, 1.2, 'lowpass', 500, 150, 0.4, 1, 0.1);
  }
  _win(t) {
    const o = this._out(0.35, 0);
    [523, 659, 784, 1047].forEach((f, i) => this._tone(o, t + i * 0.14, 0.5, 'triangle', f, f, 0.6));
    this._tone(o, t + 0.56, 0.9, 'triangle', 1047, 1047, 0.5);
  }
  _lose(t) {
    const o = this._out(0.35, 0);
    [392, 311, 262].forEach((f, i) => this._tone(o, t + i * 0.25, 0.6, 'sawtooth', f, f * 0.98, 0.3));
    this._tone(o, t + 0.75, 1.2, 'sine', 131, 98, 0.6);
  }
}
