// Neon Bay — traffic: cars that drive the road grid.
// One job: spawn traffic cars, steer them along roads and through intersections,
// slow them for the car ahead, and draw them.
import { ROAD_SPACING, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { angleDiff, clamp, dist, pick, range } from './random.js';
import { ROAD_XS, ROAD_YS, isOnRoad, randomRoadPoint } from './world.js';

const TRAFFIC_COLORS = ['#2ed573', '#1e90ff', '#ffa502', '#eccc68', '#7bed9f', '#70a1ff', '#ff6b81', '#c0c0c0', '#ff9ff3'];

export function spawnTraffic(G, count) {
  G.traffic = [];
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(G.rng);
    G.traffic.push({
      x: p.x, y: p.y, angle: p.angle, speed: range(G.rng, 90, 150),
      targetSpeed: range(G.rng, 100, 160), color: pick(G.rng, TRAFFIC_COLORS),
      turnCooldown: 0, length: 46, width: 24, braking: false,
    });
  }
}

function nearestIntersection(x, y) {
  let bx = ROAD_XS[0], bd = Infinity;
  for (const rx of ROAD_XS) { const d = Math.abs(x - rx); if (d < bd) { bd = d; bx = rx; } }
  let by = ROAD_YS[0]; bd = Infinity;
  for (const ry of ROAD_YS) { const d = Math.abs(y - ry); if (d < bd) { bd = d; by = ry; } }
  return { x: bx, y: by };
}

// At an intersection, sometimes turn left or right; otherwise keep straight.
function maybeTurn(car, G) {
  if (car.turnCooldown > 0) return;
  const inter = nearestIntersection(car.x, car.y);
  if (dist(car.x, car.y, inter.x, inter.y) < 30) {
    const r = G.rng();
    const turn = r < 0.25 ? Math.PI / 2 : r < 0.5 ? -Math.PI / 2 : 0;
    if (turn !== 0) {
      car.angle += turn;
      // Snap back onto the road centre after the turn.
      const snapped = nearestIntersection(car.x, car.y);
      car.x = snapped.x; car.y = snapped.y;
    }
    car.turnCooldown = 1.2;
  }
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    car.turnCooldown -= dt;
    maybeTurn(car, G);
    // Slow down for the car ahead (player car or another traffic car).
    let desired = car.targetSpeed;
    const aheadX = car.x + Math.cos(car.angle) * 70;
    const aheadY = car.y + Math.sin(car.angle) * 70;
    for (const other of G.traffic) {
      if (other !== car && dist(aheadX, aheadY, other.x, other.y) < 42) { desired = 0; break; }
    }
    if (G.playerCar && dist(aheadX, aheadY, G.playerCar.x, G.playerCar.y) < 46) desired = 0;
    if (G.player.inCar === false && dist(aheadX, aheadY, G.player.x, G.player.y) < 40) desired = 0;
    car.speed += clamp(desired - car.speed, -260 * dt, 140 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Wrap around the city edges so traffic never runs out.
    if (car.x < 120) { car.x = 120; car.angle = 0; }
    if (car.x > WORLD_W - 120) { car.x = WORLD_W - 120; car.angle = Math.PI; }
    if (car.y < 120) { car.y = 120; car.angle = Math.PI / 2; }
    if (car.y > WORLD_H - 120) { car.y = WORLD_H - 120; car.angle = -Math.PI / 2; }
    // Keep on the road: if pushed off, steer back toward the nearest road centre.
    if (!isOnRoad(car.x, car.y)) {
      const inter = nearestIntersection(car.x, car.y);
      const want = Math.abs(car.x - inter.x) < Math.abs(car.y - inter.y)
        ? Math.atan2(0, inter.x - car.x) : Math.atan2(inter.y - car.y, 0);
      car.angle += clamp(angleDiff(car.angle, want), -1.6 * dt, 1.6 * dt);
    }
  }
}

export function drawCarShape(ctx, x, y, angle, length, width, color, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-length / 2 + 3, -width / 2 + 4, length, width);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-length / 2, -width / 2, length, width, 7);
  ctx.fill();
  ctx.fillStyle = '#1b2733';
  ctx.fillRect(-length * 0.18, -width / 2 + 4, length * 0.28, width - 8);
  ctx.fillStyle = '#dfe9ff';
  ctx.fillRect(length / 2 - 6, -width / 2 + 3, 4, 6);
  ctx.fillRect(length / 2 - 6, width / 2 - 9, 4, 6);
  if (opts.lights) {
    ctx.fillStyle = opts.lights === 'police' ? '#ff2d2d' : '#ffe08a';
    ctx.beginPath(); ctx.arc(2, -width / 2 + 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = opts.lights === 'police' ? '#2d7dff' : '#ffe08a';
    ctx.beginPath(); ctx.arc(2, width / 2 - 2, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawTraffic(ctx, G) {
  for (const car of G.traffic) drawCarShape(ctx, car.x, car.y, car.angle, car.length, car.width, car.color);
}
