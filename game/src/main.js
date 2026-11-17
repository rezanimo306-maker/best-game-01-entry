// main.js — boot, game loop, state machine, waves, draft, collisions, scoring.
// One clear job: how the whole game fits together and when it changes state.
import { World, PLAY } from './world.js';
import { bandForWave } from './bands.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { Ship } from './ship.js';
import { Enemies } from './enemies.js';
import { CapitalShips } from './boss.js';
import { Bullets } from './bullets.js';
import { Particles } from './particles.js';
import { Powerups } from './powerups.js';
import { Hud } from './hud.js';
import { rollDraft, upgradesLabel, SKIP_SCORE } from './upgrades.js';

const TOTAL_WAVES = 10;
const BOSS_WAVE = 10;
const WARDEN_WAVE = 5;
// Surge waves (3, 6, 9): the rift dumps extra hostiles at a faster pace.
const SURGE_WAVES = new Set([3, 6, 9]);
// Kill-streak milestones: combo reached, banner shown, bonus paid.
const STREAKS = [
  { combo: 5, title: 'RAMPAGE', bonus: 250 },
  { combo: 10, title: 'UNSTOPPABLE', bonus: 500 },
  { combo: 15, title: 'VOIDBORN', bonus: 1000 },
];
const COMBO_CAP = 8;

const game = {
  state: 'menu', // menu | playing | draft | paused | over
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
  upgradesTaken: {},
  draftOffers: [],
  streaksHit: new Set(),
  leviathanPhase: 0,
  lastDmgPopup: 0,
};

const world = new World(document.getElementById('app'));
const input = new Input(world.renderer.domElement);
const sounds = new SoundBank();
const particles = new Particles(world.scene);
const ship = new Ship(world.scene, particles, sounds);
const bullets = new Bullets(world.scene);
const enemies = new Enemies(world.scene, bullets, particles, sounds);
const bosses = new CapitalShips(world.scene, bullets, particles, sounds, enemies);
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
  // Drones scale up every wave; weavers join at 2, darts at 3, tanks and
  // splitters at 4, orbiters at 5. The Warden's wave runs a lighter queue.
  const queue = [];
  const surge = SURGE_WAVES.has(n);
  const drones = 4 + n * 2 + (surge ? 4 : 0) - (n === WARDEN_WAVE ? 2 : 0);
  const weavers = n >= 2 ? 1 + Math.floor(n * 0.8) + (surge ? 2 : 0) : 0;
  const darts = n >= 3 ? 1 + Math.floor((n - 1) * 0.7) + (surge ? 2 : 0) : 0;
  const tanks = n >= 4 ? Math.floor((n - 2) / 2) : 0;
  const splitters = n >= 4 ? 1 + Math.floor((n - 4) / 2) : 0;
  const orbiters = n >= 5 ? Math.min(3, 1 + Math.floor((n - 5) / 2)) : 0;
  for (let i = 0; i < drones; i++) queue.push('drone');
  for (let i = 0; i < weavers; i++) queue.push('weaver');
  for (let i = 0; i < darts; i++) queue.push('dart');
  for (let i = 0; i < tanks; i++) queue.push('tank');
  for (let i = 0; i < splitters; i++) queue.push('splitter');
  for (let i = 0; i < orbiters; i++) queue.push('orbiter');
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
  const band = bandForWave(n);
  world.setBand(n);
  hud.setBand(band.name);
  game.leviathanPhase = 0;
  if (n === BOSS_WAVE) {
    bosses.spawnLeviathan();
    game.spawnQueue = ['drone', 'drone', 'weaver', 'drone'];
    hud.banner('FINAL WAVE', 'DESTROY THE VOIDLEVIATHAN', 2400);
    sounds.waveStart();
  } else if (n === WARDEN_WAVE) {
    bosses.spawnWarden();
    game.spawnQueue = waveComposition(n);
    hud.banner(`WAVE ${n} — VOIDWARDEN`, 'A CAPITAL SHIP GUARDS THE RIFT', 2400);
    sounds.warden();
  } else {
    game.spawnQueue = waveComposition(n);
    const surge = SURGE_WAVES.has(n);
    hud.banner(
      surge ? `WAVE ${n} — SURGE` : `WAVE ${n} · ${band.name}`,
      surge ? 'THE RIFT IS POURING — HOLD THE LINE' : n === 1 ? 'DESTROY THE SWARM' : `${game.spawnQueue.length} HOSTILES INBOUND`,
      2200,
    );
    if (surge) sounds.surge(); else sounds.waveStart();
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
  game.upgradesTaken = {};
  game.streaksHit = new Set();
  game.state = 'playing';
  ship.reset();
  enemies.clear();
  bosses.clear();
  bullets.clear();
  powerups.clear();
  particles.update(10); // flush any leftover sparks
  hud.showGame();
  hud.setScore(0, 0);
  hud.setComboTimer(0);
  hud.setLives(ship.lives);
  hud.setPower('shield', false);
  hud.setPower('rapid', false);
  hud.setPower('spread', false);
  hud.setUpgrades('');
  hud.hideBoss();
  world.setBand(1);
  hud.setBand(bandForWave(1).name);
  startWave(1);
}

function endGame(won) {
  game.state = 'over';
  saveBest();
  hud.hideBoss();
  hud.hideDraft();
  hud.clearBanner();
  if (won) sounds.victory(); else sounds.gameOver();
  hud.showEnd(won, game.score, game.wave, game.kills, upgradesLabel(game.upgradesTaken));
}

/** Open the upgrade draft after a cleared wave. */
function openDraft() {
  game.state = 'draft';
  game.draftOffers = rollDraft(game.upgradesTaken);
  sounds.draft();
  hud.showDraft(game.wave, game.draftOffers, game.upgradesTaken, pickUpgrade);
}

function pickUpgrade(i) {
  if (game.state !== 'draft') return;
  if (i >= 0 && game.draftOffers[i]) {
    const offer = game.draftOffers[i];
    game.upgradesTaken[offer.id] = (game.upgradesTaken[offer.id] || 0) + 1;
    ship.applyUpgrade(offer.id);
    sounds.pick();
    hud.setUpgrades(upgradesLabel(game.upgradesTaken));
    hud.setLives(ship.lives);
    hud.banner(offer.name, offer.desc, 1600);
  } else {
    game.score += SKIP_SCORE;
    hud.setScore(game.score, game.combo);
    sounds.pick();
  }
  hud.hideDraft();
  game.state = 'playing';
  if (game.wave >= TOTAL_WAVES) { endGame(true); return; }
  startWave(game.wave + 1);
}

function addScore(base, x, z) {
  game.combo = Math.min(COMBO_CAP, game.combo + 1);
  game.comboTimer = ship.comboSeconds;
  const gained = base * game.combo;
  game.score += gained;
  game.kills += 1;
  hud.setScore(game.score, game.combo);
  // Kill-streak milestones: a banner, a sting and a bonus, once each.
  for (const s of STREAKS) {
    if (game.combo >= s.combo && !game.streaksHit.has(s.combo)) {
      game.streaksHit.add(s.combo);
      game.score += s.bonus;
      hud.setScore(game.score, game.combo);
      hud.banner(s.title, `COMBO x${game.combo} — BONUS +${s.bonus}`, 1800);
      sounds.streak();
      break;
    }
  }
  // A floating "+gained" where the kill happened: feedback on every action.
  if (x !== undefined && z !== undefined) {
    const p = world.toScreen(x, z);
    if (!p.behind) hud.popup(p.x, p.y, `+${gained}`, 'score', game.combo >= 4);
  }
}

/** A small damage number where a bolt lands (throttled so it never spams). */
function damageNumber(x, z, amount, nowMs) {
  if (nowMs - game.lastDmgPopup < 80) return;
  game.lastDmgPopup = nowMs;
  const p = world.toScreen(x, z);
  if (!p.behind) hud.popup(p.x, p.y, `${amount}`, 'dmg');
}

/** A nova core detonates: every enemy on screen takes 3 damage, plus a
 * shockwave ring, a shake and a banner. Kills score through addScore. */
function novaBlast() {
  sounds.nova();
  particles.ring(ship.x, 0, ship.z, [0.6, 0.95, 1], 18, 0.7);
  particles.burst(ship.x, 0, ship.z, [0.7, 0.95, 1], 50, 12, 0.8);
  world.addShake(0.8);
  hud.banner('NOVA BURST', 'THE SKY CLEARS', 1600);
  const nowMs = performance.now();
  for (const e of [...enemies.list]) {
    const res = enemies.damage(e, 3, nowMs);
    if (res) {
      addScore(e.score, e.x, e.z);
      if (res.split) spawnShards(e.x, e.z);
    }
  }
  for (const b of [...bosses.list]) {
    const res = bosses.damage(b, 3, nowMs);
    if (res) {
      addScore(b.score, b.x, b.z);
      onCapitalKilled(b, res);
    }
  }
  if (game.state === 'playing' && bosses.leviathan) hud.setBoss(bosses.leviathan.name, bosses.leviathan.hp, bosses.leviathan.maxHp);
}

/** A splitter breaks into three shards that keep flying at the player. */
function spawnShards(x, z) {
  for (let i = 0; i < 3; i++) {
    enemies.spawn('shard', x + (i - 1) * 1.2, z + 0.5);
  }
}

/** A capital ship died: the Warden pays out drops, the Leviathan ends the run. */
function onCapitalKilled(b, res) {
  if (res.warden) {
    powerups.dropKind(b.x - 1.5, b.z, 'shield');
    powerups.dropKind(b.x + 1.5, b.z, 'nova');
    hud.banner('VOIDWARDEN DOWN', 'SHIELD + NOVA SECURED', 2000);
  } else if (!bosses.leviathan) {
    hud.hideBoss();
    endGame(true);
  }
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
  } else if (mode === 'warden') {
    // Aimed triple + a six-way ring.
    for (const dx of [-0.2, 0, 0.2]) bullets.fireEnemy(e.x, e.z + 1, dx, 1, 12);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + e.phase * 0.5;
      bullets.fireEnemy(e.x, e.z + 1, Math.sin(a) * 0.5, Math.cos(a) * 0.5 + 0.3, 10);
    }
    sounds.enemyShoot();
  } else if (mode === 'spiral') {
    // One bolt on the rotating spiral (final phase bullet-hell).
    const a = e.spiralAngle;
    bullets.fireEnemy(e.x, e.z + 1, Math.sin(a) * 0.85, Math.cos(a) * 0.85, 9);
  } else if (mode === 'burst') {
    // Orbiter burst: three aimed bolts with a slight spread.
    const dx = (ship.x - e.x) * 0.04;
    for (const off of [-0.18, 0, 0.18]) {
      bullets.fireEnemy(e.x, e.z + 1, Math.max(-0.4, Math.min(0.4, dx + off)), 1, 11);
    }
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
  // Player bullets vs enemies and capital ships.
  for (const b of bullets.player) {
    if (!b.active) continue;
    let hit = false;
    for (const e of [...enemies.list]) {
      const dx = b.x - e.x;
      const dz = b.z - e.z;
      if (dx * dx + dz * dz < (e.radius + 0.4) * (e.radius + 0.4)) {
        b.active = false; b.mesh.visible = false;
        particles.burst(b.x, 0, b.z, [0.4, 0.9, 1], 6, 5, 0.35);
        const res = enemies.damage(e, b.dmg, nowMs);
        if (res) {
          addScore(e.score, e.x, e.z);
          powerups.drop(e.x, e.z, ship.novaLuck);
          world.addShake(0.25);
          if (res.split) spawnShards(e.x, e.z);
        } else {
          damageNumber(b.x, b.z, b.dmg, nowMs);
        }
        hit = true;
        break;
      }
    }
    if (hit) continue;
    for (const cap of [...bosses.list]) {
      const dx = b.x - cap.x;
      const dz = b.z - cap.z;
      if (dx * dx + dz * dz < (cap.radius + 0.4) * (cap.radius + 0.4)) {
        b.active = false; b.mesh.visible = false;
        particles.burst(b.x, 0, b.z, [0.4, 0.9, 1], 6, 5, 0.35);
        const res = bosses.damage(cap, b.dmg, nowMs);
        if (res) {
          addScore(cap.score, cap.x, cap.z);
          world.addShake(0.7);
          onCapitalKilled(cap, res);
          return;
        }
        damageNumber(b.x, b.z, b.dmg, nowMs);
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
          hud.flash();
          game.combo = 0;
          hud.setScore(game.score, 0);
          hud.setLives(ship.lives);
          if (res === 'dead') { endGame(false); return; }
        }
        break;
      }
    }
    // Enemy ramming the ship.
    for (const e of [...enemies.list, ...bosses.list]) {
      if (e.kind === 'boss') continue;
      const dx = e.x - ship.x;
      const dz = e.z - ship.z;
      if (dx * dx + dz * dz < (e.radius + 0.9) * (e.radius + 0.9)) {
        enemies.damage(e, 1, nowMs);
        const res = ship.takeHit(nowMs);
        particles.burst(ship.x, 0, ship.z, [1, 0.5, 0.2], 30, 10, 0.8);
        world.addShake(0.6);
        hud.flash();
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
    hud.setComboTimer(Math.max(0, game.comboTimer / ship.comboSeconds));
    if (game.comboTimer <= 0) { game.combo = 0; hud.setScore(game.score, 0); hud.setComboTimer(0); }
  }

  ship.update(dt, game.time, input, nowMs);
  if (input.firing()) bullets.firePlayer(ship.tryFire());

  // Spawn from the wave queue. Surge waves pour in faster.
  if (game.spawnQueue.length > 0) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      const kind = game.spawnQueue.shift();
      const x = (Math.random() * 2 - 1) * (PLAY.x - 1.5);
      enemies.spawn(kind, x, -28);
      const surge = SURGE_WAVES.has(game.wave);
      game.spawnTimer = Math.max(0.35, (surge ? 0.55 : 0.9) - game.wave * 0.05);
    }
  }

  enemies.update(dt, game.time, ship.x, ship.z, onEnemyShoot);
  bosses.update(dt, game.time, ship.x, ship.z, onEnemyShoot);
  bullets.update(dt);
  powerups.update(dt, game.time, ship.x, ship.z, ship.magnetRadius, (kind) => {
    if (kind === 'nova') { novaBlast(); return; }
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
  // Boss bar follows whichever capital ship is on screen.
  const cap = bosses.leviathan || bosses.warden;
  if (cap) {
    hud.setBoss(cap.name, cap.hp, cap.maxHp);
    // Leviathan phase changes: enrage, then the white-hot final phase.
    if (cap === bosses.leviathan) {
      const phase = bosses.phaseOf(cap);
      if (phase > game.leviathanPhase) {
        game.leviathanPhase = phase;
        if (phase === 2) {
          hud.banner('VOIDLEVIATHAN ENRAGED', 'IT FIGHTS FASTER NOW', 2000);
          sounds.surge();
        } else if (phase === 3) {
          hud.banner('FINAL PHASE', 'THE SPIRAL BEGINS', 2200);
          sounds.finalPhase();
          bosses.matLeviathan.emissive.setHex(0xffffff);
          bosses.matLeviathan.emissiveIntensity = 1.4;
        }
      }
    }
  } else {
    hud.hideBoss();
  }

  // Wave cleared: queue empty, nothing left alive, ship alive.
  if (game.waveActive && game.spawnQueue.length === 0 && enemies.list.length === 0 && bosses.list.length === 0) {
    game.waveActive = false;
    const bonus = 500 * game.wave;
    game.score += bonus;
    hud.setScore(game.score, game.combo);
    hud.banner('WAVE CLEARED', `BONUS +${bonus.toLocaleString('en-US')}`, 2000);
    sounds.waveClear();
    game.waveClearTimer = 1.6;
  }
  if (!game.waveActive && game.state === 'playing') {
    game.waveClearTimer -= dt;
    if (game.waveClearTimer <= 0) {
      if (game.wave >= TOTAL_WAVES) { endGame(true); return; }
      openDraft();
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
  if (code === 'KeyR' && (game.state === 'over' || game.state === 'playing' || game.state === 'draft')) startGame();
  if (code === 'KeyP' && game.state === 'playing') { game.state = 'paused'; hud.showPause(true); }
  else if (code === 'KeyP' && game.state === 'paused') { game.state = 'playing'; hud.showPause(false); }
  if (code === 'KeyM') hud.setMuted(sounds.toggleMute());
  if (game.state === 'draft') {
    if (code === 'Digit1') pickUpgrade(0);
    else if (code === 'Digit2') pickUpgrade(1);
    else if (code === 'Digit3') pickUpgrade(2);
    else if (code === 'Digit0') pickUpgrade(-1);
  }
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
  enemies: () => enemies.list.length + bosses.list.length,
  kinds: () => [...enemies.list.map((e) => e.kind), ...bosses.list.map((b) => (b.isWarden ? 'warden' : 'leviathan'))],
  positions: () => ({
    ship: { x: +ship.x.toFixed(2), z: +ship.z.toFixed(2) },
    foes: [...enemies.list, ...bosses.list].map((e) => ({ kind: e.kind, x: +e.x.toFixed(2), z: +e.z.toFixed(2) })),
  }),
  bossInfo: () => bosses.list.map((b) => ({ name: b.name, hp: b.hp, z: +b.z.toFixed(1), minionTimer: +b.minionTimer.toFixed(2) })),
  upgrades: () => ({ ...game.upgradesTaken }),
  band: () => bandForWave(game.wave).name,
  start: () => startGame(),
  gameOver: () => {
    if (game.state !== 'playing') return;
    ship.lives = 1; ship.shield = false; ship.invulnerableUntil = 0;
    if (ship.takeHit(performance.now()) === 'dead') endGame(false);
  },
  victory: () => { if (game.state === 'playing') endGame(true); },
  spawnBoss: () => { if (game.state === 'playing') bosses.spawnLeviathan(); },
  spawnWarden: () => { if (game.state === 'playing') bosses.spawnWarden(); },
  hurt: () => ship.takeHit(performance.now()),
  /** Jump straight to a wave (test hook only; used to stage screenshots). */
  skipWave: (n) => {
    if (game.state !== 'playing') return;
    enemies.clear();
    bosses.clear();
    bullets.clear();
    powerups.clear();
    game.spawnQueue = [];
    startWave(Math.max(1, Math.min(TOTAL_WAVES, n | 0)));
  },
  /** Drop extra hostiles on screen at once (test hook only; stages a busy
   * frame for screenshots — the same shot the game reaches on its own a few
   * seconds later, when the wave queue has poured in). */
  stage: (kind, count) => {
    if (game.state !== 'playing') return;
    for (let i = 0; i < (count | 0); i++) {
      enemies.spawn(kind || 'drone', (Math.random() * 2 - 1) * (PLAY.x - 2), -14 - Math.random() * 14);
    }
  },
  nova: () => { if (game.state === 'playing') novaBlast(); },
  /** Force the upgrade draft open (test hook only; stages the draft screen). */
  openDraft: () => { if (game.state === 'playing') { game.waveActive = false; openDraft(); } },
  /** Pick a draft card by index, or -1 to skip (test hook only). */
  pickUpgrade: (i) => pickUpgrade(i | 0),
  /** Set the Leviathan's HP (test hook only; stages the final phase). */
  setBossHp: (n) => {
    if (bosses.leviathan) {
      bosses.leviathan.hp = Math.max(1, n | 0);
      hud.setBoss(bosses.leviathan.name, bosses.leviathan.hp, bosses.leviathan.maxHp);
    }
  },
};
