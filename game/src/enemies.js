// enemies.js — drones, weavers, tanks, dart divers, splitters, orbiters
// and the shards a splitter breaks into. Capital ships live in boss.js.
// One clear job: what the player fights, how it moves, how it shoots.
import * as THREE from 'three';
import { PLAY } from './world.js';

const SPECS = {
  drone: { hp: 1, score: 100, speed: 5.5, color: 0xff2e88, radius: 0.85 },
  weaver: { hp: 2, score: 150, speed: 7, color: 0xff8a2e, radius: 0.85 },
  tank: { hp: 4, score: 300, speed: 3.2, color: 0xff3355, radius: 1.25 },
  // DART: a fast diver that steers at the ship and never shoots.
  dart: { hp: 1, score: 150, speed: 9.5, color: 0x2effa8, radius: 0.8 },
  // SPLITTER (round 4): a ringed hex that breaks into three shards on death.
  splitter: { hp: 2, score: 200, speed: 4.5, color: 0x8b5cff, radius: 1.0 },
  // ORBITER (round 4): a flat disc that circles the ship and fires in bursts.
  orbiter: { hp: 2, score: 250, speed: 6, color: 0xffc233, radius: 0.9 },
  // SHARD: what a splitter leaves behind — small, fast, fragile.
  shard: { hp: 1, score: 50, speed: 8, color: 0xc9a6ff, radius: 0.55 },
};

export class Enemies {
  constructor(scene, bullets, particles, sounds) {
    this.scene = scene;
    this.bullets = bullets;
    this.particles = particles;
    this.sounds = sounds;
    this.list = [];
    this.geoDrone = new THREE.OctahedronGeometry(0.75);
    this.geoWeaver = new THREE.TetrahedronGeometry(0.9);
    this.geoTank = new THREE.IcosahedronGeometry(1.05, 0);
    this.geoDart = new THREE.ConeGeometry(0.55, 1.7, 4);
    this.geoSplitter = new THREE.TorusGeometry(0.85, 0.22, 10, 6);
    this.geoOrbiter = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 8);
    this.geoShard = new THREE.TetrahedronGeometry(0.5);
    // Bright emissive so enemies read as solid neon gems, not wireframes.
    this.mats = {};
    for (const [kind, spec] of Object.entries(SPECS)) {
      this.mats[kind] = new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.6, roughness: 0.3, emissive: spec.color, emissiveIntensity: 1.0 });
    }
  }

  _spawnMesh(kind, x, z) {
    const spec = SPECS[kind] || SPECS.drone;
    const geoMap = {
      drone: this.geoDrone, weaver: this.geoWeaver, tank: this.geoTank,
      dart: this.geoDart, splitter: this.geoSplitter, orbiter: this.geoOrbiter,
      shard: this.geoShard,
    };
    const mesh = new THREE.Mesh(geoMap[kind] || this.geoDrone, this.mats[kind]);
    mesh.position.set(x, 0, z);
    // Darts fly tip-first at the player; orbiters lie flat like discs.
    if (kind === 'dart') mesh.rotation.x = Math.PI / 2;
    if (kind === 'orbiter') mesh.rotation.x = Math.PI / 2;
    if (kind === 'splitter') mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    // Orbiters keep their own angle around the ship.
    return {
      kind, mesh, x, z, hp: spec.hp, maxHp: spec.hp, score: spec.score,
      speed: spec.speed * (0.9 + Math.random() * 0.25), radius: spec.radius,
      phase: Math.random() * Math.PI * 2, shootTimer: 1 + Math.random() * 2,
      flashUntil: 0, baseX: x, orbitAngle: Math.random() * Math.PI * 2,
      orbitDir: Math.random() < 0.5 ? 1 : -1,
    };
  }

  spawn(kind, x, z) { this.list.push(this._spawnMesh(kind, x, z)); }

  /** dt seconds, t total, ship position for aiming, fire callback. */
  update(dt, t, shipX, shipZ, onEnemyShoot) {
    for (const e of this.list) {
      e.phase += dt;
      if (e.kind === 'drone') {
        e.z += e.speed * dt;
        e.x = e.baseX + Math.sin(e.phase * 1.4) * 0.8;
        e.mesh.rotation.y += dt * 2;
        e.mesh.rotation.x += dt;
      } else if (e.kind === 'weaver') {
        e.z += e.speed * dt;
        e.x = e.baseX + Math.sin(e.phase * 2.6) * 2.6;
        e.mesh.rotation.y += dt * 4;
      } else if (e.kind === 'dart') {
        // Darts dive at the ship: fast, steering, no shots — dodge or kill.
        e.z += e.speed * dt;
        e.x += THREE.MathUtils.clamp(shipX - e.x, -1, 1) * 4.5 * dt;
        e.x += Math.sin(e.phase * 5) * 0.4 * dt;
        e.mesh.rotation.z = THREE.MathUtils.clamp(-(shipX - e.x) * 0.15, -0.5, 0.5);
      } else if (e.kind === 'tank') {
        e.z += e.speed * dt;
        e.mesh.rotation.y += dt * 0.8;
        e.mesh.rotation.z += dt * 0.5;
      } else if (e.kind === 'splitter') {
        // Slow, steady, spinning ring — a tank that multiplies when killed.
        e.z += e.speed * dt;
        e.x = e.baseX + Math.sin(e.phase * 1.1) * 1.2;
        e.mesh.rotation.z += dt * 2.5;
      } else if (e.kind === 'orbiter') {
        // Circles the ship at mid-range, closing in slowly, firing bursts.
        // It stays ahead of the ship (never closer than 2.5 in z) so it
        // orbits instead of ramming.
        e.orbitAngle += e.orbitDir * dt * 0.9;
        const r = 7.5 - Math.min(2.5, e.phase * 0.25);
        e.x = shipX + Math.cos(e.orbitAngle) * r;
        e.z = shipZ - 4 + Math.sin(e.orbitAngle) * r * 0.8;
        e.x = THREE.MathUtils.clamp(e.x, -PLAY.x, PLAY.x);
        e.z = Math.min(e.z, shipZ - 2.5);
        e.z = THREE.MathUtils.clamp(e.z, -26, PLAY.zMax);
        e.mesh.rotation.z += dt * 3;
      } else if (e.kind === 'shard') {
        e.z += e.speed * dt;
        e.x += Math.sin(e.phase * 6) * 1.2 * dt;
        e.mesh.rotation.y += dt * 6;
      }
      e.mesh.position.set(e.x, 0, e.z);
      // Hit flash: scale pulse while recently damaged.
      const flashed = performance.now() < e.flashUntil;
      e.mesh.scale.setScalar(flashed ? 1.25 : 1);

      // Shooting: only when on screen and roughly ahead of the player.
      // Darts and shards never shoot — they are the ram.
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && e.z > -28 && e.z < 4 && e.kind !== 'dart' && e.kind !== 'shard') {
        if (e.kind === 'tank' || e.kind === 'splitter') {
          e.shootTimer = 2.2 + Math.random();
          onEnemyShoot(e, 'spread');
        } else if (e.kind === 'orbiter') {
          e.shootTimer = 2.6 + Math.random() * 0.8;
          onEnemyShoot(e, 'burst');
        } else {
          e.shootTimer = 2.6 + Math.random() * 1.6;
          onEnemyShoot(e, 'aimed');
        }
      }
    }
    // Cull enemies that slipped past the player.
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (e.z > 14) {
        this.scene.remove(e.mesh);
        this.list.splice(i, 1);
      }
    }
  }

  /**
   * A player bullet hit enemy e with `amount` damage.
   * Returns null while it lives, or { split: true } when it dies —
   * splitters break into three shards.
   */
  damage(e, amount, nowMs) {
    e.hp -= amount;
    e.flashUntil = nowMs + 90;
    if (e.hp > 0) return null;
    const burstCol = e.kind === 'dart' ? [0.2, 1, 0.65]
      : e.kind === 'splitter' ? [0.55, 0.35, 1]
      : e.kind === 'orbiter' ? [1, 0.75, 0.2]
      : e.kind === 'shard' ? [0.8, 0.65, 1]
      : [1, 0.45, 0.2];
    this.particles.burst(e.x, 0, e.z, burstCol, e.kind === 'tank' ? 40 : 26, 9, 0.7);
    if (e.kind === 'tank' || e.kind === 'splitter') {
      this.particles.ring(e.x, 0, e.z, burstCol, 6, 0.5);
    }
    this.sounds.explosion(e.kind === 'tank' || e.kind === 'splitter');
    this.scene.remove(e.mesh);
    const idx = this.list.indexOf(e);
    if (idx >= 0) this.list.splice(idx, 1);
    return { split: e.kind === 'splitter' };
  }

  clear() {
    for (const e of this.list) this.scene.remove(e.mesh);
    this.list = [];
  }
}
