import * as THREE from 'three';
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
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

export function createLevel2(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Fog for dark forest atmosphere
  scene.fog = new THREE.FogExp2(C.L2_FOG, 0.015);

  // Skybox
  const sky = new Skybox(C.L2_SKY_TOP, C.L2_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Lighting (dimmer)
  const hemiLight = new THREE.HemisphereLight(C.L2_SKY_TOP, C.L2_GRASS_DARK, 0.4);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x334466, 0.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x88aacc, 0.8);
  dirLight.position.set(10, 25, -10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.camera.left = -40;
  dirLight.shadow.camera.right = 40;
  dirLight.shadow.camera.top = 40;
  dirLight.shadow.camera.bottom = -40;
  scene.add(dirLight);

  // Point lights for atmosphere (fireflies)
  for (let i = 0; i < 6; i++) {
    const light = new THREE.PointLight(0x88ff88, 0.5, 10);
    light.position.set(randomRange(-30, 30), 3, randomRange(-30, 30));
    scene.add(light);
  }

  // Terrain
  const terrain = new Terrain({
    width: 90,
    depth: 90,
    segments: 45,
    heightScale: 4,
    color: C.L2_GRASS,
    colorDark: C.L2_GRASS_DARK,
    noiseScale: 0.04,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Dense forest
  const veg = new Vegetation({
    trunkColor: C.L2_TREE_TRUNK,
    leavesColor: C.L2_TREE_LEAVES,
    count: 60,
    areaSize: 80,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
    minScale: 0.8,
    maxScale: 2.0,
    treeType: 'pine',
  });
  scene.add(veg.group);

  // Rocks (mossy-looking)
  const rocks = new Rocks({
    color: 0x445544,
    count: 25,
    areaSize: 80,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

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
    scene.add(pig.mesh);
    enemies.push(pig);
  }

  const rabbitPositions = [
    { x: 20, z: 5 }, { x: -8, z: 22 }, { x: -20, z: -5 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rabbit.mesh);
    enemies.push(rabbit);
  }

  // Boss: Giant pig
  const boss = new Pig(-30, -30, true);
  const bossY = terrain.getHeightAt(-30, -30) + 3;
  boss.initPhysics(physics, -30, bossY, -30, 0.9);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Biscuits
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 10; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
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
    name: 'Floresta Sombria',
    boss,
  };
}
