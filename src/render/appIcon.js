import { drawFort } from './bases.js?v=12';

// Icône de l'application : ciel apocalyptique, soleil voilé, le fort et son drapeau jaune.
// Le contenu reste dans la zone centrale (80 %) pour les icônes « adaptatives » d'Android.
export function drawIcon(ctx, size) {
  const k = size / 512;
  ctx.save();
  ctx.scale(k, k);
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#8a3e1e'); sky.addColorStop(0.55, '#d98a48'); sky.addColorStop(1, '#f2c98c');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 512, 512);
  const sun = ctx.createRadialGradient(360, 170, 10, 360, 170, 170);
  sun.addColorStop(0, 'rgba(255,244,214,0.95)'); sun.addColorStop(0.25, 'rgba(255,226,170,0.5)'); sun.addColorStop(1, 'rgba(255,210,140,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, 512, 512);
  // ruines au loin
  ctx.fillStyle = '#9a6040';
  for (const [x, w, h] of [[20, 70, 120], [95, 50, 170], [150, 80, 100], [300, 60, 150], [370, 90, 110], [455, 60, 160]]) ctx.fillRect(x, 400 - h, w, h);
  // sol
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(0, 395, 512, 117);
  ctx.fillStyle = '#4a2e1a'; ctx.fillRect(0, 395, 512, 8);
  // le fort, agrandi
  ctx.save();
  ctx.translate(250, 400);
  ctx.scale(1.35, 1.35);
  drawFort(ctx, 0.6, { damageState: 0, turretAngle: -0.25, turretFlash: 0 });
  ctx.restore();
  ctx.restore();
}
