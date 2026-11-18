// Neon Bay — pedestrians walking the sidewalks.
// One job: spawn walkers, stroll them along sidewalks, make them flee from danger
// (gunfire, speeding cars, the player), and draw them.
import { WORLD_H, WORLD_W } from './config.js';
import { angleTo, dist, pick, range } from './random.js';
import { ROAD_XS, ROAD_YS } from './world.js';

const SHIRT_COLORS = ['#ff6b81', '#2ed573', '#1e90ff', '#ffa502', '#eccc68', '#a55eea', '#ffffff', '#fd9644'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'];

export function spawnPedestrians(G, count) {
  G.peds = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = G.rng() < 0.5;
    let x, y;
    if (vertical) {
      x = pick(G.rng, ROAD_XS) + (G.rng() < 0.5 ? -50 : 50);
      y = range(G.rng, 200, WORLD_H - 200);
    } else {
      x = range(G.rng, 200, WORLD_W - 200);
      y = pick(G.rng, ROAD_YS) + (G.rng() < 0.5 ? -50 : 50);
    }
    G.peds.push({
      x, y, angle: G.rng() * Math.PI * 2, speed: range(G.rng, 35, 65),
      shirt: pick(G.rng, SHIRT_COLORS), skin: pick(G.rng, SKIN),
      fleeing: false, fleeTimer: 0, walkPhase: G.rng() * 6,
    });
  }
}

export function scarePedestrians(G, x, y, radius) {
  for (const p of G.peds) {
    if (dist(p.x, p.y, x, y) < radius) {
      p.fleeing = true; p.fleeTimer = 2.5;
      p.angle = angleTo(x, y, p.x, p.y);
    }
  }
}

export function updatePedestrians(G, dt) {
  for (const p of G.peds) {
    p.walkPhase += dt * 8;
    if (p.fleeTimer > 0) {
      p.fleeTimer -= dt;
      p.speed = 170;
      if (p.fleeTimer <= 0) { p.fleeing = false; p.speed = range(G.rng, 35, 65); }
    }
    // Danger nearby keeps them running.
    const threat = G.playerCar
      ? dist(p.x, p.y, G.playerCar.x, G.playerCar.y) < 90 && Math.abs(G.playerCar.speed) > 120
      : dist(p.x, p.y, G.player.x, G.player.y) < 30 && G.player.speedNow > 150;
    if (threat && !p.fleeing) {
      p.fleeing = true; p.fleeTimer = 1.5;
      p.angle = angleTo(G.playerCar ? G.playerCar.x : G.player.x, G.playerCar ? G.playerCar.y : G.player.y, p.x, p.y);
    }
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    // Wander: pick a new sidewalk direction now and then, stay inside the city.
    if (G.rng() < dt * 0.25) p.angle += (G.rng() - 0.5) * 1.2;
    if (p.x < 100 || p.x > WORLD_W - 100 || p.y < 100 || p.y > WORLD_H - 100) {
      p.angle = angleTo(p.x, p.y, WORLD_W / 2, WORLD_H / 2);
    }
  }
}

// A hit pedestrian falls and the player earns a wanted star (handled by police.js).
export function checkPedHit(G) {
  const px = G.playerCar ? G.playerCar.x : G.player.x;
  const py = G.playerCar ? G.playerCar.y : G.player.y;
  const speed = G.playerCar ? Math.abs(G.playerCar.speed) : G.player.speedNow;
  if (speed < 60) return null;
  for (const p of G.peds) {
    if (dist(p.x, p.y, px, py) < 30) return p;
  }
  return null;
}

export function drawPedestrians(ctx, G) {
  for (const p of G.peds) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 4, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    const bob = Math.sin(p.walkPhase) * 1.5;
    ctx.fillStyle = p.shirt;
    ctx.beginPath(); ctx.arc(0, bob, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(0, -6 + bob, 5, 0, Math.PI * 2); ctx.fill();
    if (p.fleeing) {
      ctx.fillStyle = '#ff4757';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -18);
    }
    ctx.restore();
  }
}
