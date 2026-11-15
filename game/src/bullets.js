// bullets.js — player and enemy projectiles, pooled meshes, sphere collisions.
// One clear job: everything that flies straight and hurts something.
import * as THREE from 'three';

const PLAYER_POOL = 48;
const ENEMY_POOL = 64;

export class Bullets {
  constructor(scene) {
    this.scene = scene;
    this.player = [];
    this.enemy = [];
    const pGeo = new THREE.CapsuleGeometry(0.09, 0.7, 3, 8);
    pGeo.rotateX(Math.PI / 2);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x66f6ff });
    const eGeo = new THREE.SphereGeometry(0.22, 10, 8);
    const eMat = new THREE.MeshBasicMaterial({ color: 0xff5c9d });
    for (let i = 0; i < PLAYER_POOL; i++) {
      const m = new THREE.Mesh(pGeo, pMat);
      m.visible = false;
      this.scene.add(m);
      this.player.push({ mesh: m, active: false, x: 0, z: 0, dx: 0, speed: 34 });
    }
    for (let i = 0; i < ENEMY_POOL; i++) {
      const m = new THREE.Mesh(eGeo, eMat);
      m.visible = false;
      this.scene.add(m);
      this.enemy.push({ mesh: m, active: false, x: 0, z: 0, dx: 0, dz: 1, speed: 12 });
    }
  }

  firePlayer(shots) {
    for (const s of shots) {
      const b = this.player.find((p) => !p.active);
      if (!b) return;
      b.active = true;
      b.x = s.x; b.z = s.z; b.dx = s.dx;
      b.mesh.visible = true;
      b.mesh.position.set(b.x, 0, b.z);
    }
  }

  fireEnemy(x, z, dx = 0, dz = 1, speed = 12) {
    const b = this.enemy.find((p) => !p.active);
    if (!b) return;
    b.active = true;
    b.x = x; b.z = z; b.dx = dx; b.dz = dz; b.speed = speed;
    b.mesh.visible = true;
    b.mesh.position.set(b.x, 0, b.z);
  }

  update(dt) {
    for (const b of this.player) {
      if (!b.active) continue;
      b.z -= b.speed * dt;
      b.x += b.dx * b.speed * dt;
      if (b.z < -34 || Math.abs(b.x) > 14) { b.active = false; b.mesh.visible = false; continue; }
      b.mesh.position.set(b.x, 0, b.z);
    }
    for (const b of this.enemy) {
      if (!b.active) continue;
      b.z += b.dz * b.speed * dt;
      b.x += b.dx * b.speed * dt;
      if (b.z > 16 || Math.abs(b.x) > 14) { b.active = false; b.mesh.visible = false; continue; }
      b.mesh.position.set(b.x, 0, b.z);
    }
  }

  clear() {
    for (const b of [...this.player, ...this.enemy]) { b.active = false; b.mesh.visible = false; }
  }
}
