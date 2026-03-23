import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Terrain } from '../world/Terrain';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Pig } from '../entities/enemies/Pig';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { toonMat, hexColor } from '../utils/materials';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 4: Caverna Cristalina
 * Underground crystal cave with glowing crystals, mushrooms, and tight passages.
 * Boss: Coelho Cristalino (crystal-armored giant rabbit)
 * Difficulty: enemies are faster, fewer biscuits, low visibility
 */

function createCrystal(
  scene: Scene,
  x: number, y: number, z: number,
  color: number, scale: number
) {
  const group = new TransformNode('crystal', scene);

  // Main crystal shard
  const mesh = MeshBuilder.CreateCylinder(
    'crystalMain',
    { diameterTop: 0, diameterBottom: 0.3 * scale * 2, height: 1.5 * scale, tessellation: 5 },
    scene,
  );
  mesh.material = toonMat('crystalMat', color, scene);
  mesh.position.y = 0.75 * scale;
  mesh.parent = group;

  // Smaller side crystals
  for (let i = 0; i < 3; i++) {
    const sMesh = MeshBuilder.CreateCylinder(
      `crystalSide_${i}`,
      { diameterTop: 0, diameterBottom: 0.15 * scale * 2, height: 0.7 * scale, tessellation: 4 },
      scene,
    );
    sMesh.material = toonMat(`crystalSideMat_${i}`, color, scene);
    const angle = (i / 3) * Math.PI * 2 + Math.random();
    sMesh.position.set(
      Math.cos(angle) * 0.25 * scale,
      0.35 * scale,
      Math.sin(angle) * 0.25 * scale,
    );
    sMesh.rotation.z = (Math.random() - 0.5) * 0.5;
    sMesh.parent = group;
  }

  // Glow point light
  const glow = new PointLight('crystalGlow', new Vector3(0, 1.0 * scale, 0), scene);
  glow.diffuse = hexColor(color);
  glow.intensity = 0.6;
  glow.range = 8;
  glow.parent = group;

  group.position.set(x, y, z);
}

function createGlowMushroom(
  scene: Scene,
  x: number, y: number, z: number,
  scale: number
) {
  const group = new TransformNode('mushroom', scene);

  // Stem
  const stem = MeshBuilder.CreateCylinder(
    'mushroomStem',
    { diameterTop: 0.06 * scale * 2, diameterBottom: 0.08 * scale * 2, height: 0.4 * scale, tessellation: 5 },
    scene,
  );
  stem.material = toonMat('mushroomStemMat', 0xccccaa, scene);
  stem.position.y = 0.2 * scale;
  stem.parent = group;

  // Cap (hemisphere via sphere with top half)
  const cap = MeshBuilder.CreateSphere(
    'mushroomCap',
    { diameter: 0.2 * scale * 2, segments: 6 },
    scene,
  );
  cap.material = toonMat('mushroomCapMat', C.L4_MUSHROOM, scene);
  cap.position.y = 0.4 * scale;
  // Scale Y to make it a hemisphere-like shape
  cap.scaling.y = 0.5;
  cap.parent = group;

  // Glow
  const glow = new PointLight('mushroomGlow', new Vector3(0, 0.5 * scale, 0), scene);
  glow.diffuse = hexColor(C.L4_MUSHROOM_GLOW);
  glow.intensity = 0.3;
  glow.range = 4;
  glow.parent = group;

  group.position.set(x, y, z);
}

export function createLevel4(scene: Scene, physics: PhysicsWorld): LevelData {
  // Dark cave atmosphere
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.025;
  scene.fogColor = hexColor(0x0a0a1a);

  // Skybox (dark cave ceiling)
  new Skybox(C.L4_SKY_TOP, C.L4_SKY_BOTTOM, scene);

  // Dim ambient - cave is dark!
  scene.ambientColor = new Color3(
    ((0x222244 >> 16) & 0xff) / 255 * 0.25,
    ((0x222244 >> 8) & 0xff) / 255 * 0.25,
    (0x222244 & 0xff) / 255 * 0.25,
  );

  // Subtle directional (cracks in ceiling)
  const dirLight = new DirectionalLight('dir', new Vector3(-5, -25, -5), scene);
  dirLight.diffuse = hexColor(0x6688aa);
  dirLight.intensity = 0.4;

  // Terrain (cave floor, relatively flat with some bumps)
  const terrain = new Terrain(
    {
      width: 85,
      depth: 85,
      segments: 42,
      heightScale: 2.5,
      color: C.L4_GROUND,
      colorDark: C.L4_GROUND_DARK,
      noiseScale: 0.06,
    },
    scene,
  );
  terrain.initPhysics(physics);

  // Crystal formations scattered around
  const crystalColors = [C.L4_CRYSTAL, C.L4_CRYSTAL_DARK, C.L4_CRYSTAL_PINK, C.L4_CRYSTAL_GREEN];
  for (let i = 0; i < 25; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
    const y = terrain.getHeightAt(x, z);
    const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];
    createCrystal(scene, x, y, z, color, randomRange(0.8, 2.0));
  }

  // Glowing mushrooms
  for (let i = 0; i < 20; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    const y = terrain.getHeightAt(x, z);
    createGlowMushroom(scene, x, y, z, randomRange(0.8, 1.5));
  }

  // Dark cave rocks - many!
  new Rocks(
    {
      color: C.L4_ROCK,
      count: 40,
      areaSize: 75,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  new Rocks(
    {
      color: C.L4_ROCK_DARK,
      count: 30,
      areaSize: 75,
      getHeight: (x, z) => terrain.getHeightAt(x, z),
    },
    scene,
  );

  // Stalactites (hanging rocks from ceiling)
  for (let i = 0; i < 15; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    const stalactite = MeshBuilder.CreateCylinder(
      `stalactite_${i}`,
      {
        diameterTop: 0,
        diameterBottom: randomRange(0.2, 0.5) * 2,
        height: randomRange(1, 3),
        tessellation: 5,
      },
      scene,
    );
    stalactite.material = toonMat(`stalactiteMat_${i}`, C.L4_ROCK_DARK, scene);
    stalactite.position.set(x, randomRange(12, 18), z);
    stalactite.rotation.x = Math.PI; // Point downward
  }

  // Enemies: 5 fast rabbits + 3 pigs (tougher in the dark)
  const enemies: Enemy[] = [];
  const rabbitPositions = [
    { x: 15, z: 8 }, { x: -12, z: 18 }, { x: 22, z: -10 },
    { x: -20, z: -15 }, { x: 8, z: -25 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(rabbit);
  }

  const pigPositions = [
    { x: -18, z: 12 }, { x: 25, z: 15 }, { x: -8, z: -22 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    enemies.push(pig);
  }

  // Boss: Coelho Cristalino (giant rabbit, deep in the cave)
  const boss = new Rabbit(32, 32, true);
  boss.bossName = 'Coelho Cristalino';
  const bossY = terrain.getHeightAt(32, 32) + 3;
  boss.initPhysics(physics, 32, bossY, 32, 0.9);
  enemies.push(boss);

  // Crystal glow around boss area
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const cx = 32 + Math.cos(angle) * 5;
    const cz = 32 + Math.sin(angle) * 5;
    const cy = terrain.getHeightAt(cx, cz);
    createCrystal(scene, cx, cy, cz, C.L4_CRYSTAL_PINK, 2.5);
  }

  // Biscuits (scarce in the cave!)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 5; i++) {
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
    name: 'Caverna Cristalina',
    boss,
  };
}
