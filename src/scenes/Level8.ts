import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { Rocks } from '../world/Rocks';
import { Skybox } from '../world/Skybox';
import { Cat } from '../entities/enemies/Cat';
import { Rat } from '../entities/enemies/Rat';
import { Biscuit } from '../entities/items/Biscuit';
import { Enemy } from '../entities/enemies/Enemy';
import { PhysicsWorld } from '../core/PhysicsWorld';
import * as C from '../utils/colors';
import { randomRange } from '../utils/math';
import type { LevelData } from './Level1';

/**
 * Level 8: Cidade Abandonada
 * Post-apocalyptic city ruins with crumbling buildings, street lights, and rubble.
 * Boss: Gato das Sombras (shadowy cat lurking in the alleys)
 * Difficulty: cats stalk from shadows, rats dash through tight alley corridors
 */

function createBuilding(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  width: number, height: number, depth: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Main building body
  const bodyGeo = new THREE.BoxGeometry(width, height, depth);
  const body = new THREE.Mesh(bodyGeo, toon(C.L8_BUILDING));
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Darker roof slab
  const roofGeo = new THREE.BoxGeometry(width + 0.3, 0.3, depth + 0.3);
  const roof = new THREE.Mesh(roofGeo, toon(C.L8_BUILDING_DARK));
  roof.position.y = height + 0.15;
  roof.castShadow = true;
  group.add(roof);

  // Window holes (dark squares on the facade)
  const windowRows = Math.max(1, Math.floor(height / 2));
  const windowCols = Math.max(1, Math.floor(width / 1.5));
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const winGeo = new THREE.BoxGeometry(0.4, 0.5, 0.05);
      const winMat = new THREE.MeshToonMaterial({ color: 0x111122 });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(
        (col - (windowCols - 1) / 2) * (width / windowCols),
        1.2 + row * 2.0,
        depth / 2 + 0.03
      );
      group.add(win);
    }
  }

  group.position.set(x, y, z);
  scene.add(group);
}

function createStreetLight(
  scene: THREE.Scene,
  x: number, y: number, z: number
) {
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });
  const group = new THREE.Group();

  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 5, 5);
  const pole = new THREE.Mesh(poleGeo, toon(0x666666));
  pole.position.y = 2.5;
  pole.castShadow = true;
  group.add(pole);

  // Horizontal arm
  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4);
  const arm = new THREE.Mesh(armGeo, toon(0x666666));
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.6, 5, 0);
  group.add(arm);

  // Lamp housing
  const lampGeo = new THREE.SphereGeometry(0.18, 6, 5);
  const lamp = new THREE.Mesh(lampGeo, toon(0xffffcc));
  lamp.position.set(1.3, 4.9, 0);
  group.add(lamp);

  // Actual point light — dim orange-yellow like sodium vapor
  const light = new THREE.PointLight(0xffaa44, 0.8, 12);
  light.position.set(1.3, 4.8, 0);
  group.add(light);

  group.position.set(x, y, z);
  scene.add(group);
}

export function createLevel8(physics: PhysicsWorld): LevelData {
  const scene = new THREE.Scene();

  // Oppressive urban fog
  scene.fog = new THREE.FogExp2(C.L8_SKY_BOTTOM, 0.012);

  // Skybox (overcast city sky)
  const sky = new Skybox(C.L8_SKY_TOP, C.L8_SKY_BOTTOM);
  scene.add(sky.mesh);

  // Dim ambient — city is gloomy
  const ambientLight = new THREE.AmbientLight(0x334455, 0.3);
  scene.add(ambientLight);

  // Weak directional (overcast light)
  const dirLight = new THREE.DirectionalLight(0x667788, 0.5);
  dirLight.position.set(0, 30, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.camera.left = -55;
  dirLight.shadow.camera.right = 55;
  dirLight.shadow.camera.top = 55;
  dirLight.shadow.camera.bottom = -55;
  scene.add(dirLight);

  // Terrain (mostly flat urban ground)
  const terrain = new Terrain({
    width: 100,
    depth: 100,
    segments: 50,
    heightScale: 1.5,
    color: C.L8_GROUND,
    colorDark: C.L8_GROUND_DARK,
    noiseScale: 0.02,
  });
  scene.add(terrain.mesh);
  terrain.initPhysics(physics);

  // Buildings scattered across the city block
  const buildingConfigs = [
    { x: 15, z: 10, w: 5, h: 8, d: 4 },
    { x: -18, z: 8, w: 4, h: 6, d: 5 },
    { x: 22, z: -14, w: 6, h: 10, d: 4 },
    { x: -12, z: -20, w: 5, h: 7, d: 6 },
    { x: -28, z: 5, w: 4, h: 9, d: 4 },
    { x: 8, z: 28, w: 7, h: 6, d: 4 },
    { x: -22, z: -12, w: 4, h: 8, d: 5 },
    { x: 30, z: 20, w: 5, h: 5, d: 5 },
    { x: -30, z: -22, w: 6, h: 11, d: 4 },
    { x: 10, z: -28, w: 4, h: 7, d: 6 },
    { x: -6, z: 20, w: 5, h: 6, d: 4 },
    { x: 28, z: -5, w: 4, h: 8, d: 5 },
  ];
  for (const b of buildingConfigs) {
    const y = terrain.getHeightAt(b.x, b.z);
    createBuilding(scene, b.x, y, b.z, b.w, b.h, b.d);
  }

  // Street lights along the roads
  const lightPositions = [
    { x: 5, z: 0 }, { x: -5, z: 0 }, { x: 0, z: 8 },
    { x: 0, z: -8 }, { x: 12, z: -5 }, { x: -12, z: 5 },
    { x: 18, z: 18 }, { x: -18, z: -18 },
  ];
  for (const lp of lightPositions) {
    const y = terrain.getHeightAt(lp.x, lp.z);
    createStreetLight(scene, lp.x, y, lp.z);
  }

  // Rubble and debris
  const rocks = new Rocks({
    color: C.L8_RUST,
    count: 30,
    areaSize: 90,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rocks.group);

  const rubble = new Rocks({
    color: C.L8_BUILDING_DARK,
    count: 20,
    areaSize: 90,
    getHeight: (x, z) => terrain.getHeightAt(x, z),
  });
  scene.add(rubble.group);

  // Enemies: 4 cats (stalking in shadows) + 4 rats (fast in alleys)
  const enemies: Enemy[] = [];
  const catPositions = [
    { x: 16, z: 8 }, { x: -14, z: -18 },
    { x: 24, z: -12 }, { x: -20, z: 10 },
  ];
  for (const pos of catPositions) {
    const cat = new Cat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    cat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(cat.mesh);
    enemies.push(cat);
  }

  const ratPositions = [
    { x: 8, z: -14 }, { x: -10, z: 22 },
    { x: 26, z: 18 }, { x: -24, z: -6 },
  ];
  for (const pos of ratPositions) {
    const rat = new Rat(pos.x, pos.z);
    const y = terrain.getHeightAt(pos.x, pos.z) + 2;
    rat.initPhysics(physics, pos.x, y, pos.z);
    scene.add(rat.mesh);
    enemies.push(rat);
  }

  // Boss: Gato das Sombras (prowling in the darkest alley)
  const boss = new Cat(-30, -30, true);
  boss.bossName = 'Gato das Sombras';
  const bossY = terrain.getHeightAt(-30, -30) + 3;
  boss.initPhysics(physics, -30, bossY, -30, 0.75);
  scene.add(boss.mesh);
  enemies.push(boss);

  // Tall dark buildings flanking the boss arena
  const bossArenaBuildings = [
    { x: -24, z: -30, w: 5, h: 12, d: 4 },
    { x: -36, z: -24, w: 4, h: 10, d: 5 },
    { x: -30, z: -22, w: 6, h: 8, d: 4 },
  ];
  for (const b of bossArenaBuildings) {
    const y = terrain.getHeightAt(b.x, b.z);
    createBuilding(scene, b.x, y, b.z, b.w, b.h, b.d);
  }

  // Biscuits hidden in the ruins
  const biscuits: Biscuit[] = [];
  for (let i = 0; i < 6; i++) {
    const x = randomRange(-38, 38);
    const z = randomRange(-38, 38);
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
    name: 'Cidade Abandonada',
    boss,
  };
}
