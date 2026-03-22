import * as THREE from 'three';
import { randomRange } from '../utils/math';

export interface RocksConfig {
  color: number;
  count: number;
  areaSize: number;
  getHeight: (x: number, z: number) => number;
}

export class Rocks {
  group: THREE.Group;

  constructor(config: RocksConfig) {
    this.group = new THREE.Group();
    // Use Standard material for better lighting interaction (PBR)
    const mat = new THREE.MeshStandardMaterial({ 
      color: config.color, 
      roughness: 0.9, 
      metalness: 0.1,
      flatShading: true 
    });

    const half = config.areaSize / 2;
    const baseGeo = new THREE.DodecahedronGeometry(1, 1);
    
    // Add noise to base geometry
    const positions = baseGeo.attributes.position;
    for (let j = 0; j < positions.count; j++) {
      positions.setX(j, positions.getX(j) + randomRange(-0.2, 0.2));
      positions.setY(j, positions.getY(j) + randomRange(-0.2, 0.2));
      positions.setZ(j, positions.getZ(j) + randomRange(-0.2, 0.2));
    }
    baseGeo.computeVertexNormals();

    for (let i = 0; i < config.count; i++) {
      const x = randomRange(-half, half);
      const z = randomRange(-half, half);
      if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

      const y = config.getHeight(x, z);

      // Create a rock cluster instead of a single rock
      const rockCluster = new THREE.Group();
      const numPieces = Math.floor(randomRange(1, 4));
      
      for(let p = 0; p < numPieces; p++) {
        const rockPiece = new THREE.Mesh(baseGeo, mat);
        rockPiece.position.set(
          randomRange(-0.5, 0.5), 
          randomRange(0, 0.5), 
          randomRange(-0.5, 0.5)
        );
        rockPiece.scale.set(
          randomRange(0.6, 1.5),
          randomRange(0.4, 1.2),
          randomRange(0.6, 1.5)
        );
        rockPiece.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        rockPiece.castShadow = true;
        rockPiece.receiveShadow = true;
        rockCluster.add(rockPiece);
      }

      rockCluster.position.set(x, y - 0.2, z);
      this.group.add(rockCluster);
    }
  }
}
