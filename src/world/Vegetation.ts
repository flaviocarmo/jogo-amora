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
  treeType?: 'oak' | 'pine' | 'dead';
}

export class Vegetation {
  group: THREE.Group;

  constructor(config: VegetationConfig) {
    this.group = new THREE.Group();
    const type = config.treeType || 'oak';

    const trunkMat = new THREE.MeshStandardMaterial({ color: config.trunkColor, roughness: 1.0 });
    const leafMat = new THREE.MeshStandardMaterial({ color: config.leavesColor, roughness: 0.8 });

    const half = config.areaSize / 2;
    const minS = config.minScale ?? 0.8;
    const maxS = config.maxScale ?? 1.6;

    for (let i = 0; i < config.count; i++) {
      const x = randomRange(-half, half);
      const z = randomRange(-half, half);
      if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

      const y = config.getHeight(x, z);
      const scale = randomRange(minS, maxS);

      const tree = new THREE.Group();
      tree.position.set(x, y, z);
      tree.scale.setScalar(scale);
      tree.rotation.y = Math.random() * Math.PI * 2;

      // Organic Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.15, 0.3, 2.5, 7, 3);
      const trunkPositions = trunkGeo.attributes.position;
      for (let j = 0; j < trunkPositions.count; j++) {
        if (trunkPositions.getY(j) > 0) {
           trunkPositions.setX(j, trunkPositions.getX(j) + (Math.random()-0.5)*0.2);
           trunkPositions.setZ(j, trunkPositions.getZ(j) + (Math.random()-0.5)*0.2);
        }
      }
      trunkGeo.computeVertexNormals();

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.25;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      if (type === 'oak') {
        // Fluffy cloud-like leaves
        const crown = new THREE.Group();
        crown.position.y = 2.5;
        const leafGeo = new THREE.DodecahedronGeometry(1, 1);
        for(let k=0; k<5; k++) {
            const leafPuff = new THREE.Mesh(leafGeo, leafMat);
            leafPuff.scale.setScalar(randomRange(0.8, 1.4));
            leafPuff.position.set(
                randomRange(-0.8, 0.8),
                randomRange(-0.5, 0.5),
                randomRange(-0.8, 0.8)
            );
            leafPuff.castShadow = true;
            leafPuff.receiveShadow = true;
            crown.add(leafPuff);
        }
        tree.add(crown);
      } else if (type === 'pine') {
        // Sharp layered pine leaves
        for(let k=0; k<4; k++) {
            const h = 1.5 - (k * 0.2);
            const w = 1.8 - (k * 0.35);
            const coneGeo = new THREE.ConeGeometry(w, h, 7);
            const cone = new THREE.Mesh(coneGeo, leafMat);
            cone.position.y = 1.5 + k * 0.9;
            cone.castShadow = true;
            cone.receiveShadow = true;
            tree.add(cone);
        }
      } else if (type === 'dead') {
         // Spooky branches
         for(let k=0; k<3; k++) {
            const branchGeo = new THREE.CylinderGeometry(0.05, 0.1, 1.5, 5);
            const branch = new THREE.Mesh(branchGeo, trunkMat);
            branch.position.y = 2.0 + k*0.4;
            branch.position.x = (k%2===0?0.5:-0.5);
            branch.rotation.z = (k%2===0?-0.8:0.8);
            branch.rotation.y = randomRange(0, Math.PI);
            branch.castShadow = true;
            tree.add(branch);
         }
      }

      this.group.add(tree);
    }
  }
}
