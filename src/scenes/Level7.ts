import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { Vegetation } from '../world/Vegetation';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rat } from '../entities/enemies/Rat';
import { Chicken } from '../entities/enemies/Chicken';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 7: Praia Tropical
 * Sandy beach with palm trees, water pools, and beach rocks under bright sun.
 * Boss: Rato Praiano (fast rat boss patrolling the dunes)
 * Difficulty: fast rats on open sand, chickens roaming the shore
 */

function createPalmTree(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  scale: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Tall thin trunk with slight lean
  const trunkGeo = new THREE.CylinderGeometry(0.1 * scale, 0.18 * scale, 4 * scale, 6);
  const trunk = new THREE.Mesh(trunkGeo, toon(C.L7_PALM_TRUNK));
  trunk.position.y = 2 * scale;
  trunk.rotation.z = randomRange(-0.15, 0.15);
  trunk.castShadow = true;
  group.add(trunk);

  // Sphere of leaves at the top
  const leavesGeo = new THREE.SphereGeometry(1.1 * scale, 7, 5);
  const leaves = new THREE.Mesh(leavesGeo, toon(C.L7_PALM_LEAVES));
  leaves.position.y = 4.2 * scale;
  leaves.scale.y = 0.55;
  leaves.castShadow = true;
  group.add(leaves);

  // Coconuts cluster
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const coconutGeo = new THREE.SphereGeometry(0.1 * scale, 4, 4);
    const coconut = new THREE.Mesh(coconutGeo, toon(0x885522));
    coconut.position.set(
      Math.cos(angle) * 0.35 * scale,
      3.8 * scale,
      Math.sin(angle) * 0.35 * scale
    );
    group.add(coconut);
  }

  group.position.set(x, y, z);
  scene.add(group);
}

function createBeachPool(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  radius: number
) {
  // Shallow water disc
  const waterGeo = new THREE.CircleGeometry(radius, 12);
  const waterMat = new THREE.MeshToonMaterial({
    color: C.L7_WATER,
    transparent: true,
    opacity: 0.75,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, y + 0.05, z);
  scene.add(water);

  // Sandy rim around the pool
  const rimGeo = new THREE.RingGeometry(radius, radius + 0.4, 12);
  const rimMat = new THREE.MeshToonMaterial({ color: C.L7_SAND_DARK });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(x, y + 0.04, z);
  scene.add(rim);
}

export function createLevel7(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Bright tropical sky — no fog on a sunny beach
  const sky = new Skybox(C.L7_SKY_TOP, C.L7_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Bright sunny ambient
  const ambientLight = new THREE.AmbientLight(0xfff5cc, 0.6);
  scene.add(ambientLight);

  // Strong directional sun high in the sky
  const sunLight = new THREE.DirectionalLight(0xfffbe0, 1.2);
  sunLight.position.set(10, 35, 5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.far = 100;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  scene.add(sunLight);

  // Subtle fill light from the water reflection
  const fillLight = new THREE.DirectionalLight(0x88ccff, 0.3);
  fillLight.position.set(-10, 10, -15);
  scene.add(fillLight);

  // Terrain (sandy beach, flat with gentle dunes)
  const terrain = new Terrain({
    width: 90,
    depth: 90,
    segments: 45,
    heightScale: 2,
    color: C.L7_SAND,
    colorDark: C.L7_SAND_DARK,
    noiseScale: 0.04,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Palm trees using Vegetation with custom palm colors
  const palms = new Vegetation({
    trunkColor: C.L7_PALM_TRUNK,
    leavesColor: C.L7_PALM_LEAVES,
    count: 20,
    areaSize: 75,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
    minScale: 0.7,
    maxScale: 1.2,
  });
  scene.add(palms.group);

  // Custom palm trees scattered for variety
  for (let i = 0; i < 15; i++) {
    const x = randomRange(-38, 38);
    const z = randomRange(-38, 38);
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
    const y = terrain.getHeightAt(x, z);
    createPalmTree(scene, x, y, z, randomRange(0.8, 1.4));
  }

  // Water pools scattered like tide pools and lagoons
  const poolPositions = [
    { x: 12, z: 14, r: 3 }, { x: -18, z: 10, r: 2.5 },
    { x: 22, z: -12, r: 3.5 }, { x: -10, z: -20, r: 2 },
    { x: -28, z: -8, r: 3 }, { x: 5, z: 28, r: 2.5 },
    { x: -22, z: 20, r: 2 },
  ];
  for (const pool of poolPositions) {
    const y = terrain.getHeightAt(pool.x, pool.z);
    createBeachPool(scene, pool.x, y, pool.z, pool.r);
  }

  // Beach rocks scattered across the sand
  const rocks = new Rocks({
    color: 0xbba080,
    count: 20,
    areaSize: 80,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  const darkRocks = new Rocks({
    color: 0x998866,
    count: 12,
    areaSize: 80,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(darkRocks.group);

  // Enemies: 4 rats (fast on sand) + 3 chickens
  const enemies: Enemy[] = [];
  const ratPositions = [
    { x: 14, z: 10 }, { x: -12, z: 16 },
    { x: 20, z: -14 }, { x: -18, z: -12 },
  ];
  for (const pos of ratPositions) {
    const rat = new Rat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rat.mesh);
    enemies.push(rat);
  }

  const chickenPositions = [
    { x: 18, z: 6 }, { x: -8, z: -18 }, { x: 6, z: 24 },
  ];
  for (const pos of chickenPositions) {
    const chicken = new Chicken(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    chicken.initPhysics(physics, pos.x, y, pos.z);
    scene.add(chicken.mesh);
    enemies.push(chicken);
  }

  // Boss: Rato Praiano (fast rat boss dominating the dunes)
  const boss = new Rat(30, 30, true);
  boss.bossName = 'Rato Praiano';
  const bossY = terrain.getHeightAt(30, 30) + 3;
  boss.initPhysics(physics, 30, bossY, 30, 0.8);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Palm grove around boss area as an arena
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const px = 30 + Math.cos(angle) * 6;
    const pz = 30 + Math.sin(angle) * 6;
    const py = terrain.getHeightAt(px, pz);
    createPalmTree(scene, px, py, pz, 1.2);
  }

  // Biscuits hidden among the dunes and pools
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 7; i++) {
    const x = randomRange(-32, 32);
    const z = randomRange(-32, 32);
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
    name: 'Praia Tropical',
    boss,
  };
}
