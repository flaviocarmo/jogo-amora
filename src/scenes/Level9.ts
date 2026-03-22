import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Cat } from '../entities/enemies/Cat';
import { Chicken } from '../entities/enemies/Chicken';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 9: Jardim Encantado
 * A magical garden with vibrant flowers, hedge mazes, and warm glowing lights.
 * Boss: Galinha Rainha (regal chicken boss ruling the garden)
 * Difficulty: maze-like hedges force close combat, mixed enemy types
 */

function createFlower(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  petalColor: number,
  scale: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, 0.35 * scale, 4);
  const stem = new THREE.Mesh(stemGeo, toon(0x33aa33));
  stem.position.y = 0.18 * scale;
  group.add(stem);

  // Petals as a flat sphere
  const petalGeo = new THREE.SphereGeometry(0.15 * scale, 6, 4);
  const petal = new THREE.Mesh(petalGeo, toon(petalColor));
  petal.position.y = 0.38 * scale;
  petal.scale.y = 0.5;
  group.add(petal);

  // Yellow center
  const centerGeo = new THREE.SphereGeometry(0.07 * scale, 5, 4);
  const center = new THREE.Mesh(centerGeo, toon(0xffee00));
  center.position.y = 0.4 * scale;
  group.add(center);

  group.position.set(x, y, z);
  scene.add(group);
}

function createHedge(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  width: number, height: number, depth: number
) {
  const hedgeGeo = new THREE.BoxGeometry(width, height, depth);
  const hedgeMat = new THREE.MeshToonMaterial({ color: C.L9_HEDGE });
  const hedge = new THREE.Mesh(hedgeGeo, hedgeMat);
  hedge.position.set(x, y + height / 2, z);
  hedge.castShadow = true;
  hedge.receiveShadow = true;
  scene.add(hedge);

  // Lighter top to give the trimmed look
  const topGeo = new THREE.BoxGeometry(width + 0.1, 0.2, depth + 0.1);
  const topMat = new THREE.MeshToonMaterial({ color: 0x44aa44 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(x, y + height + 0.1, z);
  scene.add(top);
}

function createButterfly(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  color: number
) {
  // Represent as a small colored point light floating in the air
  // giving the impression of glowing magical butterflies
  const light = new THREE.PointLight(color, 0.4, 5);
  light.position.set(x, y + randomRange(1.5, 3.5), z);
  scene.add(light);

  // Small flat plane as wing silhouette
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c, side: THREE.DoubleSide });
  for (let side = -1; side <= 1; side += 2) {
    const wingGeo = new THREE.PlaneGeometry(0.2, 0.15);
    const wing = new THREE.Mesh(wingGeo, toon(color));
    wing.position.set(x + side * 0.12, y + randomRange(1.5, 3.5), z);
    wing.rotation.y = Math.PI / 4;
    scene.add(wing);
  }
}

export function createLevel9(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // No fog — the garden is clear and magical
  const sky = new Skybox(C.L9_SKY_TOP, C.L9_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Warm magical ambient light
  const ambientLight = new THREE.AmbientLight(0xffccee, 0.55);
  scene.add(ambientLight);

  // Warm golden sun
  const sunLight = new THREE.DirectionalLight(0xffe0cc, 1.0);
  sunLight.position.set(8, 30, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.far = 100;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  scene.add(sunLight);

  // Soft pink fill from the pink sky
  const fillLight = new THREE.DirectionalLight(0xffaacc, 0.35);
  fillLight.position.set(-12, 15, -10);
  scene.add(fillLight);

  // Terrain (garden hills, gentle undulation)
  const terrain = new Terrain({
    width: 85,
    depth: 85,
    segments: 42,
    heightScale: 2.5,
    color: C.L9_GRASS,
    colorDark: C.L9_GRASS_DARK,
    noiseScale: 0.05,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Scattered flowers — pink and yellow across the garden
  const flowerColors = [C.L9_FLOWER_PINK, C.L9_FLOWER_YELLOW, 0xff99cc, 0xffcc55];
  for (let i = 0; i < 50; i++) {
    const x = randomRange(-38, 38);
    const z = randomRange(-38, 38);
    if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;
    const y = terrain.getHeightAt(x, z);
    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    createFlower(scene, x, y, z, color, randomRange(0.8, 1.4));
  }

  // Hedge walls forming maze-like patterns
  const hedgeLayout = [
    // Outer ring segments
    { x: 20, z: 0, w: 0.8, h: 3, d: 14 },
    { x: -20, z: 0, w: 0.8, h: 3, d: 14 },
    { x: 0, z: 20, w: 14, h: 3, d: 0.8 },
    { x: 0, z: -20, w: 14, h: 3, d: 0.8 },
    // Inner corridors
    { x: 10, z: 8, w: 0.8, h: 2.5, d: 10 },
    { x: -10, z: -8, w: 0.8, h: 2.5, d: 10 },
    { x: 8, z: -10, w: 10, h: 2.5, d: 0.8 },
    { x: -8, z: 10, w: 10, h: 2.5, d: 0.8 },
    // Corner accents
    { x: 16, z: 16, w: 6, h: 2.5, d: 0.8 },
    { x: -16, z: -16, w: 6, h: 2.5, d: 0.8 },
    { x: 16, z: -16, w: 0.8, h: 2.5, d: 6 },
    { x: -16, z: 16, w: 0.8, h: 2.5, d: 6 },
  ];
  for (const h of hedgeLayout) {
    const y = terrain.getHeightAt(h.x, h.z);
    createHedge(scene, h.x, y, h.z, h.w, h.h, h.d);
  }

  // Butterflies — colored point lights + wing planes floating around
  const butterflyColors = [0xff88ff, 0xffff44, 0x88ffff, 0xffaa88, 0xaaffaa];
  for (let i = 0; i < 18; i++) {
    const x = randomRange(-35, 35);
    const z = randomRange(-35, 35);
    const y = terrain.getHeightAt(x, z);
    const color = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
    createButterfly(scene, x, y, z, color);
  }

  // Small decorative rocks as garden stepping stones
  const rocks = new Rocks({
    color: 0xccbbaa,
    count: 15,
    areaSize: 75,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  // Enemies: 3 chickens + 3 cats + 2 rabbits
  const enemies: Enemy[] = [];
  const chickenPositions = [
    { x: 14, z: 12 }, { x: -16, z: 6 }, { x: 6, z: -18 },
  ];
  for (const pos of chickenPositions) {
    const chicken = new Chicken(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    chicken.initPhysics(physics, pos.x, y, pos.z);
    scene.add(chicken.mesh);
    enemies.push(chicken);
  }

  const catPositions = [
    { x: -14, z: -12 }, { x: 22, z: -8 }, { x: -8, z: 22 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(cat.mesh);
    enemies.push(cat);
  }

  const rabbitPositions = [
    { x: 18, z: -16 }, { x: -20, z: 14 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rabbit.mesh);
    enemies.push(rabbit);
  }

  // Boss: Galinha Rainha (presiding in her garden throne)
  const boss = new Chicken(30, -30, true);
  boss.bossName = 'Galinha Rainha';
  const bossY = terrain.getHeightAt(30, -30) + 3;
  boss.initPhysics(physics, 30, bossY, -30, 0.85);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Royal flower garden around boss — ring of pink flowers and warm lights
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const fx = 30 + Math.cos(angle) * 5;
    const fz = -30 + Math.sin(angle) * 5;
    const fy = terrain.getHeightAt(fx, fz);
    createFlower(scene, fx, fy, fz, C.L9_FLOWER_PINK, 1.5);
  }

  // Warm point lights in the boss clearing
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const light = new THREE.PointLight(0xff88bb, 0.5, 8);
    light.position.set(
      30 + Math.cos(angle) * 4,
      terrain.getHeightAt(30, -30) + 2,
      -30 + Math.sin(angle) * 4
    );
    scene.add(light);
  }

  // Biscuits hidden among the flower beds
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 8; i++) {
    const x = randomRange(-32, 32);
    const z = randomRange(-32, 32);
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
    name: 'Jardim Encantado',
    boss,
  };
}
