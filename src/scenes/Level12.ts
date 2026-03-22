import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Rabbit } from '../entities/enemies/Rabbit';
import { Pig } from '../entities/enemies/Pig';
import { Cat } from '../entities/enemies/Cat';
import { Rat } from '../entities/enemies/Rat';
import { Chicken } from '../entities/enemies/Chicken';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 12: Torre do Imperador - FINAL BOSS
 * The top of the emperor's tower: a grand throne room arena with pillars, torches,
 * gold decorations, and a red carpet leading to the supreme ruler.
 * Boss: Imperador Supremo (the ultimate pig emperor)
 * Difficulty: maximum - every enemy type, very few biscuits
 */

function createThroneColumn(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  height: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Column base (wide flat box)
  const baseGeo = new THREE.BoxGeometry(1.0, 0.3, 1.0);
  const base = new THREE.Mesh(baseGeo, toon(C.L12_TOWER));
  base.position.y = 0.15;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Column shaft (cylinder)
  const shaftGeo = new THREE.CylinderGeometry(0.35, 0.4, height, 8);
  const shaft = new THREE.Mesh(shaftGeo, toon(C.L12_TOWER));
  shaft.position.y = 0.3 + height / 2;
  shaft.castShadow = true;
  group.add(shaft);

  // Column capital (top decorative box)
  const capitalGeo = new THREE.BoxGeometry(0.9, 0.25, 0.9);
  const capital = new THREE.Mesh(capitalGeo, toon(C.L12_TOWER));
  capital.position.y = 0.3 + height + 0.125;
  group.add(capital);

  // Gold sphere decoration on top of capital
  const goldGeo = new THREE.SphereGeometry(0.18, 6, 5);
  const goldSphere = new THREE.Mesh(goldGeo, toon(C.L12_GOLD));
  goldSphere.position.y = 0.3 + height + 0.35;
  group.add(goldSphere);

  // Torch on column (flame + light)
  const torchLight = new THREE.PointLight(0xff8833, 1.0, 12);
  torchLight.position.set(0.5, height * 0.65, 0);
  group.add(torchLight);

  const flameGeo = new THREE.SphereGeometry(0.14, 4, 4);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xff8833 }));
  flame.position.copy(torchLight.position);
  group.add(flame);

  group.position.set(x, y, z);
  scene.add(group);
}

function createThrone(
  scene: THREE.Scene,
  x: number, y: number, z: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Throne base (wide platform seat)
  const seatGeo = new THREE.BoxGeometry(2.4, 0.4, 1.8);
  const seat = new THREE.Mesh(seatGeo, toon(C.L12_THRONE));
  seat.position.y = 0.2;
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);

  // Throne back (tall ornate back panel)
  const backGeo = new THREE.BoxGeometry(2.4, 3.2, 0.3);
  const back = new THREE.Mesh(backGeo, toon(C.L12_THRONE));
  back.position.set(0, 2.0, -0.75);
  back.castShadow = true;
  group.add(back);

  // Back panel gold trim (thin overlay)
  const trimGeo = new THREE.BoxGeometry(2.0, 2.6, 0.08);
  const trim = new THREE.Mesh(trimGeo, toon(C.L12_GOLD));
  trim.position.set(0, 2.0, -0.58);
  group.add(trim);

  // Arm rests (left and right)
  for (const side of [-1, 1]) {
    const armGeo = new THREE.BoxGeometry(0.25, 0.2, 1.6);
    const arm = new THREE.Mesh(armGeo, toon(C.L12_THRONE));
    arm.position.set(side * 1.1, 0.5, -0.1);
    group.add(arm);

    // Gold orb on armrest end
    const orbGeo = new THREE.SphereGeometry(0.15, 6, 5);
    const orb = new THREE.Mesh(orbGeo, toon(C.L12_GOLD));
    orb.position.set(side * 1.1, 0.65, 0.65);
    group.add(orb);
  }

  // Crown-like spires on throne back top
  const spirePositions = [-0.9, -0.3, 0.3, 0.9];
  for (const sx of spirePositions) {
    const spireGeo = new THREE.ConeGeometry(0.1, 0.5, 4);
    const spire = new THREE.Mesh(spireGeo, toon(C.L12_GOLD));
    spire.position.set(sx, 3.85, -0.75);
    group.add(spire);
  }

  // Throne step platform (slightly wider, lower)
  const stepGeo = new THREE.BoxGeometry(3.2, 0.2, 2.4);
  const step = new THREE.Mesh(stepGeo, toon(C.L12_TOWER));
  step.position.y = -0.1;
  step.receiveShadow = true;
  group.add(step);

  group.position.set(x, y, z);
  scene.add(group);
}

function createCarpet(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  length: number
) {
  // Red carpet runner from spawn toward throne
  const carpetGeo = new THREE.BoxGeometry(2.0, 0.08, length);
  const carpetMat = new THREE.MeshToonMaterial({ color: C.L12_CARPET });
  const carpet = new THREE.Mesh(carpetGeo, carpetMat);
  carpet.position.set(x, y + 0.04, z);
  carpet.receiveShadow = true;
  scene.add(carpet);

  // Gold border strips along the carpet edges
  for (const side of [-1, 1]) {
    const borderGeo = new THREE.BoxGeometry(0.12, 0.09, length);
    const border = new THREE.Mesh(borderGeo, new THREE.MeshToonMaterial({ color: C.L12_GOLD }));
    border.position.set(x + side * 1.06, y + 0.045, z);
    scene.add(border);
  }
}

export function createLevel12(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Dramatic dark-red atmosphere of the emperor's tower
  scene.fog = new THREE.Fog(C.L12_SKY_BOTTOM, 35, 100);

  // Skybox (pitch-black night above the tower)
  const sky = new Skybox(C.L12_SKY_TOP, C.L12_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Dramatic gold-red lighting
  const hemiLight = new THREE.HemisphereLight(0x331100, 0x110000, 0.4);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x221100, 0.3);
  scene.add(ambientLight);

  // Main dramatic directional light from above
  const dirLight = new THREE.DirectionalLight(0xff9944, 0.9);
  dirLight.position.set(0, 40, -20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.far = 150;
  dirLight.shadow.camera.left = -60;
  dirLight.shadow.camera.right = 60;
  dirLight.shadow.camera.top = 60;
  dirLight.shadow.camera.bottom = -60;
  scene.add(dirLight);

  // Gold accent light from throne direction
  const throneLight = new THREE.PointLight(C.L12_GOLD, 1.5, 30);
  throneLight.position.set(0, 10, 40);
  scene.add(throneLight);

  // Terrain (tower top platform, relatively flat with gentle height variation)
  const terrain = new Terrain({
    width: 110,
    depth: 110,
    segments: 55,
    heightScale: 4,
    color: C.L12_GROUND,
    colorDark: C.L12_GROUND_DARK,
    noiseScale: 0.03,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Red carpet from entrance toward throne (player enters from z = -35)
  const carpetY = terrain.getHeightAt(0, 0);
  createCarpet(scene, 0, carpetY, 5, 80);

  // Throne at far end of the arena
  const throneY = terrain.getHeightAt(0, 38);
  createThrone(scene, 0, throneY, 38);

  // Arena pillars arranged in two rows flanking the carpet
  const pillarPairs = [
    { z: -20 }, { z: -8 }, { z: 5 }, { z: 18 }, { z: 30 },
  ];
  for (const pair of pillarPairs) {
    for (const side of [-1, 1]) {
      const px = side * 12;
      const py = terrain.getHeightAt(px, pair.z);
      createThroneColumn(scene, px, py, pair.z, 7);
    }
  }

  // Additional flanking torches near the throne
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const tx = Math.cos(angle) * 9;
    const tz = 38 + Math.sin(angle) * 9;
    const ty = terrain.getHeightAt(tx, tz);

    const torchLight = new THREE.PointLight(0xff8833, 1.2, 10);
    torchLight.position.set(tx, ty + 3, tz);
    scene.add(torchLight);

    const flameGeo = new THREE.SphereGeometry(0.16, 4, 4);
    const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xff8833 }));
    flame.position.copy(torchLight.position);
    scene.add(flame);
  }

  // Gold decorative spheres scattered as floor ornaments
  const goldOrnamentPositions = [
    { x: -8, z: -15 }, { x: 8, z: -15 }, { x: -8, z: 25 }, { x: 8, z: 25 },
    { x: -14, z: 5 }, { x: 14, z: 5 },
  ];
  for (const pos of goldOrnamentPositions) {
    const py = terrain.getHeightAt(pos.x, pos.z);
    const ornGeo = new THREE.SphereGeometry(0.22, 7, 6);
    const orn = new THREE.Mesh(ornGeo, new THREE.MeshToonMaterial({ color: C.L12_GOLD }));
    orn.position.set(pos.x, py + 0.22, pos.z);
    scene.add(orn);
  }

  // Dark stone rocks around the arena perimeter
  const rocks = new Rocks({
    color: C.L12_GROUND_DARK,
    count: 30,
    areaSize: 100,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  // Enemies: maximum difficulty - ALL enemy types
  const enemies: Enemy[] = [];

  const pigPositions = [
    { x: 10, z: -20 }, { x: -10, z: -15 },
    { x: 15, z: 10 }, { x: -15, z: 15 },
  ];
  for (const pos of pigPositions) {
    const pig = new Pig(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    pig.initPhysics(physics, pos.x, y, pos.z);
    scene.add(pig.mesh);
    enemies.push(pig);
  }

  const catPositions = [
    { x: 20, z: -5 }, { x: -20, z: 5 }, { x: 8, z: 25 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(cat.mesh);
    enemies.push(cat);
  }

  const ratPositions = [
    { x: -18, z: -20 }, { x: 18, z: -22 }, { x: -5, z: 20 },
  ];
  for (const pos of ratPositions) {
    const rat = new Rat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rat.mesh);
    enemies.push(rat);
  }

  const chickenPositions = [
    { x: 25, z: 15 }, { x: -22, z: -10 },
  ];
  for (const pos of chickenPositions) {
    const chicken = new Chicken(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    chicken.initPhysics(physics, pos.x, y, pos.z);
    scene.add(chicken.mesh);
    enemies.push(chicken);
  }

  const rabbitPositions = [
    { x: -25, z: 20 }, { x: 22, z: -18 },
  ];
  for (const pos of rabbitPositions) {
    const rabbit = new Rabbit(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rabbit.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rabbit.mesh);
    enemies.push(rabbit);
  }

  // FINAL BOSS: Imperador Supremo (seated on the throne, giant armored pig emperor)
  const boss = new Pig(0, 40, true);
  boss.bossName = 'Imperador Supremo';
  const bossY = terrain.getHeightAt(0, 40) + 4;
  boss.initPhysics(physics, 0, bossY, 40, 1.2);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Biscuits (very scarce in the final arena - only 4)
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 4; i++) {
    const x = randomRange(-30, 30);
    const z = randomRange(-30, 25);
    const y = terrain.getHeightAt(x, z);
    const biscuit = new Biscuit(x, y, z);
    scene.add(biscuit.mesh);
    biscuits.push(biscuit);
  }

  // Player enters from the far end of the carpet
  const spawnY = terrain.getHeightAt(0, -35) + 3;

  return {
    scene,
    terrain,
    enemies,
    biscuits,
    spawnPoint: { x: 0, y: spawnY, z: -35 },
    name: 'Torre do Imperador',
    boss,
  };
}
