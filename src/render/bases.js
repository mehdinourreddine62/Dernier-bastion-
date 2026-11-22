// Dessin des deux bases. Origine = centre de la base au sol ; la « façade »
// (côté champ de bataille) est vers +x. Le nid ennemi est dessiné en miroir.
// ds = état de dégâts : 0 intacte, 1 (< 50 % PV) abîmée, 2 (< 25 % PV) en ruine.

const OUT = '#1b120b';

function poly(c, pts, fill, stroke = true) {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  c.fill();
  if (stroke) { c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); }
}
function rect(c, x, y, w, h, fill, stroke = true) {
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  if (stroke) { c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(x, y, w, h); }
}
function line(c, x1, y1, x2, y2, w, color) {
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
function ell(c, x, y, rx, ry, fill, stroke = true, rot = 0) {
  c.fillStyle = fill;
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fill();
  if (stroke) { c.strokeStyle = OUT; c.lineWidth = 1.8; c.stroke(); }
}

// Flamme animée (dessinée en mode « lumière »)
export function fire(c, x, y, s, time, seed = 0) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y - 10 * s, 2, x, y - 10 * s, 40 * s);
  g.addColorStop(0, 'rgba(255,170,60,0.45)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = g; c.fillRect(x - 40 * s, y - 50 * s, 80 * s, 80 * s);
  const layers = [['rgba(220,70,30,0.85)', 1], ['rgba(255,150,40,0.9)', 0.7], ['rgba(255,240,170,0.9)', 0.4]];
  for (const [col, k] of layers) {
    const fl = Math.sin(time * 13 + seed) * 0.15 + Math.sin(time * 7.3 + seed * 2) * 0.1;
    const h = 30 * s * k * (1 + fl), w = 10 * s * k;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - w, y);
    c.quadraticCurveTo(x - w * 1.1, y - h * 0.5, x + Math.sin(time * 9 + seed) * 4 * s, y - h);
    c.quadraticCurveTo(x + w * 1.1, y - h * 0.5, x + w, y);
    c.closePath(); c.fill();
  }
  c.restore();
}

// ---------- Fort des Survivants ----------
export function drawFort(c, time, b) {
  const ds = b.damageState;
  c.lineJoin = 'round';

  // Palissade de tôles au fond
  const sheets = [
    [-104, 118, '#7a5a3c'], [-80, 132, '#6a6a62'], [-56, 124, '#8a5030'], [-32, 112, '#5e6a70'],
    [-8, 128, '#7a5a3c'], [16, 106, '#6a6a62'], [40, 116, '#8a5030'],
  ];
  sheets.forEach(([x, h, col], i) => {
    if (ds === 2 && (i === 2 || i === 5)) return;              // tôles arrachées
    const tilt = (i % 3 - 1) * 3 + (ds >= 1 && i === 4 ? 10 : 0);
    poly(c, [x, 0, x + tilt, -h, x + 26 + tilt, -h + 4, x + 26, 0], col);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1.5;
    for (let k = 5; k < 26; k += 6) { c.beginPath(); c.moveTo(x + k, 0); c.lineTo(x + k + tilt, -h + 3); c.stroke(); }
    c.fillStyle = 'rgba(150,70,30,0.45)'; c.fillRect(x + 4, -h * 0.5, 10, 14);
  });
  const wt = b.wallTier || 0, tt = b.turretTier || 0;   // paliers d'atelier (0 à 3)
  // Murailles palier 1 : plaques d'acier rivetées sur la palissade
  if (wt >= 1) {
    for (const [x, y, w, h] of [[-100, -110, 24, 40], [-52, -104, 26, 46], [-4, -112, 24, 50], [38, -100, 24, 42]]) {
      rect(c, x, y, w, h, '#7d848a');
      c.fillStyle = '#c0c4c8';
      for (const [rx, ry] of [[3, 3], [w - 5, 3], [3, h - 5], [w - 5, h - 5]]) c.fillRect(x + rx, y + ry, 2, 2);
    }
  }
  if (wt >= 2) {
    // palier 2 : pointes d'acier au sommet au lieu des barbelés
    for (let x = -102; x < 64; x += 11) poly(c, [x, -122, x + 4, -140, x + 8, -122], '#9aa0a6');
  } else {
    // barbelés
    c.strokeStyle = '#2a2420'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-104, -128);
    for (let x = -100; x < 66; x += 8) c.lineTo(x, -128 + ((x / 8) % 2 ? -6 : 4));
    c.stroke();
  }

  // Tour de guet
  rect(c, -54, -158, 7, 158, '#4a3a2c'); rect(c, -20, -158, 7, 158, '#4a3a2c');
  line(c, -50, -30, -16, -80, 3, '#4a3a2c'); line(c, -16, -30, -50, -80, 3, '#4a3a2c');
  line(c, -50, -90, -16, -140, 3, '#4a3a2c'); line(c, -16, -90, -50, -140, 3, '#4a3a2c');
  rect(c, -64, -164, 62, 9, '#6b5440');
  // sacs de sable autour de la mitrailleuse
  for (let i = 0; i < 4; i++) ell(c, -56 + i * 14, -170, 8, 6, '#a8946a');
  if (ds < 2) {
    poly(c, [-68, -200, -2, -206, 2, -196, -64, -190], '#5a6066');   // toit de tôle
    line(c, -60, -190, -60, -172, 2.5, '#3a3028'); line(c, -8, -196, -8, -172, 2.5, '#3a3028');
  }

  // Mitrailleuse qui pivote vers sa cible
  c.save();
  c.translate(-14, -182);
  c.rotate(b.turretAngle);
  rect(c, -10, -6, 14, 12, '#3a3a3e');
  if (tt >= 2) {
    // palier 2 : double canon
    rect(c, 2, -6, 28, 4.5, '#2b2b2e'); rect(c, 2, 1.5, 28, 4.5, '#2b2b2e');
    rect(c, 28, -6.5, 6, 5.5, '#1a1a1c'); rect(c, 28, 1, 6, 5.5, '#1a1a1c');
  } else {
    rect(c, 2, -3, 26, 6, '#2b2b2e');
    rect(c, 26, -2.5, 6, 5, '#1a1a1c');
  }
  // palier 1 : bouclier blindé
  if (tt >= 1) { rect(c, 4, -13, 5, 26, '#5e6a70'); c.fillStyle = '#f2c230'; c.fillRect(4, -2, 5, 4); }
  if (b.turretFlash > 0) {
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(36, 0, 1, 36, 0, 26);
    g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(1, 'rgba(255,180,80,0)');
    c.fillStyle = g; c.fillRect(10, -26, 52, 52);
    poly(c, [32, 0, 42, -7, 52, 0, 42, 7], '#fff3b0', false);
  }
  c.restore();
  // servant de la mitrailleuse
  ell(c, -30, -186, 6, 6, '#d39a72');
  poly(c, [-36, -188, -34, -195, -24, -195, -22, -188], '#56708a');

  // Drapeau jaune
  line(c, -84, -150, -84, -238, 3, '#3b2f22');
  const wv = Math.sin(time * 3) * 4, wv2 = Math.sin(time * 3 + 1.4) * 4;
  poly(c, [-83, -236, -60, -232 + wv, -38, -230 + wv2, -40, -212 + wv2, -60, -214 + wv, -83, -216], '#f2c230');
  c.save(); c.globalAlpha = 0.85;
  ell(c, -60, -224 + wv * 0.8, 5, 5, '#2a2018', false);              // emblème (engrenage)
  c.restore();

  // Bus renversé qui sert de rempart
  poly(c, [-106, -22, -104, -84, 14, -88, 18, -22], '#6a7880');
  rect(c, -104, -88, 118, 8, '#7d8c94', false);
  c.fillStyle = 'rgba(20,16,12,0.9)';
  for (let i = 0; i < 4; i++) c.fillRect(-96 + i * 27, -74, 20, 18);
  // planches clouées sur les fenêtres
  for (let i = 0; i < 4; i++) { line(c, -98 + i * 27, -70, -74 + i * 27, -60, 3, '#8a6a44'); }
  c.fillStyle = 'rgba(150,70,30,0.5)'; c.fillRect(-60, -44, 24, 14); c.fillRect(-20, -84, 18, 10);
  c.fillStyle = '#f2c230'; c.fillRect(-104, -40, 122, 5);
  ell(c, -76, -18, 13, 13, '#1c1714'); ell(c, -76, -18, 5, 5, '#5a5048', false);
  ell(c, -8, -18, 13, 13, '#1c1714'); ell(c, -8, -18, 5, 5, '#5a5048', false);

  // Porte blindée (côté champ de bataille)
  rect(c, 60, -84, 8, 84, '#4a4038'); rect(c, 92, -84, 8, 84, '#4a4038');
  rect(c, 66, -78, 28, 72, '#5a5a52');
  for (let i = 0; i < 4; i++) {
    c.fillStyle = i % 2 ? '#f2c230' : '#1e1a16';
    c.save(); c.beginPath(); c.rect(66, -78, 28, 72); c.clip();
    c.beginPath(); c.moveTo(66 + i * 14 - 14, -6); c.lineTo(66 + i * 14, -6); c.lineTo(66 + i * 14 + 20, -26); c.lineTo(66 + i * 14 + 6, -26); c.fill();
    c.restore();
  }
  c.fillStyle = '#8a8a7a';
  for (const [rx, ry] of [[70, -72], [88, -72], [70, -40], [88, -40]]) c.fillRect(rx, ry, 2, 2);
  poly(c, [60, -84, 64, -98, 68, -84], '#6a6058'); poly(c, [92, -84, 96, -98, 100, -84], '#6a6058');

  // Sacs de sable et pneus devant (une rangée de plus au palier 1 des murailles)
  for (let i = 0; i < 4; i++) ell(c, 20 + i * 12, -8, 9, 7, '#a8946a');
  for (let i = 0; i < 3; i++) ell(c, 26 + i * 12, -19, 9, 7, '#b4a078');
  if (wt >= 1) for (let i = 0; i < 2; i++) ell(c, 32 + i * 12, -30, 9, 7, '#a8946a');
  // Murailles palier 3 : blocs de béton anti-chars devant la porte
  if (wt >= 3) {
    for (const x of [104, 140]) { poly(c, [x - 14, 0, x - 10, -12, x - 6, -26, x + 6, -26, x + 10, -12, x + 14, 0], '#8a8478'); c.fillStyle = '#b0402a'; c.fillRect(x - 6, -22, 12, 4); }
  }
  ell(c, -112, -10, 12, 10, '#1e1a18'); ell(c, -112, -10, 5, 4, '#3a3330', false);
  // Baril qui brûle
  rect(c, 38, -60, 16, 24, '#8a3a22');
  fire(c, 46, -60, 0.55, time, 1);
  // Herses anti-chars devant la façade
  for (const hx of [112, 130]) {
    line(c, hx - 8, 0, hx + 8, -16, 3, '#3a3632'); line(c, hx + 8, 0, hx - 8, -16, 3, '#3a3632');
  }

  // Tourelle palier 3 : projecteur qui balaie le champ de bataille
  if (tt >= 3) {
    const a = Math.sin(time * 0.8) * 0.25 - 0.15;
    c.save();
    c.translate(-46, -200);
    c.rotate(a);
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, 0, 260, 0);
    g.addColorStop(0, 'rgba(255,245,200,0.35)'); g.addColorStop(1, 'rgba(255,245,200,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(6, -4); c.lineTo(260, -40); c.lineTo(260, 40); c.lineTo(6, 4); c.fill();
    c.globalCompositeOperation = 'source-over';
    rect(c, -6, -6, 14, 12, '#4a4a50');
    ell(c, 8, 0, 3, 5, '#fff6d0', false);
    c.restore();
  }
  // Murailles palier 2 : bandes de danger sur le bus et caisses de munitions
  if (wt >= 2) {
    c.fillStyle = '#f2c230';
    for (let i = 0; i < 6; i++) c.fillRect(-100 + i * 20, -86, 10, 4);
    rect(c, -26, -16, 18, 14, '#5a6a3a'); rect(c, -24, -28, 14, 12, '#5a6a3a');
  }

  // Dégâts
  if (ds >= 1) {
    c.strokeStyle = 'rgba(20,10,5,0.7)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-90, -80); c.lineTo(-80, -64); c.lineTo(-86, -50); c.moveTo(0, -84); c.lineTo(-8, -66); c.stroke();
    c.fillStyle = 'rgba(30,18,10,0.35)'; c.fillRect(-106, -90, 70, 50);
    fire(c, -40, -88, 0.8, time, 3);
  }
  if (ds >= 2) {
    poly(c, [-70, 0, -60, -18, -40, -12, -20, -26, 10, -10, 20, 0], '#5a4636');   // gravats
    fire(c, -90, -40, 1, time, 5);
    fire(c, 20, -110, 0.7, time, 7);
    c.fillStyle = 'rgba(15,8,4,0.35)'; c.fillRect(-110, -170, 220, 170);
  }
}

// ---------- Nid des Mutants ----------
export function drawNest(c, time, b) {
  const ds = b.damageState;
  const pulse = 0.5 + Math.sin(time * 2.4) * 0.5;
  c.lineJoin = 'round';

  // Pics d'os à l'arrière
  for (const [x, h, a] of [[-80, 70, -0.3], [-50, 100, -0.15], [10, 90, 0.1], [56, 66, 0.3]]) {
    c.save(); c.translate(x, -80); c.rotate(a);
    poly(c, [-7, 10, 0, -h, 7, 10], '#d8cfae');
    c.restore();
  }

  // Masse de chair
  const g = c.createRadialGradient(-10, -110, 10, 0, -50, 130);
  g.addColorStop(0, '#a65268'); g.addColorStop(0.6, '#7a3048'); g.addColorStop(1, '#4a1a2c');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-104, 0);
  c.bezierCurveTo(-110, -70, -80, -120, -40, -128);
  c.bezierCurveTo(-10, -150, 40, -140, 60, -110);
  c.bezierCurveTo(96, -90, 108, -40, 104, 0);
  c.closePath(); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke();
  // lobes
  ell(c, -56, -96, 34, 28, '#8a3a56');
  ell(c, 40, -88, 30, 26, '#8e3e5a');
  ell(c, -10, -40, 50, 30, '#6e2a42', false);
  // veines
  c.strokeStyle = '#4a1428'; c.lineWidth = 2.5;
  for (const [x1, y1, cx, cy, x2, y2] of [[-90, -20, -70, -70, -40, -120], [20, -10, 30, -60, 10, -130], [80, -20, 70, -60, 60, -100]]) {
    c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.stroke();
  }
  // tôles rouillées incrustées
  poly(c, [-84, -36, -44, -56, -38, -24, -80, -10], '#7b4a2a');
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-74, -40, 26, 3);
  poly(c, [6, -112, 46, -104, 40, -78, 10, -84], '#6a5a4a');
  line(c, -30, -120, -46, -150, 4, '#5a4a3e');                         // tuyau qui dépasse
  // côtes
  c.strokeStyle = '#d8cfae'; c.lineWidth = 4.5; c.lineCap = 'round';
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-14 + i * 18, -2, 36 + i * 3, Math.PI * 1.15, Math.PI * 1.7); c.stroke(); }

  // Pustules qui luisent
  for (const [px, py, pr, ph] of [[-64, -62, 9, 0], [-12, -96, 7, 1], [70, -46, 8, 2], [30, -124, 6, 3], [-86, -84, 5, 4]]) {
    const pl = 0.5 + Math.sin(time * 2.4 + ph) * 0.5;
    c.save(); c.globalCompositeOperation = 'lighter';
    const gl = c.createRadialGradient(px, py, 1, px, py, pr * 2.6);
    gl.addColorStop(0, `rgba(160,240,60,${0.5 * pl})`); gl.addColorStop(1, 'rgba(160,240,60,0)');
    c.fillStyle = gl; c.fillRect(px - pr * 3, py - pr * 3, pr * 6, pr * 6);
    c.restore();
    ell(c, px, py, pr, pr, `rgb(${120 + 40 * pl},${200 + 30 * pl},50)`);
    ell(c, px - pr * 0.3, py - pr * 0.3, pr * 0.3, pr * 0.3, 'rgba(255,255,255,0.5)', false);
  }
  // Yeux qui clignent
  const blink = (Math.sin(time * 0.9) > 0.97);
  for (const [ex, ey, er] of [[28, -64, 5], [40, -70, 4], [48, -60, 3.5]]) {
    ell(c, ex, ey, er, blink ? 0.8 : er, '#f0e040');
    if (!blink) ell(c, ex + 1, ey, er * 0.4, er * 0.7, '#1a0a0a', false);
  }

  // Gueule-porte avec dents (côté champ de bataille)
  ell(c, 78, -30, 24, 32, '#1a0810');
  c.save(); c.globalCompositeOperation = 'lighter';
  const mg = c.createRadialGradient(80, -26, 2, 80, -26, 26);
  mg.addColorStop(0, `rgba(150,230,50,${0.35 + 0.3 * pulse})`); mg.addColorStop(1, 'rgba(150,230,50,0)');
  c.fillStyle = mg; c.fillRect(54, -60, 52, 64);
  c.restore();
  for (let i = 0; i < 5; i++) {
    poly(c, [62 + i * 7, -58 + i * 2, 66 + i * 7, -44, 70 + i * 7, -58 + i * 2], '#e8e0c0');
    poly(c, [62 + i * 7, -2 - i, 66 + i * 7, -14, 70 + i * 7, -2 - i], '#e8e0c0');
  }
  // bave
  c.fillStyle = 'rgba(155,226,43,0.8)';
  c.beginPath(); c.ellipse(86, -6 + (time * 20) % 14, 2, 4, 0, 0, Math.PI * 2); c.fill();

  // Tentacule cracheur qui ondule (le tir part de son extrémité)
  c.strokeStyle = OUT; c.lineWidth = 16; c.lineCap = 'round';
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push([-6 + t * 52 + Math.sin(time * 2 + t * 5) * 8 * t, -110 - t * 70 + Math.cos(time * 1.7 + t * 4) * 4]);
  }
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts) c.lineTo(x, y); };
  path(); c.stroke();
  c.strokeStyle = '#8a3c63'; c.lineWidth = 12; path(); c.stroke();
  c.strokeStyle = '#a85080'; c.lineWidth = 4; path(); c.stroke();
  const [tx, ty] = pts[10];
  const spit = b.turretFlash > 0 ? 4 : 0;
  ell(c, tx, ty, 10 + spit, 8 + spit, '#7a2c54');
  ell(c, tx + 4, ty, 5 + spit * 0.6, 4 + spit * 0.6, '#9be22b', false);

  // Dégâts
  if (ds >= 1) {
    c.strokeStyle = '#2a0a12'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-70, -110); c.lineTo(-50, -90); c.moveTo(20, -40); c.lineTo(36, -24); c.stroke();
    c.fillStyle = 'rgba(155,226,43,0.7)';
    c.fillRect(-52, -88 + (time * 18) % 30, 2, 6);
    fire(c, -60, -110, 0.8, time, 2);
  }
  if (ds >= 2) {
    ell(c, -30, -70, 26, 18, '#2a0a12');
    fire(c, 30, -100, 1, time, 4);
    fire(c, -80, -20, 0.9, time, 6);
    c.fillStyle = 'rgba(15,5,8,0.35)';
    c.beginPath(); c.ellipse(0, -70, 110, 80, 0, 0, Math.PI * 2); c.fill();
  }
}
