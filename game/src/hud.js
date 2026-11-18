// Neon Bay — HUD and minimap.
// One job: draw everything that sits on top of the world — health, cash, wanted
// stars, the mission objective, speed, the minimap, flash messages and dialogue.
import { WORLD_H, WORLD_W } from './config.js';
import { missionTarget } from './missions.js';
import { ROAD_XS, ROAD_YS } from './world.js';

const MINIMAP_W = 200;
const MINIMAP_H = 150;

export function drawHud(ctx, G, viewW, viewH) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Top-left: health bar, cash, ammo.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 12, 250, 100);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ROOK', 22, 36);
  ctx.fillStyle = '#333';
  ctx.fillRect(22, 44, 200, 14);
  ctx.fillStyle = G.player.health > 30 ? '#2ed573' : '#ff4757';
  ctx.fillRect(22, 44, 200 * Math.max(0, G.player.health / 100), 14);
  ctx.fillStyle = '#2ed573';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(`$${G.player.cash}`, 22, 80);
  ctx.fillStyle = '#ffe08a';
  ctx.fillText(`AMMO ${G.player.ammo}`, 130, 80);
  ctx.fillStyle = '#8b93a3';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(G.playerCar ? 'IN CAR — E to exit' : 'ON FOOT — E near a car to steal it', 22, 98);
  // Wanted stars, top centre.
  const stars = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const sw = 190;
  ctx.fillRect((viewW - sw) / 2, 12, sw, 40);
  ctx.fillStyle = G.wanted > 0 ? '#ff4757' : '#8b93a3';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(stars, viewW / 2, 42);
  // Mission objective, bottom centre.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const obj = G.objective || 'Free roam — press M for the next mission.';
  ctx.font = 'bold 17px system-ui, sans-serif';
  const ow = Math.min(viewW - 40, ctx.measureText(obj).width + 32);
  ctx.fillRect((viewW - ow) / 2, viewH - 52, ow, 36);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(obj, viewW / 2, viewH - 28);
  // Speed when driving, bottom right.
  if (G.playerCar) {
    const kmh = Math.round(Math.abs(G.playerCar.speed) * 0.36);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(viewW - 130, viewH - 100, 118, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`${kmh} km/h`, viewW - 71, viewH - 71);
  }
  // Flash message, centre.
  if (G.flashTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = 'bold 22px system-ui, sans-serif';
    const fw = ctx.measureText(G.flashMessage).width + 40;
    ctx.fillRect((viewW - fw) / 2, 70, fw, 44);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(G.flashMessage, viewW / 2, 100);
  }
  drawMinimap(ctx, G, viewW, viewH);
  drawDialogue(ctx, G, viewW, viewH);
  ctx.restore();
}

function drawMinimap(ctx, G, viewW, viewH) {
  const mx = viewW - MINIMAP_W - 12;
  const my = 12;
  const sx = MINIMAP_W / WORLD_W;
  const sy = MINIMAP_H / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(mx - 4, my - 4, MINIMAP_W + 8, MINIMAP_H + 8);
  ctx.fillStyle = '#3f7d4a';
  ctx.fillRect(mx, my, MINIMAP_W, MINIMAP_H);
  ctx.fillStyle = '#1e7fa8';
  ctx.fillRect(mx + (WORLD_W - 110) * sx, my, 110 * sx, MINIMAP_H);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(mx + (WORLD_W - 260) * sx, my, 150 * sx, MINIMAP_H);
  ctx.strokeStyle = '#2b2f36';
  ctx.lineWidth = 3;
  for (const rx of ROAD_XS) { ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + MINIMAP_H); ctx.stroke(); }
  for (const ry of ROAD_YS) { ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + MINIMAP_W, my + ry * sy); ctx.stroke(); }
  // Mission marker (pulsing yellow diamond).
  const target = missionTarget(G);
  if (target) {
    const pulse = 5 + Math.sin(G.time * 5) * 2;
    ctx.fillStyle = '#ffd23f';
    ctx.save();
    ctx.translate(mx + target.x * sx, my + target.y * sy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-pulse, -pulse, pulse * 2, pulse * 2);
    ctx.restore();
  }
  // Police (blue/red dots), traffic (white), player (yellow arrow).
  for (const cop of G.police) {
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath(); ctx.arc(mx + cop.x * sx, my + cop.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const car of G.traffic) ctx.fillRect(mx + car.x * sx - 1.5, my + car.y * sy - 1.5, 3, 3);
  const px = G.playerCar ? G.playerCar.x : G.player.x;
  const py = G.playerCar ? G.playerCar.y : G.player.y;
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(mx + px * sx, my + py * sy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(mx + px * sx, my + py * sy, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NEON BAY', mx, my + MINIMAP_H + 16);
}

function drawDialogue(ctx, G, viewW, viewH) {
  if (!G.dialogueActive || !G.mission) return;
  const line = G.mission.dialogue[G.mission.dialogueIdx];
  if (!line) { G.dialogueActive = false; return; }
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  const dw = Math.min(viewW - 80, 760);
  ctx.fillRect((viewW - dw) / 2, viewH - 150, dw, 84);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(G.mission.def.giver.toUpperCase(), (viewW - dw) / 2 + 20, viewH - 122);
  ctx.fillStyle = '#fff';
  ctx.font = '17px system-ui, sans-serif';
  wrapText(ctx, line, (viewW - dw) / 2 + 20, viewH - 96, dw - 40, 22);
  ctx.fillStyle = '#8b93a3';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('click / Enter to continue', (viewW + dw) / 2 - 16, viewH - 76);
}

export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
