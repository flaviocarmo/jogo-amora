import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
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
import { hexColor } from '../utils/materials';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

export function createLevel3(scene: Scene, physics: PhysicsWorld): LevelData {
  // Storm atmosphere
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 30;
  scene.fogEnd = 100;
  scene.fogColor = hexColor(C.L3_SKY_BOTTOM);

  // Skybox (stormy)
  new Skybox(C.L3_SKY_TOP, C.L3_SKY_BOTTOM, scene);

  // Lighting (dramatic)
  const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.diffuse = hexColor(C.L3_SKY_TOP);
  hemiLight.groundColor = hexColor(C.L3_GROUND_DARK);
  hemiLight.intensity = 0.5;

  scene.ambientColor = new Color3(
    ((0x443355 >> 16) & 0xff) / 255,
    ((0x443355 >> 8) & 0xff) / 255,
    (0x443355 & 0xff) / 255,
  );

  const dirLight = new DirectionalLight('dir', new Vector3(15, -30, -20), scene);
  dirLight.diffuse = hexColor(0xccaaee);
  dirLight.intensity = 0.9;

  // Lightning effect (flickering point light at sky height)
  const lightningLight = new PointLight('lightning', new Vector3(0, 50, 0), scene);
  lightningLight.diffuse = hexColor(0xaaaaff);
  lightningLight.intensity = 0;
  lightningLight.range = 200;

  // Terrain (mountainous)
  const terrain = new Terrain(
    {
      width: 100,
      depth: 100,
      segments: 50,
      heightScale: 8,
      color: C.L3_GROUND,
      colorDark: C.L3_GROUND_DARK,
      noiseScale: 0.035,
    },
    scene,
  );
  terrain.initPhysics(physics);

  // Sparse dead trees
  new Vegetation(
    {
      trunkColor: 0x3a2a1a,
      leavesColor: 0x2a3a2a,
      count: 15,
      areaSize: 90,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
      minScale: 0.5,
      maxScale: 1.0,
      treeType: 'dead',
    },
    scene,
  );

  // Many rocks
  new Rocks(
    {
      color: C.L3_ROCK,
      count: 50,
      areaSize: 90,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  // Dark rocks
  new Rocks(
    {
      color: C.L3_ROCK_DARK,
      count: 30,
      areaSize: 90,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  // Enemies: 4 pigs + 4 rabbits
  const enemies: Enemy[] = [];
  const pigPositions = [
    { x: 15, z: 10 }, { x: -15, z: 15 },
    { x: 20, z: -20 }, { x: -20, z: -10 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(pig);
  }

  const rabbitPositions = [
    { x: 10, z: -15 }, { x: -10, z: -20 },
    { x: 25, z: 5 }, { x: -25, z: 8 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rabbit);
  }

  // Final Boss: Porco-Rei (armored super pig)
  const boss = new Pig(35, 35, true);
  const bossY = terrain.getHeightAt(35, 35) + 4;
  boss.initPhysics(physics, 35, bossY, 35, 1.0);
  enemies.push(boss);

  // Biscuits (scarce in the mountain!)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 6; i++) {
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
    name: 'Montanha do Trovao',
    boss,
  };
}
