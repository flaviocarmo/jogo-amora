import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Terrain } from '../world/Terrain';
import { Vegetation } from '../world/Vegetation';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import { toonMat, basicMat, hexColor } from '../utils/materials';
import type { LevelData } from './Level1';

import { Rat } from '../entities/enemies/Rat';
import { Chicken } from '../entities/enemies/Chicken';

/**
 * Level 7: Praia Tropical
 * Sandy beach with palm trees, water pools, and beach rocks under bright sun.
 * Boss: Rato Praiano (fast rat boss patrolling the dunes)
 * Difficulty: fast rats on open sand, chickens roaming the shore
 */

function createPalmTree(
  scene: Scene,
  x: number, y: number, z: number,
  scale: number
) {
  const root = new TransformNode('palmTree', scene);
  root.position.set(x, y, z);

  // Tall thin trunk with slight lean
  const trunk = MeshBuilder.CreateCylinder('palmTrunk', {
    diameterTop: 0.1 * scale * 2,
    diameterBottom: 0.18 * scale * 2,
    height: 4 * scale,
    tessellation: 6,
  }, scene);
  trunk.position.set(0, 2 * scale, 0);
  trunk.rotation.z = randomRange(-0.15, 0.15);
  trunk.material = toonMat('palmTrunkMat', C.L7_PALM_TRUNK, scene);
  trunk.parent = root;

  // Sphere of leaves at the top
  const leaves = MeshBuilder.CreateSphere('palmLeaves', {
    diameter: 1.1 * scale * 2,
    segments: 7,
  }, scene);
  leaves.position.set(0, 4.2 * scale, 0);
  leaves.scaling.set(1, 0.55, 1);
  leaves.material = toonMat('palmLeavesMat', C.L7_PALM_LEAVES, scene);
  leaves.parent = root;

  // Coconuts cluster
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const coconut = MeshBuilder.CreateSphere('coconut', {
      diameter: 0.1 * scale * 2,
      segments: 4,
    }, scene);
    coconut.position.set(
      Math.cos(angle) * 0.35 * scale,
      3.8 * scale,
      Math.sin(angle) * 0.35 * scale
    );
    coconut.material = toonMat('coconutMat', 0x885522, scene);
    coconut.parent = root;
  }
}

function createBeachPool(
  scene: Scene,
  x: number, y: number, z: number,
  radius: number
) {
  // Shallow water disc
  const water = MeshBuilder.CreateDisc('beachWater', {
    radius: radius,
    tessellation: 12,
  }, scene);
  water.rotation.x = Math.PI / 2;
  water.position.set(x, y + 0.05, z);
  const waterMat = toonMat('beachWaterMat', C.L7_WATER, scene);
  waterMat.alpha = 0.75;
  water.material = waterMat;

  // Sandy rim around the pool — use a thin disc slightly larger
  const rim = MeshBuilder.CreateDisc('beachRim', {
    radius: radius + 0.4,
    tessellation: 12,
    arc: 1,
    // inner radius not directly available in CreateDisc; use a torus for the ring
  }, scene);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y + 0.04, z);
  rim.material = toonMat('beachRimMat', C.L7_SAND_DARK, scene);
}

export function createLevel7(scene: Scene, physics: PhysicsWorld): LevelData {
  // Bright tropical sky — no fog on a sunny beach

  // Skybox
  const sky = new Skybox(C.L7_SKY_TOP, C.L7_SKY_BOTTOM, scene);

  // Bright sunny ambient (HemisphericLight replaces AmbientLight + sky tone)
  const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.diffuse = hexColor(0xfff5cc);
  hemiLight.groundColor = hexColor(0xfff5cc);
  hemiLight.intensity = 0.6;

  // Strong directional sun high in the sky
  const sunLight = new DirectionalLight('sun', new Vector3(-10, -35, -5).normalize(), scene);
  sunLight.diffuse = hexColor(0xfffbe0);
  sunLight.intensity = 1.2;

  // Subtle fill light from the water reflection
  const fillLight = new DirectionalLight('fill', new Vector3(10, -10, 15).normalize(), scene);
  fillLight.diffuse = hexColor(0x88ccff);
  fillLight.intensity = 0.3;

  // Terrain (sandy beach, flat with gentle dunes)
  const terrain = new Terrain({
    width: 90,
    depth: 90,
    segments: 45,
    heightScale: 2,
    color: C.L7_SAND,
    colorDark: C.L7_SAND_DARK,
    noiseScale: 0.04,
  }, scene);
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
  }, scene);

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
  }, scene);

  const darkRocks = new Rocks({
    color: 0x998866,
    count: 12,
    areaSize: 80,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  }, scene);

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
    enemies.push(rat);
  }

  const chickenPositions = [
    { x: 18, z: 6 }, { x: -8, z: -18 }, { x: 6, z: 24 },
  ];
  for (const pos of chickenPositions) {
    const chicken = new Chicken(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    chicken.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(chicken);
  }

  // Boss: Rato Praiano (fast rat boss dominating the dunes)
  const boss = new Rat(30, 30, true);
  boss.bossName = 'Rato Praiano';
  const bossY = terrain.getHeightAt(30, 30) + 3;
  boss.initPhysics(physics, 30, bossY, 30, 0.8);
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
    const biscuit = new Biscuit(x, y, z, scene);
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
