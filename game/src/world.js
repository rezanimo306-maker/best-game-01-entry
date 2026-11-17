// world.js — the scene: renderer, lights, two parallax starfields, neon
// grid, nebula, drifting shards, camera rig and screen shake.
// One clear job: everything that is scenery, not gameplay.
import * as THREE from 'three';
import { bandForWave } from './bands.js';

export const PLAY = { x: 9, zMin: -4, zMax: 5, floorY: -2.2 };

/** A soft round dot texture so point sprites read as glow, not squares. */
export function softDot() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export class World {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04040f);
    this.scene.fog = new THREE.FogExp2(0x070418, 0.016);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 200);
    this.cameraBase = new THREE.Vector3(0, 6.0, 10.8);
    this.cameraLook = new THREE.Vector3(0, -0.9, -6);
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(this.cameraLook);
    this.shake = 0;

    this.ambient = new THREE.AmbientLight(0x445577, 1.9);
    this.scene.add(this.ambient);
    this.keyLight = new THREE.DirectionalLight(0x88bbff, 1.8);
    this.keyLight.position.set(4, 10, 6);
    this.scene.add(this.keyLight);
    this.rimLight = new THREE.DirectionalLight(0xff2e88, 0.9);
    this.rimLight.position.set(-6, 3, -8);
    this.scene.add(this.rimLight);
    this.playerLight = new THREE.PointLight(0x22e6ff, 30, 18, 1.6);
    this.playerLight.position.set(0, 1, 2);
    this.scene.add(this.playerLight);

    this._buildStars();
    this._buildNearStars();
    this._buildGrid();
    this._buildNebula();
    this._buildShards();
    this.currentBand = bandForWave(1);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _scatterStars(count, spread, size, opacity) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = Math.random() * 60 - 8;
      pos[i * 3 + 2] = -Math.random() * 120 + 10;
      const pick = Math.random();
      c.set(pick < 0.6 ? 0xffffff : pick < 0.85 ? 0x9fd8ff : 0xffc2dd);
      c.multiplyScalar(0.6 + Math.random() * 0.8);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true, transparent: true, opacity, map: softDot(), depthWrite: false });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    return points;
  }

  _buildStars() {
    // The far field: many small, slow stars.
    this.stars = this._scatterStars(1300, 160, 0.55, 0.95);
  }

  _buildNearStars() {
    // The near field: fewer, bigger, faster stars — parallax depth.
    this.nearStars = this._scatterStars(220, 90, 1.15, 0.9);
  }

  _buildShards() {
    // Drifting wireframe crystals for depth in the empty black between waves.
    this.shards = [];
    const geo = new THREE.OctahedronGeometry(1, 0);
    const colors = [0x22e6ff, 0xff2e88, 0x8b5cff, 0xffc233];
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.LineBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.55 });
      const edges = new THREE.EdgesGeometry(geo);
      const shard = new THREE.LineSegments(edges, mat);
      shard.position.set((Math.random() - 0.5) * 56, Math.random() * 9 - 1, -Math.random() * 55 - 4);
      shard.scale.setScalar(0.5 + Math.random() * 1.6);
      shard.userData.spin = (Math.random() - 0.5) * 0.7;
      shard.userData.drift = 1 + Math.random() * 2;
      this.scene.add(shard);
      this.shards.push(shard);
    }
  }

  _buildGrid() {
    // Two stacked grids: a bright fine one and a dim coarse one, for depth.
    this.gridFine = new THREE.GridHelper(140, 70, 0x22e6ff, 0x123a66);
    this.gridFine.position.y = PLAY.floorY;
    this.gridFine.material.transparent = true;
    this.gridFine.material.opacity = 0.5;
    this.scene.add(this.gridFine);
    this.gridCoarse = new THREE.GridHelper(140, 14, 0xff2e88, 0x2a0f3d);
    this.gridCoarse.position.y = PLAY.floorY - 0.02;
    this.gridCoarse.material.transparent = true;
    this.gridCoarse.material.opacity = 0.35;
    this.scene.add(this.gridCoarse);
    this.grid = this.gridFine;
  }

  _makeGlow(color, x, y, z, scale) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(scale);
    this.scene.add(sprite);
    return sprite;
  }

  _buildNebula() {
    // Big soft glowing sprites far away, purely decorative.
    this.nebulaSprites = [
      this._makeGlow('rgba(139,92,255,0.55)', -38, 14, -70, 60),
      this._makeGlow('rgba(255,46,136,0.4)', 34, 8, -85, 70),
      this._makeGlow('rgba(34,230,255,0.35)', 0, 20, -95, 55),
    ];
  }

  /** Recolour a sprite's radial glow without rebuilding its texture. */
  _retintGlow(sprite, cssColor) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, cssColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    sprite.material.map.dispose();
    sprite.material.map = new THREE.CanvasTexture(canvas);
    sprite.material.needsUpdate = true;
  }

  /** Switch the whole sector to a wave's band palette. */
  setBand(wave) {
    const band = bandForWave(wave);
    this.currentBand = band;
    this.scene.background.setHex(band.bg);
    this.scene.fog.color.setHex(band.fog);
    this.scene.fog.density = band.fogDensity;
    this.ambient.color.setHex(band.ambient);
    this.keyLight.color.setHex(band.key);
    this.rimLight.color.setHex(band.rim);
    this.gridFine.material.color.setHex(band.gridFine);
    this.gridCoarse.material.color.setHex(band.gridCoarse);
    band.nebula.forEach((color, i) => {
      if (this.nebulaSprites[i]) this._retintGlow(this.nebulaSprites[i], color);
    });
  }

  /** dt in seconds, t total seconds. Scrolls the scenery and eases the camera. */
  update(dt, t, shipX) {
    this.grid.position.z = (t * 6) % 2;
    this.stars.position.z = (t * 2.5) % 4;
    this.nearStars.position.z = (t * 7) % 4;
    for (const s of this.shards) {
      s.rotation.y += s.userData.spin * dt;
      s.rotation.x += s.userData.spin * 0.6 * dt;
      s.position.z += s.userData.drift * dt;
      if (s.position.z > 10) s.position.z = -58;
    }
    const targetX = shipX * 0.35;
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, dt * 3);
    this.camera.position.y = this.cameraBase.y + Math.sin(t * 0.5) * 0.15;
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.001, dt);
    } else {
      this.shake = 0;
    }
    this.camera.lookAt(this.cameraLook);
    this.playerLight.position.x = shipX;
  }

  addShake(amount) { this.shake = Math.min(0.9, this.shake + amount); }

  /** Project a play-plane point to screen pixels (for HUD popups). */
  toScreen(x, z) {
    const v = new THREE.Vector3(x, 0, z).project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
      behind: v.z > 1,
    };
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
