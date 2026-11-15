// powerups.js — shield / rapid / spread drops: drift, spin, collect.
// One clear job: the good things enemies drop.
import * as THREE from 'three';

const KINDS = {
  shield: { color: 0x22e6ff, label: 'S', weight: 3 },
  rapid: { color: 0xffc233, label: 'R', weight: 3 },
  spread: { color: 0x8b5cff, label: 'W', weight: 3 },
  // NOVA (round 3): a rare white core. On pickup it detonates every enemy
  // on screen — the one drop that turns a bad wave around.
  nova: { color: 0xffffff, label: 'N', weight: 1 },
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

  drop(x, z) {
    // 12% drop chance, kind picked by weight (nova is rare: 1 in 10 drops).
    if (Math.random() > 0.12) return;
    const kinds = Object.keys(KINDS);
    let total = 0;
    for (const k of kinds) total += KINDS[k].weight;
    let roll = Math.random() * total;
    let kind = kinds[0];
    for (const k of kinds) { roll -= KINDS[k].weight; if (roll <= 0) { kind = k; break; } }
    const mesh = new THREE.Mesh(this.geo, this.mats[kind]);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.list.push({ kind, mesh, x, z, phase: Math.random() * Math.PI * 2 });
  }

  update(dt, t, shipX, shipZ, onCollect) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.phase += dt;
      p.z += 3.2 * dt;
      // Drift gently toward the player so drops feel rewarding.
      const dx = shipX - p.x;
      const dz = shipZ - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 7) { p.x += (dx / d) * 4 * dt; p.z += (dz / d) * 4 * dt; }
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
