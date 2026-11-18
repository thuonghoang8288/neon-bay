// Neon Bay — rendering: the camera, the world layer, every entity, and the
// menu screens. One job: turn game state into pixels. No rules live here.
import { FONT, WORLD_H, WORLD_W } from './config.js';
import { drawCity } from './world.js';
import { drawTraffic, drawCarShape } from './traffic.js';
import { drawPedestrians } from './pedestrians.js';
import { drawPolice } from './police.js';
import { drawCombat } from './combat.js';
import { drawHud } from './hud.js';
import { missionTarget } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 720 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
  }

  function drawPlayerOnFoot(ctx, G) {
    const p = G.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 5, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Body rotates toward the mouse aim.
    ctx.rotate(p.aimAngle);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(6, -3, 16, 6); // pistol
    ctx.restore();
    // Aim crosshair.
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    const ax = p.x + Math.cos(p.aimAngle) * 34;
    const ay = p.y + Math.sin(p.aimAngle) * 34;
    ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - 11, ay); ctx.lineTo(ax - 4, ay);
    ctx.moveTo(ax + 4, ay); ctx.lineTo(ax + 11, ay);
    ctx.moveTo(ax, ay - 11); ctx.lineTo(ax, ay - 4);
    ctx.moveTo(ax, ay + 4); ctx.lineTo(ax, ay + 11);
    ctx.stroke();
  }

  function drawWorldLayer(ctx, G) {
    const cam = G.camera;
    const vw = view.w, vh = view.h;
    // Sunset lighting: a warm wash over everything, stronger at dusk.
    drawCity(ctx, G.city, cam, vw, vh, G.timeOfDay);
    // Mission marker beacon.
    const target = missionTarget(G);
    if (target) {
      const pulse = 26 + Math.sin(G.time * 4) * 8;
      ctx.fillStyle = 'rgba(255,210,63,0.25)';
      ctx.beginPath(); ctx.arc(target.x, target.y, pulse + 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(target.x, target.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', target.x, target.y + 6);
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(target.label, target.x, target.y - 34);
    }
    // Parked (stealable) cars.
    for (const car of G.city.parkedCars) {
      if (car.stolen) continue;
      drawCarShape(ctx, car.x, car.y, car.angle, 46, 24, car.color);
    }
    // Ammo / health pickups (green crates).
    if (G.pickups) {
      for (const pk of G.pickups) {
        if (pk.taken) continue;
        ctx.fillStyle = pk.kind === 'ammo' ? '#2ed573' : '#ff6b81';
        ctx.fillRect(pk.x - 12, pk.y - 12, 24, 24);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pk.kind === 'ammo' ? 'A' : '+', pk.x, pk.y + 5);
      }
    }
    drawTraffic(ctx, G);
    drawPolice(ctx, G);
    drawPedestrians(ctx, G);
    if (G.playerCar) {
      drawCarShape(ctx, G.playerCar.x, G.playerCar.y, G.playerCar.angle, 46, 24, G.playerCar.color, { lights: true });
    } else {
      drawPlayerOnFoot(ctx, G);
    }
    drawCombat(ctx, G);
    // Sunset wash.
    ctx.fillStyle = `rgba(255,140,60,${0.05 + G.timeOfDay * 0.06})`;
    ctx.fillRect(cam.x, cam.y, vw, vh);
  }

  function drawPanel(ctx, title, lines, prompt, accent, topY) {
    const w = 640;
    const h = 150 + lines.length * 34 + 70;
    const x = (view.w - w) / 2;
    const y = topY !== undefined ? topY : (view.h - h) / 2;
    ctx.fillStyle = 'rgba(10,10,20,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent || '#ffd23f';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent || '#ffd23f';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, view.w / 2, y + 78);
    ctx.fillStyle = '#eef1f5';
    ctx.font = '18px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, view.w / 2, y + 130 + i * 34));
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(prompt, view.w / 2, y + h - 32);
  }

  function draw(G, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / view.w, canvas.height / view.h);
    if (screen === SCREEN_TITLE) {
      // Title backdrop: the city from above, slowly panning.
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const camX = 1200 + Math.sin(G.time * 0.05) * 300;
      const camY = 900 + Math.cos(G.time * 0.04) * 200;
      ctx.save();
      ctx.translate(-camX + view.w / 2, -camY + view.h / 2);
      drawCity(ctx, G.city, { x: camX - view.w / 2, y: camY - view.h / 2 }, view.w, view.h, 0.7);
      ctx.restore();
      ctx.fillStyle = 'rgba(5,5,15,0.55)';
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff2d78';
      ctx.font = 'bold 92px system-ui, sans-serif';
      ctx.fillText('NEON BAY', view.w / 2, 105);
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText('A sun-soaked open-world crime story', view.w / 2, 142);
      const titleLines = [
        'Jay "Rook" Mercer is back in Neon Bay — and Mara Voss owns his debt.',
        'Steal cars, outrun the Bay PD, run four story missions, take the Coral Hotel.',
        'WASD move / drive  •  Mouse aim  •  Click shoot  •  E steal car  •  F punch',
        'M missions  •  P pause  •  N mute  •  Progress saves automatically',
        G.bestCash > 0 ? `Best cash so far: $${G.bestCash}` : '',
      ].filter(Boolean);
      const panelH = 150 + titleLines.length * 34 + 70;
      drawPanel(ctx, '', titleLines, 'Press Enter or click to start', '#ff2d78', view.h - panelH - 30);
      return;
    }
    // Play / pause / over: camera follows the player.
    const px = G.playerCar ? G.playerCar.x : G.player.x;
    const py = G.playerCar ? G.playerCar.y : G.player.y;
    let shakeX = 0, shakeY = 0;
    if (G.shake > 0) { shakeX = (Math.random() - 0.5) * G.shake * 24; shakeY = (Math.random() - 0.5) * G.shake * 24; }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    ctx.translate(-G.camera.x + shakeX, -G.camera.y + shakeY);
    drawWorldLayer(ctx, G);
    ctx.restore();
    drawHud(ctx, G, view.w, view.h);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawPanel(ctx, 'PAUSED', ['The city waits. Your save is safe.', `Cash $${G.player.cash}  •  Missions done ${G.missionsDone}/4`], 'Press P or click to resume');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, view.w, view.h);
      const busted = G.busted;
      drawPanel(ctx, busted ? 'BUSTED' : 'WASTED', [
        busted ? 'The Bay PD finally caught Rook.' : 'Rook went down in Neon Bay.',
        `Cash kept: $${Math.floor(G.player.cash / 2)}  •  Missions done: ${G.missionsDone}/4`,
        'The crew will bail you out. It costs half your cash.',
      ], 'Press Enter or click to try again', '#ff4757');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
