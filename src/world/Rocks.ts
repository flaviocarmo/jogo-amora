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
    const mat = new THREE.MeshLambertMaterial({ color: config.color, flatShading: true });

    const half = config.areaSize / 2;

    for (let i = 0; i < config.count; i++) {
      const x = randomRange(-half, half);
      const z = randomRange(-half, half);
      if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

      const y = config.getHeight(x, z);

      // Distorted icosahedron for natural rock look
      const geo = new THREE.IcosahedronGeometry(randomRange(0.3, 1.2), 1);
      const positions = geo.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        positions.setX(j, positions.getX(j) + randomRange(-0.15, 0.15));
        positions.setY(j, positions.getY(j) + randomRange(-0.1, 0.1));
        positions.setZ(j, positions.getZ(j) + randomRange(-0.15, 0.15));
      }
      geo.computeVertexNormals();

      const rock = new THREE.Mesh(geo, mat);
      rock.position.set(x, y + 0.2, z);
      rock.scale.set(
        randomRange(0.8, 1.5),
        randomRange(0.5, 1.0),
        randomRange(0.8, 1.5)
      );
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
    }
  }
}
