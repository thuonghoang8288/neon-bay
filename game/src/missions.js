// Neon Bay — missions and story.
// One job: the four story missions — their dialogue, objectives, triggers,
// pass/fail and cash rewards. The game loop only calls startMission,
// updateMission and missionTarget.
import { MISSION_REWARDS } from './config.js';
import { dist } from './random.js';
import { addWanted } from './police.js';
import { spawnGang } from './combat.js';
import { playMission, playPickup } from './audio.js';

export const MISSION_DEFS = [
  {
    id: 1, name: 'First Run', giver: 'Mara Voss',
    brief: 'Mara needs a package driven to the Pier. Steal a car if you have to — just get it there.',
    dialogue: [
      'MARA: Rook. You still owe me for that courier job.',
      'ROOK: I paid that off, Mara. Twice.',
      'MARA: Then this one is easy money. Package, Pier, no questions. $150.',
    ],
    target: { x: 2920, y: 1113, label: 'Neon Bay Pier' },
    needsCar: true,
  },
  {
    id: 2, name: 'Smoke and Sirens', giver: 'Mara Voss',
    brief: 'The drop was watched. Lose the heat and reach the safehouse in the park district.',
    dialogue: [
      'MARA: Cops made the drop. You are hot — two stars, at least.',
      'ROOK: Great. First job back and I am already a headline.',
      'MARA: Drive like you mean it. Safehouse by the park. $300 if you make it.',
    ],
    target: { x: 1400, y: 1000, label: 'Park Safehouse' },
    startWanted: 2,
  },
  {
    id: 3, name: 'The Pickup', giver: 'Dante Cole',
    brief: 'Dante is pinned down by the Red Tide gang near the docks. Get to him, clear the gang, bring him out.',
    dialogue: [
      'DANTE: Rook! Red Tide jumped me at the docks!',
      'ROOK: How many?',
      'DANTE: Four, maybe five. Bring the pistol. $500 and I forget you owe me.',
    ],
    target: { x: 300, y: 2150, label: 'Docks — Dante' },
    gangAtTarget: 4,
  },
  {
    id: 4, name: 'The Neon Heist', giver: 'Mara Voss',
    brief: 'Finale: hit the Coral Hotel vault crew, grab the cash, and escape to the Pier. Red Tide guards the money.',
    dialogue: [
      'MARA: One last job, Rook. The Coral Hotel. The vault crew skims every Friday.',
      'ROOK: And Red Tide guards it.',
      'MARA: That is why it pays $1,200. Take the cash, get to the Pier, and we are done.',
    ],
    target: { x: 600, y: 600, label: 'Coral Hotel Vault' },
    gangAtTarget: 6, escapeTarget: { x: 2920, y: 1113, label: 'Neon Bay Pier' },
  },
];

export function startMission(G, index) {
  const def = MISSION_DEFS[index];
  G.mission = {
    index, def, stage: 'go', startedAt: G.time,
    dialogue: def.dialogue.slice(), dialogueIdx: 0,
  };
  G.objective = def.brief;
  G.dialogueActive = true;
  if (def.startWanted) addWanted(G, def.startWanted, 'made at the drop');
  if (def.gangAtTarget) spawnGang(G, def.target.x, def.target.y, def.gangAtTarget);
  playMission(G.audio);
}

export function missionTarget(G) {
  if (!G.mission) return null;
  if (G.mission.stage === 'escape') return G.mission.def.escapeTarget;
  return G.mission.def.target;
}

export function updateMission(G, dt) {
  if (!G.mission) return;
  const m = G.mission;
  const target = missionTarget(G);
  const px = G.playerCar ? G.playerCar.x : G.player.x;
  const py = G.playerCar ? G.playerCar.y : G.player.y;
  const d = dist(px, py, target.x, target.y);
  m.distance = d;
  if (m.stage === 'go' && d < 70) {
    if (m.def.id === 3) {
      // Mission 3: clear the gang first, then the pickup completes.
      if (G.enemies.length === 0) { completeMission(G); return; }
      G.objective = 'Clear the Red Tide gang, then reach Dante.';
      return;
    }
    if (m.def.id === 4) {
      if (G.enemies.length === 0) {
        m.stage = 'escape';
        G.objective = 'Vault cash grabbed! Escape to the Neon Bay Pier.';
        G.player.cash += 200; // the vault skim, on the spot
        playPickup(G.audio);
        return;
      }
      G.objective = 'Clear the vault guards, then grab the cash.';
      return;
    }
    completeMission(G);
  } else if (m.stage === 'escape' && d < 70) {
    completeMission(G);
  }
  // Fail: busted or wasted ends the mission.
  if (G.busted || G.player.health <= 0) {
    G.missionFailed = true;
  }
}

export function completeMission(G) {
  const m = G.mission;
  const reward = MISSION_REWARDS[m.index];
  G.player.cash += reward;
  G.missionsDone += 1;
  G.flashMessage = `MISSION COMPLETE — ${m.def.name}  +$${reward}`;
  G.flashTimer = 4;
  playPickup(G.audio);
  G.mission = null;
  G.objective = G.missionsDone < MISSION_DEFS.length
    ? `Mission ${G.missionsDone + 1} ready — drive to the yellow marker (press M).`
    : 'All missions complete! Neon Bay is yours, Rook.';
  if (G.missionsDone >= MISSION_DEFS.length) G.storyComplete = true;
}

export function failMission(G) {
  if (!G.mission) return;
  G.flashMessage = `MISSION FAILED — ${G.mission.def.name}. Press M to retry.`;
  G.flashTimer = 4;
  G.mission = null;
  G.enemies.length = 0;
  G.objective = 'Mission failed. Press M to retry the next job.';
}
