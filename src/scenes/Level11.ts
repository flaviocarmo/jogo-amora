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

import { Rabbit } from '../entities/enemies/Rabbit';
import { Pig } from '../entities/enemies/Pig';
import { Cat } from '../entities/enemies/Cat';
import { Rat } from '../entities/enemies/Rat';
import { Chicken } from '../entities/enemies/Chicken';

/**
 * Level 11: Cemiterio Sombrio
 * A haunted graveyard with tombstones, iron fences, and dead trees under eerie fog.
 * Boss: Rato Fantasma (phantom rat boss)
 * Difficulty: very high - all enemy types present, heavy fog disorientation
 */

function createTombstone(
  scene: Scene,
  x: number, y: number, z: number,
  rotation = 0
) {
  const root = new TransformNode('tombstone', scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  // Main tombstone slab
  const slab = MeshBuilder.CreateBox('tombstoneSlab', {
    width: 0.8,
    height: 1.4,
    depth: 0.18,
  }, scene);
  slab.position.set(0, 0.7, 0);
  slab.material = toonMat('tombstoneMat', C.L11_TOMBSTONE, scene);
  slab.parent = root;

  // Rounded top arch (smaller box on top of slab)
  const arch = MeshBuilder.CreateBox('tombstoneArch', {
    width: 0.8,
    height: 0.35,
    depth: 0.2,
  }, scene);
  arch.position.set(0, 1.55, 0);
  arch.material = toonMat('tombstoneArchMat', C.L11_TOMBSTONE, scene);
  arch.parent = root;

  // Cross vertical bar
  const crossV = MeshBuilder.CreateBox('crossV', {
    width: 0.08,
    height: 0.5,
    depth: 0.1,
  }, scene);
  crossV.position.set(0, 1.85, 0);
  crossV.material = toonMat('crossMat', 0x666666, scene);
  crossV.parent = root;

  // Cross horizontal bar
  const crossH = MeshBuilder.CreateBox('crossH', {
    width: 0.35,
    height: 0.08,
    depth: 0.1,
  }, scene);
  crossH.position.set(0, 2.0, 0);
  crossH.material = toonMat('crossHMat', 0x666666, scene);
  crossH.parent = root;

  // Eerie green light near tombstone
  const eerieLight = new PointLight('eerieLight', new Vector3(x, y + 1.0, z + 0.3), scene);
  eerieLight.diffuse = hexColor(0x44ff66);
  eerieLight.intensity = 0.5;
  eerieLight.range = 5;
}

function createIronFence(
  scene: Scene,
  x: number, y: number, z: number,
  length: number, rotation = 0
) {
  const root = new TransformNode('ironFence', scene);
  root.position.set(x, y, z);
  root.rotation.y = rotation;

  // Horizontal rail top
  const rail = MeshBuilder.CreateBox('fenceRail', {
    width: length,
    height: 0.06,
    depth: 0.06,
  }, scene);
  rail.position.set(0, 0.8, 0);
  rail.material = toonMat('fenceMat', C.L11_FENCE, scene);
  rail.parent = root;

  // Horizontal rail middle
  const rail2 = MeshBuilder.CreateBox('fenceRail2', {
    width: length,
    height: 0.06,
    depth: 0.06,
  }, scene);
  rail2.position.set(0, 0.4, 0);
  rail2.material = toonMat('fenceMat2', C.L11_FENCE, scene);
  rail2.parent = root;

  // Vertical fence posts and spikes
  const postCount = Math.floor(length / 0.6) + 1;
  for (let i = 0; i < postCount; i++) {
    const px = -length / 2 + i * (length / (postCount - 1));

    const post = MeshBuilder.CreateBox('fencePost' + i, {
      width: 0.06,
      height: 1.0,
      depth: 0.06,
    }, scene);
    post.position.set(px, 0.5, 0);
    post.material = toonMat('fencePostMat', C.L11_FENCE, scene);
    post.parent = root;

    // Spike tip (cone)
    const spike = MeshBuilder.CreateCylinder('fenceSpike' + i, {
      diameterTop: 0,
      diameterBottom: 0.05 * 2,
      height: 0.2,
      tessellation: 4,
    }, scene);
    spike.position.set(px, 1.1, 0);
    spike.material = toonMat('fenceSpikeMat', C.L11_FENCE, scene);
    spike.parent = root;
  }
}

export function createLevel11(scene: Scene, physics: PhysicsWorld): LevelData {
  // Heavy exponential fog for graveyard atmosphere
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.02;
  scene.fogColor = hexColor(C.L11_FOG);

  // Skybox (near-black night sky)
  const sky = new Skybox(C.L11_SKY_TOP, C.L11_SKY_BOTTOM, scene);

  // Dim moonlight via hemisphere light
  const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.diffuse = hexColor(C.L11_SKY_TOP);
  hemiLight.groundColor = hexColor(C.L11_GROUND_DARK);
  hemiLight.intensity = 0.3;

  // Very dim ambient
  const ambientDir = new DirectionalLight('ambDir', new Vector3(0, -1, 0), scene);
  ambientDir.diffuse = hexColor(0x111122);
  ambientDir.intensity = 0.2;

  // Moonlight directional
  const dirLight = new DirectionalLight('dir', new Vector3(-10, -30, 15).normalize(), scene);
  dirLight.diffuse = hexColor(0x8888cc);
  dirLight.intensity = 0.5;

  // Terrain (undulating graveyard ground)
  const terrain = new Terrain({
    width: 95,
    depth: 95,
    segments: 48,
    heightScale: 3,
    color: C.L11_GROUND,
    colorDark: C.L11_GROUND_DARK,
    noiseScale: 0.04,
  }, scene);
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
  }, scene);

  // Dark rocks among the graves
  const rocks = new Rocks({
    color: 0x333333,
    count: 25,
    areaSize: 88,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  }, scene);

  // Enemies: ALL types present in the graveyard
  const enemies: Enemy[] = [];

  const catPositions = [
    { x: 16, z: 8 }, { x: -14, z: -8 }, { x: 8, z: -18 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(cat);
  }

  const ratPositions = [
    { x: -10, z: 15 }, { x: 20, z: -12 }, { x: -22, z: -5 },
  ];
  for (const pos of ratPositions) {
    const rat = new Rat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rat.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rat);
  }

  const chickenPositions = [
    { x: 12, z: -22 }, { x: -18, z: 20 }, { x: 25, z: 18 },
  ];
  for (const pos of chickenPositions) {
    const chicken = new Chicken(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    chicken.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(chicken);
  }

  const pigPositions = [
    { x: -25, z: 10 }, { x: 18, z: 22 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(pig);
  }

  // Boss: Rato Fantasma (phantom rat boss)
  const boss = new Rat(-30, 30, true);
  boss.bossName = 'Rato Fantasma';
  const bossY = terrain.getHeightAt(-30, 30) + 4;
  boss.initPhysics(physics, -30, bossY, 30, 1.0);
  enemies.push(boss);

  // Eerie torches around boss area
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const tx = -30 + Math.cos(angle) * 5;
    const tz = 30 + Math.sin(angle) * 5;
    const ty = terrain.getHeightAt(tx, tz);

    const spookLight = new PointLight('spookLight' + i, new Vector3(tx, ty + 2.5, tz), scene);
    spookLight.diffuse = hexColor(0x44ff66);
    spookLight.intensity = 0.7;
    spookLight.range = 8;

    const glow = MeshBuilder.CreateSphere('spookGlow' + i, {
      diameter: 0.12 * 2,
      segments: 4,
    }, scene);
    glow.position.set(tx, ty + 2.5, tz);
    glow.material = basicMat('spookGlowMat' + i, 0x44ff66, scene);
  }

  // Biscuits (5 scattered among the graves)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 5; i++) {
    const x = randomRange(-30, 30);
    const z = randomRange(-30, 30);
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
    name: 'Cemiterio Sombrio',
    boss,
  };
}
