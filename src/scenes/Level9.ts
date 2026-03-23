import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Terrain } from '../world/Terrain';
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
import { Cat } from '../entities/enemies/Cat';
import { Chicken } from '../entities/enemies/Chicken';

/**
 * Level 9: Jardim Encantado
 * A magical garden with vibrant flowers, hedge mazes, and warm glowing lights.
 * Boss: Galinha Rainha (regal chicken boss ruling the garden)
 * Difficulty: maze-like hedges force close combat, mixed enemy types
 */

function createFlower(
  scene: Scene,
  x: number, y: number, z: number,
  petalColor: number,
  scale: number
) {
  const root = new TransformNode('flower', scene);
  root.position.set(x, y, z);

  // Stem
  const stem = MeshBuilder.CreateCylinder('flowerStem', {
    diameterTop: 0.03 * scale * 2,
    diameterBottom: 0.04 * scale * 2,
    height: 0.35 * scale,
    tessellation: 4,
  }, scene);
  stem.position.set(0, 0.18 * scale, 0);
  stem.material = toonMat('stemMat', 0x33aa33, scene);
  stem.parent = root;

  // Petals as a flat sphere
  const petal = MeshBuilder.CreateSphere('flowerPetal', {
    diameter: 0.15 * scale * 2,
    segments: 6,
  }, scene);
  petal.position.set(0, 0.38 * scale, 0);
  petal.scaling.set(1, 0.5, 1);
  petal.material = toonMat('petalMat', petalColor, scene);
  petal.parent = root;

  // Yellow center
  const center = MeshBuilder.CreateSphere('flowerCenter', {
    diameter: 0.07 * scale * 2,
    segments: 5,
  }, scene);
  center.position.set(0, 0.4 * scale, 0);
  center.material = toonMat('centerMat', 0xffee00, scene);
  center.parent = root;
}

function createHedge(
  scene: Scene,
  x: number, y: number, z: number,
  width: number, height: number, depth: number
) {
  const hedge = MeshBuilder.CreateBox('hedge', { width, height, depth }, scene);
  hedge.position.set(x, y + height / 2, z);
  hedge.material = toonMat('hedgeMat', C.L9_HEDGE, scene);

  // Lighter top to give the trimmed look
  const top = MeshBuilder.CreateBox('hedgeTop', {
    width: width + 0.1,
    height: 0.2,
    depth: depth + 0.1,
  }, scene);
  top.position.set(x, y + height + 0.1, z);
  top.material = toonMat('hedgeTopMat', 0x44aa44, scene);
}

function createButterfly(
  scene: Scene,
  x: number, y: number, z: number,
  color: number
) {
  // Colored point light giving the impression of glowing magical butterflies
  const butterflyY = y + randomRange(1.5, 3.5);
  const light = new PointLight('butterfly', new Vector3(x, butterflyY, z), scene);
  light.diffuse = hexColor(color);
  light.intensity = 0.4;
  light.range = 5;

  // Small flat planes as wing silhouettes
  for (let side = -1; side <= 1; side += 2) {
    const wingY = y + randomRange(1.5, 3.5);
    const wing = MeshBuilder.CreatePlane('butterflyWing', {
      width: 0.2,
      height: 0.15,
      sideOrientation: MeshBuilder.DOUBLESIDE,
    }, scene);
    wing.position.set(x + side * 0.12, wingY, z);
    wing.rotation.y = Math.PI / 4;
    wing.material = toonMat('wingMat', color, scene);
  }
}

export function createLevel9(scene: Scene, physics: PhysicsWorld): LevelData {
  // No fog — the garden is clear and magical

  // Skybox
  const sky = new Skybox(C.L9_SKY_TOP, C.L9_SKY_BOTTOM, scene);

  // Warm magical ambient light
  const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.diffuse = hexColor(0xffccee);
  hemiLight.groundColor = hexColor(0xffccee);
  hemiLight.intensity = 0.55;

  // Warm golden sun
  const sunLight = new DirectionalLight('sun', new Vector3(-8, -30, -10).normalize(), scene);
  sunLight.diffuse = hexColor(0xffe0cc);
  sunLight.intensity = 1.0;

  // Soft pink fill from the pink sky
  const fillLight = new DirectionalLight('fill', new Vector3(12, -15, 10).normalize(), scene);
  fillLight.diffuse = hexColor(0xffaacc);
  fillLight.intensity = 0.35;

  // Terrain (garden hills, gentle undulation)
  const terrain = new Terrain({
    width: 85,
    depth: 85,
    segments: 42,
    heightScale: 2.5,
    color: C.L9_GRASS,
    colorDark: C.L9_GRASS_DARK,
    noiseScale: 0.05,
  }, scene);
  terrain.initPhysics(physics);

  // Scattered flowers — pink and yellow across the garden
  const flowerColors = [C.L9_FLOWER_PINK, C.L9_FLOWER_YELLOW, 0xff99cc, 0xffcc55];
  for (let i = 0; i < 50; i++) {
    const x = randomRange(-38, 38);
    const z = randomRange(-38, 38);
    if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;
    const y = terrain.getHeightAt(x, z);
    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    createFlower(scene, x, y, z, color, randomRange(0.8, 1.4));
  }

  // Hedge walls forming maze-like patterns
  const hedgeLayout = [
    // Outer ring segments
    { x: 20, z: 0, w: 0.8, h: 3, d: 14 },
    { x: -20, z: 0, w: 0.8, h: 3, d: 14 },
    { x: 0, z: 20, w: 14, h: 3, d: 0.8 },
    { x: 0, z: -20, w: 14, h: 3, d: 0.8 },
    // Inner corridors
    { x: 10, z: 8, w: 0.8, h: 2.5, d: 10 },
    { x: -10, z: -8, w: 0.8, h: 2.5, d: 10 },
    { x: 8, z: -10, w: 10, h: 2.5, d: 0.8 },
    { x: -8, z: 10, w: 10, h: 2.5, d: 0.8 },
    // Corner accents
    { x: 16, z: 16, w: 6, h: 2.5, d: 0.8 },
    { x: -16, z: -16, w: 6, h: 2.5, d: 0.8 },
    { x: 16, z: -16, w: 0.8, h: 2.5, d: 6 },
    { x: -16, z: 16, w: 0.8, h: 2.5, d: 6 },
  ];
  for (const h of hedgeLayout) {
    const y = terrain.getHeightAt(h.x, h.z);
    createHedge(scene, h.x, y, h.z, h.w, h.h, h.d);
  }

  // Butterflies — colored point lights + wing planes floating around
  const butterflyColors = [0xff88ff, 0xffff44, 0x88ffff, 0xffaa88, 0xaaffaa];
  for (let i = 0; i < 18; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    const y = terrain.getHeightAt(x, z);
    const color = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
    createButterfly(scene, x, y, z, color);
  }

  // Small decorative rocks as garden stepping stones
  const rocks = new Rocks({
    color: 0xccbbaa,
    count: 15,
    areaSize: 75,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  }, scene);

  // Enemies: 3 chickens + 3 cats + 2 rabbits
  const enemies: Enemy[] = [];
  const chickenPositions = [
    { x: 14, z: 12 }, { x: -16, z: 6 }, { x: 6, z: -18 },
  ];
  for (const pos of chickenPositions) {
    const chicken = new Chicken(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    chicken.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(chicken);
  }

  const catPositions = [
    { x: -14, z: -12 }, { x: 22, z: -8 }, { x: -8, z: 22 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(cat);
  }

  const rabbitPositions = [
    { x: 18, z: -16 }, { x: -20, z: 14 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rabbit);
  }

  // Boss: Galinha Rainha (presiding in her garden throne)
  const boss = new Chicken(30, -30, true);
  boss.bossName = 'Galinha Rainha';
  const bossY = terrain.getHeightAt(30, -30) + 3;
  boss.initPhysics(physics, 30, bossY, -30, 0.85);
  enemies.push(boss);

  // Royal flower garden around boss — ring of pink flowers
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const fx = 30 + Math.cos(angle) * 5;
    const fz = -30 + Math.sin(angle) * 5;
    const fy = terrain.getHeightAt(fx, fz);
    createFlower(scene, fx, fy, fz, C.L9_FLOWER_PINK, 1.5);
  }

  // Warm point lights in the boss clearing
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const lx = 30 + Math.cos(angle) * 4;
    const lz = -30 + Math.sin(angle) * 4;
    const ly = terrain.getHeightAt(30, -30) + 2;
    const bossAreaLight = new PointLight('bossLight' + i, new Vector3(lx, ly, lz), scene);
    bossAreaLight.diffuse = hexColor(0xff88bb);
    bossAreaLight.intensity = 0.5;
    bossAreaLight.range = 8;
  }

  // Biscuits hidden among the flower beds
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 8; i++) {
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
    name: 'Jardim Encantado',
    boss,
  };
}
