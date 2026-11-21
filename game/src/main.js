// Neon Bay — boot and the one game loop.
// One job: own the screens (title / play / paused / over), read input, advance
// every system one fixed step, and keep the camera and the save file current.
// updateGame is exported so shots.js can drive the real rules for screenshots.
import { CAR, PLAYER, SAVE_KEY, WORLD_H, WORLD_W } from './config.js';
import { clamp, dist, lerp } from './random.js';
import { createInput, isDown, wasPressed, endFrame } from './input.js';
import { createGameState, loadSave, saveGame } from './state.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { collidesWithBuilding, pointInRect } from './world.js';
import { updateTraffic } from './traffic.js';
import { updatePedestrians, checkPedHit, scarePedestrians } from './pedestrians.js';
import { updatePolice, addWanted } from './police.js';
import { updateBullets, updateEnemies, playerShoot, playerMelee } from './combat.js';
import { startMission, updateMission, failMission, MISSION_DEFS } from './missions.js';
import { ensureAudio, setEngine, setSiren, toggleMute, playCrash, playPickup, playHorn } from './audio.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const G = createGameState(seed);
window.__neonBay = G; // debug handle: lets a playtest read the live game state
const renderer = createRenderer(canvas);
loadSave(G);
G.bestCash = Math.max(G.bestCash, G.player.cash);

function announce(message) { status.textContent = message; }

// --- Car stealing: nearest stealable car within reach. ---
function nearestStealableCar(G) {
  let best = null, bestD = 70;
  for (const car of G.city.parkedCars) {
    if (car.stolen) continue;
    const d = dist(G.player.x, G.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = { car, kind: 'parked' }; }
  }
  for (const car of G.traffic) {
    const d = dist(G.player.x, G.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = { car, kind: 'traffic' }; }
  }
  return best;
}

function enterCar(G, found) {
  const car = found.car;
  if (found.kind === 'traffic') {
    G.traffic = G.traffic.filter((c) => c !== car);
    addWanted(G, 1, 'car theft');
  } else {
    car.stolen = true;
  }
  car.speed = 0;
  G.playerCar = car;
  G.player.inCar = true;
  G.player.x = car.x; G.player.y = car.y;
  G.flashMessage = found.kind === 'traffic' ? 'Car stolen! The owner called it in.' : 'Car taken. Drive safe, Rook.';
  G.flashTimer = 2;
  playHorn(G.audio);
}

function exitCar(G) {
  const car = G.playerCar;
  car.speed = 0;
  const px = Math.cos(car.angle + Math.PI / 2);
  const py = Math.sin(car.angle + Math.PI / 2);
  // Step out on the side that is not inside a building; fall back to the
  // other side, and stay inside the world like on-foot movement does.
  let sx = car.x + px * 40;
  let sy = car.y + py * 40;
  if (collidesWithBuilding(G.city, sx, sy, PLAYER.radius)) {
    sx = car.x - px * 40;
    sy = car.y - py * 40;
  }
  G.player.x = clamp(sx, 20, WORLD_W - 20);
  G.player.y = clamp(sy, 20, WORLD_H - 20);
  G.player.inCar = false;
  G.playerCar = null;
  if (!G.city.parkedCars.includes(car)) {
    car.parked = true;
    G.city.parkedCars.push(car);
  }
}

// --- Player movement: on foot and behind the wheel. ---
function updatePlayerOnFoot(G, dt, input) {
  const p = G.player;
  let mx = 0, my = 0;
  if (isDown(input, 'KeyW', 'ArrowUp')) my -= 1;
  if (isDown(input, 'KeyS', 'ArrowDown')) my += 1;
  if (isDown(input, 'KeyA', 'ArrowLeft')) mx -= 1;
  if (isDown(input, 'KeyD', 'ArrowRight')) mx += 1;
  const len = Math.hypot(mx, my) || 1;
  const speed = PLAYER.walkSpeed;
  const nx = p.x + (mx / len) * speed * dt * (mx || my ? 1 : 0);
  const ny = p.y + (my / len) * speed * dt * (mx || my ? 1 : 0);
  p.speedNow = (mx || my) ? speed : 0;
  // Slide along buildings: try X, then Y.
  if (!collidesWithBuilding(G.city, nx, p.y, PLAYER.radius)) p.x = clamp(nx, 20, WORLD_W - 20);
  if (!collidesWithBuilding(G.city, p.x, ny, PLAYER.radius)) p.y = clamp(ny, 20, WORLD_H - 20);
  // Aim at the mouse.
  const wx = G.camera.x + input.mouseX;
  const wy = G.camera.y + input.mouseY;
  p.aimAngle = Math.atan2(wy - p.y, wx - p.x);
  // Enter a car.
  if (wasPressed(input, 'KeyE')) {
    const found = nearestStealableCar(G);
    if (found) enterCar(G, found);
  }
  // Shoot / punch.
  if (input.mouseDown) playerShoot(G);
  if (wasPressed(input, 'KeyF')) playerMelee(G);
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  if (p.meleeCooldown > 0) p.meleeCooldown -= dt;
}

function updatePlayerCar(G, dt, input) {
  const car = G.playerCar;
  const forward = isDown(input, 'KeyW', 'ArrowUp') || G.autoDrive;
  const brake = isDown(input, 'KeyS', 'ArrowDown');
  if (forward) car.speed += CAR.accel * dt;
  else if (brake) {
    if (car.speed > 5) car.speed -= CAR.accel * 1.4 * dt;
    else car.speed -= CAR.accel * 0.5 * dt;
  }
  car.speed -= car.speed * CAR.drag * dt;
  car.speed = clamp(car.speed, -CAR.reverseMax, CAR.maxSpeed);
  const steer = (isDown(input, 'KeyA', 'ArrowLeft') ? -1 : 0) + (isDown(input, 'KeyD', 'ArrowRight') ? 1 : 0);
  const steerAmount = steer * CAR.turnRate * dt * clamp(Math.abs(car.speed) / 120, 0, 1) * (car.speed < 0 ? -1 : 1);
  car.angle += steerAmount;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Building collision: bounce off, lose speed.
  const hit = collidesWithBuilding(G.city, nx, ny, 22);
  if (hit) {
    car.speed *= -0.25;
    playCrash(G.audio);
    G.shake = Math.max(G.shake, 0.2);
    G.player.health = Math.max(0, G.player.health - 2);
  } else {
    car.x = clamp(nx, 30, WORLD_W - 30);
    car.y = clamp(ny, 30, WORLD_H - 30);
  }
  // Bumping traffic cars slows both.
  for (const other of G.traffic) {
    if (dist(car.x, car.y, other.x, other.y) < 46) {
      car.speed *= 0.94;
      other.speed *= 0.8;
    }
  }
  G.player.x = car.x; G.player.y = car.y;
  G.player.aimAngle = car.angle;
  if (wasPressed(input, 'KeyE')) exitCar(G);
  if (wasPressed(input, 'KeyH')) playHorn(G.audio);
}

// --- One fixed step of the whole game. ---
export function updateGame(G, dt, input) {
  G.time += dt;
  G.timeOfDay = 0.55 + 0.25 * Math.sin(G.time * 0.01);
  if (G.flashTimer > 0) G.flashTimer -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.muzzleTimer > 0) G.muzzleTimer -= dt;

  // Dialogue advance.
  if (G.dialogueActive && G.mission) {
    if (input.clicked || wasPressed(input, 'Enter', 'Space')) {
      G.mission.dialogueIdx += 1;
      if (G.mission.dialogueIdx >= G.mission.dialogue.length) G.dialogueActive = false;
    }
  }
  // Mission key.
  if (wasPressed(input, 'KeyM') && !G.mission && G.missionsDone < MISSION_DEFS.length && !G.dialogueActive) {
    startMission(G, G.missionsDone);
  }
  // Mute key.
  if (wasPressed(input, 'KeyN')) {
    const muted = toggleMute(G.audio);
    G.flashMessage = muted ? 'Sound muted (N to unmute)' : 'Sound on';
    G.flashTimer = 1.5;
  }

  if (G.playerCar) updatePlayerCar(G, dt, input);
  else updatePlayerOnFoot(G, dt, input);

  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateEnemies(G, dt);
  updateMission(G, dt);

  // Running someone over in a car is a crime (on foot, bumping into people is not).
  const hitPed = G.playerCar ? checkPedHit(G) : null;
  if (hitPed) {
    G.peds = G.peds.filter((p) => p !== hitPed);
    scarePedestrians(G, hitPed.x, hitPed.y, 200);
    addWanted(G, 1, 'hit and run');
    playCrash(G.audio);
    G.shake = Math.max(G.shake, 0.25);
  }

  // Ammo / health pickups: green crates scattered on sidewalks.
  if (!G.pickups) {
    G.pickups = [
      { x: 640, y: 1040, kind: 'ammo' }, { x: 1760, y: 1240, kind: 'health' },
      { x: 2540, y: 440, kind: 'ammo' }, { x: 440, y: 1840, kind: 'health' },
      { x: 2240, y: 2040, kind: 'ammo' },
    ];
  }
  for (const pk of G.pickups) {
    if (!pk.taken && dist(G.player.x, G.player.y, pk.x, pk.y) < 34) {
      pk.taken = true;
      if (pk.kind === 'ammo') { G.player.ammo += 24; G.flashMessage = '+24 ammo'; }
      else { G.player.health = Math.min(100, G.player.health + 40); G.flashMessage = '+40 health'; }
      G.flashTimer = 2;
      playPickup(G.audio);
    }
  }

  // Camera follows the player smoothly.
  const view = renderer.view;
  const targetX = clamp((G.playerCar ? G.playerCar.x : G.player.x) - view.w / 2, 0, WORLD_W - view.w);
  const targetY = clamp((G.playerCar ? G.playerCar.y : G.player.y) - view.h / 2, 0, WORLD_H - view.h);
  G.camera.x = lerp(G.camera.x, targetX, Math.min(1, dt * 5));
  G.camera.y = lerp(G.camera.y, targetY, Math.min(1, dt * 5));

  // Engine and siren follow the game.
  setEngine(G.audio, G.playerCar ? Math.abs(G.playerCar.speed) / CAR.maxSpeed : 0, !!G.playerCar);
  setSiren(G.audio, G.wanted);

  if (G.missionFailed) {
    G.missionFailed = false;
    failMission(G);
  }
}

function runShot(name) {
  const screen = stageShot(name, G);
  let painted = 0;
  function paint() {
    renderer.draw(G, screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;

  function startGame() {
    ensureAudio(G.audio);
    G.screen = SCREEN_PLAY;
    screen = SCREEN_PLAY;
    announce('Playing Neon Bay. Press M for the next mission.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    G.player.cash = Math.floor(G.player.cash / 2);
    G.bestCash = Math.max(G.bestCash, G.player.cash);
    saveGame(G);
    announce(G.busted ? 'Busted. The crew bails you out for half your cash.' : 'Wasted. The crew bails you out for half your cash.');
  }

  function resetRun() {
    const keepCash = G.player.cash;
    const keepMissions = G.missionsDone;
    const keepBest = G.bestCash;
    const fresh = createGameState(G.seed);
    Object.assign(G, fresh);
    G.player.cash = keepCash;
    G.missionsDone = keepMissions;
    G.bestCash = keepBest;
    G.objective = keepMissions < MISSION_DEFS.length
      ? `Mission ${keepMissions + 1} ready — press M.`
      : 'All missions complete! Neon Bay is yours, Rook.';
    loadSave(G);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    // Title / over screens: Enter or click starts.
    if ((screen === SCREEN_TITLE || screen === SCREEN_OVER) && (wasPressed(input, 'Enter', 'Space') || input.clicked)) {
      if (screen === SCREEN_OVER) resetRun();
      startGame();
    } else if (screen === SCREEN_PLAY && wasPressed(input, 'KeyP', 'Escape')) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (wasPressed(input, 'KeyP', 'Escape', 'Enter') || input.clicked)) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }

    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        updateGame(G, STEP, input);
        accumulator -= STEP;
        if (G.busted || G.player.health <= 0) { endGame(); break; }
      }
      saveTimer += STEP;
      if (saveTimer > 5) { saveTimer = 0; saveGame(G); }
    } else {
      accumulator = 0;
      G.time += 1 / 60; // title backdrop keeps panning
    }
    endFrame(input);
    renderer.draw(G, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Neon Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
