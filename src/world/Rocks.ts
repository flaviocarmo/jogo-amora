import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { randomRange } from '../utils/math';
import { toonMat } from '../utils/materials';

export interface RocksConfig {
  color: number;
  count: number;
  areaSize: number;
  getHeight: (x: number, z: number) => number;
}

export class Rocks {
  root: TransformNode;

  constructor(config: RocksConfig, scene: Scene) {
    this.root = new TransformNode('rocks', scene);
    const mat = toonMat('rockMat', config.color, scene);

    const half = config.areaSize / 2;

    for (let i = 0; i < config.count; i++) {
      const x = randomRange(-half, half);
      const z = randomRange(-half, half);
      if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

      const y = config.getHeight(x, z);

      const cluster = new TransformNode(`rockCluster_${i}`, scene);
      cluster.position.set(x, y - 0.2, z);
      cluster.parent = this.root;

      const numPieces = Math.floor(randomRange(1, 4));

      for (let p = 0; p < numPieces; p++) {
        // Low-poly sphere + flat shading to mimic DodecahedronGeometry look
        const rock = MeshBuilder.CreateSphere(
          `rock_${i}_${p}`,
          { diameter: 2, segments: 2 }, // very low segments for angular look
          scene,
        );
        rock.convertToFlatShadedMesh();

        rock.position.set(
          randomRange(-0.5, 0.5),
          randomRange(0, 0.5),
          randomRange(-0.5, 0.5),
        );
        rock.scaling.set(
          randomRange(0.6, 1.5),
          randomRange(0.4, 1.2),
          randomRange(0.6, 1.5),
        );
        rock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        );
        rock.material = mat;
        rock.parent = cluster;
      }
    }
  }
}
