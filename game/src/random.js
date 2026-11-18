// Neon Bay — deterministic seeded random numbers.
// One job: every "random" thing in the city and in screenshots is reproducible
// from a seed, so ?shot=...&seed=1 always stages the same scene.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function range(rng, min, max) { return min + rng() * (max - min); }
export function rangeInt(rng, min, max) { return Math.floor(range(rng, min, max + 1)); }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.hypot(dx, dy); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function lerp(a, b, t) { return a + (b - a) * t; }
