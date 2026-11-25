import { CONFIG } from '../config.js?v=27';

// Décor en parallaxe : ciel (fixe), ruines lointaines, ruines proches, sol avec débris,
// et quelques débris au premier plan. Les couches lointaines et le sol sont dessinés
// UNE fois dans des images en mémoire (rapide), puis simplement recopiées à chaque image.
// Chaque niveau a son thème : couleurs du ciel, type de ruines, ambiance.

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Thèmes des 10 niveaux ----------
// features : éléments du plan moyen (alternés avec des immeubles en ruine)
// air : particules d'ambiance ('dust' poussière, 'ash' cendres, 'spores', 'embers' braises, 'snow' neige)
const THEMES = {
  1: { // Banlieue morte
    sky: ['#9c5428', '#d98a48', '#f2c98c'], sun: [930, 150, 44], glow: '255,228,170',
    far: '#b88458', mid: '#7c5236', midLight: '#94654a', fog: '236,190,130',
    ground: ['#8f6440', '#6b4629', '#3a2514'], road: true,
    features: ['house', 'pylon', 'house', 'deadTree', 'billboard', 'house', 'waterTower'], farH: [70, 170], midH: [70, 150], air: 'dust',
  },
  2: { // Autoroute effondrée
    sky: ['#8a5a36', '#c99a62', '#ecd29e'], sun: [780, 130, 40], glow: '255,236,190',
    far: '#a88866', mid: '#6e5640', midLight: '#8a6e54', fog: '230,200,150',
    ground: ['#93724e', '#6e5236', '#3c2a18'], road: true,
    features: ['overpass', 'billboard', 'pylon', 'overpass', 'deadTree'], farH: [110, 230], midH: [80, 170], air: 'dust',
  },
  3: { // Centrale
    sky: ['#6e5248', '#b88a6a', '#e2c4a0'], sun: [1000, 170, 50], glow: '255,220,180',
    far: '#9a8274', mid: '#5e4c44', midLight: '#7a6458', fog: '220,190,160',
    ground: ['#86684e', '#634a36', '#33261a'], road: false,
    features: ['coolingTower', 'chimney', 'pylon', 'coolingTower', 'tank'], farH: [80, 180], midH: [80, 160], air: 'ash',
  },
  4: { // Port rouillé
    sky: ['#7a3a2c', '#c86a48', '#f0b08a'], sun: [880, 210, 60], glow: '255,200,160',
    far: '#a8705c', mid: '#5c3a30', midLight: '#7a5040', fog: '240,170,130',
    ground: ['#8a6048', '#64422e', '#36221a'], road: false,
    features: ['crane', 'containers', 'ship', 'crane', 'containers'], farH: [60, 140], midH: [70, 140], air: 'dust',
  },
  5: { // Zone irradiée
    sky: ['#4e5a2e', '#a4a858', '#e0e09a'], sun: [700, 160, 54], glow: '230,255,170',
    far: '#8a8c5a', mid: '#4c5232', midLight: '#646c40', fog: '210,220,140',
    ground: ['#7c7444', '#5a5330', '#2e2a18'], road: true,
    features: ['ruinGlow', 'pylon', 'deadTree', 'ruinGlow', 'tank'], farH: [100, 220], midH: [90, 180], air: 'spores',
  },
  6: { // Cité effondrée
    sky: ['#4a3448', '#a0606a', '#eaa47e'], sun: [1050, 230, 48], glow: '255,190,160',
    far: '#8a6070', mid: '#46323e', midLight: '#5e4452', fog: '220,150,140',
    ground: ['#7e5a4a', '#5a3e34', '#2e2020'], road: true,
    features: ['skyscraper', 'billboard', 'skyscraper', 'skyscraper', 'deadTree'], farH: [150, 300], midH: [140, 300], air: 'ash',
  },
  7: { // Raffinerie
    sky: ['#3e1e18', '#9a3a22', '#e8884a'], sun: [640, 190, 40], glow: '255,170,110',
    far: '#7a4030', mid: '#3a2420', midLight: '#54342a', fog: '230,130,80',
    ground: ['#6e4a36', '#4e3224', '#261812'], road: false,
    features: ['flare', 'tank', 'chimney', 'tank', 'flare', 'pylon'], farH: [80, 170], midH: [80, 160], air: 'embers',
  },
  8: { // Marais toxique
    sky: ['#3a4430', '#7a8a58', '#c4c890'], sun: [860, 150, 42], glow: '220,240,170',
    far: '#6c7454', mid: '#38402c', midLight: '#4c563a', fog: '190,200,140',
    ground: ['#5e5a38', '#423e26', '#221e12'], road: false, swamp: true,
    features: ['deadTree', 'shack', 'deadTree', 'deadTree', 'shack', 'pylon'], farH: [60, 130], midH: [80, 150], air: 'spores',
  },
  9: { // Dernier rempart
    sky: ['#3e4652', '#8a8e90', '#d4c4a8'], sun: [980, 140, 38], glow: '240,240,220',
    far: '#7c7e80', mid: '#3e4044', midLight: '#56585c', fog: '200,195,180',
    ground: ['#7a6a56', '#58493a', '#2c241c'], road: true,
    features: ['wall', 'watchTower', 'wall', 'skyscraper', 'watchTower'], farH: [120, 240], midH: [90, 190], air: 'ash',
  },
  10: { // Le Nid
    sky: ['#2a0e1a', '#7a2236', '#d0604a'], sun: [640, 170, 58], glow: '255,140,120',
    far: '#6a3040', mid: '#341622', midLight: '#4c2232', fog: '200,90,90',
    ground: ['#6a3a34', '#4a2622', '#241210'], road: false, organic: true,
    features: ['spire', 'deadTree', 'spire', 'skyscraper', 'spire'], farH: [100, 220], midH: [100, 220], air: 'spores',
  },
};

// ---------- Chapitre 2 : le Fléau ----------
Object.assign(THEMES, {
  11: { // Faubourgs brûlés
    sky: ['#3a1c14', '#8a3a1e', '#d8783a'], sun: [820, 200, 46], glow: '255,160,90',
    far: '#6e3a28', mid: '#38201a', midLight: '#52302a', fog: '220,120,70',
    ground: ['#6a4a34', '#4a3224', '#241812'], road: true,
    features: ['house', 'deadTree', 'house', 'flare', 'house', 'pylon'], farH: [70, 160], midH: [70, 150], air: 'embers',
  },
  12: { // Barrage fissuré
    sky: ['#3c4c5a', '#7a8c94', '#c8c8b4'], sun: [1000, 150, 40], glow: '230,240,230',
    far: '#6a7884', mid: '#3a444c', midLight: '#526068', fog: '180,196,200',
    ground: ['#6e6a58', '#4e4a3c', '#262420'], road: true,
    features: ['dam', 'pylon', 'pylon', 'watchTower'], farH: [140, 240], midH: [80, 160], air: 'dust',
  },
  13: { // Couvoir
    sky: ['#2e1a2a', '#6a3050', '#c07a7a'], sun: [700, 180, 50], glow: '255,170,170',
    far: '#5a3448', mid: '#2e1822', midLight: '#442432', fog: '190,110,120',
    ground: ['#5e3a3a', '#422626', '#201212'], road: false, organic: true,
    features: ['pod', 'spire', 'pod', 'deadTree', 'pod'], farH: [80, 180], midH: [70, 150], air: 'spores',
  },
  14: { // Base aérienne
    sky: ['#4a5462', '#9a9c9a', '#e0d0ae'], sun: [900, 140, 42], glow: '255,240,210',
    far: '#7e8288', mid: '#40444a', midLight: '#585e64', fog: '210,205,190',
    ground: ['#7a7262', '#58524a', '#2c2824'], road: true,
    features: ['hangar', 'watchTower', 'dish', 'hangar', 'pylon'], farH: [60, 140], midH: [70, 140], air: 'dust',
  },
  15: { // Antre de la Matriarche
    sky: ['#1e0a16', '#5a1630', '#a8404a'], sun: [600, 160, 62], glow: '255,120,120',
    far: '#4e2232', mid: '#26101a', midLight: '#3c1a28', fog: '170,70,80',
    ground: ['#5a2c2c', '#3e1c1c', '#1c0c0c'], road: false, organic: true,
    features: ['pod', 'spire', 'spire', 'pod', 'pod'], farH: [100, 220], midH: [90, 200], air: 'spores',
  },
  16: { // Gare de triage
    sky: ['#4e3a30', '#a06a48', '#e8b880'], sun: [1060, 190, 44], glow: '255,210,150',
    far: '#8a6852', mid: '#463228', midLight: '#5e463a', fog: '230,180,130',
    ground: ['#7a6048', '#584432', '#2c2218'], road: false,
    features: ['containers', 'crane', 'pylon', 'containers', 'tank', 'chimney'], farH: [80, 180], midH: [70, 150], air: 'ash',
  },
  17: { // Désert de verre
    sky: ['#6a8aa0', '#d0b88a', '#f4e0b0'], sun: [700, 120, 56], glow: '255,250,220',
    far: '#c8a878', mid: '#8a6a48', midLight: '#a8885e', fog: '250,226,180',
    ground: ['#d0aa72', '#aa8656', '#5e4630'], road: false,
    features: ['mesa', 'deadTree', 'mesa', 'billboard', 'mesa'], farH: [40, 110], midH: [50, 110], air: 'dust',
  },
  18: { // Observatoire
    sky: ['#141a32', '#3a3a5e', '#9a6a7a'], sun: [980, 120, 30], glow: '220,220,255',
    far: '#3e4060', mid: '#22243a', midLight: '#34385a', fog: '120,120,170',
    ground: ['#4a4450', '#34303a', '#18161c'], road: true,
    features: ['dome', 'dish', 'pylon', 'dome', 'dish'], farH: [80, 180], midH: [70, 150], air: 'ash',
  },
  19: { // Cratère
    sky: ['#2a2420', '#6a5040', '#c8945a'], sun: [640, 220, 70], glow: '255,190,120',
    far: '#5e4a3c', mid: '#30261e', midLight: '#46382c', fog: '200,150,100',
    ground: ['#5a4838', '#3e3226', '#1c1610'], road: false,
    features: ['ruinGlow', 'mesa', 'ruinGlow', 'chimney', 'deadTree'], farH: [40, 120], midH: [60, 140], air: 'embers',
  },
  20: { // Cœur du Fléau
    sky: ['#0e0612', '#3e0e2a', '#8a2238'], sun: [640, 150, 80], glow: '255,80,110',
    far: '#3a1428', mid: '#1c0812', midLight: '#30101e', fog: '150,40,70',
    ground: ['#4a1c24', '#321218', '#16080a'], road: false, organic: true,
    features: ['spire', 'pod', 'spire', 'spire', 'pod', 'skyscraper'], farH: [120, 260], midH: [110, 240], air: 'spores',
  },
});

// ---------- Chapitre 3 : la Reconquête ----------
Object.assign(THEMES, {
  21: { // Route du Nord (neige)
    sky: ['#56636e', '#97a4ae', '#d6dade'], sun: [900, 150, 40], glow: '240,245,255',
    far: '#8a96a0', mid: '#4e5860', midLight: '#6c7680', fog: '220,228,235',
    ground: ['#cfd3d6', '#a2a8ae', '#545a62'], road: true,
    features: ['house', 'pylon', 'deadTree', 'house', 'waterTower'], farH: [70, 170], midH: [70, 150], air: 'snow',
  },
  22: { // Forêt pétrifiée
    sky: ['#3e4a40', '#7a8670', '#c4c6a4'], sun: [760, 170, 44], glow: '230,240,200',
    far: '#6a7462', mid: '#363e32', midLight: '#4a5444', fog: '180,190,160',
    ground: ['#6a6a52', '#4c4c3a', '#24241a'], road: false,
    features: ['deadTree', 'deadTree', 'pod', 'deadTree', 'shack'], farH: [60, 140], midH: [60, 130], air: 'spores',
  },
  23: { // Port gelé (neige)
    sky: ['#4a5868', '#8a9aa8', '#cfd6dc'], sun: [1050, 160, 38], glow: '235,242,255',
    far: '#7e8c98', mid: '#44505a', midLight: '#5e6a76', fog: '215,225,235',
    ground: ['#c4cad0', '#969ea6', '#4c525a'], road: false,
    features: ['crane', 'containers', 'ship', 'crane', 'containers'], farH: [60, 140], midH: [70, 140], air: 'snow',
  },
  24: { // Usine d'armement
    sky: ['#3a2a22', '#7a4a32', '#c8865a'], sun: [700, 200, 46], glow: '255,190,130',
    far: '#6a4a3a', mid: '#34261e', midLight: '#4a382c', fog: '200,140,100',
    ground: ['#6a5442', '#4a3a2e', '#221a14'], road: true,
    features: ['chimney', 'hangar', 'tank', 'chimney', 'hangar'], farH: [90, 190], midH: [80, 160], air: 'ash',
  },
  25: { // Les Arènes
    sky: ['#4a2c3a', '#a0566a', '#f0a888'], sun: [640, 210, 64], glow: '255,190,160',
    far: '#8a5a68', mid: '#44283a', midLight: '#5e3a4e', fog: '230,150,140',
    ground: ['#8a6a52', '#644a3a', '#30221c'], road: false,
    features: ['dome', 'skyscraper', 'billboard', 'dome', 'pylon'], farH: [120, 240], midH: [90, 190], air: 'dust',
  },
  26: { // Tunnel effondré
    sky: ['#1e1a18', '#3e342c', '#6e5a46'], sun: [640, 120, 18], glow: '200,170,120',
    far: '#3e342c', mid: '#221c18', midLight: '#342a24', fog: '120,100,80',
    ground: ['#4e4234', '#362e24', '#181410'], road: true,
    features: ['overpass', 'wall', 'overpass', 'pylon'], farH: [160, 260], midH: [120, 220], air: 'dust',
  },
  27: { // Ville fantôme
    sky: ['#0c1424', '#22304a', '#4a5a74'], sun: [1000, 110, 28], glow: '200,215,255',
    far: '#26324a', mid: '#141c2c', midLight: '#22304a', fog: '90,110,150',
    ground: ['#3a3a44', '#2a2a32', '#121216'], road: true,
    features: ['skyscraper', 'skyscraper', 'billboard', 'skyscraper', 'watchTower'], farH: [160, 320], midH: [150, 300], air: 'ash',
  },
  28: { // Raffinerie en feu
    sky: ['#1a0a06', '#6a200e', '#e0602a'], sun: [800, 240, 70], glow: '255,140,60',
    far: '#5a2614', mid: '#2a120a', midLight: '#401c10', fog: '230,110,50',
    ground: ['#5a3a28', '#3e281a', '#1c120c'], road: false,
    features: ['flare', 'tank', 'flare', 'chimney', 'flare', 'tank'], farH: [80, 170], midH: [80, 160], air: 'embers',
  },
  29: { // Mur du Nid
    sky: ['#24101a', '#5a2232', '#a04a4a'], sun: [960, 160, 50], glow: '255,140,130',
    far: '#4a2430', mid: '#24121a', midLight: '#381c26', fog: '170,80,90',
    ground: ['#5a3634', '#3e2424', '#1c1010'], road: false, organic: true,
    features: ['wall', 'spire', 'watchTower', 'wall', 'spire'], farH: [120, 240], midH: [90, 190], air: 'spores',
  },
  30: { // Le Grand Nid
    sky: ['#0a0408', '#300a1e', '#781c34'], sun: [640, 140, 90], glow: '255,70,100',
    far: '#30101e', mid: '#16060e', midLight: '#280c18', fog: '140,30,60',
    ground: ['#401820', '#2a1016', '#120608'], road: false, organic: true,
    features: ['spire', 'pod', 'spire', 'pod', 'spire', 'pod'], farH: [140, 280], midH: [120, 260], air: 'spores',
  },
});

// Survie : nuit, lune rouge, ruines en feu
THEMES[99] = {
  sky: ['#06060f', '#1c1226', '#4a1e22'], sun: [960, 110, 26], glow: '255,110,90',
  far: '#1e1826', mid: '#141018', midLight: '#241c28', fog: '110,40,40',
  ground: ['#2a1c1a', '#1a1210', '#0a0606'], road: true,
  features: ['skyscraper', 'flare', 'ruinGlow', 'pylon', 'skyscraper', 'flare'], farH: [120, 260], midH: [100, 220], air: 'embers',
};

export function themeFor(levelId) { return THEMES[levelId] || THEMES[1]; }

const OUT = 'rgba(20,12,8,0.55)';

// ---------- Outils de dessin ----------
function poly(c, pts, fill) {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  c.fill();
}
function line(c, x1, y1, x2, y2, w, color) {
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
// Disque flou d'une couleur (nuages, fumée), mis en cache
const softCache = new Map();
function softDisc(rgb) {
  let t = softCache.get(rgb);
  if (!t) {
    t = makeCanvas(64, 64);
    const c = t.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.55, `rgba(${rgb},0.55)`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    softCache.set(rgb, t);
  }
  return t;
}
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
// mélange de deux couleurs « r,g,b » (k = part de la seconde)
const mix = (a, b, k) => { const A = a.split(',').map(Number), B = b.split(',').map(Number); return A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(','); };

function makeCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
  return cv;
}

// Immeuble en ruine : sommet déchiqueté, fenêtres, fers à béton, arête éclairée
function ruinBlock(c, r, x, base, w, h, col, light, holes, detail) {
  const top = base - h;
  const a = r() * 0.5, b = r() * 0.6, d = r() * 0.4;
  const pts = [x, base, x, top + a * 40, x + w * 0.22, top + 6 + b * 20, x + w * 0.38, top - b * 10,
    x + w * 0.55, top + d * 50, x + w * 0.7, top + 10, x + w * 0.86, top + a * 30, x + w, top + b * 25, x + w, base];
  poly(c, pts, col);
  // arête éclairée côté soleil
  c.save();
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath(); c.clip();
  c.fillStyle = light; c.fillRect(x + w - w * 0.18, top - 30, w * 0.18, h + 30);
  if (detail) {
    // fenêtres
    const fw = Math.max(6, w / 9), fh = fw * 1.4;
    for (let wy = top + 22; wy < base - 16; wy += fh + 9) {
      for (let wx = x + 7; wx < x + w - fw - 5; wx += fw + 7) {
        const k = r();
        if (k < 0.18) continue;
        c.fillStyle = k < 0.3 ? 'rgba(255,200,120,0.08)' : holes;
        c.fillRect(wx, wy, fw, fh);
      }
    }
    // étages
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let wy = top + 14; wy < base; wy += fh + 9) c.fillRect(x, wy, w, 2);
    // trou béant
    if (r() < 0.5) poly(c, [x + w * 0.3, top + h * 0.35, x + w * 0.55, top + h * 0.3, x + w * 0.6, top + h * 0.5, x + w * 0.35, top + h * 0.55], holes);
  }
  c.restore();
  if (detail) {
    // fers à béton qui dépassent
    for (let i = 0; i < 4; i++) {
      const rx = x + w * (0.3 + r() * 0.5);
      line(c, rx, top + 12, rx + (r() - 0.5) * 10, top - 8 - r() * 16, 1.2, col);
    }
  }
}

// ---------- Éléments du plan moyen ----------
const FEATURES = {
  house(c, r, x, base, t) {
    const w = 90 + r() * 40, h = 50 + r() * 20;
    c.fillStyle = t.mid; c.fillRect(x, base - h, w, h);
    c.fillStyle = t.midLight; c.fillRect(x + w - 14, base - h, 14, h);
    // toit cassé
    poly(c, [x - 8, base - h, x + w * 0.45, base - h - 38, x + w * 0.6, base - h - 22, x + w * 0.7, base - h - 30, x + w + 8, base - h], t.mid);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x + 12, base - h + 14, 16, 18); c.fillRect(x + w - 40, base - h + 14, 16, 18);
    c.fillRect(x + w / 2 - 8, base - 28, 16, 28);
    line(c, x + 12, base - h + 18, x + 28, base - h + 28, 2, t.midLight); // planches
    c.fillStyle = t.mid; c.fillRect(x + w * 0.2, base - h - 34, 10, 22);  // cheminée
    return w + 30;
  },
  pylon(c, r, x, base, t) {
    const h = 150 + r() * 50;
    const col = t.mid;
    line(c, x - 16, base, x - 3, base - h, 3, col);
    line(c, x + 16, base, x + 3, base - h, 3, col);
    for (let y = base - 20; y > base - h + 10; y -= 26) {
      const k = (base - y) / h;
      const hw = 16 - 13 * k;
      line(c, x - hw, y, x + hw - 2, y - 24, 1.5, col);
      line(c, x + hw, y, x - hw + 2, y - 24, 1.5, col);
    }
    line(c, x - 30, base - h + 14, x + 30, base - h + 8, 3, col);
    line(c, x - 22, base - h + 34, x + 24, base - h + 30, 2.5, col);
    // câbles qui pendent
    c.strokeStyle = col; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x + 30, base - h + 8); c.quadraticCurveTo(x + 90, base - h + 60, x + 150, base - h + 20); c.stroke();
    c.beginPath(); c.moveTo(x - 30, base - h + 14); c.quadraticCurveTo(x - 50, base - h + 90, x - 44, base - h + 120); c.stroke();
    return 90;
  },
  deadTree(c, r, x, base, t) {
    const branch = (x1, y1, a, len, w, depth) => {
      const x2 = x1 + Math.cos(a) * len, y2 = y1 + Math.sin(a) * len;
      line(c, x1, y1, x2, y2, w, t.mid);
      if (depth <= 0) return;
      branch(x2, y2, a - 0.4 - r() * 0.4, len * 0.7, w * 0.65, depth - 1);
      if (r() < 0.8) branch(x2, y2, a + 0.3 + r() * 0.4, len * 0.65, w * 0.6, depth - 1);
    };
    branch(x, base, -Math.PI / 2 + (r() - 0.5) * 0.3, 45 + r() * 25, 7, 4);
    return 70;
  },
  billboard(c, r, x, base, t) {
    const h = 110 + r() * 30;
    line(c, x + 20, base, x + 20, base - h, 5, t.mid);
    line(c, x + 80, base, x + 80, base - h, 5, t.mid);
    poly(c, [x, base - h - 50, x + 100, base - h - 56, x + 104, base - h + 4, x - 2, base - h], t.midLight);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    poly(c, [x + 40, base - h - 50, x + 70, base - h - 54, x + 60, base - h - 10], 'rgba(0,0,0,0.3)');
    c.fillRect(x + 8, base - h - 40, 30, 6); c.fillRect(x + 8, base - h - 28, 50, 6);
    return 130;
  },
  waterTower(c, r, x, base, t) {
    const h = 130;
    for (const lx of [-22, -8, 8, 22]) line(c, x + lx, base, x + lx * 0.6, base - h, 3, t.mid);
    c.fillStyle = t.mid;
    c.beginPath(); c.ellipse(x, base - h - 16, 34, 26, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = t.midLight; c.fillRect(x + 14, base - h - 34, 8, 30);
    poly(c, [x - 34, base - h - 30, x, base - h - 56, x + 34, base - h - 30], t.mid);
    return 110;
  },
  overpass(c, r, x, base, t) {
    const len = 380, y = base - 120 - r() * 20;
    // piliers
    for (const px of [40, 170, 300]) {
      c.fillStyle = t.mid; c.fillRect(x + px, y, 22, base - y);
      c.fillStyle = t.midLight; c.fillRect(x + px + 16, y, 6, base - y);
    }
    // tablier cassé au milieu
    poly(c, [x, y - 14, x + 210, y - 18, x + 230, y + 30, x + 200, y + 8, x, y + 8], t.mid);
    poly(c, [x + 250, y + 40, x + 270, y - 16, x + len, y - 14, x + len, y + 8, x + 280, y + 12], t.mid);
    c.fillStyle = t.midLight; c.fillRect(x, y - 18, 205, 4); c.fillRect(x + 272, y - 18, len - 272, 4);
    for (let i = 0; i < 6; i++) line(c, x + 200 + i * 4, y + 8, x + 204 + i * 5, y + 30 + r() * 20, 1, t.mid);
    // garde-corps
    for (let gx = x + 6; gx < x + 200; gx += 14) line(c, gx, y - 18, gx, y - 28, 1.5, t.mid);
    line(c, x, y - 28, x + 200, y - 28, 1.5, t.mid);
    return len + 40;
  },
  coolingTower(c, r, x, base, t) {
    const h = 170 + r() * 30, w = 120;
    c.fillStyle = t.mid;
    c.beginPath();
    c.moveTo(x, base);
    c.quadraticCurveTo(x + w * 0.25, base - h * 0.6, x + w * 0.12, base - h);
    c.lineTo(x + w * 0.88, base - h);
    c.quadraticCurveTo(x + w * 0.75, base - h * 0.6, x + w, base);
    c.closePath(); c.fill();
    c.fillStyle = t.midLight;
    c.beginPath();
    c.moveTo(x + w * 0.82, base);
    c.quadraticCurveTo(x + w * 0.7, base - h * 0.6, x + w * 0.8, base - h);
    c.lineTo(x + w * 0.88, base - h);
    c.quadraticCurveTo(x + w * 0.75, base - h * 0.6, x + w, base);
    c.closePath(); c.fill();
    poly(c, [x + 40, base - h, x + 60, base - h + 30, x + 75, base - h], 'rgba(0,0,0,0.3)');   // brèche
    // panache figé
    c.fillStyle = 'rgba(230,220,210,0.18)';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + w / 2 + i * 18, base - h - 20 - i * 16, 22 + i * 6, 0, Math.PI * 2); c.fill(); }
    return w + 40;
  },
  chimney(c, r, x, base, t) {
    const h = 200 + r() * 40;
    poly(c, [x, base, x + 6, base - h, x + 22, base - h, x + 28, base], t.mid);
    c.fillStyle = t.midLight; c.fillRect(x + 18, base - h, 5, h);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = base - h + 14; y < base - 20; y += 40) c.fillRect(x + 4, y, 22, 5);
    return 60;
  },
  tank(c, r, x, base, t) {
    const w = 90 + r() * 30, h = 60 + r() * 30;
    c.fillStyle = t.mid; c.fillRect(x, base - h, w, h);
    c.beginPath(); c.ellipse(x + w / 2, base - h, w / 2, 10, 0, Math.PI, 0); c.fill();
    c.fillStyle = t.midLight; c.fillRect(x + w - 16, base - h, 16, h);
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x, base - h * 0.6, w, 3); c.fillRect(x, base - h * 0.3, w, 3);
    line(c, x - 30, base - 30, x, base - 30, 4, t.mid);   // tuyau
    line(c, x + w, base - 20, x + w + 30, base - 20, 4, t.mid);
    return w + 40;
  },
  flare(c, r, x, base, t) {
    const h = 180 + r() * 30;
    line(c, x, base, x, base - h, 6, t.mid);
    for (let y = base - 30; y > base - h; y -= 30) line(c, x - 8, y, x + 8, y - 10, 1.5, t.mid);
    // flamme figée (lueur)
    const g = c.createRadialGradient(x, base - h - 16, 2, x, base - h - 16, 40);
    g.addColorStop(0, 'rgba(255,230,150,0.9)'); g.addColorStop(0.3, 'rgba(255,140,60,0.5)'); g.addColorStop(1, 'rgba(255,100,40,0)');
    c.fillStyle = g; c.fillRect(x - 40, base - h - 56, 80, 80);
    poly(c, [x - 6, base - h, x, base - h - 30, x + 6, base - h], '#ffd27a');
    return 70;
  },
  crane(c, r, x, base, t) {
    const h = 220;
    line(c, x, base, x + 10, base - h, 6, t.mid);
    line(c, x + 50, base, x + 40, base - h, 6, t.mid);
    for (let y = base - 20; y > base - h; y -= 30) { line(c, x + 2, y, x + 46, y - 28, 1.5, t.mid); line(c, x + 46, y, x + 2, y - 28, 1.5, t.mid); }
    // flèche
    line(c, x - 60, base - h, x + 200, base - h - 30, 7, t.mid);
    line(c, x + 25, base - h - 50, x + 200, base - h - 30, 2, t.mid);
    line(c, x + 25, base - h - 50, x - 60, base - h, 2, t.mid);
    line(c, x + 160, base - h - 26, x + 160, base - h + 80, 1.2, t.mid);
    c.fillStyle = t.mid; c.fillRect(x + 150, base - h + 80, 20, 12);
    return 230;
  },
  containers(c, r, x, base, t) {
    const cols = ['#7a3a2a', '#3a4a5a', '#6a5a2a', '#4a3a3a'];
    let w = 0;
    for (let i = 0; i < 3; i++) {
      const stack = 1 + Math.floor(r() * 3);
      for (let j = 0; j < stack; j++) {
        const y = base - 30 * (j + 1);
        c.fillStyle = cols[Math.floor(r() * cols.length)];
        c.globalAlpha = 0.55; c.fillRect(x + i * 64 + (j % 2) * 6, y, 62, 30);
        c.globalAlpha = 1;
        c.fillStyle = t.mid; c.globalAlpha = 0.5; c.fillRect(x + i * 64 + (j % 2) * 6, y, 62, 30); c.globalAlpha = 1;
        c.fillStyle = 'rgba(0,0,0,0.2)';
        for (let k = 0; k < 6; k++) c.fillRect(x + i * 64 + (j % 2) * 6 + 4 + k * 10, y + 3, 2, 24);
      }
      w += 64;
    }
    return w + 30;
  },
  ship(c, r, x, base, t) {
    poly(c, [x, base - 20, x + 30, base + 6, x + 260, base + 6, x + 300, base - 60, x + 280, base - 70, x + 10, base - 50], t.mid);
    c.fillStyle = t.midLight; poly(c, [x + 10, base - 50, x + 280, base - 70, x + 282, base - 62, x + 12, base - 44], t.midLight);
    c.fillStyle = t.mid; c.fillRect(x + 180, base - 130, 60, 66); c.fillRect(x + 200, base - 170, 14, 40);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 4; i++) c.fillRect(x + 186 + i * 13, base - 120, 8, 8);
    for (let i = 0; i < 8; i++) c.fillRect(x + 30 + i * 28, base - 34, 6, 6);
    return 330;
  },
  skyscraper(c, r, x, base, t) {
    const w = 80 + r() * 50, h = 220 + r() * 90;
    ruinBlock(c, r, x, base, w, h, t.mid, t.midLight, 'rgba(0,0,0,0.3)', true);
    return w + 20;
  },
  ruinGlow(c, r, x, base, t) {
    const w = 90 + r() * 40, h = 120 + r() * 60;
    ruinBlock(c, r, x, base, w, h, t.mid, t.midLight, 'rgba(0,0,0,0.3)', true);
    // lueur radioactive au pied
    const g = c.createRadialGradient(x + w / 2, base, 4, x + w / 2, base, 90);
    g.addColorStop(0, 'rgba(170,255,90,0.35)'); g.addColorStop(1, 'rgba(170,255,90,0)');
    c.fillStyle = g; c.fillRect(x - 40, base - 90, w + 80, 100);
    return w + 30;
  },
  shack(c, r, x, base, t) {
    for (const lx of [6, 40, 74]) line(c, x + lx, base, x + lx, base - 40, 3, t.mid);
    c.fillStyle = t.mid; c.fillRect(x - 4, base - 84, 90, 46);
    poly(c, [x - 12, base - 84, x + 40, base - 110, x + 96, base - 86], t.mid);
    c.fillStyle = t.midLight; c.fillRect(x + 70, base - 84, 16, 46);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 14, base - 72, 16, 14);
    return 120;
  },
  wall(c, r, x, base, t) {
    const w = 240, h = 70;
    c.fillStyle = t.mid; c.fillRect(x, base - h, w, h);
    c.fillStyle = t.midLight; c.fillRect(x, base - h, w, 5);
    for (let i = 0; i < w; i += 30) {
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + i, base - h, 2, h);
      poly(c, [x + i + 6, base - h, x + i + 12, base - h - 18, x + i + 18, base - h], t.mid);
    }
    return w + 20;
  },
  watchTower(c, r, x, base, t) {
    const h = 150;
    line(c, x - 18, base, x - 10, base - h, 4, t.mid); line(c, x + 18, base, x + 10, base - h, 4, t.mid);
    line(c, x - 16, base - 40, x + 14, base - 80, 2, t.mid); line(c, x + 16, base - 40, x - 14, base - 80, 2, t.mid);
    c.fillStyle = t.mid; c.fillRect(x - 26, base - h - 30, 52, 30);
    poly(c, [x - 34, base - h - 30, x, base - h - 52, x + 34, base - h - 30], t.mid);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x - 18, base - h - 24, 36, 10);
    return 80;
  },
  dam(c, r, x, base, t) {
    const w = 420, h = 170;
    poly(c, [x, base, x + 30, base - h, x + w - 30, base - h, x + w, base], t.mid);
    c.fillStyle = t.midLight; c.fillRect(x + 30, base - h, w - 60, 6);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 1; i < 7; i++) c.fillRect(x + 30 + i * (w - 60) / 7, base - h, 3, h);
    // fissure et filet d'eau
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 200, base - h); c.lineTo(x + 215, base - h + 40); c.lineTo(x + 205, base - h + 80); c.lineTo(x + 222, base - 40); c.stroke();
    c.fillStyle = 'rgba(160,190,210,0.35)'; c.fillRect(x + 206, base - h + 40, 10, h - 40);
    return w + 30;
  },
  pod(c, r, x, base, t) {
    // cocon de chair translucide
    const h = 60 + r() * 50, w = 34 + r() * 16;
    c.fillStyle = t.mid;
    c.beginPath(); c.ellipse(x + w / 2, base - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(200,90,110,0.25)';
    c.beginPath(); c.ellipse(x + w / 2 + 4, base - h / 2, w / 3, h / 3, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = t.midLight; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + w / 2, base - h); c.quadraticCurveTo(x + w, base - h * 0.5, x + w / 2, base); c.stroke();
    line(c, x + w / 2, base - h, x + w / 2 - 10, base - h - 26, 3, t.mid);   // filament
    return w + 30 + r() * 30;
  },
  hangar(c, r, x, base, t) {
    const w = 220, h = 90;
    c.fillStyle = t.mid;
    c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - h * 0.5); c.quadraticCurveTo(x + w / 2, base - h * 1.5, x + w, base - h * 0.5); c.lineTo(x + w, base); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x + 50, base - h * 0.6, w - 100, h * 0.6);   // porte béante
    c.strokeStyle = t.midLight; c.lineWidth = 2;
    for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x + i * w / 6, base - h * 0.9 + Math.abs(i - 3) * 12); c.lineTo(x + i * w / 6, base - h * 0.6); c.stroke(); }
    return w + 40;
  },
  dish(c, r, x, base, t) {
    const h = 110;
    line(c, x - 14, base, x, base - h, 4, t.mid); line(c, x + 14, base, x, base - h, 4, t.mid);
    c.save(); c.translate(x, base - h - 10); c.rotate(-0.5);
    c.fillStyle = t.mid; c.beginPath(); c.ellipse(0, 0, 52, 18, 0, Math.PI, 0); c.fill();
    c.fillStyle = t.midLight; c.beginPath(); c.ellipse(0, -2, 46, 8, 0, Math.PI, 0); c.fill();
    line(c, 0, 0, 0, -36, 2, t.mid);
    c.restore();
    return 110;
  },
  dome(c, r, x, base, t) {
    const w = 140, h = 110;
    c.fillStyle = t.mid; c.fillRect(x, base - 50, w, 50);
    c.beginPath(); c.ellipse(x + w / 2, base - 50, w / 2, h - 50, 0, Math.PI, 0); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.4)';
    poly(c, [x + w / 2 - 8, base - h, x + w / 2 + 8, base - h, x + w / 2 + 14, base - 56, x + w / 2 - 14, base - 56], 'rgba(0,0,0,0.4)');   // fente ouverte
    c.fillStyle = t.midLight; c.fillRect(x + w - 14, base - 50, 14, 50);
    return w + 40;
  },
  mesa(c, r, x, base, t) {
    const w = 160 + r() * 120, h = 60 + r() * 60;
    poly(c, [x, base, x + w * 0.15, base - h, x + w * 0.8, base - h - 6, x + w, base], t.mid);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let k = 1; k < 4; k++) c.fillRect(x + w * 0.1, base - h * k / 4, w * 0.8, 2);
    // éclats de verre qui brillent
    for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(200,240,255,0.5)'; c.fillRect(x + r() * w, base - r() * h * 0.8, 3, 3); }
    return w + 30;
  },
  spire(c, r, x, base, t) {
    const h = 150 + r() * 80;
    c.fillStyle = t.mid;
    c.beginPath(); c.moveTo(x - 30, base);
    c.quadraticCurveTo(x - 10, base - h * 0.5, x + (r() - 0.5) * 30, base - h);
    c.quadraticCurveTo(x + 14, base - h * 0.5, x + 30, base);
    c.closePath(); c.fill();
    c.strokeStyle = t.midLight; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x + 18, base); c.quadraticCurveTo(x + 8, base - h * 0.5, x + 2, base - h * 0.9); c.stroke();
    // pustules qui luisent
    for (let i = 0; i < 4; i++) {
      c.fillStyle = 'rgba(160,230,80,0.35)';
      c.beginPath(); c.arc(x + (r() - 0.5) * 30, base - r() * h * 0.7, 3 + r() * 4, 0, Math.PI * 2); c.fill();
    }
    // os
    line(c, x - 20, base - h * 0.4, x - 46, base - h * 0.55, 3, '#9a8a7a');
    return 80;
  },
};

// ---------- Débris au sol (derrière les unités) ----------
function groundProp(c, r, type, x, y, t) {
  c.save();
  c.translate(x, y);
  const flip = r() < 0.5 ? -1 : 1;
  const s = 0.85 + r() * 0.35;
  c.scale(flip * s, s);
  c.lineJoin = 'round';
  c.strokeStyle = OUT; c.lineWidth = 1.5;
  const sh = () => { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 3, 50, 6, 0, 0, Math.PI * 2); c.fill(); };
  if (type === 'car') {
    sh();
    const body = ['#7a4a30', '#5a5a52', '#6a3a2a', '#4a5560'][Math.floor(r() * 4)];
    poly(c, [-48, -6, -50, -22, -34, -26, -22, -42, 18, -44, 32, -28, 50, -24, 50, -6], body); c.stroke();
    poly(c, [-18, -38, -2, -40, -2, -28, -26, -26], 'rgba(20,14,10,0.85)');
    poly(c, [2, -40, 16, -40, 26, -28, 2, -28], 'rgba(20,14,10,0.85)');
    c.fillStyle = 'rgba(140,70,30,0.6)'; c.fillRect(-40, -20, 18, 8); c.fillRect(20, -22, 12, 10);  // rouille
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(-46, -24, 92, 3);
    c.fillStyle = '#1a1410';
    c.beginPath(); c.arc(-30, -5, 9, 0, Math.PI * 2); c.fill();
    poly(c, [22, -2, 40, -2, 38, -10, 24, -10], '#1a1410');   // roue arrachée : jante posée
  } else if (type === 'barrier') {
    sh();
    poly(c, [-36, 0, -30, -14, -24, -30, 24, -30, 30, -14, 36, 0], '#8a8478'); c.stroke();
    c.fillStyle = '#b0402a'; c.fillRect(-22, -26, 12, 6); c.fillRect(2, -26, 12, 6);
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-30, -12, 60, 3);
  } else if (type === 'tires') {
    for (const [tx, ty] of [[-14, -8], [10, -8], [-2, -24]]) {
      c.fillStyle = '#1e1a18'; c.beginPath(); c.ellipse(tx, ty, 13, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#3a3330'; c.beginPath(); c.ellipse(tx, ty - 1, 6, 3, 0, 0, Math.PI * 2); c.fill();
    }
  } else if (type === 'barrel') {
    const toxic = t.air === 'spores';
    for (const bx of [-12, 10]) {
      c.fillStyle = toxic ? '#5a6a2a' : '#8a3a22';
      c.fillRect(bx - 9, -30, 18, 30); c.strokeRect(bx - 9, -30, 18, 30);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(bx - 9, -22, 18, 3); c.fillRect(bx - 9, -10, 18, 3);
      if (toxic) { c.fillStyle = '#c8e040'; c.beginPath(); c.arc(bx, -16, 4, 0, Math.PI * 2); c.fill(); }
    }
    c.fillStyle = toxic ? '#5a6a2a' : '#8a3a22';
    c.save(); c.translate(34, -8); c.rotate(1.5708); c.fillRect(-8, -9, 16, 22); c.strokeRect(-8, -9, 16, 22); c.restore();
  } else if (type === 'rubble') {
    poly(c, [-40, 2, -30, -14, -16, -10, -6, -26, 10, -18, 22, -24, 40, 2], '#6a5444'); c.stroke();
    c.fillStyle = '#8a7260'; c.fillRect(-14, -16, 16, 8); c.fillRect(10, -14, 12, 6);
    line(c, -4, -20, 2, -42, 1.5, '#4a3a2e'); line(c, 6, -18, 16, -36, 1.5, '#4a3a2e');
  } else if (type === 'sign') {
    line(c, 0, 0, 2, -60, 3, '#4a4440');
    c.save(); c.translate(2, -66); c.rotate(0.15);
    poly(c, [0, -14, 14, 0, 0, 14, -14, 0], '#c09a2a'); c.stroke();
    c.fillStyle = '#2a2018'; c.fillRect(-2, -7, 4, 9); c.fillRect(-2, 4, 4, 3);
    c.restore();
  } else if (type === 'bones') {
    c.fillStyle = '#d8cfae';
    c.beginPath(); c.ellipse(0, -8, 10, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#2a1a14'; c.fillRect(-5, -10, 3, 3); c.fillRect(2, -10, 3, 3);
    line(c, 12, -2, 34, -6, 3, '#d8cfae'); line(c, -12, -2, -30, 2, 3, '#d8cfae');
  }
  c.restore();
}

// ---------- Décor complet d'un niveau ----------
export class Backdrop {
  constructor(levelId) {
    this.theme = themeFor(levelId);
    this.levelId = levelId;
    this.res = 0;
    this.layers = null;
    const W = CONFIG.world.width;
    // Débris du premier plan (couche la plus rapide, dessinée par-dessus le sol)
    const r = rng(levelId * 97 + 3);
    this.fore = [];
    for (let x = 200; x < W * 1.25 + 1280; x += 380 + r() * 520) {
      this.fore.push({ x, type: Math.floor(r() * 3), s: 0.8 + r() * 0.5 });
    }
    // Particules d'ambiance (calculées à partir du temps, sans état)
    this.air = Array.from({ length: 34 }, (_, i) => ({ a: rng(i + 1)(), b: rng(i + 40)(), c: rng(i + 80)() }));
    // Colonnes de fumée qui montent des ruines (plan moyen) et corbeaux dans le ciel
    const r2 = rng(levelId * 53 + 11);
    this.plumes = Array.from({ length: 4 }, (_, i) => ({ x: 200 + i * 520 + r2() * 300, h: 120 + r2() * 90, ph: r2() }));
    this.birds = Array.from({ length: 5 }, (_, i) => ({ s: r2(), y: 90 + r2() * 150, sp: 18 + r2() * 16, ph: r2() * 6 }));
    this.lowFx = false;
  }

  // (Re)dessine les couches en mémoire à la résolution voulue
  ensure(res) {
    res = Math.max(0.5, Math.min(1.6, Math.round(res * 4) / 4));
    if (res === this.res && this.layers) return;
    this.res = res;
    const W = CONFIG.world.width, V = CONFIG.display.width;
    const hz = CONFIG.world.horizonY;
    this.layers = {
      horizon: this._layer(0.05, W * 0.05 + V + 8, 250, hz + 8, (c, w) => this._drawHorizon(c, w)),
      far: this._layer(0.12, W * 0.12 + V + 8, 170, hz + 8, (c, w) => this._drawFar(c, w)),
      mid: this._layer(0.35, W * 0.35 + V + 8, 140, hz + 14, (c, w) => this._drawMid(c, w)),
      ground: this._layer(1, W, hz - 70, CONFIG.display.height, (c, w) => this._drawGround(c, w)),
    };
  }

  // Montagnes / collines très lointaines, presque fondues dans la brume
  _drawHorizon(c, w) {
    const t = this.theme, hz = CONFIG.world.horizonY;
    const r = rng(this.levelId * 17 + 3);
    const col = mix(hexRgb(t.sky[2]), hexRgb(t.far), 0.45);
    c.fillStyle = `rgb(${col})`;
    c.beginPath(); c.moveTo(0, hz + 8);
    let y = hz - 90 - r() * 60;
    for (let x = 0; x <= w + 40; x += 40) {
      y += (r() - 0.5) * 50; y = Math.max(hz - 200, Math.min(hz - 40, y));
      c.lineTo(x, y);
    }
    c.lineTo(w, hz + 8); c.closePath(); c.fill();
    // arêtes éclairées
    c.strokeStyle = `rgba(${t.glow},0.18)`; c.lineWidth = 2; c.stroke();
    this._fog(c, w, 250, hz + 8, 0.6);
  }

  // Nuages éclairés par le soleil (dessous plus sombre), sur une bande qui défile en boucle
  _makeClouds() {
    const t = this.theme, V = CONFIG.display.width;
    const cw = V * 2, ch = 300;
    const cv = makeCanvas(cw, ch);
    const c = cv.getContext('2d');
    const r = rng(this.levelId * 29 + 5);
    const lit = mix(hexRgb(t.sky[2]), t.glow, 0.5), dark = mix(hexRgb(t.sky[0]), hexRgb(t.sky[1]), 0.5);
    for (let i = 0; i < 9; i++) {
      const x0 = r() * cw, y0 = 40 + r() * 170, n = 5 + Math.floor(r() * 6), sc = 0.6 + r() * 0.8;
      for (let k = 0; k < n; k++) {
        const x = x0 + (k - n / 2) * 34 * sc + (r() - 0.5) * 20, y = y0 + (r() - 0.5) * 18 * sc;
        const rad = (30 + r() * 34) * sc;
        for (const dx of [0, -cw, cw]) {      // copie pour que la bande se raccorde
          c.globalAlpha = 0.32; c.drawImage(softDisc(dark), x + dx - rad, y - rad * 0.5, rad * 2, rad * 1.3);
          c.globalAlpha = 0.28; c.drawImage(softDisc(lit), x + dx - rad * 0.9, y - rad * 0.75, rad * 1.8, rad * 1.1);
        }
      }
    }
    return cv;
  }

  // Rayons de lumière partant du soleil
  _makeRays() {
    const t = this.theme, V = CONFIG.display.width, hz = CONFIG.world.horizonY;
    const cv = makeCanvas(V, hz + 40);
    const c = cv.getContext('2d');
    const [sx, sy] = t.sun;
    const r = rng(this.levelId * 41 + 9);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.2 + r() * 0.6), len = 760;
      // chaque rayon = 3 passes de largeur croissante, très transparentes (bords doux)
      for (const spread of [0.03, 0.06, 0.1]) {
        const g = c.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
        g.addColorStop(0, `rgba(${t.glow},0)`); g.addColorStop(0.12, `rgba(${t.glow},0.035)`); g.addColorStop(1, `rgba(${t.glow},0)`);
        c.fillStyle = g;
        c.beginPath(); c.moveTo(sx, sy);
        c.lineTo(sx + Math.cos(a - spread) * len, sy + Math.sin(a - spread) * len);
        c.lineTo(sx + Math.cos(a + spread) * len, sy + Math.sin(a + spread) * len);
        c.closePath(); c.fill();
      }
    }
    return cv;
  }

  _layer(factor, w, y0, y1, draw) {
    const h = y1 - y0;
    const cv = makeCanvas(w * this.res, h * this.res);
    const c = cv.getContext('2d');
    c.setTransform(this.res, 0, 0, this.res, 0, -y0 * this.res);
    draw(c, w);
    return { cv, factor, y0, h };
  }

  _fog(c, w, top, bottom, alpha) {
    const g = c.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, `rgba(${this.theme.fog},0)`);
    g.addColorStop(1, `rgba(${this.theme.fog},${alpha})`);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = g; c.fillRect(0, top, w, bottom - top);
    c.globalCompositeOperation = 'source-over';
  }

  _drawFar(c, w) {
    const t = this.theme, hz = CONFIG.world.horizonY;
    const r = rng(this.levelId * 13 + 1);
    let x = -40;
    while (x < w) {
      const bw = 50 + r() * 90;
      ruinBlock(c, r, x, hz + 8, bw, t.farH[0] + r() * (t.farH[1] - t.farH[0]), t.far, t.far, 'rgba(0,0,0,0.12)', r() < 0.5);
      x += bw * (0.6 + r() * 0.5);
    }
    this._fog(c, w, 200, hz + 8, 0.55);
  }

  _drawMid(c, w) {
    const t = this.theme, hz = CONFIG.world.horizonY;
    const r = rng(this.levelId * 31 + 7);
    const base = hz + 14;
    let x = -20, i = 0;
    while (x < w) {
      if (r() < 0.55) {
        const f = FEATURES[t.features[i % t.features.length]];
        i++;
        x += f(c, r, x, base, t) + r() * 40;
      } else {
        const bw = 70 + r() * 70;
        ruinBlock(c, r, x, base, bw, t.midH[0] + r() * (t.midH[1] - t.midH[0]), t.mid, t.midLight, 'rgba(0,0,0,0.3)', true);
        x += bw + 10 + r() * 50;
      }
    }
    this._fog(c, w, 300, base, 0.3);
  }

  _drawGround(c, w) {
    const t = this.theme;
    const { horizonY: hz, groundY: gy } = CONFIG.world;
    const H = CONFIG.display.height;
    const r = rng(this.levelId * 7 + 5);

    const g = c.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, t.ground[0]); g.addColorStop(0.35, t.ground[1]); g.addColorStop(1, t.ground[2]);
    c.fillStyle = g; c.fillRect(0, hz, w, H - hz);
    c.fillStyle = `rgba(${t.fog},0.35)`; c.fillRect(0, hz, w, 6);       // brume à l'horizon
    c.fillStyle = `rgba(${t.fog},0.12)`; c.fillRect(0, hz + 6, w, 10);

    // Chemin/route de combat
    const top = gy - 36, bot = gy + 34;
    c.fillStyle = t.road ? 'rgba(40,34,30,0.42)' : 'rgba(30,18,10,0.2)';
    c.beginPath(); c.moveTo(0, top);
    for (let x = 0; x <= w; x += 40) c.lineTo(x, top + Math.sin(x * 0.05) * 2 + (r() - 0.5) * 3);
    for (let x = w; x >= 0; x -= 40) c.lineTo(x, bot + Math.sin(x * 0.04) * 3 + (r() - 0.5) * 3);
    c.closePath(); c.fill();
    if (t.road) {
      c.fillStyle = 'rgba(220,200,150,0.22)';
      for (let x = 0; x < w; x += 90) if (r() < 0.75) c.fillRect(x, gy - 2, 44, 3);
    }
    // Fissures
    c.strokeStyle = 'rgba(20,12,6,0.35)'; c.lineWidth = 1.2;
    for (let i = 0; i < w / 60; i++) {
      let x = r() * w, y = top + r() * (bot - top);
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += 6 + r() * 14; y += (r() - 0.5) * 8; c.lineTo(x, y); }
      c.stroke();
    }
    // Sable qui recouvre la route
    c.fillStyle = `rgba(${t.fog},0.12)`;
    for (let i = 0; i < w / 120; i++) { c.beginPath(); c.ellipse(r() * w, top + r() * 60, 40 + r() * 60, 6 + r() * 6, 0, 0, Math.PI * 2); c.fill(); }
    // Flaques toxiques (marais)
    if (t.swamp || t.organic) {
      for (let i = 0; i < w / 260; i++) {
        c.fillStyle = t.organic ? 'rgba(120,20,40,0.35)' : 'rgba(120,160,40,0.35)';
        c.beginPath(); c.ellipse(r() * w, bot + 10 + r() * 60, 30 + r() * 40, 5 + r() * 4, 0, 0, Math.PI * 2); c.fill();
      }
    }
    // Cailloux et touffes d'herbe sèche
    for (let i = 0; i < w / 14; i++) {
      const x = r() * w, y = hz + 18 + r() * (H - hz - 20);
      if (y > top - 4 && y < bot + 4 && r() < 0.7) continue;
      if (r() < 0.6) {
        c.fillStyle = r() < 0.5 ? 'rgba(20,12,6,0.35)' : 'rgba(255,230,190,0.12)';
        c.fillRect(x, y, 2 + r() * 4, 2 + r() * 2);
      } else {
        c.strokeStyle = t.organic ? 'rgba(90,20,30,0.6)' : 'rgba(90,80,40,0.55)'; c.lineWidth = 1;
        c.beginPath();
        for (let k = 0; k < 4; k++) { c.moveTo(x + k * 2, y); c.lineTo(x + k * 2 + (r() - 0.5) * 6, y - 5 - r() * 6); }
        c.stroke();
      }
    }
    // Traces de pneus le long de la route
    if (t.road) {
      c.strokeStyle = 'rgba(20,12,6,0.18)'; c.lineWidth = 3; c.setLineDash([14, 10]);
      for (const dy of [-14, -4]) { c.beginPath(); c.moveTo(0, gy + dy); for (let x = 0; x <= w; x += 60) c.lineTo(x, gy + dy + Math.sin(x * 0.01) * 3); c.stroke(); }
      c.setLineDash([]);
    }
    // Flaques qui reflètent le ciel (sauf désert)
    if (t.air !== 'dust' || t.road) {
      const sky = hexRgb(t.sky[2]);
      for (let i = 0; i < w / 420; i++) {
        const px = r() * w, py = bot + 14 + r() * 50, pw = 20 + r() * 40;
        c.fillStyle = 'rgba(20,12,6,0.35)'; c.beginPath(); c.ellipse(px, py + 1, pw + 2, 4.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = `rgba(${sky},0.45)`; c.beginPath(); c.ellipse(px, py, pw, 3.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(px - pw * 0.5, py - 1, pw * 0.5, 1);
      }
    }
    // Cailloux avec reflet
    for (let i = 0; i < w / 40; i++) {
      const px = r() * w, py = hz + 24 + r() * (H - hz - 30), sz = 2 + r() * 4;
      if (py > top - 4 && py < bot + 4 && r() < 0.8) continue;
      c.fillStyle = 'rgba(20,12,6,0.45)'; c.beginPath(); c.ellipse(px, py, sz * 1.3, sz * 0.7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,235,200,0.18)'; c.beginPath(); c.ellipse(px - sz * 0.3, py - sz * 0.3, sz * 0.6, sz * 0.3, 0, 0, Math.PI * 2); c.fill();
    }
    // Débris au fond du couloir (hors des bases)
    const types = t.organic ? ['bones', 'rubble', 'car', 'bones', 'tires']
      : ['car', 'rubble', 'barrier', 'tires', 'barrel', 'car', 'sign', 'rubble'];
    let x = 330 + r() * 60;
    while (x < w - 330) {
      groundProp(c, r, types[Math.floor(r() * types.length)], x, gy - 36 + r() * 6, t);
      x += 150 + r() * 230;
    }
  }

  // ---------- Dessin à chaque image ----------
  drawSky(ctx, time) {
    const t = this.theme, V = CONFIG.display.width, hz = CONFIG.world.horizonY;
    this._time = time;
    if (!this._skyGrad || this._skyCtx !== ctx) {
      this._skyCtx = ctx;
      const g = ctx.createLinearGradient(0, 0, 0, hz);
      g.addColorStop(0, t.sky[0]); g.addColorStop(0.55, t.sky[1]); g.addColorStop(1, t.sky[2]);
      this._skyGrad = g;
      const [sx, sy, sr] = t.sun;
      const sg = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 4.5);
      sg.addColorStop(0, `rgba(${t.glow},0.95)`);
      sg.addColorStop(0.12, `rgba(${t.glow},0.75)`);
      sg.addColorStop(0.35, `rgba(${t.glow},0.25)`);
      sg.addColorStop(1, `rgba(${t.glow},0)`);
      this._sunGrad = sg;
    }
    ctx.fillStyle = this._skyGrad;
    ctx.fillRect(0, 0, V, hz + 2);
    const [sx, sy, sr] = t.sun;
    ctx.fillStyle = this._sunGrad;
    ctx.fillRect(sx - sr * 4.5, sy - sr * 4.5, sr * 9, sr * 9);
    // rayons de lumière (qualité haute)
    const lum = hexRgb(t.sky[1]).split(',').reduce((m, v) => m + Number(v), 0) / 3;
    if (!this.lowFx && lum > 90) {      // pas de rayons la nuit
      if (!this._rays) this._rays = this._makeRays();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.75 + Math.sin(time * 0.4) * 0.25;
      ctx.drawImage(this._rays, 0, 0);
      ctx.restore();
    }
    // nuages qui dérivent lentement (bande qui défile en boucle)
    if (!this._clouds) this._clouds = this._makeClouds();
    const cw = this._clouds.width, off = ((time * 6 + (this._camX || 0) * 0.04) % cw + cw) % cw;
    ctx.drawImage(this._clouds, -off, 0); ctx.drawImage(this._clouds, cw - off, 0);
    // corbeaux
    if (!this.lowFx) {
      ctx.strokeStyle = 'rgba(25,15,12,0.7)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (const b of this.birds) {
        const x = ((b.s * 2000 + time * b.sp) % (V + 300)) - 150, y = b.y + Math.sin(time * 0.5 + b.ph) * 12;
        const f = Math.sin(time * 7 + b.ph) * 4;
        ctx.beginPath(); ctx.moveTo(x - 7, y - f); ctx.quadraticCurveTo(x - 3, y - 2, x, y); ctx.quadraticCurveTo(x + 3, y - 2, x + 7, y - f); ctx.stroke();
      }
    }
  }

  // Colonnes de fumée qui montent des ruines (entre le plan moyen et le sol)
  _drawPlumes(ctx, camX, time) {
    const col = mix(hexRgb(this.theme.mid), '40,34,30', 0.5);
    const tex = softDisc(col), V = CONFIG.display.width, hz = CONFIG.world.horizonY;
    for (const p of this.plumes) {
      const sx = p.x - camX * 0.35;
      if (sx < -150 || sx > V + 150) continue;
      for (let i = 0; i < 7; i++) {
        const k = (time * 0.07 + p.ph + i / 7) % 1;
        const r = 12 + k * 46;
        ctx.globalAlpha = 0.42 * (1 - k) * Math.min(1, k * 6);
        ctx.drawImage(tex, sx + k * k * 70 - r, hz - 20 - k * p.h * 1.6 - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawLayers(ctx, camX) {
    const V = CONFIG.display.width;
    const res = this.res;
    this._camX = camX;
    for (const key of ['horizon', 'far', 'mid', 'ground']) {
      const L = this.layers[key];
      ctx.drawImage(L.cv, camX * L.factor * res, 0, V * res, L.h * res, 0, L.y0, V, L.h);
      if (key === 'mid' && !this.lowFx) this._drawPlumes(ctx, camX, this._time || 0);
    }
  }

  // Premier plan sombre, devant les unités (parallaxe rapide)
  drawForeground(ctx, camX) {
    const V = CONFIG.display.width, H = CONFIG.display.height;
    const off = camX * 1.25;
    ctx.fillStyle = '#1a110b';
    ctx.strokeStyle = '#1a110b';
    for (const f of this.fore) {
      const x = f.x - off;
      if (x < -120 || x > V + 120) continue;
      ctx.save();
      ctx.translate(x, H - 92);
      ctx.scale(f.s, f.s);
      if (f.type === 0) {        // tas de gravats
        ctx.beginPath(); ctx.moveTo(-70, 40); ctx.lineTo(-40, 10); ctx.lineTo(-20, 16); ctx.lineTo(0, -4); ctx.lineTo(24, 12); ctx.lineTo(60, 6); ctx.lineTo(80, 40); ctx.fill();
      } else if (f.type === 1) { // fers à béton tordus
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-10, 40); ctx.lineTo(-4, -14); ctx.lineTo(8, -24); ctx.moveTo(6, 40); ctx.lineTo(14, -6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-40, 40); ctx.lineTo(-30, 18); ctx.lineTo(30, 14); ctx.lineTo(40, 40); ctx.fill();
      } else {                   // herbes sèches
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k < 9; k++) { ctx.moveTo(-20 + k * 5, 40); ctx.quadraticCurveTo(-20 + k * 5, 10, -26 + k * 6 + (k % 3) * 4, -6 - (k % 4) * 6); }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Particules d'ambiance (poussière, cendres, spores, braises) en coordonnées écran
  drawAir(ctx, camX, time) {
    const V = CONFIG.display.width;
    const kind = this.theme.air;
    for (const p of this.air) {
      const speed = 8 + p.c * 20;
      let x, y, size, color;
      if (kind === 'ash') {
        x = ((p.a * V * 2 + time * speed - camX * 0.5) % (V + 40) + V + 40) % (V + 40) - 20;
        y = ((p.b * 600 + time * (14 + p.c * 10)) % 560) + 20;
        size = 2.5; color = 'rgba(210,200,190,0.45)';
      } else if (kind === 'spores') {
        x = ((p.a * V * 2 + Math.sin(time * 0.5 + p.b * 6) * 20 - camX * 0.5) % (V + 40) + V + 40) % (V + 40) - 20;
        y = 580 - ((p.b * 560 + time * (10 + p.c * 10)) % 560);
        size = 2 + p.c * 2; color = `rgba(170,240,90,${0.35 + 0.3 * Math.sin(time * 3 + p.a * 10)})`;
      } else if (kind === 'snow') {
        x = ((p.a * V * 2 + Math.sin(time * 0.8 + p.b * 6) * 24 + time * 12 - camX * 0.5) % (V + 40) + V + 40) % (V + 40) - 20;
        y = ((p.b * 600 + time * (30 + p.c * 25)) % 580) + 10;
        size = 2 + p.c * 2.5; color = 'rgba(255,255,255,0.75)';
      } else if (kind === 'embers') {
        x = ((p.a * V * 2 + Math.sin(time + p.b * 6) * 14 - camX * 0.5) % (V + 40) + V + 40) % (V + 40) - 20;
        y = 580 - ((p.b * 560 + time * (24 + p.c * 20)) % 560);
        size = 2; color = `rgba(255,${150 + Math.floor(p.c * 80)},60,0.7)`;
      } else {
        x = ((p.a * V * 2 + time * speed - camX * 0.6) % (V + 40) + V + 40) % (V + 40) - 20;
        y = 110 + p.b * 420 + Math.sin(time * 0.7 + p.c * 9) * 10;
        size = 2; color = 'rgba(255,235,200,0.35)';
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size);
    }
  }
}
