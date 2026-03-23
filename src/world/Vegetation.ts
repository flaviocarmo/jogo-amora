import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { randomRange } from '../utils/math';
import { toonMat } from '../utils/materials';

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
  root: TransformNode;

  constructor(config: VegetationConfig, scene: Scene) {
    this.root = new TransformNode('vegetation', scene);
    const type = config.treeType || 'oak';

    const trunkMaterial = toonMat('trunkMat', config.trunkColor, scene);
    const leafMaterial = toonMat('leafMat', config.leavesColor, scene);

    const half = config.areaSize / 2;
    const minS = config.minScale ?? 0.8;
    const maxS = config.maxScale ?? 1.6;

    for (let i = 0; i < config.count; i++) {
      const x = randomRange(-half, half);
      const z = randomRange(-half, half);
      if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

      const y = config.getHeight(x, z);
      const scale = randomRange(minS, maxS);

      const tree = new TransformNode(`tree_${i}`, scene);
      tree.position.set(x, y, z);
      tree.scaling.setAll(scale);
      tree.rotation.y = Math.random() * Math.PI * 2;
      tree.parent = this.root;

      // --- Organic Trunk ---
      const trunk = MeshBuilder.CreateCylinder(
        `trunk_${i}`,
        { diameterTop: 0.3, diameterBottom: 0.6, height: 2.5, tessellation: 7, subdivisions: 3, updatable: true },
        scene,
      );
      // Wobble upper vertices for organic feel
      const trunkPos = trunk.getVerticesData(VertexBuffer.PositionKind)!;
      for (let j = 0; j < trunkPos.length / 3; j++) {
        if (trunkPos[j * 3 + 1] > 0) {
          trunkPos[j * 3] += (Math.random() - 0.5) * 0.2;
          trunkPos[j * 3 + 2] += (Math.random() - 0.5) * 0.2;
        }
      }
      trunk.updateVerticesData(VertexBuffer.PositionKind, trunkPos);
      trunk.createNormals(false);
      trunk.position.y = 1.25;
      trunk.material = trunkMaterial;
      trunk.parent = tree;

      if (type === 'oak') {
        // Fluffy cloud-like leaves using icospheres
        const crown = new TransformNode(`crown_${i}`, scene);
        crown.position.y = 2.5;
        crown.parent = tree;

        for (let k = 0; k < 5; k++) {
          const puff = MeshBuilder.CreateSphere(
            `leaf_${i}_${k}`,
            { diameter: 2, segments: 2 }, // low-poly icosphere
            scene,
          );
          const s = randomRange(0.8, 1.4);
          puff.scaling.setAll(s);
          puff.position.set(
            randomRange(-0.8, 0.8),
            randomRange(-0.5, 0.5),
            randomRange(-0.8, 0.8),
          );
          puff.material = leafMaterial;
          puff.parent = crown;
        }
      } else if (type === 'pine') {
        // Sharp layered pine cones
        for (let k = 0; k < 4; k++) {
          const h = 1.5 - k * 0.2;
          const w = 1.8 - k * 0.35;
          const cone = MeshBuilder.CreateCylinder(
            `pine_${i}_${k}`,
            { diameterTop: 0, diameterBottom: w * 2, height: h, tessellation: 7 },
            scene,
          );
          cone.position.y = 1.5 + k * 0.9;
          cone.material = leafMaterial;
          cone.parent = tree;
        }
      } else if (type === 'dead') {
        // Spooky branches
        for (let k = 0; k < 3; k++) {
          const branch = MeshBuilder.CreateCylinder(
            `branch_${i}_${k}`,
            { diameterTop: 0.1, diameterBottom: 0.2, height: 1.5, tessellation: 5 },
            scene,
          );
          branch.position.y = 2.0 + k * 0.4;
          branch.position.x = k % 2 === 0 ? 0.5 : -0.5;
          branch.rotation.z = k % 2 === 0 ? -0.8 : 0.8;
          branch.rotation.y = randomRange(0, Math.PI);
          branch.material = trunkMaterial;
          branch.parent = tree;
        }
      }
    }
  }
}
