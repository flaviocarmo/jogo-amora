import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Terrain } from '../world/Terrain';
import { Vegetation } from '../world/Vegetation';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { hexColor } from '../utils/materials';
import { randomRange } from '../utils/math';

export interface LevelData {
  scene: Scene;
  terrain: Terrain;
  enemies: Enemy[];
  biscuits: Biscuit[];
  spawnPoint: { x: number; y: number; z: number };
  name: string;
  boss: Enemy | null;
}

export function createLevel1(scene: Scene, physics: PhysicsWorld): LevelData {
  // Skybox
  new Skybox(C.L1_SKY_TOP, C.L1_SKY_BOTTOM, scene);

  // Lighting
  const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.diffuse = hexColor(C.L1_SKY_TOP);
  hemiLight.groundColor = hexColor(C.L1_GRASS_DARK);
  hemiLight.intensity = 0.6;

  scene.ambientColor = new Color3(1, 1, 1);

  const dirLight = new DirectionalLight('dir', new Vector3(-20, -30, -20), scene);
  dirLight.diffuse = hexColor(0xffeedd);
  dirLight.intensity = 1.2;

  // Terrain
  const terrain = new Terrain(
    {
      width: 80,
      depth: 80,
      segments: 40,
      heightScale: 3,
      color: C.L1_GRASS,
      colorDark: C.L1_GRASS_DARK,
      noiseScale: 0.05,
    },
    scene,
  );
  terrain.initPhysics(physics);

  // Trees
  new Vegetation(
    {
      trunkColor: C.L1_TREE_TRUNK,
      leavesColor: C.L1_TREE_LEAVES,
      count: 30,
      areaSize: 70,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
      treeType: 'oak',
    },
    scene,
  );

  // Rocks
  new Rocks(
    {
      color: C.L1_ROCK,
      count: 20,
      areaSize: 70,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  // Enemies: 5 rabbits
  const enemies: Enemy[] = [];
  const enemyPositions = [
    { x: 15, z: 10 }, { x: -12, z: 15 }, { x: 20, z: -8 },
    { x: -18, z: -12 }, { x: 8, z: -20 },
  ];
  for (const pos of enemyPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rabbit);
  }

  // Boss: Giant rabbit at far corner
  const boss = new Rabbit(30, 30, true);
  const bossY = terrain.getHeightAt(30, 30) + 3;
  boss.initPhysics(physics, 30, bossY, 30, 0.8);
  enemies.push(boss);

  // Biscuits
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 8; i++) {
    const x = randomRange(-30, 30);
    const z = randomRange(-30, 30);
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
    name: 'Prado Verde',
    boss,
  };
}
