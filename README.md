# NEON VOID

A neon 3D arcade space shooter. Pilot the last interceptor of the Void
Patrol through 10 waves of swarm drones and destroy the VOIDLEVIATHAN
capital ship to win the sector.

## How to play

Serve `game/` with any static HTTP server and open `index.html` in desktop
Chrome. No network is needed: every file the game loads lives under `game/`.

- **Move** — WASD / arrow keys, or steer with the mouse
- **Fire** — hold Space or the mouse button
- **Pause** — P · **Mute** — M
- **Start / restart** — Enter, or click
- **Pick an upgrade** — click a card, or press 1 / 2 / 3 (0 skips)

Destroy drones to build your combo multiplier, grab power-ups (shield,
rapid fire, spread shot), and survive all 10 waves. Lose all your hulls and
the run ends.

Round 4 adds: a **between-wave upgrade draft** (pick 1 of 3 — heavy rounds,
twin cannons, hull plating, magnet coil, Nova charge and more, each
stackable), two new enemies (**splitters** that break into three shards and
**orbiters** that circle you firing bursts), a **VOIDWARDEN mini-boss** on
wave 5, a **three-phase final boss** (enrage, then a white-hot spiral
bullet-hell final phase), three **visual wave bands** (Azure Drift, Ember
Rift, Crimson Deep) that re-tint the whole sector, damage numbers on every
hit, kill-streak banners (RAMPAGE / UNSTOPPABLE / VOIDBORN), and a second
parallax starfield.

## Layout

- `game/index.html` — the page, HUD, menus and the upgrade draft panel
- `game/src/main.js` — boot, game loop, state machine, waves, draft, scoring
- `game/src/world.js` — scene, lights, starfields, neon grid, camera rig
- `game/src/bands.js` — the three wave-band palettes
- `game/src/input.js` — keyboard + mouse input
- `game/src/ship.js` — the player interceptor and its upgrade stats
- `game/src/enemies.js` — drones, weavers, tanks, darts, splitters, orbiters, shards
- `game/src/boss.js` — the VOIDLEVIATHAN and the VOIDWARDEN capital ships
- `game/src/bullets.js` — player and enemy projectiles
- `game/src/particles.js` — explosions, engine trail, muzzle flash, shockwave rings
- `game/src/powerups.js` — shield / rapid / spread / Nova drops
- `game/src/upgrades.js` — the upgrade pool and the draft roll
- `game/src/audio.js` — synthesized WebAudio sounds (no audio files)
- `game/src/hud.js` — HUD, banners, damage numbers, draft UI, menu screens
- `game/vendor/three/three.module.min.js` — vendored three.js r187
- `main.ts` — hands game/ + screenshots/ in and writes dossier.json
- `screenshots/` — real renders of the game in a browser
