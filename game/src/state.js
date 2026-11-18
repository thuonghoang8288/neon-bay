// Neon Bay — game state: one object every system reads and writes.
// One job: build a fresh game (city, player, traffic, pedestrians, police,
// missions, save data) from a seed, and load/save progress to localStorage.
import { PLAYER, SAVE_KEY, WORLD_H, WORLD_W } from './config.js';
import { mulberry32 } from './random.js';
import { buildCity } from './world.js';
import { createAudio } from './audio.js';
import { spawnTraffic } from './traffic.js';
import { spawnPedestrians } from './pedestrians.js';

export function createGameState(seed) {
  const rng = mulberry32(seed);
  const G = {
    seed, rng, time: 0, timeOfDay: 0.7, // late-afternoon sun
    city: buildCity(rng),
    player: {
      x: 600, y: 600, angle: 0, aimAngle: 0, health: PLAYER.health,
      ammo: 48, cash: 0, speedNow: 0, shootCooldown: 0, meleeCooldown: 0,
      inCar: false,
    },
    playerCar: null,
    camera: { x: 0, y: 0 },
    traffic: [], peds: [], police: [], enemies: [], bullets: [],
    wanted: 0, wantedTimer: 0,
    mission: null, missionsDone: 0, objective: 'Free roam — press M for the next mission.',
    dialogueActive: false, missionFailed: false, storyComplete: false,
    flashMessage: '', flashTimer: 0, shake: 0, muzzleTimer: 0,
    busted: false, kills: 0,
    audio: createAudio(),
    bestCash: 0,
    screen: 'title',
  };
  spawnTraffic(G, 14);
  spawnPedestrians(G, 24);
  return G;
}

export function loadSave(G) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const save = JSON.parse(raw);
    G.player.cash = save.cash || 0;
    G.missionsDone = save.missionsDone || 0;
    G.bestCash = save.bestCash || 0;
    G.player.x = save.x ?? 600;
    G.player.y = save.y ?? 600;
    return true;
  } catch { return false; }
}

export function saveGame(G) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.player.cash,
      missionsDone: G.missionsDone,
      bestCash: Math.max(G.bestCash, G.player.cash),
      x: G.player.x, y: G.player.y,
    }));
  } catch { /* storage can be off; the run still works */ }
}
