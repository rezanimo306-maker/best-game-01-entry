// boss.js — the capital ships: the VOIDLEVIATHAN (final boss, three phases)
// and the VOIDWARDEN (mini-boss guarding wave 5).
// One clear job: the big fights, their movement, phases and attacks.
import * as THREE from 'three';

const LEVIATHAN_HP = 80;
const WARDEN_HP = 25;

export class CapitalShips {
  constructor(scene, bullets, particles, sounds, enemies) {
    this.scene = scene;
    this.bullets = bullets;
    this.particles = particles;
    this.sounds = sounds;
    this.enemies = enemies;
    this.list = [];
    this.leviathan = null;
    this.warden = null;
    this.geoLeviathan = new THREE.DodecahedronGeometry(3.0, 0);
    this.geoWarden = new THREE.DodecahedronGeometry(1.7, 0);
    this.matLeviathan = new THREE.MeshStandardMaterial({ color: 0xaa1155, metalness: 0.75, roughness: 0.25, emissive: 0xff2e88, emissiveIntensity: 1.0 });
    this.matWarden = new THREE.MeshStandardMaterial({ color: 0x3311aa, metalness: 0.7, roughness: 0.3, emissive: 0x8b5cff, emissiveIntensity: 1.0 });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  }

  _makeCapital(geo, mat, eyeColor, ringColor, ringRadius, x, z, hp, score) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), this.eyeMat.clone());
    eye.material.color.setHex(eyeColor);
    eye.position.set(0, 0, 2.5);
    mesh.add(eye);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ringRadius, 0.09, 8, 48),
      new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.7 }),
    );
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);
    return {
      kind: 'boss', mesh, ring, x, z, hp, maxHp: hp, score,
      speed: 2.2, radius: 3.0, phase: 0, shootTimer: 2, spiralTimer: 0,
      spiralAngle: 0, minionTimer: 5, flashUntil: 0, baseX: x,
    };
  }

  spawnLeviathan() {
    const boss = this._makeCapital(this.geoLeviathan, this.matLeviathan, 0xffe066, 0xff2e88, 3.9, 0, -24, LEVIATHAN_HP, 5000);
    boss.name = 'VOIDLEVIATHAN';
    boss.radius = 3.0;
    this.leviathan = boss;
    this.list.push(boss);
    return boss;
  }

  spawnWarden() {
    const boss = this._makeCapital(this.geoWarden, this.matWarden, 0x22e6ff, 0x8b5cff, 2.4, 0, -22, WARDEN_HP, 1500);
    boss.name = 'VOIDWARDEN';
    boss.radius = 2.0;
    boss.isWarden = true;
    this.warden = boss;
    this.list.push(boss);
    return boss;
  }

  /** Leviathan phase: 1 above half health, 2 enraged, 3 final (last quarter). */
  phaseOf(boss) {
    if (boss.isWarden) return 1;
    if (boss.hp <= boss.maxHp / 4) return 3;
    if (boss.hp <= boss.maxHp / 2) return 2;
    return 1;
  }

  /** dt seconds, t total, ship position, fire callback, minion-spawn callback. */
  update(dt, t, shipX, shipZ, onEnemyShoot) {
    for (const b of this.list) {
      b.phase += dt;
      const phase = this.phaseOf(b);
      if (b.isWarden) {
        b.z = Math.min(b.z + dt * 1.1, -17);
        b.x = Math.sin(b.phase * 0.7) * 6;
        b.mesh.rotation.y += dt * 0.9;
        b.ring.rotation.z += dt * 1.6;
        // Every few seconds it calls in two drones.
        b.minionTimer -= dt;
        if (b.minionTimer <= 0 && b.z > -26) {
          b.minionTimer = 6;
          this.enemies.spawn('drone', b.x - 2, b.z + 2);
          this.enemies.spawn('drone', b.x + 2, b.z + 2);
          this.sounds.enemyShoot();
        }
      } else {
        // Leviathan: faster approach and wider sweep as phases deepen.
        const approach = phase === 3 ? 2.0 : phase === 2 ? 1.5 : 0.8;
        b.z = Math.min(b.z + dt * approach, -16);
        b.x = Math.sin(b.phase * (phase === 3 ? 1.1 : phase === 2 ? 0.85 : 0.55)) * (phase === 3 ? 8 : phase === 2 ? 7.5 : 6.5);
        b.mesh.rotation.y += dt * (phase === 3 ? 1.4 : phase === 2 ? 1.1 : 0.6);
        b.ring.rotation.z += dt * (phase === 3 ? 3 : phase === 2 ? 2.4 : 1.2);
        // Final phase: a slow spiral of bullets, the bullet-hell moment.
        if (phase === 3) {
          b.spiralTimer -= dt;
          if (b.spiralTimer <= 0) {
            b.spiralTimer = 0.16;
            b.spiralAngle += 0.55;
            onEnemyShoot(b, 'spiral');
          }
        }
      }
      b.mesh.position.set(b.x, 0, b.z);
      const flashed = performance.now() < b.flashUntil;
      b.mesh.scale.setScalar(flashed ? 1.12 : 1);

      b.shootTimer -= dt;
      if (b.shootTimer <= 0 && b.z > -28 && b.z < 4) {
        if (b.isWarden) {
          b.shootTimer = 1.1;
          onEnemyShoot(b, 'warden');
        } else if (phase === 3) {
          b.shootTimer = 1.6;
          onEnemyShoot(b, 'boss');
        } else {
          b.shootTimer = phase === 2 ? 0.55 : 0.85;
          onEnemyShoot(b, 'boss');
        }
      }
    }
    // Cull a capital ship that slipped past the player (should not happen).
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (b.z > 14) {
        this.scene.remove(b.mesh);
        this.list.splice(i, 1);
        if (b === this.leviathan) this.leviathan = null;
        if (b === this.warden) this.warden = null;
      }
    }
  }

  /**
   * A player bullet hit capital ship b with `amount` damage.
   * Returns null while it lives, or { phase } when it dies.
   */
  damage(b, amount, nowMs) {
    b.hp -= amount;
    b.flashUntil = nowMs + 90;
    if (b.hp > 0) return null;
    this.particles.burst(b.x, 0, b.z, [1, 0.3, 0.6], 90, 14, 1.1);
    this.particles.ring(b.x, 0, b.z, [1, 0.3, 0.6], 22, 0.9);
    this.particles.ring(b.x, 0, b.z, [1, 0.9, 0.4], 14, 0.7);
    this.sounds.explosion(true);
    this.scene.remove(b.mesh);
    const idx = this.list.indexOf(b);
    if (idx >= 0) this.list.splice(idx, 1);
    const wasWarden = !!b.isWarden;
    if (b === this.leviathan) this.leviathan = null;
    if (b === this.warden) this.warden = null;
    return { warden: wasWarden };
  }

  clear() {
    for (const b of this.list) this.scene.remove(b.mesh);
    this.list = [];
    this.leviathan = null;
    this.warden = null;
  }
}
