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

import { Cat } from '../entities/enemies/Cat';
import { Rat } from '../entities/enemies/Rat';

/**
 * Level 8: Cidade Abandonada
 * Post-apocalyptic city ruins with crumbling buildings, street lights, and rubble.
 * Boss: Gato das Sombras (shadowy cat lurking in the alleys)
 * Difficulty: cats stalk from shadows, rats dash through tight alley corridors
 */

function createBuilding(
  scene: Scene,
  x: number, y: number, z: number,
  width: number, height: number, depth: number
) {
  const root = new TransformNode('building', scene);
  root.position.set(x, y, z);

  // Main building body
  const body = MeshBuilder.CreateBox('buildingBody', {
    width,
    height,
    depth,
  }, scene);
  body.position.set(0, height / 2, 0);
  body.material = toonMat('buildingMat', C.L8_BUILDING, scene);
  body.parent = root;

  // Darker roof slab
  const roof = MeshBuilder.CreateBox('buildingRoof', {
    width: width + 0.3,
    height: 0.3,
    depth: depth + 0.3,
  }, scene);
  roof.position.set(0, height + 0.15, 0);
  roof.material = toonMat('buildingRoofMat', C.L8_BUILDING_DARK, scene);
  roof.parent = root;

  // Window holes (dark squares on the facade)
  const windowRows = Math.max(1, Math.floor(height / 2));
  const windowCols = Math.max(1, Math.floor(width / 1.5));
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const win = MeshBuilder.CreateBox('buildingWindow', {
        width: 0.4,
        height: 0.5,
        depth: 0.05,
      }, scene);
      win.position.set(
        (col - (windowCols - 1) / 2) * (width / windowCols),
        1.2 + row * 2.0,
        depth / 2 + 0.03
      );
      win.material = toonMat('windowMat', 0x111122, scene);
      win.parent = root;
    }
  }
}

function createStreetLight(
  scene: Scene,
  x: number, y: number, z: number
) {
  const root = new TransformNode('streetLight', scene);
  root.position.set(x, y, z);

  // Pole
  const pole = MeshBuilder.CreateCylinder('lightPole', {
    diameterTop: 0.05 * 2,
    diameterBottom: 0.07 * 2,
    height: 5,
    tessellation: 5,
  }, scene);
  pole.position.set(0, 2.5, 0);
  pole.material = toonMat('lightPoleMat', 0x666666, scene);
  pole.parent = root;

  // Horizontal arm
  const arm = MeshBuilder.CreateCylinder('lightArm', {
    diameter: 0.04 * 2,
    height: 1.5,
    tessellation: 4,
  }, scene);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.6, 5, 0);
  arm.material = toonMat('lightArmMat', 0x666666, scene);
  arm.parent = root;

  // Lamp housing
  const lamp = MeshBuilder.CreateSphere('lightLamp', {
    diameter: 0.18 * 2,
    segments: 6,
  }, scene);
  lamp.position.set(1.3, 4.9, 0);
  lamp.material = toonMat('lightLampMat', 0xffffcc, scene);
  lamp.parent = root;

  // Actual point light — dim orange-yellow like sodium vapor
  const light = new PointLight('streetPointLight', new Vector3(x + 1.3, y + 4.8, z), scene);
  light.diffuse = hexColor(0xffaa44);
  light.intensity = 0.8;
  light.range = 12;
}

export function createLevel8(scene: Scene, physics: PhysicsWorld): LevelData {
  // Oppressive urban fog
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = hexColor(C.L8_SKY_BOTTOM);

  // Skybox (overcast city sky)
  const sky = new Skybox(C.L8_SKY_TOP, C.L8_SKY_BOTTOM, scene);

  // Dim ambient — city is gloomy
  const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.diffuse = hexColor(0x334455);
  hemiLight.groundColor = hexColor(0x334455);
  hemiLight.intensity = 0.3;

  // Weak directional (overcast light)
  const dirLight = new DirectionalLight('dir', new Vector3(0, -30, -10).normalize(), scene);
  dirLight.diffuse = hexColor(0x667788);
  dirLight.intensity = 0.5;

  // Terrain (mostly flat urban ground)
  const terrain = new Terrain({
    width: 100,
    depth: 100,
    segments: 50,
    heightScale: 1.5,
    color: C.L8_GROUND,
    colorDark: C.L8_GROUND_DARK,
    noiseScale: 0.02,
  }, scene);
  terrain.initPhysics(physics);

  // Buildings scattered across the city block
  const buildingConfigs = [
    { x: 15, z: 10, w: 5, h: 8, d: 4 },
    { x: -18, z: 8, w: 4, h: 6, d: 5 },
    { x: 22, z: -14, w: 6, h: 10, d: 4 },
    { x: -12, z: -20, w: 5, h: 7, d: 6 },
    { x: -28, z: 5, w: 4, h: 9, d: 4 },
    { x: 8, z: 28, w: 7, h: 6, d: 4 },
    { x: -22, z: -12, w: 4, h: 8, d: 5 },
    { x: 30, z: 20, w: 5, h: 5, d: 5 },
    { x: -30, z: -22, w: 6, h: 11, d: 4 },
    { x: 10, z: -28, w: 4, h: 7, d: 6 },
    { x: -6, z: 20, w: 5, h: 6, d: 4 },
    { x: 28, z: -5, w: 4, h: 8, d: 5 },
  ];
  for (const b of buildingConfigs) {
    const y = terrain.getHeightAt(b.x, b.z);
    createBuilding(scene, b.x, y, b.z, b.w, b.h, b.d);
  }

  // Street lights along the roads
  const lightPositions = [
    { x: 5, z: 0 }, { x: -5, z: 0 }, { x: 0, z: 8 },
    { x: 0, z: -8 }, { x: 12, z: -5 }, { x: -12, z: 5 },
    { x: 18, z: 18 }, { x: -18, z: -18 },
  ];
  for (const lp of lightPositions) {
    const y = terrain.getHeightAt(lp.x, lp.z);
    createStreetLight(scene, lp.x, y, lp.z);
  }

  // Rubble and debris
  const rocks = new Rocks({
    color: C.L8_RUST,
    count: 30,
    areaSize: 90,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  }, scene);

  const rubble = new Rocks({
    color: C.L8_BUILDING_DARK,
    count: 20,
    areaSize: 90,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  }, scene);

  // Enemies: 4 cats (stalking in shadows) + 4 rats (fast in alleys)
  const enemies: Enemy[] = [];
  const catPositions = [
    { x: 16, z: 8 }, { x: -14, z: -18 },
    { x: 24, z: -12 }, { x: -20, z: 10 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(cat);
  }

  const ratPositions = [
    { x: 8, z: -14 }, { x: -10, z: 22 },
    { x: 26, z: 18 }, { x: -24, z: -6 },
  ];
  for (const pos of ratPositions) {
    const rat = new Rat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rat.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rat);
  }

  // Boss: Gato das Sombras (prowling in the darkest alley)
  const boss = new Cat(-30, -30, true);
  boss.bossName = 'Gato das Sombras';
  const bossY = terrain.getHeightAt(-30, -30) + 3;
  boss.initPhysics(physics, -30, bossY, -30, 0.75);
  enemies.push(boss);

  // Tall dark buildings flanking the boss arena
  const bossArenaBuildings = [
    { x: -24, z: -30, w: 5, h: 12, d: 4 },
    { x: -36, z: -24, w: 4, h: 10, d: 5 },
    { x: -30, z: -22, w: 6, h: 8, d: 4 },
  ];
  for (const b of bossArenaBuildings) {
    const y = terrain.getHeightAt(b.x, b.z);
    createBuilding(scene, b.x, y, b.z, b.w, b.h, b.d);
  }

  // Biscuits hidden in the ruins
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 6; i++) {
    const x = randomRange(-38, 38);
    const z = randomRange(-38, 38);
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
    name: 'Cidade Abandonada',
    boss,
  };
}
