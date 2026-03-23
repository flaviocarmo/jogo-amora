import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Terrain } from '../world/Terrain';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Pig } from '../entities/enemies/Pig';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { toonMat, basicMat, hexColor } from '../utils/materials';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 6: Castelo do Rei Porco (Final Boss)
 * A dark castle fortress on volcanic terrain with lava rivers, towers, banners.
 * Boss: Imperador Porco (armored emperor pig with 10 hearts)
 * Difficulty: maximum - lots of enemies, few biscuits, lava hazards
 */

function createCastleWall(
  scene: Scene,
  x: number, y: number, z: number,
  width: number, height: number, depth: number,
  rotation = 0
) {
  const group = new TransformNode('castleWall', scene);

  // Main wall
  const wall = MeshBuilder.CreateBox('wall', { width, height, depth }, scene);
  wall.material = toonMat('wallMat', C.L6_CASTLE_WALL, scene);
  wall.position.y = height / 2;
  wall.receiveShadows = true;
  wall.parent = group;

  // Battlements (crenellations)
  const merlonCount = Math.floor(width / 1.5);
  for (let i = 0; i < merlonCount; i++) {
    const merlon = MeshBuilder.CreateBox(`merlon_${i}`, { width: 0.6, height: 0.6, depth: depth + 0.1 }, scene);
    merlon.material = toonMat(`merlonMat_${i}`, C.L6_CASTLE_DARK, scene);
    merlon.position.set(
      -width / 2 + 0.75 + i * (width / merlonCount),
      height + 0.3,
      0,
    );
    merlon.parent = group;
  }

  group.position.set(x, y, z);
  group.rotation.y = rotation;
}

function createTower(
  scene: Scene,
  x: number, y: number, z: number,
  radius: number, height: number
) {
  const group = new TransformNode('tower', scene);

  // Tower body
  const body = MeshBuilder.CreateCylinder(
    'towerBody',
    { diameterTop: radius * 2, diameterBottom: radius * 1.1 * 2, height, tessellation: 8 },
    scene,
  );
  body.material = toonMat('towerBodyMat', C.L6_CASTLE_WALL, scene);
  body.position.y = height / 2;
  body.parent = group;

  // Conical roof
  const roof = MeshBuilder.CreateCylinder(
    'towerRoof',
    { diameterTop: 0, diameterBottom: radius * 1.3 * 2, height: height * 0.3, tessellation: 8 },
    scene,
  );
  roof.material = toonMat('towerRoofMat', C.L6_BANNER, scene);
  roof.position.y = height + height * 0.15;
  roof.parent = group;

  // Torch on tower
  const torchLight = new PointLight('towerTorch', new Vector3(radius + 0.2, height * 0.7, 0), scene);
  torchLight.diffuse = hexColor(C.L6_TORCH);
  torchLight.intensity = 1.0;
  torchLight.range = 12;
  torchLight.parent = group;

  // Torch flame (small glowing sphere)
  const flame = MeshBuilder.CreateSphere('towerFlame', { diameter: 0.12 * 2, segments: 4 }, scene);
  flame.material = basicMat('towerFlameMat', C.L6_TORCH, scene);
  flame.position.set(radius + 0.2, height * 0.7, 0);
  flame.parent = group;

  group.position.set(x, y, z);
}

function createLavaPool(
  scene: Scene,
  x: number, y: number, z: number,
  radius: number
) {
  // Lava disc
  const lava = MeshBuilder.CreateDisc('lavaPool', { radius, tessellation: 10 }, scene);
  const lavaMat = new StandardMaterial('lavaPoolMat', scene);
  lavaMat.emissiveColor = hexColor(C.L6_LAVA);
  lavaMat.disableLighting = true;
  lava.material = lavaMat;
  lava.rotation.x = Math.PI / 2; // Lie flat
  lava.position.set(x, y + 0.05, z);

  // Lava glow
  const glow = new PointLight('lavaGlow', new Vector3(x, y + 0.5, z), scene);
  glow.diffuse = hexColor(C.L6_LAVA_GLOW);
  glow.intensity = 0.8;
  glow.range = 10;
}

function createBanner(
  scene: Scene,
  x: number, y: number, z: number,
  height: number
) {
  const group = new TransformNode('banner', scene);

  // Pole
  const pole = MeshBuilder.CreateCylinder(
    'bannerPole',
    { diameterTop: 0.03 * 2, diameterBottom: 0.03 * 2, height, tessellation: 4 },
    scene,
  );
  pole.material = toonMat('bannerPoleMat', 0x888888, scene);
  pole.position.y = height / 2;
  pole.parent = group;

  // Banner cloth
  const bannerCloth = MeshBuilder.CreatePlane('bannerCloth', { width: 0.8, height: height * 0.4 }, scene);
  bannerCloth.material = toonMat('bannerClothMat', C.L6_BANNER, scene);
  bannerCloth.position.set(0.45, height * 0.75, 0);
  bannerCloth.parent = group;

  // Pig skull emblem on banner
  const skull = MeshBuilder.CreateSphere('bannerSkull', { diameter: 0.12 * 2, segments: 5 }, scene);
  skull.material = toonMat('bannerSkullMat', 0xdddddd, scene);
  skull.position.set(0.45, height * 0.78, 0.02);
  skull.parent = group;

  group.position.set(x, y, z);
}

export function createLevel6(scene: Scene, physics: PhysicsWorld): LevelData {
  // Hellish atmosphere
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 25;
  scene.fogEnd = 80;
  scene.fogColor = hexColor(C.L6_SKY_BOTTOM);

  // Skybox (red-black inferno)
  new Skybox(C.L6_SKY_TOP, C.L6_SKY_BOTTOM, scene);

  // Lighting (warm/ominous from lava)
  scene.ambientColor = new Color3(
    ((0x442222 >> 16) & 0xff) / 255 * 0.3,
    ((0x442222 >> 8) & 0xff) / 255 * 0.3,
    (0x442222 & 0xff) / 255 * 0.3,
  );

  const dirLight = new DirectionalLight('dir', new Vector3(10, -25, -10), scene);
  dirLight.diffuse = hexColor(0xff8844);
  dirLight.intensity = 0.7;

  // Red under-light for lava glow
  const underLight = new HemisphericLight('underHemi', new Vector3(0, -1, 0), scene);
  underLight.diffuse = hexColor(0x442222);
  underLight.groundColor = hexColor(0xff4400);
  underLight.intensity = 0.3;

  // Terrain (volcanic, rugged)
  const terrain = new Terrain(
    {
      width: 110,
      depth: 110,
      segments: 55,
      heightScale: 5,
      color: C.L6_GROUND,
      colorDark: C.L6_GROUND_DARK,
      noiseScale: 0.04,
    },
    scene,
  );
  terrain.initPhysics(physics);

  // Castle structure around boss area (center-back of map)
  // Front wall
  createCastleWall(scene, 0, terrain.getHeightAt(0, 25), 25, 20, 6, 1.5);
  // Side walls
  createCastleWall(scene, -10, terrain.getHeightAt(-10, 32), 32, 15, 6, 1.5, Math.PI / 2);
  createCastleWall(scene, 10, terrain.getHeightAt(10, 32), 32, 15, 6, 1.5, Math.PI / 2);

  // Towers at corners
  const towerPositions = [
    { x: -10, z: 25 }, { x: 10, z: 25 },
    { x: -10, z: 40 }, { x: 10, z: 40 },
  ];
  for (const pos of towerPositions) {
    const y = terrain.getHeightAt(pos.x, pos.z);
    createTower(scene, pos.x, y, pos.z, 1.5, 8);
  }

  // Banners along approach path
  for (let i = 0; i < 6; i++) {
    const bx = (i % 2 === 0 ? -3 : 3);
    const bz = 5 + i * 3;
    const by = terrain.getHeightAt(bx, bz);
    createBanner(scene, bx, by, bz, 4);
  }

  // Lava pools scattered around
  const lavaPositions = [
    { x: -20, z: -10, r: 3 }, { x: 22, z: -15, r: 2.5 },
    { x: -15, z: 15, r: 2 }, { x: 18, z: 20, r: 3.5 },
    { x: -25, z: -25, r: 2 }, { x: 30, z: 5, r: 2.5 },
    { x: 0, z: -20, r: 4 },
  ];
  for (const pool of lavaPositions) {
    const y = terrain.getHeightAt(pool.x, pool.z);
    createLavaPool(scene, pool.x, y, pool.z, pool.r);
  }

  // Dark volcanic rocks
  new Rocks(
    {
      color: 0x3a2a2a,
      count: 45,
      areaSize: 100,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  new Rocks(
    {
      color: 0x1a1a1a,
      count: 25,
      areaSize: 100,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  // Enemies: 6 pigs (guards) + 5 rabbits (scouts) - maximum difficulty
  const enemies: Enemy[] = [];
  const pigPositions2 = [
    { x: 12, z: 8 }, { x: -14, z: 10 },
    { x: 20, z: -12 }, { x: -18, z: -18 },
    { x: 5, z: 20 }, { x: -5, z: 22 },
  ];
  for (const pos of pigPositions2) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(pig);
  }

  const rabbitPositions = [
    { x: 15, z: -5 }, { x: -10, z: -15 },
    { x: 25, z: 10 }, { x: -22, z: 5 }, { x: 8, z: -25 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rabbit);
  }

  // FINAL BOSS: Imperador Porco (inside the castle courtyard)
  const boss = new Pig(0, 35, true);
  boss.bossName = 'Imperador Porco';
  const bossY = terrain.getHeightAt(0, 35) + 4;
  boss.initPhysics(physics, 0, bossY, 35, 1.2);
  enemies.push(boss);

  // Torches around boss arena
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const tx = Math.cos(angle) * 6;
    const tz = 35 + Math.sin(angle) * 6;
    const ty = terrain.getHeightAt(tx, tz);

    const torchLight = new PointLight(`arenaTorch_${i}`, new Vector3(tx, ty + 3, tz), scene);
    torchLight.diffuse = hexColor(C.L6_TORCH);
    torchLight.intensity = 1.2;
    torchLight.range = 10;

    const flame = MeshBuilder.CreateSphere(`arenaFlame_${i}`, { diameter: 0.15 * 2, segments: 4 }, scene);
    flame.material = basicMat(`arengetFlameMat_${i}`, C.L6_TORCH, scene);
    flame.position.set(tx, ty + 3, tz);
  }

  // Biscuits (very scarce in the castle!)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 4; i++) {
    const x = randomRange(-25, 25);
    const z = randomRange(-25, 20);
    const y = terrain.getHeightAt(x, z);
    biscuits.push(new Biscuit(x, y, z, scene));
  }

  const spawnY = terrain.getHeightAt(0, -30) + 3;

  return {
    scene,
    terrain,
    enemies,
    biscuits,
    spawnPoint: { x: 0, y: spawnY, z: -30 },
    name: 'Castelo do Rei Porco',
    boss,
  };
}
