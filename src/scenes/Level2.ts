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

export function createLevel2(scene: Scene, physics: PhysicsWorld): LevelData {
  // Fog for dark forest atmosphere
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.015;
  scene.fogColor = hexColor(C.L2_FOG);

  // Skybox
  new Skybox(C.L2_SKY_TOP, C.L2_SKY_BOTTOM, scene);

  // Lighting (dimmer)
  const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.diffuse = hexColor(C.L2_SKY_TOP);
  hemiLight.groundColor = hexColor(C.L2_GRASS_DARK);
  hemiLight.intensity = 0.4;

  scene.ambientColor = new Color3(
    ((0x334466 >> 16) & 0xff) / 255,
    ((0x334466 >> 8) & 0xff) / 255,
    (0x334466 & 0xff) / 255,
  );

  const dirLight = new DirectionalLight('dir', new Vector3(-10, -25, 10), scene);
  dirLight.diffuse = hexColor(0x88aacc);
  dirLight.intensity = 0.8;

  // Point lights for atmosphere (fireflies)
  for (let i = 0; i < 6; i++) {
    const light = new PointLight(`firefly_${i}`, new Vector3(randomRange(-30, 30), 3, randomRange(-30, 30)), scene);
    light.diffuse = hexColor(0x88ff88);
    light.intensity = 0.5;
    light.range = 10;
  }

  // Terrain
  const terrain = new Terrain(
    {
      width: 90,
      depth: 90,
      segments: 45,
      heightScale: 4,
      color: C.L2_GRASS,
      colorDark: C.L2_GRASS_DARK,
      noiseScale: 0.04,
    },
    scene,
  );
  terrain.initPhysics(physics);

  // Dense forest
  new Vegetation(
    {
      trunkColor: C.L2_TREE_TRUNK,
      leavesColor: C.L2_TREE_LEAVES,
      count: 60,
      areaSize: 80,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
      minScale: 0.8,
      maxScale: 2.0,
      treeType: 'pine',
    },
    scene,
  );

  // Rocks (mossy-looking)
  new Rocks(
    {
      color: 0x445544,
      count: 25,
      areaSize: 80,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  // Enemies: 4 pigs + 3 rabbits
  const enemies: Enemy[] = [];
  const pigPositions = [
    { x: 12, z: 12 }, { x: -15, z: 10 },
    { x: 18, z: -15 }, { x: -10, z: -18 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(pig);
  }

  const rabbitPositions = [
    { x: 20, z: 5 }, { x: -8, z: 22 }, { x: -20, z: -5 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rabbit);
  }

  // Boss: Giant pig
  const boss = new Pig(-30, -30, true);
  const bossY = terrain.getHeightAt(-30, -30) + 3;
  boss.initPhysics(physics, -30, bossY, -30, 0.9);
  enemies.push(boss);

  // Biscuits
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 10; i++) {
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
    name: 'Floresta Sombria',
    boss,
  };
}
