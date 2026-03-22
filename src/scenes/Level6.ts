import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
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
 * Level 6: Castelo do Rei Porco (Final Boss)
 * A dark castle fortress on volcanic terrain with lava rivers, towers, banners.
 * Boss: Imperador Porco (armored emperor pig with 10 hearts)
 * Difficulty: maximum - lots of enemies, few biscuits, lava hazards
 */

function createCastleWall(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  width: number, height: number, depth: number,
  rotation = 0
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Main wall
  const wallGeo = new THREE.BoxGeometry(width, height, depth);
  const wall = new THREE.Mesh(wallGeo, toon(C.L6_CASTLE_WALL));
  wall.position.y = height / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Battlements (crenellations)
  const merlonCount = Math.floor(width / 1.5);
  for (let i = 0; i < merlonCount; i++) {
    const merlonGeo = new THREE.BoxGeometry(0.6, 0.6, depth + 0.1);
    const merlon = new THREE.Mesh(merlonGeo, toon(C.L6_CASTLE_DARK));
    merlon.position.set(
      -width / 2 + 0.75 + i * (width / merlonCount),
      height + 0.3,
      0
    );
    group.add(merlon);
  }

  group.position.set(x, y, z);
  group.rotation.y = rotation;
  scene.add(group);
}

function createTower(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  radius: number, height: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Tower body
  const bodyGeo = new THREE.CylinderGeometry(radius, radius * 1.1, height, 8);
  const body = new THREE.Mesh(bodyGeo, toon(C.L6_CASTLE_WALL));
  body.position.y = height / 2;
  body.castShadow = true;
  group.add(body);

  // Conical roof
  const roofGeo = new THREE.ConeGeometry(radius * 1.3, height * 0.3, 8);
  const roof = new THREE.Mesh(roofGeo, toon(C.L6_BANNER));
  roof.position.y = height + height * 0.15;
  group.add(roof);

  // Torch on tower
  const torchLight = new THREE.PointLight(C.L6_TORCH, 1.0, 12);
  torchLight.position.set(radius + 0.2, height * 0.7, 0);
  group.add(torchLight);

  // Torch flame (small glowing sphere)
  const flameGeo = new THREE.SphereGeometry(0.12, 4, 4);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: C.L6_TORCH }));
  flame.position.copy(torchLight.position);
  group.add(flame);

  group.position.set(x, y, z);
  scene.add(group);
}

function createLavaPool(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  radius: number
) {
  // Lava disc
  const lavaGeo = new THREE.CircleGeometry(radius, 10);
  const lavaMat = new THREE.MeshBasicMaterial({
    color: C.L6_LAVA,
  });
  const lava = new THREE.Mesh(lavaGeo, lavaMat);
  lava.rotation.x = -Math.PI / 2;
  lava.position.set(x, y + 0.05, z);
  scene.add(lava);

  // Lava glow
  const glow = new THREE.PointLight(C.L6_LAVA_GLOW, 0.8, 10);
  glow.position.set(x, y + 0.5, z);
  scene.add(glow);
}

function createBanner(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  height: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, height, 4);
  const pole = new THREE.Mesh(poleGeo, toon(0x888888));
  pole.position.y = height / 2;
  group.add(pole);

  // Banner cloth
  const bannerGeo = new THREE.PlaneGeometry(0.8, height * 0.4);
  const banner = new THREE.Mesh(bannerGeo, toon(C.L6_BANNER));
  banner.position.set(0.45, height * 0.75, 0);
  group.add(banner);

  // Pig skull emblem on banner
  const skullGeo = new THREE.SphereGeometry(0.12, 5, 4);
  const skull = new THREE.Mesh(skullGeo, toon(0xdddddd));
  skull.position.set(0.45, height * 0.78, 0.02);
  group.add(skull);

  group.position.set(x, y, z);
  scene.add(group);
}

export function createLevel6(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Hellish atmosphere
  scene.fog = new THREE.Fog(C.L6_SKY_BOTTOM, 25, 80);

  // Skybox (red-black inferno)
  const sky = new Skybox(C.L6_SKY_TOP, C.L6_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Lighting (warm/ominous from lava)
  const ambientLight = new THREE.AmbientLight(0x442222, 0.3);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xff8844, 0.7);
  dirLight.position.set(-10, 25, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 120;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);

  // Red under-light for lava glow
  const underLight = new THREE.HemisphereLight(0x442222, 0xff4400, 0.3);
  scene.add(underLight);

  // Terrain (volcanic, rugged)
  const terrain = new Terrain({
    width: 110,
    depth: 110,
    segments: 55,
    heightScale: 5,
    color: C.L6_GROUND,
    colorDark: C.L6_GROUND_DARK,
    noiseScale: 0.04,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Castle structure around boss area (center-back of map)
  // Front wall
  createCastleWall(scene, 0, terrain.getHeightAt(0, 25), 25, 20, 6, 1.5);
  // Side walls
  createCastleWall(scene, -10, terrain.getHeightAt(-10, 32), 32, 15, 6, 1.5, Math.PI / 2);
  createCastleWall(scene, 10, terrain.getHeightAt(10, 32), 32, 15, 6, 1.5, Math.PI / 2);

  // Towers at corners
  const towerPositions = [
    { x: -10, z: 25 }, { x: 10, z: 25 },
    { x: -10, z: 40 }, { x: 10, z: 40 },
  ];
  for (const pos of towerPositions) {
    const y = terrain.getHeightAt(pos.x, pos.z);
    createTower(scene, pos.x, y, pos.z, 1.5, 8);
  }

  // Banners along approach path
  for (let i = 0; i < 6; i++) {
    const bx = (i % 2 === 0 ? -3 : 3);
    const bz = 5 + i * 3;
    const by = terrain.getHeightAt(bx, bz);
    createBanner(scene, bx, by, bz, 4);
  }

  // Lava pools scattered around
  const lavaPositions = [
    { x: -20, z: -10, r: 3 }, { x: 22, z: -15, r: 2.5 },
    { x: -15, z: 15, r: 2 }, { x: 18, z: 20, r: 3.5 },
    { x: -25, z: -25, r: 2 }, { x: 30, z: 5, r: 2.5 },
    { x: 0, z: -20, r: 4 },
  ];
  for (const pool of lavaPositions) {
    const y = terrain.getHeightAt(pool.x, pool.z);
    createLavaPool(scene, pool.x, y, pool.z, pool.r);
  }

  // Dark volcanic rocks
  const rocks = new Rocks({
    color: 0x3a2a2a,
    count: 45,
    areaSize: 100,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  const obsidianRocks = new Rocks({
    color: 0x1a1a1a,
    count: 25,
    areaSize: 100,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(obsidianRocks.group);

  // Enemies: 6 pigs (guards) + 5 rabbits (scouts) - maximum difficulty
  const enemies: Enemy[] = [];
  const pigPositions2 = [
    { x: 12, z: 8 }, { x: -14, z: 10 },
    { x: 20, z: -12 }, { x: -18, z: -18 },
    { x: 5, z: 20 }, { x: -5, z: 22 },
  ];
  for (const pos of pigPositions2) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    scene.add(pig.mesh);
    enemies.push(pig);
  }

  const rabbitPositions = [
    { x: 15, z: -5 }, { x: -10, z: -15 },
    { x: 25, z: 10 }, { x: -22, z: 5 }, { x: 8, z: -25 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rabbit.mesh);
    enemies.push(rabbit);
  }

  // FINAL BOSS: Imperador Porco (inside the castle courtyard)
  const boss = new Pig(0, 35, true);
  boss.bossName = 'Imperador Porco';
  const bossY = terrain.getHeightAt(0, 35) + 4;
  boss.initPhysics(physics, 0, bossY, 35, 1.2);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Torches around boss arena
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const tx = Math.cos(angle) * 6;
    const tz = 35 + Math.sin(angle) * 6;
    const ty = terrain.getHeightAt(tx, tz);

    const torchLight = new THREE.PointLight(C.L6_TORCH, 1.2, 10);
    torchLight.position.set(tx, ty + 3, tz);
    scene.add(torchLight);

    const flameGeo = new THREE.SphereGeometry(0.15, 4, 4);
    const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: C.L6_TORCH }));
    flame.position.copy(torchLight.position);
    scene.add(flame);
  }

  // Biscuits (very scarce in the castle!)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 4; i++) {
    const x = randomRange(-25, 25);
    const z = randomRange(-25, 20);
    const y = terrain.getHeightAt(x, z);
    const biscuit = new Biscuit(x, y, z);
    scene.add(biscuit.mesh);
    biscuits.push(biscuit);
  }

  const spawnY = terrain.getHeightAt(0, -30) + 3;

  return {
    scene,
    terrain,
    enemies,
    biscuits,
    spawnPoint: { x: 0, y: spawnY, z: -30 },
    name: 'Castelo do Rei Porco',
    boss,
  };
}
