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

export function createLevel3(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Storm atmosphere
  scene.fog = new THREE.Fog(C.L3_SKY_BOTTOM, 30, 100);

  // Skybox (stormy)
  const sky = new Skybox(C.L3_SKY_TOP, C.L3_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Lighting (dramatic)
  const hemiLight = new THREE.HemisphereLight(C.L3_SKY_TOP, C.L3_GROUND_DARK, 0.5);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x443355, 0.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xccaaee, 0.9);
  dirLight.position.set(-15, 30, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 120;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);

  // Lightning effect (flickering point light)
  const lightningLight = new THREE.PointLight(0xaaaaff, 0, 200);
  lightningLight.position.set(0, 50, 0);
  scene.add(lightningLight);

  // Terrain (mountainous)
  const terrain = new Terrain({
    width: 100,
    depth: 100,
    segments: 50,
    heightScale: 8,
    color: C.L3_GROUND,
    colorDark: C.L3_GROUND_DARK,
    noiseScale: 0.035,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Sparse dead trees
  const veg = new Vegetation({
    trunkColor: 0x3a2a1a,
    leavesColor: 0x2a3a2a,
    count: 15,
    areaSize: 90,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
    minScale: 0.5,
    maxScale: 1.0,
    treeType: 'dead',
  });
  scene.add(veg.group);

  // Many rocks
  const rocks = new Rocks({
    color: C.L3_ROCK,
    count: 50,
    areaSize: 90,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  // Dark rocks
  const darkRocks = new Rocks({
    color: C.L3_ROCK_DARK,
    count: 30,
    areaSize: 90,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(darkRocks.group);

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
    scene.add(pig.mesh);
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
    scene.add(rabbit.mesh);
    enemies.push(rabbit);
  }

  // Final Boss: Porco-Rei (armored super pig)
  const boss = new Pig(35, 35, true);
  const bossY = terrain.getHeightAt(35, 35) + 4;
  boss.initPhysics(physics, 35, bossY, 35, 1.0);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Biscuits (scarce in the mountain!)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 6; i++) {
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
    name: 'Montanha do Trovao',
    boss,
  };
}
