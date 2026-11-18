// Neon Bay — the city itself: roads, blocks, buildings, beach, park and docks.
// One job: build the open world from a seed, answer collision questions, and draw
// the ground layer (terrain, roads, buildings). No gameplay rules live here.
import { COLORS, ROAD_SPACING, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { pick, range, rangeInt } from './random.js';

const BUILDING_COLORS = [COLORS.buildingA, COLORS.buildingB, COLORS.buildingC, COLORS.buildingD, COLORS.buildingE];
const BUILDING_NAMES = ['Sunset Towers', 'Marina Plaza', 'Palm Court', 'Bayview Lofts', 'Coral Hotel', 'Neon Arcade', 'Pier House', 'Cactus Motel'];

// Road centre lines.
export const ROAD_XS = [];
export const ROAD_YS = [];
for (let x = 200; x < WORLD_W - 200; x += ROAD_SPACING) ROAD_XS.push(x);
for (let y = 200; y < WORLD_H - 200; y += ROAD_SPACING) ROAD_YS.push(y);

export function buildCity(seed) {
  const rng = seed;
  const buildings = [];
  const trees = [];
  const parkedCars = [];
  // Districts: beach on the east edge, park in the centre, docks in the south-west.
  const beach = { x: WORLD_W - 260, y: 0, w: 260, h: WORLD_H };
  const water = { x: WORLD_W - 110, y: 0, w: 110, h: WORLD_H };
  const park = { x: 1200, y: 800, w: 400, h: 400 };
  const docks = { x: 0, y: WORLD_H - 260, w: 520, h: 260 };

  // One or two buildings per city block (the rectangles between roads).
  for (let bx = 0; bx < ROAD_XS.length - 1; bx += 1) {
    for (let by = 0; by < ROAD_YS.length - 1; by += 1) {
      const x0 = ROAD_XS[bx] + ROAD_W / 2 + 24;
      const y0 = ROAD_YS[by] + ROAD_W / 2 + 24;
      const x1 = ROAD_XS[bx + 1] - ROAD_W / 2 - 24;
      const y1 = ROAD_YS[by + 1] - ROAD_W / 2 - 24;
      // Skip the park block and the docks block.
      if (x0 < park.x + park.w && x1 > park.x && y0 < park.y + park.h && y1 > park.y) continue;
      if (x0 < docks.x + docks.w && y0 > docks.y) continue;
      // Skip blocks that touch the beach.
      if (x1 > beach.x) continue;
      const count = rangeInt(rng, 1, 2);
      for (let i = 0; i < count; i += 1) {
        const w = range(rng, 90, 170);
        const h = range(rng, 80, 150);
        const x = range(rng, x0, Math.max(x0 + 1, x1 - w));
        const y = range(rng, y0, Math.max(y0 + 1, y1 - h));
        buildings.push({
          x, y, w, h,
          color: pick(rng, BUILDING_COLORS),
          name: pick(rng, BUILDING_NAMES),
          windows: rangeInt(rng, 6, 16),
        });
      }
    }
  }
  // Palm trees in the park and along the beach — never on a road band.
  const onRoadBand = (x, y) => {
    for (const rx of ROAD_XS) if (Math.abs(x - rx) < 60) return true;
    for (const ry of ROAD_YS) if (Math.abs(y - ry) < 60) return true;
    return false;
  };
  for (let i = 0; i < 46; i += 1) {
    const t = { x: range(rng, park.x + 20, park.x + park.w - 20), y: range(rng, park.y + 20, park.y + park.h - 20) };
    if (!onRoadBand(t.x, t.y)) trees.push(t);
  }
  for (let i = 0; i < 18; i += 1) {
    trees.push({ x: range(rng, beach.x + 20, beach.x + 130), y: range(rng, 40, WORLD_H - 40) });
  }
  // Parked cars along the roads (stealable).
  const carColors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#eccc68', '#7bed9f', '#70a1ff', '#ff6b81'];
  for (let i = 0; i < 26; i += 1) {
    const vertical = rng() < 0.5;
    let x, y, angle;
    if (vertical) {
      x = pick(rng, ROAD_XS) + (rng() < 0.5 ? -26 : 26);
      y = range(rng, 240, WORLD_H - 240);
      angle = rng() < 0.5 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      x = range(rng, 240, WORLD_W - 240);
      y = pick(rng, ROAD_YS) + (rng() < 0.5 ? -26 : 26);
      angle = rng() < 0.5 ? 0 : Math.PI;
    }
    parkedCars.push({ x, y, angle, color: pick(rng, carColors), speed: 0, parked: true, stolen: false });
  }
  return { buildings, trees, parkedCars, beach, water, park, docks };
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function collidesWithBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function isOnRoad(x, y) {
  for (const rx of ROAD_XS) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROAD_YS) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

export function nearestRoadPoint(x, y) {
  let bestX = ROAD_XS[0], bestD = Infinity;
  for (const rx of ROAD_XS) { const d = Math.abs(x - rx); if (d < bestD) { bestD = d; bestX = rx; } }
  let bestY = ROAD_YS[0]; bestD = Infinity;
  for (const ry of ROAD_YS) { const d = Math.abs(y - ry); if (d < bestD) { bestD = d; bestY = ry; } }
  // Snap to whichever road axis is closer.
  if (Math.abs(x - bestX) < Math.abs(y - bestY)) return { x: bestX, y };
  return { x, y: bestY };
}

export function randomRoadPoint(rng) {
  const vertical = rng() < 0.5;
  if (vertical) return { x: pick(rng, ROAD_XS), y: range(rng, 200, WORLD_H - 200), angle: rng() < 0.5 ? -Math.PI / 2 : Math.PI / 2 };
  return { x: range(rng, 200, WORLD_W - 200), y: pick(rng, ROAD_YS), angle: rng() < 0.5 ? 0 : Math.PI };
}

// Draw the ground layer: grass, beach, water, park, docks, roads and buildings.
export function drawCity(ctx, city, cam, viewW, viewH, timeOfDay) {
  const x0 = Math.max(0, cam.x - 40), y0 = Math.max(0, cam.y - 40);
  const x1 = Math.min(WORLD_W, cam.x + viewW + 40), y1 = Math.min(WORLD_H, cam.y + viewH + 40);
  // Grass base.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Docks (south-west): concrete + containers.
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(city.docks.x, city.docks.y, city.docks.w, city.docks.h);
  ctx.fillStyle = '#374151';
  for (let i = 0; i < 5; i += 1) ctx.fillRect(city.docks.x + 20 + i * 100, city.docks.y + 30, 80, 40);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(city.docks.x + 40, city.docks.y + 120, 120, 50);
  // Park.
  ctx.fillStyle = COLORS.park;
  ctx.fillRect(city.park.x, city.park.y, city.park.w, city.park.h);
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath(); ctx.arc(city.park.x + 200, city.park.y + 200, 46, 0, Math.PI * 2); ctx.fill();
  // Beach and water (east edge).
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(city.beach.x, city.beach.y, city.beach.w, city.beach.h);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(city.water.x, city.water.y, city.water.w, city.water.h);
  ctx.fillStyle = COLORS.waterDeep;
  for (let y = 60; y < WORLD_H; y += 160) {
    ctx.fillRect(city.water.x + 12, y, 60, 8);
  }
  // Roads.
  ctx.fillStyle = COLORS.road;
  for (const rx of ROAD_XS) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of ROAD_YS) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Centre dashes.
  ctx.fillStyle = COLORS.roadLine;
  for (const rx of ROAD_XS) for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(rx - 3, y, 6, 30);
  for (const ry of ROAD_YS) for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x, ry - 3, 30, 6);
  // Sidewalks.
  ctx.fillStyle = COLORS.sidewalk;
  for (const rx of ROAD_XS) {
    ctx.fillRect(rx - ROAD_W / 2 - 12, 0, 12, WORLD_H);
    ctx.fillRect(rx + ROAD_W / 2, 0, 12, WORLD_H);
  }
  for (const ry of ROAD_YS) {
    ctx.fillRect(0, ry - ROAD_W / 2 - 12, WORLD_W, 12);
    ctx.fillRect(0, ry + ROAD_W / 2, WORLD_W, 12);
  }
  // Buildings with lit windows.
  for (const b of city.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = COLORS.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 10);
    ctx.fillStyle = timeOfDay > 0.6 ? '#ffe08a' : '#dfe9ff';
    const cols = Math.max(2, Math.floor(b.w / 34));
    const rows = Math.max(2, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i += 1) for (let j = 0; j < rows; j += 1) {
      if ((i * 7 + j * 3 + b.windows) % 4 === 0) continue;
      ctx.fillRect(b.x + 12 + i * 30, b.y + 26 + j * 30, 14, 16);
    }
  }
  // Palm trees.
  for (const t of city.trees) {
    if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
    ctx.fillStyle = '#7c4a21';
    ctx.fillRect(t.x - 3, t.y - 3, 6, 12);
    ctx.fillStyle = COLORS.parkTree;
    ctx.beginPath(); ctx.arc(t.x, t.y - 8, 13, 0, Math.PI * 2); ctx.fill();
  }
  // Pier jutting into the water.
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(WORLD_W - 260, 1100, 150, 26);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NEON BAY PIER', WORLD_W - 250, 1090);
}
