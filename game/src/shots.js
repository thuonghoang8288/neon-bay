// Neon Bay — screenshot staging behind ?shot=start|play|chase|mission.
// One job: put a fresh game into a deterministic, photogenic state for each
// named shot, advance the world a fixed number of steps, paint twice and set
// window.__shotReady so the screenshot tool knows the frame is settled.
import { spawnGang } from './combat.js';
import { addWanted, spawnPolice } from './police.js';
import { startMission } from './missions.js';
import { updateGame } from './main.js';

// Drive the player car forward along a road for a fixed number of steps.
function autopilotDrive(G, steps) {
  for (let i = 0; i < steps; i += 1) {
    G.autoDrive = true;
    updateGame(G, 1 / 60, {
      keys: new Set(['KeyW']), pressed: new Set(), mouseX: 640, mouseY: 360,
      mouseDown: false, clicked: false,
    });
    G.autoDrive = false;
  }
}

function putPlayerInCar(G, x, y, angle) {
  const car = { x, y, angle, speed: 220, color: '#ff4757', length: 46, width: 24, health: 100 };
  G.playerCar = car;
  G.player.inCar = true;
  G.player.x = x; G.player.y = y;
  G.camera.x = x - 640; G.camera.y = y - 360;
}

export function stageShot(name, G) {
  if (name === 'start') {
    G.time = 12;
    return 'title';
  }
  if (name === 'play') {
    G.screen = 'play';
    putPlayerInCar(G, 1000, 1000, 0);
    autopilotDrive(G, 60);
    return 'play';
  }
  if (name === 'chase') {
    G.screen = 'play';
    putPlayerInCar(G, 1000, 1400, 0);
    addWanted(G, 3, 'grand theft auto');
    spawnPolice(G);
    // Park two police cars close behind for the frame.
    if (G.police[0]) { G.police[0].x = 880; G.police[0].y = 1400; G.police[0].angle = 0; G.police[0].speed = 300; }
    if (G.police[1]) { G.police[1].x = 860; G.police[1].y = 1450; G.police[1].angle = 0; G.police[1].speed = 280; }
    autopilotDrive(G, 30);
    return 'play';
  }
  if (name === 'mission') {
    G.screen = 'play';
    startMission(G, 2); // The Pickup: gang at the docks
    G.dialogueActive = false;
    G.player.x = 420; G.player.y = 2050;
    G.player.aimAngle = Math.atan2(2150 - 2050, 300 - 420);
    spawnGang(G, 300, 2150, 0); // mission already spawned 4; keep the scene full
    G.player.ammo = 48;
    // Step the world so gang members and traffic settle into frame.
    for (let i = 0; i < 40; i += 1) {
      updateGame(G, 1 / 60, {
        keys: new Set(), pressed: new Set(), mouseX: 900, mouseY: 300,
        mouseDown: false, clicked: false,
      });
    }
    G.camera.x = Math.max(0, Math.min(G.player.x - 640, 3200 - 1280));
    G.camera.y = Math.max(0, Math.min(G.player.y - 360, 2400 - 720));
    return 'play';
  }
  return 'title';
}
