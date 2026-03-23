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
import { Pig } from '../entities/enemies/Pig';
import { Cat } from '../entities/enemies/Cat';
import { Rat } from '../entities/enemies/Rat';
import { Chicken } from '../entities/enemies/Chicken';

/**
 * Level 12: Torre do Imperador - FINAL BOSS
 * The top of the emperor's tower: a grand throne room arena with pillars, torches,
 * gold decorations, and a red carpet leading to the supreme ruler.
 * Boss: Imperador Supremo (the ultimate pig emperor)
 * Difficulty: maximum - every enemy type, very few biscuits
 */

function createThroneColumn(
  scene: Scene,
  x: number, y: number, z: number,
  height: number
) {
  const root = new TransformNode('throneColumn', scene);
  root.position.set(x, y, z);

  // Column base (wide flat box)
  const base = MeshBuilder.CreateBox('colBase', {
    width: 1.0,
    height: 0.3,
    depth: 1.0,
  }, scene);
  base.position.set(0, 0.15, 0);
  base.material = toonMat('colBaseMat', C.L12_TOWER, scene);
  base.parent = root;

  // Column shaft (cylinder)
  const shaft = MeshBuilder.CreateCylinder('colShaft', {
    diameterTop: 0.35 * 2,
    diameterBottom: 0.4 * 2,
    height,
    tessellation: 8,
  }, scene);
  shaft.position.set(0, 0.3 + height / 2, 0);
  shaft.material = toonMat('colShaftMat', C.L12_TOWER, scene);
  shaft.parent = root;

  // Column capital (top decorative box)
  const capital = MeshBuilder.CreateBox('colCapital', {
    width: 0.9,
    height: 0.25,
    depth: 0.9,
  }, scene);
  capital.position.set(0, 0.3 + height + 0.125, 0);
  capital.material = toonMat('colCapitalMat', C.L12_TOWER, scene);
  capital.parent = root;

  // Gold sphere decoration on top of capital
  const goldSphere = MeshBuilder.CreateSphere('colGold', {
    diameter: 0.18 * 2,
    segments: 6,
  }, scene);
  goldSphere.position.set(0, 0.3 + height + 0.35, 0);
  goldSphere.material = toonMat('colGoldMat', C.L12_GOLD, scene);
  goldSphere.parent = root;

  // Torch on column (flame + light)
  const torchLight = new PointLight('colTorch', new Vector3(x + 0.5, y + height * 0.65, z), scene);
  torchLight.diffuse = hexColor(0xff8833);
  torchLight.intensity = 1.0;
  torchLight.range = 12;

  const flame = MeshBuilder.CreateSphere('colFlame', {
    diameter: 0.14 * 2,
    segments: 4,
  }, scene);
  flame.position.set(x + 0.5, y + height * 0.65, z);
  flame.material = basicMat('colFlameMat', 0xff8833, scene);
}

function createThrone(
  scene: Scene,
  x: number, y: number, z: number
) {
  const root = new TransformNode('throne', scene);
  root.position.set(x, y, z);

  // Throne base (wide platform seat)
  const seat = MeshBuilder.CreateBox('throneSeat', {
    width: 2.4,
    height: 0.4,
    depth: 1.8,
  }, scene);
  seat.position.set(0, 0.2, 0);
  seat.material = toonMat('throneSeatMat', C.L12_THRONE, scene);
  seat.parent = root;

  // Throne back (tall ornate back panel)
  const back = MeshBuilder.CreateBox('throneBack', {
    width: 2.4,
    height: 3.2,
    depth: 0.3,
  }, scene);
  back.position.set(0, 2.0, -0.75);
  back.material = toonMat('throneBackMat', C.L12_THRONE, scene);
  back.parent = root;

  // Back panel gold trim (thin overlay)
  const trim = MeshBuilder.CreateBox('throneTrim', {
    width: 2.0,
    height: 2.6,
    depth: 0.08,
  }, scene);
  trim.position.set(0, 2.0, -0.58);
  trim.material = toonMat('throneTrimMat', C.L12_GOLD, scene);
  trim.parent = root;

  // Arm rests (left and right)
  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateBox('throneArm' + side, {
      width: 0.25,
      height: 0.2,
      depth: 1.6,
    }, scene);
    arm.position.set(side * 1.1, 0.5, -0.1);
    arm.material = toonMat('throneArmMat' + side, C.L12_THRONE, scene);
    arm.parent = root;

    // Gold orb on armrest end
    const orb = MeshBuilder.CreateSphere('throneOrb' + side, {
      diameter: 0.15 * 2,
      segments: 6,
    }, scene);
    orb.position.set(side * 1.1, 0.65, 0.65);
    orb.material = toonMat('throneOrbMat' + side, C.L12_GOLD, scene);
    orb.parent = root;
  }

  // Crown-like spires on throne back top
  const spireXPositions = [-0.9, -0.3, 0.3, 0.9];
  for (const sx of spireXPositions) {
    const spire = MeshBuilder.CreateCylinder('throneSpire', {
      diameterTop: 0,
      diameterBottom: 0.1 * 2,
      height: 0.5,
      tessellation: 4,
    }, scene);
    spire.position.set(sx, 3.85, -0.75);
    spire.material = toonMat('throneSpireMat', C.L12_GOLD, scene);
    spire.parent = root;
  }

  // Throne step platform (slightly wider, lower)
  const step = MeshBuilder.CreateBox('throneStep', {
    width: 3.2,
    height: 0.2,
    depth: 2.4,
  }, scene);
  step.position.set(0, -0.1, 0);
  step.material = toonMat('throneStepMat', C.L12_TOWER, scene);
  step.parent = root;
}

function createCarpet(
  scene: Scene,
  x: number, y: number, z: number,
  length: number
) {
  // Red carpet runner from spawn toward throne
  const carpet = MeshBuilder.CreateBox('carpet', {
    width: 2.0,
    height: 0.08,
    depth: length,
  }, scene);
  carpet.position.set(x, y + 0.04, z);
  carpet.material = toonMat('carpetMat', C.L12_CARPET, scene);

  // Gold border strips along the carpet edges
  for (const side of [-1, 1]) {
    const border = MeshBuilder.CreateBox('carpetBorder' + side, {
      width: 0.12,
      height: 0.09,
      depth: length,
    }, scene);
    border.position.set(x + side * 1.06, y + 0.045, z);
    border.material = toonMat('carpetBorderMat' + side, C.L12_GOLD, scene);
  }
}

export function createLevel12(scene: Scene, physics: PhysicsWorld): LevelData {
  // Dramatic dark-red atmosphere of the emperor's tower
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 35;
  scene.fogEnd = 100;
  scene.fogColor = hexColor(C.L12_SKY_BOTTOM);

  // Skybox (pitch-black night above the tower)
  const sky = new Skybox(C.L12_SKY_TOP, C.L12_SKY_BOTTOM, scene);

  // Dramatic gold-red hemisphere lighting
  const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.diffuse = hexColor(0x331100);
  hemiLight.groundColor = hexColor(0x110000);
  hemiLight.intensity = 0.4;

  // Very dim dark ambient
  const ambientDir = new DirectionalLight('ambDir', new Vector3(0, -1, 0), scene);
  ambientDir.diffuse = hexColor(0x221100);
  ambientDir.intensity = 0.3;

  // Main dramatic directional light from above
  const dirLight = new DirectionalLight('dir', new Vector3(0, -40, 20).normalize(), scene);
  dirLight.diffuse = hexColor(0xff9944);
  dirLight.intensity = 0.9;

  // Gold accent light from throne direction
  const throneLight = new PointLight('throneLight', new Vector3(0, 10, 40), scene);
  throneLight.diffuse = hexColor(C.L12_GOLD);
  throneLight.intensity = 1.5;
  throneLight.range = 30;

  // Terrain (tower top platform, relatively flat with gentle height variation)
  const terrain = new Terrain({
    width: 110,
    depth: 110,
    segments: 55,
    heightScale: 4,
    color: C.L12_GROUND,
    colorDark: C.L12_GROUND_DARK,
    noiseScale: 0.03,
  }, scene);
  terrain.initPhysics(physics);

  // Red carpet from entrance toward throne (player enters from z = -35)
  const carpetY = terrain.getHeightAt(0, 0);
  createCarpet(scene, 0, carpetY, 5, 80);

  // Throne at far end of the arena
  const throneY = terrain.getHeightAt(0, 38);
  createThrone(scene, 0, throneY, 38);

  // Arena pillars arranged in two rows flanking the carpet
  const pillarPairs = [
    { z: -20 }, { z: -8 }, { z: 5 }, { z: 18 }, { z: 30 },
  ];
  for (const pair of pillarPairs) {
    for (const side of [-1, 1]) {
      const px = side * 12;
      const py = terrain.getHeightAt(px, pair.z);
      createThroneColumn(scene, px, py, pair.z, 7);
    }
  }

  // Additional flanking torches near the throne
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const tx = Math.cos(angle) * 9;
    const tz = 38 + Math.sin(angle) * 9;
    const ty = terrain.getHeightAt(tx, tz);

    const torchLight = new PointLight('throneTorch' + i, new Vector3(tx, ty + 3, tz), scene);
    torchLight.diffuse = hexColor(0xff8833);
    torchLight.intensity = 1.2;
    torchLight.range = 10;

    const flame = MeshBuilder.CreateSphere('throneTorchFlame' + i, {
      diameter: 0.16 * 2,
      segments: 4,
    }, scene);
    flame.position.set(tx, ty + 3, tz);
    flame.material = basicMat('throneFlameMat' + i, 0xff8833, scene);
  }

  // Gold decorative spheres scattered as floor ornaments
  const goldOrnamentPositions = [
    { x: -8, z: -15 }, { x: 8, z: -15 }, { x: -8, z: 25 }, { x: 8, z: 25 },
    { x: -14, z: 5 }, { x: 14, z: 5 },
  ];
  for (const pos of goldOrnamentPositions) {
    const py = terrain.getHeightAt(pos.x, pos.z);
    const orn = MeshBuilder.CreateSphere('goldOrn', {
      diameter: 0.22 * 2,
      segments: 7,
    }, scene);
    orn.position.set(pos.x, py + 0.22, pos.z);
    orn.material = toonMat('goldOrnMat', C.L12_GOLD, scene);
  }

  // Dark stone rocks around the arena perimeter
  const rocks = new Rocks({
    color: C.L12_GROUND_DARK,
    count: 30,
    areaSize: 100,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  }, scene);

  // Enemies: maximum difficulty - ALL enemy types
  const enemies: Enemy[] = [];

  const pigPositions = [
    { x: 10, z: -20 }, { x: -10, z: -15 },
    { x: 15, z: 10 }, { x: -15, z: 15 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(pig);
  }

  const catPositions = [
    { x: 20, z: -5 }, { x: -20, z: 5 }, { x: 8, z: 25 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(cat);
  }

  const ratPositions = [
    { x: -18, z: -20 }, { x: 18, z: -22 }, { x: -5, z: 20 },
  ];
  for (const pos of ratPositions) {
    const rat = new Rat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rat.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rat);
  }

  const chickenPositions = [
    { x: 25, z: 15 }, { x: -22, z: -10 },
  ];
  for (const pos of chickenPositions) {
    const chicken = new Chicken(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    chicken.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(chicken);
  }

  const rabbitPositions = [
    { x: -25, z: 20 }, { x: 22, z: -18 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rabbit);
  }

  // FINAL BOSS: Imperador Supremo (seated on the throne, giant armored pig emperor)
  const boss = new Pig(0, 40, true);
  boss.bossName = 'Imperador Supremo';
  const bossY = terrain.getHeightAt(0, 40) + 4;
  boss.initPhysics(physics, 0, bossY, 40, 1.2);
  enemies.push(boss);

  // Biscuits (very scarce in the final arena - only 4)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 4; i++) {
    const x = randomRange(-30, 30);
    const z = randomRange(-30, 25);
    const y = terrain.getHeightAt(x, z);
    const biscuit = new Biscuit(x, y, z, scene);
    biscuits.push(biscuit);
  }

  // Player enters from the far end of the carpet
  const spawnY = terrain.getHeightAt(0, -35) + 3;

  return {
    scene,
    terrain,
    enemies,
    biscuits,
    spawnPoint: { x: 0, y: spawnY, z: -35 },
    name: 'Torre do Imperador',
    boss,
  };
}
