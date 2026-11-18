// Neon Bay — shared constants, palette and tuning for the whole game.
// One job: every magic number lives here so the other files read like prose.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_SPACING = 400;
export const ROAD_W = 72;

export const COLORS = {
  grass: '#3f7d4a', grassDark: '#356b3f',
  sand: '#e8d29a', water: '#1e7fa8', waterDeep: '#14658a',
  road: '#2b2f36', roadLine: '#e8c33a', sidewalk: '#8a8f98',
  buildingA: '#c96f4a', buildingB: '#4a7ec9', buildingC: '#8a5fc9',
  buildingD: '#4ac9a0', buildingE: '#c9b44a', roof: '#5a3a2e',
  park: '#2e6b34', parkTree: '#1f4d24',
  player: '#ffd23f', playerCar: '#ff4757',
  police: '#1e5fd6', policeLight: '#ff2d2d',
  gang: '#8b1e3f', enemy: '#a83232',
};

export const PLAYER = { radius: 14, walkSpeed: 210, health: 100 };
export const CAR = { length: 46, width: 24, accel: 420, maxSpeed: 520, reverseMax: 160, turnRate: 2.6, drag: 0.6 };
export const WANTED_MAX = 5;
export const SAVE_KEY = 'neon-bay-save-v1';

// Mission rewards in cash.
export const MISSION_REWARDS = [150, 300, 500, 1200];
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
