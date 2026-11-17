// powerups.js — shield / rapid / spread drops, plus the rare Nova core.
// Drops drift toward the player inside the magnet radius, so a magnet
// upgrade makes every drop feel rewarding instead of lucky.
// One clear job: the good things enemies drop.
import * as THREE from 'three';

const KINDS = {
  shield: { color: 0x22e6ff, weight: 3 },
  rapid: { color: 0xffc233, weight: 3 },
  spread: { color: 0x8b5cff, weight: 3 },
  // NOVA: a rare white core. On pickup it detonates every enemy on screen —
  // the one drop that turns a bad wave around.
  nova: { color: 0xffffff, weight: 1 },
};

export class Powerups {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.geo = new THREE.OctahedronGeometry(0.55);
    this.mats = {};
    for (const [kind, def] of Object.entries(KINDS)) {
      this.mats[kind] = new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.4, roughness: 0.3, emissive: def.color, emissiveIntensity: 0.9 });
    }
  }

  /** Force a drop of one kind (used for the Warden's guaranteed reward). */
  dropKind(x, z, kind) {
    const mesh = new THREE.Mesh(this.geo, this.mats[kind] || this.mats.shield);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.list.push({ kind, mesh, x, z, phase: Math.random() * Math.PI * 2 });
  }

  /** 12% drop chance per kill; nova luck from the draft raises the nova share. */
  drop(x, z, novaLuck = 0) {
    if (Math.random() > 0.12) return;
    const weights = { ...KINDS };
    const total = Object.values(weights).reduce((s, k) => s + k.weight, 0) + novaLuck;
    let roll = Math.random() * total;
    let kind = 'shield';
    for (const [k, def] of Object.entries(weights)) {
      roll -= def.weight;
      if (roll <= 0) { kind = k; break; }
    }
    if (roll > 0) kind = 'nova';
    this.dropKind(x, z, kind);
  }

  update(dt, t, shipX, shipZ, magnetRadius, onCollect) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.phase += dt;
      p.z += 3.2 * dt;
      // Drift toward the player inside the magnet radius.
      const dx = shipX - p.x;
      const dz = shipZ - p.z;
      const d = Math.hypot(dx, dz);
      if (d < magnetRadius && d > 0.01) {
        p.x += (dx / d) * 4 * dt;
        p.z += (dz / d) * 4 * dt;
      }
      p.mesh.position.set(p.x, Math.sin(p.phase * 3) * 0.25, p.z);
      p.mesh.rotation.y += dt * 3;
      if (d < 1.4) {
        onCollect(p.kind);
        this.scene.remove(p.mesh);
        this.list.splice(i, 1);
        continue;
      }
      if (p.z > 14) {
        this.scene.remove(p.mesh);
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.list) this.scene.remove(p.mesh);
    this.list = [];
  }
}
