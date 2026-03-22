import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rat } from '../entities/enemies/Rat';
import { Cat } from '../entities/enemies/Cat';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 10: Vulcao Ardente
 * A scorching volcanic landscape with lava rivers, ash particles, and obsidian rocks.
 * Boss: Gato Vulcanico (heat-resistant cat)
 * Difficulty: high - lava hazards, dense enemies, few biscuits
 */

function createLavaRiver(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  length: number, width: number,
  rotation = 0
) {
  // Long narrow lava surface
  const lavaGeo = new THREE.CapsuleGeometry(width / 2, length, 6, 8);
  const lavaMat = new THREE.MeshBasicMaterial({ color: C.L10_LAVA });
  const lava = new THREE.Mesh(lavaGeo, lavaMat);
  lava.rotation.x = Math.PI / 2;
  lava.rotation.z = rotation;
  lava.position.set(x, y + 0.05, z);
  scene.add(lava);

  // Lava glow along the river
  const glow = new THREE.PointLight(C.L10_LAVA, 1.2, 14);
  glow.position.set(x, y + 0.8, z);
  scene.add(glow);

  // Secondary glow at river ends for longer coverage
  const glow2 = new THREE.PointLight(C.L10_LAVA, 0.8, 10);
  const offsetX = Math.sin(rotation) * length * 0.4;
  const offsetZ = Math.cos(rotation) * length * 0.4;
  glow2.position.set(x + offsetX, y + 0.8, z + offsetZ);
  scene.add(glow2);
}

function createAshParticle(
  scene: THREE.Scene,
  x: number, y: number, z: number
) {
  // Floating ash cloud (grey glowing point)
  const ashLight = new THREE.PointLight(C.L10_ASH, 0.3, 5);
  ashLight.position.set(x, y, z);
  scene.add(ashLight);

  // Small grey sphere as visible ash
  const ashGeo = new THREE.SphereGeometry(0.08, 4, 3);
  const ashMat = new THREE.MeshBasicMaterial({ color: C.L10_ASH });
  const ashMesh = new THREE.Mesh(ashGeo, ashMat);
  ashMesh.position.set(x, y, z);
  scene.add(ashMesh);
}

export function createLevel10(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Heavy red volcanic fog
  scene.fog = new THREE.Fog(C.L10_SKY_BOTTOM, 30, 90);

  // Skybox (infernal red-black sky)
  const sky = new Skybox(C.L10_SKY_TOP, C.L10_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Lava underglow (hemisphere light for warm lava ambience)
  const lavaUnderLight = new THREE.HemisphereLight(C.L10_LAVA, 0x110000, 0.4);
  scene.add(lavaUnderLight);

  const ambientLight = new THREE.AmbientLight(0x330000, 0.3);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xff6622, 0.8);
  dirLight.position.set(-15, 30, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 130;
  dirLight.shadow.camera.left = -55;
  dirLight.shadow.camera.right = 55;
  dirLight.shadow.camera.top = 55;
  dirLight.shadow.camera.bottom = -55;
  scene.add(dirLight);

  // Terrain (volcanic, jagged, very rugged)
  const terrain = new Terrain({
    width: 100,
    depth: 100,
    segments: 50,
    heightScale: 7,
    color: C.L10_GROUND,
    colorDark: C.L10_GROUND_DARK,
    noiseScale: 0.05,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Lava rivers (long narrow channels across the terrain)
  const lavaRivers = [
    { x: -18, z: -5, length: 18, width: 2.5, rot: 0.3 },
    { x: 20, z: 10, length: 22, width: 2.0, rot: -0.2 },
    { x: 5, z: -20, length: 16, width: 3.0, rot: 0.8 },
    { x: -8, z: 20, length: 14, width: 2.2, rot: 0.1 },
    { x: 28, z: -15, length: 12, width: 1.8, rot: -0.5 },
  ];
  for (const river of lavaRivers) {
    const y = terrain.getHeightAt(river.x, river.z);
    createLavaRiver(scene, river.x, y, river.z, river.length, river.width, river.rot);
  }

  // Floating ash particles scattered across the map
  const ashPositions = [
    { x: -10, z: -8, h: 4 }, { x: 15, z: 5, h: 5 }, { x: -22, z: 15, h: 6 },
    { x: 8, z: -15, h: 3.5 }, { x: 25, z: -5, h: 7 }, { x: -5, z: 25, h: 4.5 },
    { x: 12, z: 18, h: 5.5 }, { x: -18, z: -20, h: 6 }, { x: 30, z: 20, h: 4 },
    { x: -30, z: 8, h: 5 }, { x: 0, z: -28, h: 6.5 }, { x: 22, z: -25, h: 4 },
  ];
  for (const pos of ashPositions) {
    const y = terrain.getHeightAt(pos.x, pos.z) + pos.h;
    createAshParticle(scene, pos.x, y, pos.z);
  }

  // Dense dark volcanic rocks
  const rocks = new Rocks({
    color: C.L10_ROCK,
    count: 55,
    areaSize: 95,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  // Obsidian rocks (near-black)
  const obsidianRocks = new Rocks({
    color: 0x1a1a1a,
    count: 30,
    areaSize: 95,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(obsidianRocks.group);

  // Enemies: 5 rats + 4 cats (heat-resistant survivors)
  const enemies: Enemy[] = [];

  const ratPositions = [
    { x: 14, z: 8 }, { x: -16, z: 12 },
    { x: 22, z: -18 }, { x: -12, z: -22 }, { x: 6, z: 26 },
  ];
  for (const pos of ratPositions) {
    const rat = new Rat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rat.mesh);
    enemies.push(rat);
  }

  const catPositions = [
    { x: -20, z: -8 }, { x: 18, z: -12 },
    { x: -8, z: 18 }, { x: 26, z: 14 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(cat.mesh);
    enemies.push(cat);
  }

  // Boss: Gato Vulcanico (heat-resistant cat boss)
  const boss = new Cat(35, 35, true);
  boss.bossName = 'Gato Vulcanico';
  const bossY = terrain.getHeightAt(35, 35) + 4;
  boss.initPhysics(physics, 35, bossY, 35, 1.0);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Dramatic lava glow ring around boss area
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const tx = 35 + Math.cos(angle) * 7;
    const tz = 35 + Math.sin(angle) * 7;
    const ty = terrain.getHeightAt(tx, tz);

    const torchLight = new THREE.PointLight(C.L10_LAVA, 1.0, 9);
    torchLight.position.set(tx, ty + 2.5, tz);
    scene.add(torchLight);

    const flameGeo = new THREE.SphereGeometry(0.18, 4, 4);
    const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: C.L10_LAVA }));
    flame.position.copy(torchLight.position);
    scene.add(flame);
  }

  // Biscuits (scarce - only 5 on the volcanic terrain)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 5; i++) {
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
    name: 'Vulcao Ardente',
    boss,
  };
}
