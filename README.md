# Neon Bay

A top-down 2D open-world crime game, built for the make.fun bounty
**[gta6-01 — Make GTA 6](https://make.fun/bounty/gta6-01)**.

Jay "Rook" Mercer is back in Neon Bay — and Mara Voss owns his debt. Steal cars,
outrun the Bay PD, run four story missions, and take the Coral Hotel. The city is
yours to explore on foot or behind the wheel: a sun-soaked coastal grid with a
beach and pier, a park, docks, traffic, and pedestrians who flee when things get
loud.

## What is in the game

- **Open world** — a 3200×2400 city: road grid, buildings, beach/pier district,
  park, docks, sunset lighting, smooth follow camera.
- **Driving** — enter/exit any parked or traffic car with `E`, steal traffic cars
  (the owner calls it in), acceleration, braking, steering, collisions.
- **Traffic & pedestrians** — cars drive the roads and stop for the car ahead;
  pedestrians stroll the sidewalks and run from gunfire and speeding cars.
- **Wanted level 0–5** — crime (theft, hit-and-run, assault, shooting a cop)
  raises the heat; police cars ram you and foot cops try to arrest you; lie low
  and the heat decays.
- **4 story missions** — First Run (delivery drive), Smoke and Sirens (getaway
  under 2 stars), The Pickup (rescue Dante from the Red Tide gang), The Neon
  Heist (finale: Coral Hotel vault, escape to the Pier). Dialogue, markers,
  pass/fail, cash rewards.
- **Combat** — pistol with mouse aim and ammo, fists with `F`, gang members who
  shoot back, health/ammo pickups.
- **HUD & minimap** — health, cash, ammo, wanted stars, mission objective,
  speedometer, live minimap (player, traffic, police, mission marker).
- **Menus & save** — title screen, pause, busted/wasted + restart, progress
  (cash, missions) saved to localStorage.
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots,
  pickups. No audio files. `N` mutes.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot / drive |
| Mouse | Aim (click to shoot) |
| E | Enter / exit / steal a car |
| F | Punch |
| M | Start the next mission |
| H | Horn |
| P / Esc | Pause |
| N | Mute |

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `game/` is plain static files.

Screenshot scenes (used to take `screenshots/`): `?shot=start|play|chase|mission&seed=1`.

## Referral

Built for the make.fun bounty — referral code `namj8s1b`.
