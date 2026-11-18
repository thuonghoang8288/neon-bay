// Neon Bay — the wanted level and the police who answer it.
// One job: track stars 0–5, spawn police cars and foot cops, chase and ram the
// player, arrest on foot, and let the heat decay when the player lies low.
import { COLORS, WANTED_MAX, WORLD_H, WORLD_W } from './config.js';
import { angleDiff, angleTo, clamp, dist, range } from './random.js';
import { drawCarShape } from './traffic.js';
import { playSirenBlip } from './audio.js';

export function addWanted(G, stars, reason) {
  const before = G.wanted;
  G.wanted = clamp(G.wanted + stars, 0, WANTED_MAX);
  G.wantedTimer = 0;
  if (G.wanted > before && G.wanted >= 2) {
    G.flashMessage = `WANTED LEVEL ${G.wanted} — ${reason}`;
    G.flashTimer = 2.5;
  }
  if (G.wanted > before) playSirenBlip(G.audio);
}

export function spawnPolice(G) {
  const want = Math.min(G.wanted + 1, 4);
  while (G.police.length < want) {
    const px = G.player.x, py = G.player.y;
    const angle = G.rng() * Math.PI * 2;
    const d = range(G.rng, 500, 700);
    const x = clamp(px + Math.cos(angle) * d, 150, WORLD_W - 150);
    const y = clamp(py + Math.sin(angle) * d, 150, WORLD_H - 150);
    G.police.push({
      kind: G.wanted >= 3 && G.police.length % 2 === 1 ? 'cop' : 'car',
      x, y, angle, speed: 0, health: 100, arrestTimer: 0,
      length: 46, width: 24, color: COLORS.police,
    });
  }
}

export function updatePolice(G, dt) {
  if (G.wanted > 0) {
    spawnPolice(G);
    G.wantedTimer += dt;
    // Heat decays after 25 calm seconds with no new crime.
    if (G.wantedTimer > 25) {
      G.wanted -= 1;
      G.wantedTimer = 0;
      G.flashMessage = G.wanted > 0 ? `Heat cooling off — ${G.wanted} star${G.wanted > 1 ? 's' : ''} left` : 'You lost the cops. Clean.';
      G.flashTimer = 2;
    }
  } else {
    G.police.length = 0;
  }
  const tx = G.playerCar ? G.playerCar.x : G.player.x;
  const ty = G.playerCar ? G.playerCar.y : G.player.y;
  for (const cop of G.police) {
    const d = dist(cop.x, cop.y, tx, ty);
    if (cop.kind === 'car') {
      const wantAngle = angleTo(cop.x, cop.y, tx, ty);
      cop.angle += clamp(angleDiff(cop.angle, wantAngle), -2.4 * dt, 2.4 * dt);
      const targetSpeed = d > 60 ? 380 + G.wanted * 30 : 120;
      cop.speed += clamp(targetSpeed - cop.speed, -500 * dt, 300 * dt);
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      // Ram the player's car.
      if (G.playerCar && d < 48) {
        G.playerCar.speed *= 0.82;
        G.playerCar.x += Math.cos(cop.angle) * 26;
        G.playerCar.y += Math.sin(cop.angle) * 26;
        G.player.health = Math.max(0, G.player.health - 4 * dt * 10);
        if (G.shake < 0.3) G.shake = 0.3;
      }
    } else {
      // Foot cop: runs at the player; touch for 1.2 s to arrest.
      const wantAngle = angleTo(cop.x, cop.y, tx, ty);
      cop.angle = wantAngle;
      const speed = 235;
      cop.x += Math.cos(cop.angle) * speed * dt;
      cop.y += Math.sin(cop.angle) * speed * dt;
      if (d < 26 && !G.playerCar) {
        cop.arrestTimer += dt;
        G.flashMessage = 'BUSTED IN PROGRESS — run!';
        G.flashTimer = 0.5;
        if (cop.arrestTimer > 1.2) G.busted = true;
      } else cop.arrestTimer = 0;
    }
  }
  // Police cars that fell far behind respawn closer.
  for (const cop of G.police) {
    if (dist(cop.x, cop.y, tx, ty) > 1400) {
      const angle = G.rng() * Math.PI * 2;
      cop.x = clamp(tx + Math.cos(angle) * 600, 150, WORLD_W - 150);
      cop.y = clamp(ty + Math.sin(angle) * 600, 150, WORLD_H - 150);
    }
  }
}

export function drawPolice(ctx, G) {
  for (const cop of G.police) {
    if (cop.kind === 'car') {
      drawCarShape(ctx, cop.x, cop.y, cop.angle, cop.length, cop.width, cop.color, { lights: 'police' });
    } else {
      ctx.save();
      ctx.translate(cop.x, cop.y);
      ctx.fillStyle = '#1e5fd6';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f2f6b';
      ctx.beginPath(); ctx.arc(0, -6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PD', 0, 3);
      ctx.restore();
    }
  }
}
