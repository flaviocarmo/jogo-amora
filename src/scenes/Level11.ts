import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { Vegetation } from '../world/Vegetation';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Pig } from '../entities/enemies/Pig';
import { Cat } from '../entities/enemies/Cat';
import { Rat } from '../entities/enemies/Rat';
import { Chicken } from '../entities/enemies/Chicken';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 11: Cemiterio Sombrio
 * A haunted graveyard with tombstones, iron fences, and dead trees under eerie fog.
 * Boss: Rato Fantasma (phantom rat boss)
 * Difficulty: very high - all enemy types present, heavy fog disorientation
 */

function createTombstone(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  rotation = 0
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Main tombstone slab
  const slabGeo = new THREE.BoxGeometry(0.8, 1.4, 0.18);
  const slab = new THREE.Mesh(slabGeo, toon(C.L11_TOMBSTONE));
  slab.position.y = 0.7;
  slab.castShadow = true;
  group.add(slab);

  // Rounded top arch (smaller box on top of slab)
  const archGeo = new THREE.BoxGeometry(0.8, 0.35, 0.2);
  const arch = new THREE.Mesh(archGeo, toon(C.L11_TOMBSTONE));
  arch.position.y = 1.55;
  group.add(arch);

  // Cross on top
  const crossVGeo = new THREE.BoxGeometry(0.08, 0.5, 0.1);
  const crossV = new THREE.Mesh(crossVGeo, toon(0x666666));
  crossV.position.y = 1.85;
  group.add(crossV);

  const crossHGeo = new THREE.BoxGeometry(0.35, 0.08, 0.1);
  const crossH = new THREE.Mesh(crossHGeo, toon(0x666666));
  crossH.position.y = 2.0;
  group.add(crossH);

  // Eerie green light near tombstone
  const eerieLight = new THREE.PointLight(0x44ff66, 0.5, 5);
  eerieLight.position.set(0, 1.0, 0.3);
  group.add(eerieLight);

  group.position.set(x, y, z);
  group.rotation.y = rotation;
  scene.add(group);
}

function createIronFence(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  length: number, rotation = 0
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Horizontal rail
  const railGeo = new THREE.BoxGeometry(length, 0.06, 0.06);
  const rail = new THREE.Mesh(railGeo, toon(C.L11_FENCE));
  rail.position.y = 0.8;
  group.add(rail);

  const rail2 = new THREE.Mesh(railGeo, toon(C.L11_FENCE));
  rail2.position.y = 0.4;
  group.add(rail2);

  // Vertical fence posts / spikes
  const postCount = Math.floor(length / 0.6) + 1;
  for (let i = 0; i < postCount; i++) {
    const px = -length / 2 + i * (length / (postCount - 1));

    const postGeo = new THREE.BoxGeometry(0.06, 1.0, 0.06);
    const post = new THREE.Mesh(postGeo, toon(C.L11_FENCE));
    post.position.set(px, 0.5, 0);
    group.add(post);

    // Spike tip
    const spikeGeo = new THREE.ConeGeometry(0.05, 0.2, 4);
    const spike = new THREE.Mesh(spikeGeo, toon(C.L11_FENCE));
    spike.position.set(px, 1.1, 0);
    group.add(spike);
  }

  group.position.set(x, y, z);
  group.rotation.y = rotation;
  scene.add(group);
}

export function createLevel11(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Heavy exponential fog for graveyard atmosphere
  scene.fog = new THREE.FogExp2(C.L11_FOG, 0.02);

  // Skybox (near-black night sky)
  const sky = new Skybox(C.L11_SKY_TOP, C.L11_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Dim moonlight
  const hemiLight = new THREE.HemisphereLight(C.L11_SKY_TOP, C.L11_GROUND_DARK, 0.3);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x111122, 0.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x8888cc, 0.5);
  dirLight.position.set(10, 30, -15);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 120;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);

  // Terrain (undulating graveyard ground)
  const terrain = new Terrain({
    width: 95,
    depth: 95,
    segments: 48,
    heightScale: 3,
    color: C.L11_GROUND,
    colorDark: C.L11_GROUND_DARK,
    noiseScale: 0.04,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Tombstones scattered across the graveyard
  const tombstonePositions = [
    { x: -8, z: -5, rot: 0.1 }, { x: 6, z: -8, rot: -0.2 },
    { x: -14, z: 10, rot: 0.3 }, { x: 12, z: 12, rot: -0.1 },
    { x: 3, z: 18, rot: 0.15 }, { x: -20, z: -12, rot: -0.3 },
    { x: 18, z: -15, rot: 0.2 }, { x: -5, z: 25, rot: 0.05 },
    { x: 22, z: 5, rot: -0.25 }, { x: -25, z: 15, rot: 0.4 },
    { x: 10, z: -25, rot: -0.1 }, { x: -12, z: -22, rot: 0.2 },
    { x: 28, z: -8, rot: 0.1 }, { x: -28, z: 0, rot: -0.15 },
    { x: 0, z: 30, rot: 0.3 }, { x: 15, z: 28, rot: -0.2 },
  ];
  for (const pos of tombstonePositions) {
    const y = terrain.getHeightAt(pos.x, pos.z);
    createTombstone(scene, pos.x, y, pos.z, pos.rot);
  }

  // Iron fences forming cemetery perimeters around clusters
  const fenceSegments = [
    { x: -10, z: -2, length: 8, rot: 0 },
    { x: -6, z: 6, length: 6, rot: Math.PI / 2 },
    { x: 8, z: 10, length: 10, rot: 0 },
    { x: 13, z: 5, length: 8, rot: Math.PI / 2 },
    { x: -18, z: 12, length: 7, rot: 0.1 },
    { x: 20, z: -10, length: 9, rot: -0.1 },
    { x: -3, z: 22, length: 12, rot: 0 },
  ];
  for (const seg of fenceSegments) {
    const y = terrain.getHeightAt(seg.x, seg.z);
    createIronFence(scene, seg.x, y, seg.z, seg.length, seg.rot);
  }

  // Dead trees (dark, sparse, very few leaves)
  const deadTrees = new Vegetation({
    trunkColor: 0x2a1a0a,
    leavesColor: 0x1a1a1a,
    count: 12,
    areaSize: 85,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
    minScale: 0.6,
    maxScale: 1.1,
    treeType: 'dead',
  });
  scene.add(deadTrees.group);

  // Dark rocks among the graves
  const rocks = new Rocks({
    color: 0x333333,
    count: 25,
    areaSize: 88,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  // Enemies: ALL types present in the graveyard
  const enemies: Enemy[] = [];

  const catPositions = [
    { x: 16, z: 8 }, { x: -14, z: -8 }, { x: 8, z: -18 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(cat.mesh);
    enemies.push(cat);
  }

  const ratPositions = [
    { x: -10, z: 15 }, { x: 20, z: -12 }, { x: -22, z: -5 },
  ];
  for (const pos of ratPositions) {
    const rat = new Rat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rat.mesh);
    enemies.push(rat);
  }

  const chickenPositions = [
    { x: 12, z: -22 }, { x: -18, z: 20 }, { x: 25, z: 18 },
  ];
  for (const pos of chickenPositions) {
    const chicken = new Chicken(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    chicken.initPhysics(physics, pos.x, y, pos.z);
    scene.add(chicken.mesh);
    enemies.push(chicken);
  }

  const pigPositions = [
    { x: -25, z: 10 }, { x: 18, z: 22 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    scene.add(pig.mesh);
    enemies.push(pig);
  }

  // Boss: Rato Fantasma (phantom rat boss)
  const boss = new Rat(-30, 30, true);
  boss.bossName = 'Rato Fantasma';
  const bossY = terrain.getHeightAt(-30, 30) + 4;
  boss.initPhysics(physics, -30, bossY, 30, 1.0);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Eerie torches around boss area
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const tx = -30 + Math.cos(angle) * 5;
    const tz = 30 + Math.sin(angle) * 5;
    const ty = terrain.getHeightAt(tx, tz);

    const spookLight = new THREE.PointLight(0x44ff66, 0.7, 8);
    spookLight.position.set(tx, ty + 2.5, tz);
    scene.add(spookLight);

    const glowGeo = new THREE.SphereGeometry(0.12, 4, 4);
    const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0x44ff66 }));
    glow.position.copy(spookLight.position);
    scene.add(glow);
  }

  // Biscuits (5 scattered among the graves)
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
    name: 'Cemiterio Sombrio',
    boss,
  };
}
