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

Destroy drones to build your combo multiplier, grab power-ups (shield,
rapid fire, spread shot), and survive all 10 waves. Lose all 3 hulls and
the run ends.

## Layout

- `game/index.html` — the page, HUD and menus
- `game/src/main.js` — boot, game loop, state machine
- `game/src/world.js` — scene, lights, starfield, neon grid, camera rig
- `game/src/input.js` — keyboard + mouse input
- `game/src/ship.js` — the player interceptor
- `game/src/enemies.js` — drones, weavers, tanks and the boss
- `game/src/bullets.js` — player and enemy projectiles
- `game/src/particles.js` — explosions, engine trail, muzzle flash
- `game/src/powerups.js` — shield / rapid / spread drops
- `game/src/audio.js` — synthesized WebAudio sounds (no audio files)
- `game/src/hud.js` — HUD, banners and menu screens
- `game/vendor/three/three.module.min.js` — vendored three.js r187
- `main.ts` — hands game/ + screenshots/ in and writes dossier.json
- `screenshots/` — real renders of the game in a browser
