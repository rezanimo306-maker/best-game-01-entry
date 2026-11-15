// particles.js — explosion sparks, engine trail, muzzle flash.
// One clear job: short-lived visual feedback, pooled so it never allocates mid-game.
import * as THREE from 'three';
import { softDot } from './world.js';

const MAX = 900;

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.baseCol = new Float32Array(MAX * 3);
    this.cursor = 0;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.42, vertexColors: true, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      map: softDot(),
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    // Hide everything initially.
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -999;
  }

  _spawn(x, y, z, vx, vy, vz, life, r, g, b) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.baseCol[i * 3] = r; this.baseCol[i * 3 + 1] = g; this.baseCol[i * 3 + 2] = b;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
  }

  /** A burst of sparks. color as [r, g, b] 0..1. */
  burst(x, y, z, color, count = 26, speed = 9, life = 0.7) {
    for (let n = 0; n < count; n++) {
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI;
      const s = speed * (0.35 + Math.random() * 0.75);
      this._spawn(x, y, z,
        Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s, Math.sin(a) * Math.cos(b) * s,
        life * (0.5 + Math.random() * 0.7), color[0], color[1], color[2]);
    }
  }

  /** One engine-trail mote behind the ship. */
  trail(x, y, z) {
    this._spawn(x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.2, z,
      (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 6 + Math.random() * 3,
      0.45, 0.15, 0.85, 1);
  }

  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3] *= (1 - 2.2 * dt);
      this.vel[i * 3 + 1] *= (1 - 2.2 * dt);
      this.vel[i * 3 + 2] *= (1 - 2.2 * dt);
      const f = this.life[i] / this.maxLife[i];
      this.col[i * 3] = this.baseCol[i * 3] * f;
      this.col[i * 3 + 1] = this.baseCol[i * 3 + 1] * f;
      this.col[i * 3 + 2] = this.baseCol[i * 3 + 2] * f;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
