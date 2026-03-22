import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Pig } from '../entities/enemies/Pig';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 4: Caverna Cristalina
 * Underground crystal cave with glowing crystals, mushrooms, and tight passages.
 * Boss: Coelho Cristalino (crystal-armored giant rabbit)
 * Difficulty: enemies are faster, fewer biscuits, low visibility
 */

function createCrystal(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  color: number, scale: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Main crystal shard
  const geo = new THREE.ConeGeometry(0.3 * scale, 1.5 * scale, 5);
  const mesh = new THREE.Mesh(geo, toon(color));
  mesh.position.y = 0.75 * scale;
  mesh.castShadow = true;
  group.add(mesh);

  // Smaller side crystals
  for (let i = 0; i < 3; i++) {
    const sGeo = new THREE.ConeGeometry(0.15 * scale, 0.7 * scale, 4);
    const sMesh = new THREE.Mesh(sGeo, toon(color));
    const angle = (i / 3) * Math.PI * 2 + Math.random();
    sMesh.position.set(
      Math.cos(angle) * 0.25 * scale,
      0.35 * scale,
      Math.sin(angle) * 0.25 * scale
    );
    sMesh.rotation.z = (Math.random() - 0.5) * 0.5;
    group.add(sMesh);
  }

  // Glow point light
  const glow = new THREE.PointLight(color, 0.6, 8);
  glow.position.y = 1.0 * scale;
  group.add(glow);

  group.position.set(x, y, z);
  scene.add(group);
}

function createGlowMushroom(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  scale: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.4 * scale, 5);
  const stem = new THREE.Mesh(stemGeo, toon(0xccccaa));
  stem.position.y = 0.2 * scale;
  group.add(stem);

  // Cap
  const capGeo = new THREE.SphereGeometry(0.2 * scale, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const cap = new THREE.Mesh(capGeo, toon(C.L4_MUSHROOM));
  cap.position.y = 0.4 * scale;
  group.add(cap);

  // Glow
  const glow = new THREE.PointLight(C.L4_MUSHROOM_GLOW, 0.3, 4);
  glow.position.y = 0.5 * scale;
  group.add(glow);

  group.position.set(x, y, z);
  scene.add(group);
}

export function createLevel4(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Dark cave atmosphere
  scene.fog = new THREE.FogExp2(0x0a0a1a, 0.025);

  // Skybox (dark cave ceiling)
  const sky = new Skybox(C.L4_SKY_TOP, C.L4_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Dim ambient - cave is dark!
  const ambientLight = new THREE.AmbientLight(0x222244, 0.25);
  scene.add(ambientLight);

  // Subtle directional (cracks in ceiling)
  const dirLight = new THREE.DirectionalLight(0x6688aa, 0.4);
  dirLight.position.set(5, 25, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 80;
  dirLight.shadow.camera.left = -40;
  dirLight.shadow.camera.right = 40;
  dirLight.shadow.camera.top = 40;
  dirLight.shadow.camera.bottom = -40;
  scene.add(dirLight);

  // Terrain (cave floor, relatively flat with some bumps)
  const terrain = new Terrain({
    width: 85,
    depth: 85,
    segments: 42,
    heightScale: 2.5,
    color: C.L4_GROUND,
    colorDark: C.L4_GROUND_DARK,
    noiseScale: 0.06,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Crystal formations scattered around
  const crystalColors = [C.L4_CRYSTAL, C.L4_CRYSTAL_DARK, C.L4_CRYSTAL_PINK, C.L4_CRYSTAL_GREEN];
  for (let i = 0; i < 25; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
    const y = terrain.getHeightAt(x, z);
    const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];
    createCrystal(scene, x, y, z, color, randomRange(0.8, 2.0));
  }

  // Glowing mushrooms
  for (let i = 0; i < 20; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    const y = terrain.getHeightAt(x, z);
    createGlowMushroom(scene, x, y, z, randomRange(0.8, 1.5));
  }

  // Dark cave rocks - many!
  const rocks = new Rocks({
    color: C.L4_ROCK,
    count: 40,
    areaSize: 75,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  const darkRocks = new Rocks({
    color: C.L4_ROCK_DARK,
    count: 30,
    areaSize: 75,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(darkRocks.group);

  // Stalactites (hanging rocks from ceiling)
  for (let i = 0; i < 15; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    const geo = new THREE.ConeGeometry(
      randomRange(0.2, 0.5),
      randomRange(1, 3),
      5
    );
    const mat = new THREE.MeshToonMaterial({ color: C.L4_ROCK_DARK });
    const stalactite = new THREE.Mesh(geo, mat);
    stalactite.position.set(x, randomRange(12, 18), z);
    stalactite.rotation.x = Math.PI; // Point downward
    scene.add(stalactite);
  }

  // Enemies: 5 fast rabbits + 3 pigs (tougher in the dark)
  const enemies: Enemy[] = [];
  const rabbitPositions = [
    { x: 15, z: 8 }, { x: -12, z: 18 }, { x: 22, z: -10 },
    { x: -20, z: -15 }, { x: 8, z: -25 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rabbit.mesh);
    enemies.push(rabbit);
  }

  const pigPositions = [
    { x: -18, z: 12 }, { x: 25, z: 15 }, { x: -8, z: -22 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    scene.add(pig.mesh);
    enemies.push(pig);
  }

  // Boss: Coelho Cristalino (giant rabbit, deep in the cave)
  const boss = new Rabbit(32, 32, true);
  boss.bossName = 'Coelho Cristalino';
  const bossY = terrain.getHeightAt(32, 32) + 3;
  boss.initPhysics(physics, 32, bossY, 32, 0.9);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Crystal glow around boss area
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const cx = 32 + Math.cos(angle) * 5;
    const cz = 32 + Math.sin(angle) * 5;
    const cy = terrain.getHeightAt(cx, cz);
    createCrystal(scene, cx, cy, cz, C.L4_CRYSTAL_PINK, 2.5);
  }

  // Biscuits (scarce in the cave!)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 5; i++) {
    const x = randomRange(-30, 30);
    const z = randomRange(-30, 30);
    const y = terrain.getHeightAt(x, z);
    const biscuit = new Biscuit(x, y, z);
    scene.add(biscuit.mesh);
    biscuits.push(biscuit);
  }

  const spawnY = terrain.getHeightAt(0, 0) + 3;

  return {
    scene,
    terrain,
    enemies,
    biscuits,
    spawnPoint: { x: 0, y: spawnY, z: 0 },
    name: 'Caverna Cristalina',
    boss,
  };
}
