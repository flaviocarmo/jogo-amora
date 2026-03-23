import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Terrain } from '../world/Terrain';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import { toonMat, basicMat, hexColor } from '../utils/materials';
import type { LevelData } from './Level1';

import { Rat } from '../entities/enemies/Rat';
import { Cat } from '../entities/enemies/Cat';

/**
 * Level 10: Vulcao Ardente
 * A scorching volcanic landscape with lava rivers, ash particles, and obsidian rocks.
 * Boss: Gato Vulcanico (heat-resistant cat)
 * Difficulty: high - lava hazards, dense enemies, few biscuits
 */

function createLavaRiver(
  scene: Scene,
  x: number, y: number, z: number,
  length: number, width: number,
  rotation = 0
) {
  // Long narrow lava surface using a capsule-like cylinder
  const lava = MeshBuilder.CreateCapsule('lavaRiver', {
    radius: width / 2,
    height: length,
    tessellation: 6,
    subdivisions: 8,
  }, scene);
  lava.rotation.x = Math.PI / 2;
  lava.rotation.z = rotation;
  lava.position.set(x, y + 0.05, z);
  lava.material = basicMat('lavaMat', C.L10_LAVA, scene);

  // Lava glow along the river
  const glow = new PointLight('lavaGlow', new Vector3(x, y + 0.8, z), scene);
  glow.diffuse = hexColor(C.L10_LAVA);
  glow.intensity = 1.2;
  glow.range = 14;

  // Secondary glow at river end for longer coverage
  const offsetX = Math.sin(rotation) * length * 0.4;
  const offsetZ = Math.cos(rotation) * length * 0.4;
  const glow2 = new PointLight('lavaGlow2', new Vector3(x + offsetX, y + 0.8, z + offsetZ), scene);
  glow2.diffuse = hexColor(C.L10_LAVA);
  glow2.intensity = 0.8;
  glow2.range = 10;
}

function createAshParticle(
  scene: Scene,
  x: number, y: number, z: number
) {
  // Floating ash cloud (grey glowing point)
  const ashLight = new PointLight('ashLight', new Vector3(x, y, z), scene);
  ashLight.diffuse = hexColor(C.L10_ASH);
  ashLight.intensity = 0.3;
  ashLight.range = 5;

  // Small grey sphere as visible ash
  const ashMesh = MeshBuilder.CreateSphere('ashSphere', {
    diameter: 0.08 * 2,
    segments: 4,
  }, scene);
  ashMesh.position.set(x, y, z);
  ashMesh.material = basicMat('ashMat', C.L10_ASH, scene);
}

export function createLevel10(scene: Scene, physics: PhysicsWorld): LevelData {
  // Heavy red volcanic fog
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 30;
  scene.fogEnd = 90;
  scene.fogColor = hexColor(C.L10_SKY_BOTTOM);

  // Skybox (infernal red-black sky)
  const sky = new Skybox(C.L10_SKY_TOP, C.L10_SKY_BOTTOM, scene);

  // Lava underglow (hemisphere light for warm lava ambience)
  const lavaUnderLight = new HemisphericLight('lavaHemi', new Vector3(0, 1, 0), scene);
  lavaUnderLight.diffuse = hexColor(C.L10_LAVA);
  lavaUnderLight.groundColor = hexColor(0x110000);
  lavaUnderLight.intensity = 0.4;

  // Dim dark ambient via directional light from above
  const ambientDir = new DirectionalLight('ambDir', new Vector3(0, -1, 0), scene);
  ambientDir.diffuse = hexColor(0x330000);
  ambientDir.intensity = 0.3;

  // Main dramatic orange directional light
  const dirLight = new DirectionalLight('dir', new Vector3(15, -30, -10).normalize(), scene);
  dirLight.diffuse = hexColor(0xff6622);
  dirLight.intensity = 0.8;

  // Terrain (volcanic, jagged, very rugged)
  const terrain = new Terrain({
    width: 100,
    depth: 100,
    segments: 50,
    heightScale: 7,
    color: C.L10_GROUND,
    colorDark: C.L10_GROUND_DARK,
    noiseScale: 0.05,
  }, scene);
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
  }, scene);

  // Obsidian rocks (near-black)
  const obsidianRocks = new Rocks({
    color: 0x1a1a1a,
    count: 30,
    areaSize: 95,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  }, scene);

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
    enemies.push(cat);
  }

  // Boss: Gato Vulcanico (heat-resistant cat boss)
  const boss = new Cat(35, 35, true);
  boss.bossName = 'Gato Vulcanico';
  const bossY = terrain.getHeightAt(35, 35) + 4;
  boss.initPhysics(physics, 35, bossY, 35, 1.0);
  enemies.push(boss);

  // Dramatic lava glow ring around boss area
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const tx = 35 + Math.cos(angle) * 7;
    const tz = 35 + Math.sin(angle) * 7;
    const ty = terrain.getHeightAt(tx, tz);

    const torchLight = new PointLight('bossLava' + i, new Vector3(tx, ty + 2.5, tz), scene);
    torchLight.diffuse = hexColor(C.L10_LAVA);
    torchLight.intensity = 1.0;
    torchLight.range = 9;

    const flame = MeshBuilder.CreateSphere('bossFlame' + i, {
      diameter: 0.18 * 2,
      segments: 4,
    }, scene);
    flame.position.set(tx, ty + 2.5, tz);
    flame.material = basicMat('bossFlameMat' + i, C.L10_LAVA, scene);
  }

  // Biscuits (scarce - only 5 on the volcanic terrain)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 5; i++) {
    const x = randomRange(-30, 30);
    const z = randomRange(-30, 30);
    const y = terrain.getHeightAt(x, z);
    const biscuit = new Biscuit(x, y, z, scene);
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
