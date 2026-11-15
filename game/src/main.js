// main.js — boot, game loop, state machine, waves, collisions, scoring.
// One clear job: how the whole game fits together and when it changes state.
import { World, PLAY } from './world.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { Ship } from './ship.js';
import { Enemies } from './enemies.js';
import { Bullets } from './bullets.js';
import { Particles } from './particles.js';
import { Powerups } from './powerups.js';
import { Hud } from './hud.js';

const TOTAL_WAVES = 10;
const BOSS_WAVE = 10;

const game = {
  state: 'menu', // menu | playing | paused | over
  score: 0,
  combo: 0,
  comboTimer: 0,
  kills: 0,
  wave: 1,
  best: 0,
  spawnQueue: [],
  spawnTimer: 0,
  waveActive: false,
  waveClearTimer: 0,
  time: 0,
};

const world = new World(document.getElementById('app'));
const input = new Input(world.renderer.domElement);
const sounds = new SoundBank();
const particles = new Particles(world.scene);
const ship = new Ship(world.scene, particles, sounds);
const bullets = new Bullets(world.scene);
const enemies = new Enemies(world.scene, bullets, particles, sounds);
const powerups = new Powerups(world.scene);
const hud = new Hud();

try { game.best = Number(localStorage.getItem('neonvoid-best') || 0) || 0; } catch { game.best = 0; }
function saveBest() {
  if (game.score > game.best) {
    game.best = game.score;
    try { localStorage.setItem('neonvoid-best', String(game.best)); } catch { /* best score is optional */ }
  }
}

function waveComposition(n) {
  // Drones scale up every wave; weavers join at 2, tanks at 4, boss at 10.
  const queue = [];
  const drones = 4 + n * 2;
  const weavers = n >= 2 ? 1 + Math.floor(n * 0.8) : 0;
  const tanks = n >= 4 ? Math.floor((n - 2) / 2) : 0;
  for (let i = 0; i < drones; i++) queue.push('drone');
  for (let i = 0; i < weavers; i++) queue.push('weaver');
  for (let i = 0; i < tanks; i++) queue.push('tank');
  // Shuffle so the wave never feels like a queue.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

function startWave(n) {
  game.wave = n;
  hud.setWave(n);
  if (n === BOSS_WAVE) {
    enemies.spawnBoss();
    game.spawnQueue = ['drone', 'drone', 'weaver', 'drone'];
    hud.banner('FINAL WAVE', 'DESTROY THE VOIDLEVIATHAN', 2400);
    sounds.waveStart();
  } else {
    game.spawnQueue = waveComposition(n);
    hud.banner(`WAVE ${n}`, n === 1 ? 'DESTROY THE SWARM' : `${game.spawnQueue.length} HOSTILES INBOUND`, 2000);
    sounds.waveStart();
  }
  game.spawnTimer = 0.8;
  game.waveActive = true;
  game.waveClearTimer = 0;
}

function startGame() {
  sounds.unlock();
  game.score = 0;
  game.combo = 0;
  game.kills = 0;
  game.state = 'playing';
  ship.reset();
  enemies.clear();
  bullets.clear();
  powerups.clear();
  particles.update(10); // flush any leftover sparks
  hud.showGame();
  hud.setScore(0, 0);
  hud.setLives(ship.lives);
  hud.setPower('shield', false);
  hud.setPower('rapid', false);
  hud.setPower('spread', false);
  hud.hideBoss();
  startWave(1);
}

function endGame(won) {
  game.state = 'over';
  saveBest();
  hud.hideBoss();
  hud.clearBanner();
  if (won) sounds.victory(); else sounds.gameOver();
  hud.showEnd(won, game.score, game.wave, game.kills);
}

function addScore(base) {
  game.combo = Math.min(5, game.combo + 1);
  game.comboTimer = 4;
  game.score += base * game.combo;
  game.kills += 1;
  hud.setScore(game.score, game.combo);
}

function onEnemyShoot(e, mode) {
  const nowMs = performance.now();
  if (mode === 'boss') {
    // Radial burst + aimed triple.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + e.phase * 0.3;
      bullets.fireEnemy(e.x, e.z + 1, Math.sin(a) * 0.55, Math.cos(a) * 0.6 + 0.4, 10);
    }
    bullets.fireEnemy(e.x, e.z + 1, (ship.x - e.x) * 0.03, 1, 13);
    sounds.enemyShoot();
  } else if (mode === 'spread') {
    bullets.fireEnemy(e.x, e.z + 1, -0.25, 1, 11);
    bullets.fireEnemy(e.x, e.z + 1, 0, 1, 11);
    bullets.fireEnemy(e.x, e.z + 1, 0.25, 1, 11);
    sounds.enemyShoot();
  } else {
    const dx = (ship.x - e.x) * 0.04;
    bullets.fireEnemy(e.x, e.z + 1, Math.max(-0.3, Math.min(0.3, dx)), 1, 12);
    sounds.enemyShoot();
  }
}

function collide(dt) {
  const nowMs = performance.now();
  // Player bullets vs enemies.
  for (const b of bullets.player) {
    if (!b.active) continue;
    for (const e of [...enemies.list]) {
      const dx = b.x - e.x;
      const dz = b.z - e.z;
      if (dx * dx + dz * dz < (e.radius + 0.4) * (e.radius + 0.4)) {
        b.active = false; b.mesh.visible = false;
        particles.burst(b.x, 0, b.z, [0.4, 0.9, 1], 6, 5, 0.35);
        if (enemies.damage(e, nowMs)) {
          addScore(e.score);
          powerups.drop(e.x, e.z);
          world.addShake(e.kind === 'boss' ? 0.7 : 0.25);
          if (e.kind === 'boss') { hud.hideBoss(); endGame(true); return; }
        }
        break;
      }
    }
  }
  // Enemy bullets vs ship.
  if (ship.alive) {
    for (const b of bullets.enemy) {
      if (!b.active) continue;
      const dx = b.x - ship.x;
      const dz = b.z - ship.z;
      if (dx * dx + dz * dz < 1.1) {
        b.active = false; b.mesh.visible = false;
        const res = ship.takeHit(nowMs);
        if (res === 'shield') {
          particles.burst(ship.x, 0, ship.z, [0.2, 0.9, 1], 18, 7, 0.5);
          hud.setPower('shield', false);
        } else if (res === 'hit' || res === 'dead') {
          particles.burst(ship.x, 0, ship.z, [1, 0.4, 0.3], 40, 11, 0.9);
          world.addShake(0.6);
          game.combo = 0;
          hud.setScore(game.score, 0);
          hud.setLives(ship.lives);
          if (res === 'dead') { endGame(false); return; }
        }
        break;
      }
    }
    // Enemy ramming the ship.
    for (const e of [...enemies.list]) {
      if (e.kind === 'boss') continue;
      const dx = e.x - ship.x;
      const dz = e.z - ship.z;
      if (dx * dx + dz * dz < (e.radius + 0.9) * (e.radius + 0.9)) {
        enemies.damage(e, nowMs);
        const res = ship.takeHit(nowMs);
        particles.burst(ship.x, 0, ship.z, [1, 0.5, 0.2], 30, 10, 0.8);
        world.addShake(0.6);
        game.combo = 0;
        hud.setScore(game.score, 0);
        hud.setLives(ship.lives);
        if (res === 'dead') { endGame(false); return; }
        break;
      }
    }
  }
}

function updatePlaying(dt) {
  const nowMs = performance.now();
  // Combo decays.
  if (game.combo > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) { game.combo = 0; hud.setScore(game.score, 0); }
  }

  ship.update(dt, game.time, input, nowMs);
  if (input.firing()) bullets.firePlayer(ship.tryFire());

  // Spawn from the wave queue.
  if (game.spawnQueue.length > 0) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      const kind = game.spawnQueue.shift();
      const x = (Math.random() * 2 - 1) * (PLAY.x - 1.5);
      enemies.spawn(kind, x, -28);
      game.spawnTimer = Math.max(0.35, 1.15 - game.wave * 0.06);
    }
  }

  enemies.update(dt, game.time, ship.x, onEnemyShoot);
  bullets.update(dt);
  powerups.update(dt, game.time, ship.x, ship.z, (kind) => {
    ship.grantPower(kind, nowMs);
    sounds.powerup();
    hud.setPower(kind, true);
    if (kind === 'shield') setTimeout(() => hud.setPower('shield', ship.shield), 0);
    addScore(50);
  });
  collide(dt);
  if (game.state !== 'playing') return;

  // Power-up timers tick down in the HUD.
  hud.setPower('rapid', nowMs < ship.rapidUntil);
  hud.setPower('spread', nowMs < ship.spreadUntil);
  if (enemies.boss) hud.setBoss(enemies.boss.hp, enemies.boss.maxHp);

  // Wave cleared: queue empty, no enemies left, ship alive.
  if (game.waveActive && game.spawnQueue.length === 0 && enemies.list.length === 0) {
    game.waveActive = false;
    game.waveClearTimer = 2.2;
    const bonus = 500 * game.wave;
    game.score += bonus;
    hud.setScore(game.score, game.combo);
    hud.banner('WAVE CLEARED', `BONUS +${bonus.toLocaleString('en-US')}`, 2000);
    sounds.waveClear();
  }
  if (!game.waveActive && game.state === 'playing') {
    game.waveClearTimer -= dt;
    if (game.waveClearTimer <= 0) {
      if (game.wave >= TOTAL_WAVES) { endGame(true); return; }
      startWave(game.wave + 1);
    }
  }
}

// ---------- input wiring ----------
input.onPress((code) => {
  if (code === 'Enter' || code === 'Space') {
    sounds.unlock();
    if (game.state === 'menu') startGame();
    else if (game.state === 'over') startGame();
  }
  if (code === 'KeyR' && (game.state === 'over' || game.state === 'playing')) startGame();
  if (code === 'KeyP' && game.state === 'playing') { game.state = 'paused'; hud.showPause(true); }
  else if (code === 'KeyP' && game.state === 'paused') { game.state = 'playing'; hud.showPause(false); }
  if (code === 'KeyM') hud.setMuted(sounds.toggleMute());
});
input.onAny((code) => {
  if (code === 'MouseDown') {
    sounds.unlock();
    if (game.state === 'menu' || game.state === 'over') startGame();
  }
});
document.getElementById('menu-panel').addEventListener('click', () => { sounds.unlock(); if (game.state === 'menu') startGame(); });
document.getElementById('end-panel').addEventListener('click', () => { sounds.unlock(); if (game.state === 'over') startGame(); });

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;
  if (game.state === 'playing') updatePlaying(dt);
  particles.update(dt);
  world.update(dt, game.time, ship.x);
  world.render();
}
requestAnimationFrame(frame);
hud.showMenu(game.best);

// ---------- small test hook for automated play-testing ----------
// Lets a test drive the game to any screen without playing it by hand.
window.__NEONVOID__ = {
  state: () => game.state,
  score: () => game.score,
  wave: () => game.wave,
  lives: () => ship.lives,
  enemies: () => enemies.list.length,
  start: () => startGame(),
  gameOver: () => {
    if (game.state !== 'playing') return;
    ship.lives = 1; ship.shield = false; ship.invulnerableUntil = 0;
    if (ship.takeHit(performance.now()) === 'dead') endGame(false);
  },
  victory: () => { if (game.state === 'playing') endGame(true); },
  spawnBoss: () => { if (game.state === 'playing') { enemies.spawnBoss(); } },
  hurt: () => ship.takeHit(performance.now()),
};
