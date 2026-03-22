import * as THREE from 'three';
import { randomRange } from '../utils/math';

export interface VegetationConfig {
  trunkColor: number;
  leavesColor: number;
  count: number;
  areaSize: number;
  getHeight: (x: number, z: number) => number;
  minScale?: number;
  maxScale?: number;
}

export class Vegetation {
  group: THREE.Group;

  constructor(config: VegetationConfig) {
    this.group = new THREE.Group();
    const toonTrunk = new THREE.MeshToonMaterial({ color: config.trunkColor });
    const toonLeaves = new THREE.MeshToonMaterial({ color: config.leavesColor });

    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2, 6);
    const coneGeo1 = new THREE.ConeGeometry(1.2, 1.5, 6);
    const coneGeo2 = new THREE.ConeGeometry(1.0, 1.3, 6);
    const coneGeo3 = new THREE.ConeGeometry(0.7, 1.0, 6);

    const half = config.areaSize / 2;
    const minS = config.minScale ?? 0.6;
    const maxS = config.maxScale ?? 1.4;

    for (let i = 0; i < config.count; i++) {
      const x = randomRange(-half, half);
      const z = randomRange(-half, half);
      // Avoid center spawn area
      if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

      const y = config.getHeight(x, z);
      const scale = randomRange(minS, maxS);

      const tree = new THREE.Group();
      tree.position.set(x, y, z);
      tree.scale.setScalar(scale);
      tree.rotation.y = Math.random() * Math.PI * 2;

      // Trunk
      const trunk = new THREE.Mesh(trunkGeo, toonTrunk);
      trunk.position.y = 1;
      trunk.castShadow = true;
      tree.add(trunk);

      // 3 layers of leaves (cone shapes stacked)
      const cone1 = new THREE.Mesh(coneGeo1, toonLeaves);
      cone1.position.y = 2.5;
      cone1.castShadow = true;
      tree.add(cone1);

      const cone2 = new THREE.Mesh(coneGeo2, toonLeaves);
      cone2.position.y = 3.3;
      cone2.castShadow = true;
      tree.add(cone2);

      const cone3 = new THREE.Mesh(coneGeo3, toonLeaves);
      cone3.position.y = 3.9;
      cone3.castShadow = true;
      tree.add(cone3);

      this.group.add(tree);
    }
  }
}
