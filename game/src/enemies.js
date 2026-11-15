// enemies.js — drones, weavers, tanks and the VOIDLEVIATHAN boss.
// One clear job: what the player fights, how it moves, how it shoots.
import * as THREE from 'three';
import { PLAY } from './world.js';

const DRONE = { hp: 1, score: 100, speed: 5.5, color: 0xff2e88, radius: 0.85 };
const WEAVER = { hp: 2, score: 150, speed: 7, color: 0xff8a2e, radius: 0.85 };
const TANK = { hp: 4, score: 300, speed: 3.2, color: 0xff3355, radius: 1.25 };
// DART (round 3): a fast diver that steers at the ship and never shoots.
// It reads as a threat the moment it appears, so waves feel different.
const DART = { hp: 1, score: 150, speed: 9.5, color: 0x2effa8, radius: 0.8 };

export class Enemies {
  constructor(scene, bullets, particles, sounds) {
    this.scene = scene;
    this.bullets = bullets;
    this.particles = particles;
    this.sounds = sounds;
    this.list = [];
    this.boss = null;
    this.geoDrone = new THREE.OctahedronGeometry(0.75);
    this.geoWeaver = new THREE.TetrahedronGeometry(0.9);
    this.geoTank = new THREE.IcosahedronGeometry(1.05, 0);
    this.geoDart = new THREE.ConeGeometry(0.55, 1.7, 4);
    this.geoBoss = new THREE.DodecahedronGeometry(3.0, 0);
    // Bright emissive so enemies read as solid neon gems, not wireframes.
    this.mats = {
      drone: new THREE.MeshStandardMaterial({ color: DRONE.color, metalness: 0.6, roughness: 0.3, emissive: DRONE.color, emissiveIntensity: 1.0 }),
      weaver: new THREE.MeshStandardMaterial({ color: WEAVER.color, metalness: 0.6, roughness: 0.3, emissive: WEAVER.color, emissiveIntensity: 1.0 }),
      tank: new THREE.MeshStandardMaterial({ color: TANK.color, metalness: 0.7, roughness: 0.3, emissive: TANK.color, emissiveIntensity: 0.9 }),
      dart: new THREE.MeshStandardMaterial({ color: DART.color, metalness: 0.6, roughness: 0.3, emissive: DART.color, emissiveIntensity: 1.0 }),
      boss: new THREE.MeshStandardMaterial({ color: 0xaa1155, metalness: 0.75, roughness: 0.25, emissive: 0xff2e88, emissiveIntensity: 1.0 }),
    };
    // Boss core eye.
    this.bossEyeMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  }

  _spawnMesh(kind, x, z) {
    let geo, mat, spec;
    if (kind === 'drone') { geo = this.geoDrone; mat = this.mats.drone; spec = DRONE; }
    else if (kind === 'weaver') { geo = this.geoWeaver; mat = this.mats.weaver; spec = WEAVER; }
    else if (kind === 'dart') { geo = this.geoDart; mat = this.mats.dart; spec = DART; }
    else { geo = this.geoTank; mat = this.mats.tank; spec = TANK; }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    // Darts fly tip-first at the player.
    if (kind === 'dart') mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    return {
      kind, mesh, x, z, hp: spec.hp, maxHp: spec.hp, score: spec.score,
      speed: spec.speed * (0.9 + Math.random() * 0.25), radius: spec.radius,
      phase: Math.random() * Math.PI * 2, shootTimer: 1 + Math.random() * 2,
      flashUntil: 0, baseX: x,
    };
  }

  spawn(kind, x, z) { this.list.push(this._spawnMesh(kind, x, z)); }

  spawnBoss() {
    const mesh = new THREE.Mesh(this.geoBoss, this.mats.boss);
    mesh.position.set(0, 0, -24);
    this.scene.add(mesh);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), this.bossEyeMat);
    eye.position.set(0, 0, 2.5);
    mesh.add(eye);
    // A spinning halo ring so the boss reads as a capital ship, not a rock.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.9, 0.09, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.7 }),
    );
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);
    this.boss = {
      kind: 'boss', mesh, ring, x: 0, z: -24, hp: 60, maxHp: 60, score: 5000,
      speed: 2.2, radius: 3.0, phase: 0, shootTimer: 2, flashUntil: 0, baseX: 0,
    };
    this.list.push(this.boss);
    return this.boss;
  }

  /** dt seconds, t total, shipX for aiming, fire callback decides enemy shots. */
  update(dt, t, shipX, onEnemyShoot) {
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
      } else if (e.kind === 'boss') {
        // Enrage under half health: faster approach, wider sweep, quicker fire.
        const enraged = e.hp < e.maxHp / 2;
        e.z = Math.min(e.z + dt * (enraged ? 1.5 : 0.8), -16);
        e.x = Math.sin(e.phase * (enraged ? 0.85 : 0.55)) * (enraged ? 7.5 : 6.5);
        e.mesh.rotation.y += dt * (enraged ? 1.1 : 0.6);
        if (e.ring) e.ring.rotation.z += dt * (enraged ? 2.4 : 1.2);
      }
      e.mesh.position.set(e.x, 0, e.z);
      // Hit flash: scale pulse while recently damaged.
      const flashed = performance.now() < e.flashUntil;
      const s = flashed ? 1.25 : 1;
      e.mesh.scale.setScalar(s);

      // Shooting: only when on screen and roughly ahead of the player.
      // Darts never shoot — they are the ram.
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && e.z > -28 && e.z < 4 && e.kind !== 'dart') {
        if (e.kind === 'boss') {
          e.shootTimer = e.hp < e.maxHp / 2 ? 0.55 : 0.85;
          onEnemyShoot(e, 'boss');
        } else if (e.kind === 'tank') {
          e.shootTimer = 2.2 + Math.random();
          onEnemyShoot(e, 'spread');
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
        if (e === this.boss) this.boss = null;
      }
    }
  }

  /** A player bullet hit enemy e. Returns true when the enemy dies. */
  damage(e, nowMs) {
    e.hp -= 1;
    e.flashUntil = nowMs + 90;
    if (e.hp <= 0) {
      // Burst in the enemy's own colour: boss magenta, dart mint, the rest orange.
      const burstCol = e.kind === 'boss' ? [1, 0.3, 0.6] : e.kind === 'dart' ? [0.2, 1, 0.65] : [1, 0.45, 0.2];
      this.particles.burst(e.x, 0, e.z, burstCol, e.kind === 'boss' ? 90 : 26, e.kind === 'boss' ? 14 : 9, e.kind === 'boss' ? 1.1 : 0.7);
      this.sounds.explosion(e.kind === 'boss' || e.kind === 'tank');
      this.scene.remove(e.mesh);
      const idx = this.list.indexOf(e);
      if (idx >= 0) this.list.splice(idx, 1);
      if (e === this.boss) this.boss = null;
      return true;
    }
    return false;
  }

  clear() {
    for (const e of this.list) this.scene.remove(e.mesh);
    this.list = [];
    this.boss = null;
  }
}
