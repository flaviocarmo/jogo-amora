import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Terrain } from '../world/Terrain';
import { Vegetation } from '../world/Vegetation';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Pig } from '../entities/enemies/Pig';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { toonMat, hexColor } from '../utils/materials';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 5: Pantano Nebuloso
 * Swampy wetlands with thick fog, murky water pools, twisted trees, lily pads.
 * Boss: Porco do Pantano (swamp pig with poison charge)
 * Difficulty: heavy fog reduces visibility, enemies hide in fog
 */

function createSwampPool(
  scene: Scene,
  x: number, y: number, z: number,
  radius: number
) {
  // Murky water disc
  const water = MeshBuilder.CreateDisc('swampWater', { radius, tessellation: 12 }, scene);
  const waterMat = new StandardMaterial('swampWaterMat', scene);
  waterMat.diffuseColor = hexColor(C.L5_WATER);
  waterMat.alpha = 0.7;
  water.material = waterMat;
  water.rotation.x = Math.PI / 2; // Babylon disc faces up by default; rotate to lie flat
  water.position.set(x, y + 0.05, z);

  // Lily pads on bigger pools
  if (radius > 2) {
    for (let i = 0; i < Math.floor(radius); i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (radius - 0.5);
      const lily = MeshBuilder.CreateDisc(`lily_${i}`, { radius: 0.25, tessellation: 6 }, scene);
      lily.material = toonMat(`lilyMat_${i}`, C.L5_LILY, scene);
      lily.rotation.x = Math.PI / 2;
      lily.position.set(
        x + Math.cos(angle) * dist,
        y + 0.1,
        z + Math.sin(angle) * dist,
      );
      lily.rotation.z = Math.random() * Math.PI;

      // Occasional flower on lily pad
      if (Math.random() > 0.6) {
        const flower = MeshBuilder.CreateSphere(`flower_${i}`, { diameter: 0.08 * 2, segments: 4 }, scene);
        flower.material = toonMat(`flowerMat_${i}`, 0xff88cc, scene);
        flower.position.set(lily.position.x, y + 0.15, lily.position.z);
      }
    }
  }
}

function createHangingVines(
  scene: Scene,
  x: number, y: number, z: number
) {
  const count = 2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const vineLength = randomRange(1.5, 4);
    const vine = MeshBuilder.CreateCylinder(
      `vine_${i}`,
      { diameterTop: 0.02 * 2, diameterBottom: 0.02 * 2, height: vineLength, tessellation: 4 },
      scene,
    );
    vine.material = toonMat(`vineMat_${i}`, C.L5_VINE, scene);
    vine.position.set(
      x + randomRange(-0.5, 0.5),
      y + 3 - vineLength / 2,
      z + randomRange(-0.5, 0.5),
    );
    vine.rotation.z = randomRange(-0.2, 0.2);

    // Small leaf at the end
    const leaf = MeshBuilder.CreateSphere(`vineLeaf_${i}`, { diameter: 0.06 * 2, segments: 3 }, scene);
    leaf.material = toonMat(`vineLeafMat_${i}`, C.L5_TREE_LEAVES, scene);
    leaf.position.set(vine.position.x, y + 3 - vineLength, vine.position.z);
  }
}

export function createLevel5(scene: Scene, physics: PhysicsWorld): LevelData {
  // Heavy swamp fog
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.02;
  scene.fogColor = hexColor(C.L5_FOG);

  // Skybox (murky green-grey)
  new Skybox(C.L5_SKY_TOP, C.L5_SKY_BOTTOM, scene);

  // Lighting (dim, greenish)
  scene.ambientColor = new Color3(
    ((0x445533 >> 16) & 0xff) / 255 * 0.35,
    ((0x445533 >> 8) & 0xff) / 255 * 0.35,
    (0x445533 & 0xff) / 255 * 0.35,
  );

  const dirLight = new DirectionalLight('dir', new Vector3(-8, -20, 5), scene);
  dirLight.diffuse = hexColor(0x99aa77);
  dirLight.intensity = 0.6;

  // Swamp firefly point lights
  for (let i = 0; i < 10; i++) {
    const light = new PointLight(`firefly_${i}`, new Vector3(randomRange(-35, 35), 2, randomRange(-35, 35)), scene);
    light.diffuse = hexColor(0xaaff44);
    light.intensity = 0.3;
    light.range = 6;
  }

  // Terrain (flat and swampy)
  const terrain = new Terrain(
    {
      width: 95,
      depth: 95,
      segments: 47,
      heightScale: 2,
      color: C.L5_GROUND,
      colorDark: C.L5_GROUND_DARK,
      noiseScale: 0.03,
    },
    scene,
  );
  terrain.initPhysics(physics);

  // Twisted swamp trees (dense, gnarled)
  new Vegetation(
    {
      trunkColor: C.L5_TREE_TRUNK,
      leavesColor: C.L5_TREE_LEAVES,
      count: 45,
      areaSize: 85,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
      minScale: 0.7,
      maxScale: 1.8,
    },
    scene,
  );

  // Hanging vines from some trees
  for (let i = 0; i < 20; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
    const y = terrain.getHeightAt(x, z);
    createHangingVines(scene, x, y, z);
  }

  // Swamp pools
  const poolPositions = [
    { x: 10, z: 10, r: 3.5 }, { x: -15, z: 8, r: 2.5 },
    { x: 20, z: -15, r: 4 }, { x: -8, z: -20, r: 3 },
    { x: -25, z: -5, r: 2 }, { x: 5, z: -28, r: 3.5 },
    { x: 25, z: 22, r: 2.5 }, { x: -20, z: 25, r: 3 },
  ];
  for (const pool of poolPositions) {
    const y = terrain.getHeightAt(pool.x, pool.z);
    createSwampPool(scene, pool.x, y, pool.z, pool.r);
  }

  // Mossy rocks
  new Rocks(
    {
      color: 0x4a5a3a,
      count: 25,
      areaSize: 85,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  // Enemies: 5 pigs (hide in fog) + 4 rabbits (ambush from bushes)
  const enemies: Enemy[] = [];
  const pigPositions = [
    { x: 14, z: 14 }, { x: -16, z: 12 },
    { x: 22, z: -18 }, { x: -12, z: -22 }, { x: -28, z: 5 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(pig);
  }

  const rabbitPositions = [
    { x: 18, z: 5 }, { x: -10, z: 25 },
    { x: -22, z: -8 }, { x: 10, z: -22 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rabbit);
  }

  // Boss: Porco do Pantano (big pig lurking in the deep swamp)
  const boss = new Pig(-30, -30, true);
  boss.bossName = 'Porco do Pantano';
  const bossY = terrain.getHeightAt(-30, -30) + 4;
  boss.initPhysics(physics, -30, bossY, -30, 1.0);
  enemies.push(boss);

  // Swamp pool around boss area
  createSwampPool(scene, -30, terrain.getHeightAt(-30, -30), -30, 6);

  // Biscuits (hidden in the swamp)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 7; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    const y = terrain.getHeightAt(x, z);
    biscuits.push(new Biscuit(x, y, z, scene));
  }

  const spawnY = terrain.getHeightAt(0, 0) + 3;

  return {
    scene,
    terrain,
    enemies,
    biscuits,
    spawnPoint: { x: 0, y: spawnY, z: 0 },
    name: 'Pantano Nebuloso',
    boss,
  };
}
