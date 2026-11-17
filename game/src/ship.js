// ship.js — the player interceptor: mesh, movement, firing, shield, lives,
// and the upgrade stats the draft system grows between waves.
// One clear job: everything the player's ship is and does.
import * as THREE from 'three';
import { PLAY } from './world.js';

const BASE_SPEED = 15;
const BASE_FIRE_INTERVAL = 0.16;

export class Ship {
  constructor(scene, particles, sounds) {
    this.scene = scene;
    this.particles = particles;
    this.sounds = sounds;
    this.group = new THREE.Group();
    this._buildMesh();
    this.group.position.set(0, 0, 2);
    this.scene.add(this.group);

    // Shield ring, hidden until a shield is picked up.
    const ringGeo = new THREE.TorusGeometry(1.35, 0.06, 10, 40);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x22e6ff, transparent: true, opacity: 0.85 });
    this.shieldRing = new THREE.Mesh(ringGeo, ringMat);
    this.shieldRing.rotation.x = Math.PI / 2;
    this.shieldRing.visible = false;
    this.group.add(this.shieldRing);

    this.x = 0;
    this.z = 2;
    this.vx = 0;
    this.vz = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.shield = false;
    this.shieldCharges = 0;
    this.invulnerableUntil = 0;
    this.fireCooldown = 0;
    this.rapidUntil = 0;
    this.spreadUntil = 0;
    this.alive = true;
    this.trailAcc = 0;
    // Upgrade stats (grown by the draft in upgrades.js).
    this.damage = 1;
    this.fireRateMul = 1;
    this.extraShots = 0;
    this.speedMul = 1;
    this.magnetRadius = 7;
    this.comboSeconds = 4;
    this.novaLuck = 0;
  }

  _buildMesh() {
    const hull = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, metalness: 0.85, roughness: 0.25, emissive: 0x0a2a44, emissiveIntensity: 0.7 });
    const neon = new THREE.MeshBasicMaterial({ color: 0x22e6ff });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x2244aa, metalness: 0.8, roughness: 0.3, emissive: 0x1133ff, emissiveIntensity: 0.5 });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.7, 4), hull);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.z = -0.9;
    this.group.add(nose);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 1.5), hull);
    this.group.add(body);

    const wingGeo = new THREE.BoxGeometry(1.5, 0.08, 0.7);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.z = 0.45;
    this.group.add(wing);

    const tipGeo = new THREE.BoxGeometry(0.08, 0.3, 0.5);
    for (const sx of [-1, 1]) {
      const tip = new THREE.Mesh(tipGeo, neon);
      tip.position.set(sx * 0.78, 0.08, 0.5);
      this.group.add(tip);
    }

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 1.2), neon);
    this.group.add(stripe);

    // Engine glow.
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 64;
    const g = glowCanvas.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(160,240,255,1)');
    grad.addColorStop(0.4, 'rgba(34,230,255,0.6)');
    grad.addColorStop(1, 'rgba(34,230,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.engineGlow = new THREE.Sprite(glowMat);
    this.engineGlow.position.set(0, 0, 0.95);
    this.engineGlow.scale.setScalar(0.85);
    this.group.add(this.engineGlow);
  }

  reset() {
    this.x = 0; this.z = 2; this.vx = 0; this.vz = 0;
    this.lives = 3; this.maxLives = 3; this.shield = false;
    this.shieldCharges = 0;
    this.invulnerableUntil = 0;
    this.fireCooldown = 0;
    this.rapidUntil = 0;
    this.spreadUntil = 0;
    this.alive = true;
    this.group.visible = true;
    this.group.position.set(0, 0, 2);
    this.shieldRing.visible = false;
    this.damage = 1;
    this.fireRateMul = 1;
    this.extraShots = 0;
    this.speedMul = 1;
    this.magnetRadius = 7;
    this.comboSeconds = 4;
    this.novaLuck = 0;
  }

  /** Apply one drafted upgrade. Called by upgrades.js, one line per effect. */
  applyUpgrade(id) {
    if (id === 'heavy') this.damage += 1;
    else if (id === 'rapid') this.fireRateMul *= 0.8;
    else if (id === 'twin') this.extraShots += 1;
    else if (id === 'hull') { this.maxLives += 1; this.lives = Math.min(this.maxLives, this.lives + 1); }
    else if (id === 'repair') this.lives = Math.min(this.maxLives, this.lives + 1);
    else if (id === 'magnet') this.magnetRadius += 5;
    else if (id === 'nova') this.novaLuck += 1;
    else if (id === 'overdrive') this.comboSeconds += 2;
    else if (id === 'plating') { this.shield = true; this.shieldCharges = Math.max(this.shieldCharges, 2); }
    else if (id === 'thrusters') this.speedMul *= 1.15;
  }

  /** dt seconds, t total seconds, input from Input, nowMs for timers. */
  update(dt, t, input, nowMs) {
    if (!this.alive) return;
    const steer = input.steer();
    const speed = BASE_SPEED * this.speedMul;
    let tx = this.x + steer.x * speed * dt;
    let tz = this.z + steer.y * speed * dt;
    // Mouse steers the ship toward the pointer's projected position.
    if (input.mouseActive && steer.x === 0 && steer.y === 0) {
      tx = this.x + (input.mouseX * PLAY.x - this.x) * Math.min(1, dt * 6);
      tz = this.z + ((input.mouseY * 0.5 + 0.5) * (PLAY.zMax - PLAY.zMin) + PLAY.zMin - this.z) * Math.min(1, dt * 6);
    }
    tx = Math.max(-PLAY.x, Math.min(PLAY.x, tx));
    tz = Math.max(PLAY.zMin, Math.min(PLAY.zMax, tz));
    this.vx = (tx - this.x) / Math.max(dt, 0.001);
    this.vz = (tz - this.z) / Math.max(dt, 0.001);
    this.x = tx; this.z = tz;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.z = THREE.MathUtils.clamp(-this.vx * 0.035, -0.55, 0.55);
    this.group.rotation.x = THREE.MathUtils.clamp(this.vz * 0.03, -0.4, 0.4);
    this.engineGlow.scale.setScalar(0.8 + Math.sin(t * 30) * 0.12 + Math.abs(this.vz) * 0.01);

    // Blink while invulnerable.
    const inv = nowMs < this.invulnerableUntil;
    this.group.visible = !inv || Math.floor(t * 14) % 2 === 0;
    if (this.shield) {
      this.shieldRing.visible = true;
      this.shieldRing.rotation.z = t * 2;
    } else {
      this.shieldRing.visible = false;
    }

    // Engine trail.
    this.trailAcc += dt;
    if (this.trailAcc > 0.03) {
      this.trailAcc = 0;
      this.particles.trail(this.x, 0, this.z + 1.1);
    }

    this.fireCooldown -= dt;
  }

  /** Returns bullet spawn points when a shot is due, else []. */
  tryFire() {
    if (!this.alive || this.fireCooldown > 0) return [];
    let interval = BASE_FIRE_INTERVAL * this.fireRateMul;
    if (performance.now() < this.rapidUntil) interval *= 0.55;
    this.fireCooldown = interval;
    this.sounds.shoot();
    this.particles.muzzle(this.x, 0, this.z - 1.4);
    const shots = [{ x: this.x, z: this.z - 1.4, dx: 0, dmg: this.damage }];
    // Twin cannons add a side shot per stack; spread adds angled shots.
    const spread = performance.now() < this.spreadUntil;
    const side = this.extraShots + (spread ? 1 : 0);
    if (side >= 1) {
      shots.push({ x: this.x - 0.45, z: this.z - 1.2, dx: -0.18, dmg: this.damage });
      shots.push({ x: this.x + 0.45, z: this.z - 1.2, dx: 0.18, dmg: this.damage });
    }
    if (side >= 2) {
      shots.push({ x: this.x - 0.8, z: this.z - 1.0, dx: -0.34, dmg: this.damage });
      shots.push({ x: this.x + 0.8, z: this.z - 1.0, dx: 0.34, dmg: this.damage });
    }
    return shots;
  }

  /** A hit landed. Returns 'shield' | 'hit' | 'dead'. */
  takeHit(nowMs) {
    if (!this.alive || nowMs < this.invulnerableUntil) return 'none';
    if (this.shield) {
      this.shieldCharges -= 1;
      if (this.shieldCharges <= 0) this.shield = false;
      this.invulnerableUntil = nowMs + 1200;
      this.sounds.hit();
      return 'shield';
    }
    this.lives -= 1;
    this.sounds.hit();
    if (this.lives <= 0) {
      this.alive = false;
      this.group.visible = false;
      return 'dead';
    }
    this.invulnerableUntil = nowMs + 2000;
    return 'hit';
  }

  grantPower(kind, nowMs) {
    if (kind === 'shield') { this.shield = true; this.shieldCharges = Math.max(this.shieldCharges, 1); }
    else if (kind === 'rapid') this.rapidUntil = nowMs + 8000;
    else if (kind === 'spread') this.spreadUntil = nowMs + 8000;
  }
}
