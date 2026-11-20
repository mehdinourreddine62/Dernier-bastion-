// Musique apocalyptique générée en direct (Web Audio API), sans aucun fichier.
// Ré mineur, ~84 battements/min, boucle de 8 mesures : Rém – Sib – Do – La.
// Couches : nappe d'accords, basse, percussions (grosse caisse, caisse claire,
// chocs métalliques, charleston) et une mélodie solitaire avec écho, qui varie à chaque boucle.
// Intensité : 0 = menus (calme), 1 = en partie, 2 = danger (boss, base menacée).

const BPM = 84;
const STEP = 60 / BPM / 4;            // durée d'une double-croche (s)
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Accords de la boucle (une mesure = 16 pas, chaque accord dure 2 mesures)
const CHORDS = [
  { root: 38, notes: [62, 65, 69] },   // Ré mineur
  { root: 34, notes: [58, 62, 65] },   // Si bémol
  { root: 36, notes: [60, 64, 67] },   // Do
  { root: 33, notes: [57, 61, 64] },   // La majeur (tension)
];
const SCALE = [62, 64, 65, 67, 69, 70, 72, 74, 77];   // ré mineur, octave de la mélodie

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export class Music {
  constructor(sfx) {
    this.sfx = sfx;          // partage le contexte audio et le volume général des effets
    this.enabled = true;
    this.intensity = 0;
    this.bus = null;
    this.step = 0;
    this.nextTime = 0;
    this.rand = rng(7);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.bus) this.bus.gain.setTargetAtTime(on ? 0.55 : 0, this.sfx.ctx.currentTime, 0.4);
  }

  _init() {
    const c = this.sfx.ctx;
    this.bus = c.createGain();
    this.bus.gain.value = 0;
    this.bus.gain.setTargetAtTime(this.enabled ? 0.55 : 0, c.currentTime, 1.5);   // fondu d'entrée
    this.bus.connect(this.sfx.master);
    // Écho pour la mélodie
    this.echo = c.createDelay(1.5);
    this.echo.delayTime.value = STEP * 3;
    const fb = c.createGain(); fb.gain.value = 0.38;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.echo.connect(lp).connect(fb).connect(this.echo);
    lp.connect(this.bus);
    this.nextTime = c.currentTime + 0.1;
  }

  // À appeler à chaque image : programme les notes un peu en avance
  update(intensity) {
    const c = this.sfx.ctx;
    if (!c || c.state !== 'running') return;
    if (!this.bus) this._init();
    this.intensity = intensity;
    if (this.nextTime < c.currentTime) this.nextTime = c.currentTime + 0.05;   // rattrapage après une pause
    while (this.nextTime < c.currentTime + 0.25) {
      if (this.enabled) this._playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step++;
    }
  }

  _playStep(step, t) {
    const pos = step % 128;                 // 8 mesures
    const bar = Math.floor(pos / 16);
    const s = pos % 16;
    const chord = CHORDS[Math.floor(bar / 2) % 4];
    const I = this.intensity;

    // Nappe : un nouvel accord toutes les 2 mesures
    if (pos % 32 === 0) this._pad(t, chord);

    // Mélodie solitaire (toutes intensités), nouvelle variation à chaque boucle
    if (pos === 0) this.rand = rng(1 + Math.floor(step / 128) * 97);
    if (s % 2 === 0 && this.rand() < (I === 0 ? 0.16 : 0.22)) {
      const pool = this.rand() < 0.6 ? chord.notes.map((n) => n + 12) : SCALE;
      const note = pool[Math.floor(this.rand() * pool.length)];
      this._lead(t, note, this.rand() < 0.3 ? STEP * 6 : STEP * 3);
    }

    if (I < 1) return;
    // Basse
    if ([0, 3, 6, 8, 11, 14].includes(s)) this._bass(t, chord.root + (s === 8 && bar % 2 ? 12 : 0));
    // Grosse caisse, caisse claire, chocs de métal
    if (s === 0 || s === 8 || (I >= 2 && s === 10)) this._kick(t);
    if (s === 4 || s === 12) this._snare(t);
    if (s === 14 && bar % 2 === 1) this._metal(t);
    // Danger : charleston
    if (I >= 2 && s % 2 === 1) this._hat(t);
  }

  // ---------- Instruments ----------
  _env(t, attack, hold, release, peak) {
    const g = this.sfx.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return g;
  }

  _osc(type, freq, t, dur, dest, detune = 0) {
    const o = this.sfx.ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }

  _noise(t, dur, dest) {
    const c = this.sfx.ctx;
    const src = c.createBufferSource();
    src.buffer = this.sfx.noiseBuf;
    src.connect(dest);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  _pad(t, chord) {
    const c = this.sfx.ctx;
    const len = STEP * 32;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(300, t);
    f.frequency.linearRampToValueAtTime(900, t + len * 0.5);
    f.frequency.linearRampToValueAtTime(350, t + len);
    const g = this._env(t, 1.6, len - 2.6, 1.8, 0.05);
    f.connect(g).connect(this.bus);
    for (const n of chord.notes) {
      this._osc('sawtooth', midi(n - 12), t, len + 1, f, -8);
      this._osc('sawtooth', midi(n - 12), t, len + 1, f, 9);
    }
    this._osc('triangle', midi(chord.root), t, len + 1, f);
  }

  _bass(t, note) {
    const c = this.sfx.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(140, t + 0.3);
    const g = this._env(t, 0.01, 0.05, 0.3, 0.2);
    f.connect(g).connect(this.bus);
    this._osc('sawtooth', midi(note), t, 0.4, f);
    this._osc('square', midi(note) / 2, t, 0.4, f);
  }

  _kick(t) {
    const c = this.sfx.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const g = this._env(t, 0.003, 0.02, 0.35, 0.55);
    o.connect(g).connect(this.bus);
    o.start(t); o.stop(t + 0.45);
  }

  _snare(t) {
    const c = this.sfx.ctx;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
    const g = this._env(t, 0.002, 0.01, 0.22, 0.13);
    f.connect(g).connect(this.bus);
    this._noise(t, 0.3, f);
  }

  // Choc métallique (tôle frappée)
  _metal(t) {
    const c = this.sfx.ctx;
    const g = this._env(t, 0.002, 0.0, 0.5, 0.06);
    g.connect(this.bus);
    for (const fr of [523, 1130, 1790]) this._osc('square', fr, t, 0.55, g);
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000;
    const g2 = this._env(t, 0.002, 0, 0.12, 0.08);
    f.connect(g2).connect(this.bus);
    this._noise(t, 0.15, f);
  }

  _hat(t) {
    const c = this.sfx.ctx;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = this._env(t, 0.001, 0, 0.05, 0.05);
    f.connect(g).connect(this.bus);
    this._noise(t, 0.08, f);
  }

  // Mélodie : son doux un peu voilé, avec vibrato et écho
  _lead(t, note, dur) {
    const c = this.sfx.ctx;
    const g = this._env(t, 0.06, dur * 0.4, dur * 0.9 + 0.3, 0.09);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
    g.connect(f);
    f.connect(this.bus);
    f.connect(this.echo);
    const o = c.createOscillator();
    o.type = 'triangle'; o.frequency.value = midi(note);
    const vib = c.createOscillator(); vib.frequency.value = 5;
    const vg = c.createGain(); vg.gain.value = 4;
    vib.connect(vg).connect(o.frequency);
    o.connect(g);
    const end = t + dur * 1.3 + 0.4;
    o.start(t); o.stop(end); vib.start(t); vib.stop(end);
  }
}
