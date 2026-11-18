// Neon Bay — combat: pistol shots, fists, bullets and gang enemies.
// One job: everything that hurts someone — firing, melee, bullet flight, enemy
// gang members who shoot back, and the damage they take.
import { COLORS } from './config.js';
import { angleTo, dist, range } from './random.js';
import { playShot } from './audio.js';
import { scarePedestrians } from './pedestrians.js';
import { addWanted } from './police.js';

export function spawnGang(G, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    G.enemies.push({
      x: x + range(G.rng, -70, 70), y: y + range(G.rng, -70, 70),
      angle: G.rng() * Math.PI * 2, health: 50, speed: 120,
      shootTimer: range(G.rng, 0.5, 1.5), alive: true, walkPhase: G.rng() * 6,
    });
  }
}

export function playerShoot(G) {
  if (G.player.ammo <= 0) { G.flashMessage = 'Out of ammo — find a gun shop pickup (green crate)'; G.flashTimer = 2; return; }
  if (G.player.shootCooldown > 0) return;
  G.player.shootCooldown = 0.28;
  G.player.ammo -= 1;
  const a = G.player.aimAngle;
  G.bullets.push({
    x: G.player.x + Math.cos(a) * 20, y: G.player.y + Math.sin(a) * 20,
    vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 0.9, fromPlayer: true,
  });
  playShot(G.audio);
  scarePedestrians(G, G.player.x, G.player.y, 320);
  G.muzzleTimer = 0.06;
}

export function playerMelee(G) {
  if (G.player.meleeCooldown > 0) return;
  G.player.meleeCooldown = 0.45;
  const rangePx = 46;
  const ax = G.player.x + Math.cos(G.player.aimAngle) * rangePx;
  const ay = G.player.y + Math.sin(G.player.aimAngle) * rangePx;
  for (const e of G.enemies) {
    if (e.alive && dist(e.x, e.y, ax, ay) < 40) {
      e.health -= 25;
      if (e.health <= 0) { e.alive = false; G.player.cash += 25; }
    }
  }
  for (const p of G.peds) {
    if (dist(p.x, p.y, ax, ay) < 36) {
      p.fleeing = true; p.fleeTimer = 3;
      addWanted(G, 1, 'assault');
    }
  }
}

export function updateBullets(G, dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.fromPlayer) {
      for (const e of G.enemies) {
        if (e.alive && dist(b.x, b.y, e.x, e.y) < 16) {
          e.health -= 34; b.life = 0;
          if (e.health <= 0) { e.alive = false; G.player.cash += 25; G.kills += 1; }
          break;
        }
      }
      for (const cop of G.police) {
        if (cop.kind === 'cop' && dist(b.x, b.y, cop.x, cop.y) < 16) {
          b.life = 0; addWanted(G, 1, 'shooting a cop');
        }
      }
    } else {
      if (dist(b.x, b.y, G.player.x, G.player.y) < 16 && !G.playerCar) {
        G.player.health -= 9; b.life = 0; G.shake = 0.25;
      }
      if (G.playerCar && dist(b.x, b.y, G.playerCar.x, G.playerCar.y) < 26) {
        G.playerCar.health -= 6; b.life = 0;
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  G.enemies = G.enemies.filter((e) => e.alive);
}

export function updateEnemies(G, dt) {
  for (const e of G.enemies) {
    e.walkPhase += dt * 8;
    const d = dist(e.x, e.y, G.player.x, G.player.y);
    e.angle = angleTo(e.x, e.y, G.player.x, G.player.y);
    if (d > 320) { /* hold ground, wait for the player */ }
    else if (d > 180) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = range(G.rng, 1.1, 2.0);
        G.bullets.push({
          x: e.x + Math.cos(e.angle) * 18, y: e.y + Math.sin(e.angle) * 18,
          vx: Math.cos(e.angle) * 420, vy: Math.sin(e.angle) * 420, life: 1.1, fromPlayer: false,
        });
        playShot(G.audio);
      }
    }
  }
}

export function drawCombat(ctx, G) {
  // Bullets as glowing tracers.
  for (const b of G.bullets) {
    ctx.fillStyle = b.fromPlayer ? '#ffe08a' : '#ff6b6b';
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Gang enemies: red jackets, armed.
  for (const e of G.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 4, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.gang;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath(); ctx.arc(0, -6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(Math.cos(e.angle) * 8 - 3, Math.sin(e.angle) * 8 - 3, 10, 4);
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(-10, -20, 20, 3);
    ctx.fillStyle = '#2ed573';
    ctx.fillRect(-10, -20, 20 * Math.max(0, e.health / 50), 3);
    ctx.restore();
  }
  // Muzzle flash.
  if (G.muzzleTimer > 0) {
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(G.player.x + Math.cos(G.player.aimAngle) * 26, G.player.y + Math.sin(G.player.aimAngle) * 26, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}
