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

/**
 * Level 5: Pantano Nebuloso
 * Swampy wetlands with thick fog, murky water pools, twisted trees, lily pads.
 * Boss: Porco do Pantano (swamp pig with poison charge)
 * Difficulty: heavy fog reduces visibility, enemies hide in fog
 */

function createSwampPool(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  radius: number
) {
  // Murky water disc
  const waterGeo = new THREE.CircleGeometry(radius, 12);
  const waterMat = new THREE.MeshToonMaterial({
    color: C.L5_WATER,
    transparent: true,
    opacity: 0.7,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, y + 0.05, z);
  scene.add(water);

  // Lily pads on bigger pools
  if (radius > 2) {
    const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
    for (let i = 0; i < Math.floor(radius); i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (radius - 0.5);
      const lilyGeo = new THREE.CircleGeometry(0.25, 6);
      const lily = new THREE.Mesh(lilyGeo, toon(C.L5_LILY));
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(
        x + Math.cos(angle) * dist,
        y + 0.1,
        z + Math.sin(angle) * dist
      );
      lily.rotation.z = Math.random() * Math.PI;
      scene.add(lily);

      // Occasional flower on lily pad
      if (Math.random() > 0.6) {
        const flowerGeo = new THREE.SphereGeometry(0.08, 4, 4);
        const flower = new THREE.Mesh(flowerGeo, toon(0xff88cc));
        flower.position.copy(lily.position);
        flower.position.y += 0.15;
        scene.add(flower);
      }
    }
  }
}

function createHangingVines(
  scene: THREE.Scene,
  x: number, y: number, z: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const count = 2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const vineLength = randomRange(1.5, 4);
    const vineGeo = new THREE.CylinderGeometry(0.02, 0.02, vineLength, 4);
    const vine = new THREE.Mesh(vineGeo, toon(C.L5_VINE));
    vine.position.set(
      x + randomRange(-0.5, 0.5),
      y + 3 - vineLength / 2,
      z + randomRange(-0.5, 0.5)
    );
    vine.rotation.z = randomRange(-0.2, 0.2);
    scene.add(vine);

    // Small leaf at the end
    const leafGeo = new THREE.SphereGeometry(0.06, 3, 3);
    const leaf = new THREE.Mesh(leafGeo, toon(C.L5_TREE_LEAVES));
    leaf.position.set(vine.position.x, y + 3 - vineLength, vine.position.z);
    scene.add(leaf);
  }
}

export function createLevel5(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Heavy swamp fog
  scene.fog = new THREE.FogExp2(C.L5_FOG, 0.02);

  // Skybox (murky green-grey)
  const sky = new Skybox(C.L5_SKY_TOP, C.L5_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Lighting (dim, greenish)
  const ambientLight = new THREE.AmbientLight(0x445533, 0.35);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x99aa77, 0.6);
  dirLight.position.set(8, 20, -5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.camera.left = -45;
  dirLight.shadow.camera.right = 45;
  dirLight.shadow.camera.top = 45;
  dirLight.shadow.camera.bottom = -45;
  scene.add(dirLight);

  // Swamp firefly point lights
  for (let i = 0; i < 10; i++) {
    const light = new THREE.PointLight(0xaaff44, 0.3, 6);
    light.position.set(randomRange(-35, 35), 2, randomRange(-35, 35));
    scene.add(light);
  }

  // Terrain (flat and swampy)
  const terrain = new Terrain({
    width: 95,
    depth: 95,
    segments: 47,
    heightScale: 2,
    color: C.L5_GROUND,
    colorDark: C.L5_GROUND_DARK,
    noiseScale: 0.03,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Twisted swamp trees (dense, gnarled)
  const veg = new Vegetation({
    trunkColor: C.L5_TREE_TRUNK,
    leavesColor: C.L5_TREE_LEAVES,
    count: 45,
    areaSize: 85,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
    minScale: 0.7,
    maxScale: 1.8,
  });
  scene.add(veg.group);

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
  const rocks = new Rocks({
    color: 0x4a5a3a,
    count: 25,
    areaSize: 85,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

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
    scene.add(pig.mesh);
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
    scene.add(rabbit.mesh);
    enemies.push(rabbit);
  }

  // Boss: Porco do Pantano (big pig lurking in the deep swamp)
  const boss = new Pig(-30, -30, true);
  boss.bossName = 'Porco do Pantano';
  const bossY = terrain.getHeightAt(-30, -30) + 4;
  boss.initPhysics(physics, -30, bossY, -30, 1.0);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Swamp pool around boss area
  createSwampPool(scene, -30, terrain.getHeightAt(-30, -30), -30, 6);

  // Biscuits (hidden in the swamp)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 7; i++) {
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
    name: 'Pantano Nebuloso',
    boss,
  };
}
