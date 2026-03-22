import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { Vegetation } from '../world/Vegetation';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';

export interface LevelData {
  scene: THREE.Scene;
  terrain: Terrain;
  enemies: Enemy[];
  biscuits: Biscuit[];
  spawnPoint: { x: number; y: number; z: number };
  name: string;
  boss: Enemy | null;
}

export function createLevel1(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Skybox
  const sky = new Skybox(C.L1_SKY_TOP, C.L1_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  dirLight.position.set(20, 30, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.camera.left = -40;
  dirLight.shadow.camera.right = 40;
  dirLight.shadow.camera.top = 40;
  dirLight.shadow.camera.bottom = -40;
  scene.add(dirLight);

  // Terrain
  const terrain = new Terrain({
    width: 80,
    depth: 80,
    segments: 40,
    heightScale: 3,
    color: C.L1_GRASS,
    colorDark: C.L1_GRASS_DARK,
    noiseScale: 0.05,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Trees
  const veg = new Vegetation({
    trunkColor: C.L1_TREE_TRUNK,
    leavesColor: C.L1_TREE_LEAVES,
    count: 30,
    areaSize: 70,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(veg.group);

  // Rocks
  const rocks = new Rocks({
    color: C.L1_ROCK,
    count: 20,
    areaSize: 70,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

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
    scene.add(rabbit.mesh);
    enemies.push(rabbit);
  }

  // Boss: Giant rabbit at far corner
  const boss = new Rabbit(30, 30, true);
  const bossY = terrain.getHeightAt(30, 30) + 3;
  boss.initPhysics(physics, 30, bossY, 30, 0.8);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Biscuits
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 8; i++) {
    const x = randomRange(-30, 30);
    const z = randomRange(-30, 30);
    const y = terrain.getHeightAt(x, z);
    const biscuit = new Biscuit(x, y, z);
    scene.add(biscuit.mesh);
    biscuits.push(biscuit);
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
