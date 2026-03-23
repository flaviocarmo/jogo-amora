import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { createNoise2D } from 'simplex-noise';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { hexColor } from '../utils/materials';

export interface TerrainConfig {
  width: number;
  depth: number;
  segments: number;
  heightScale: number;
  color: number;
  colorDark: number;
  noiseScale: number;
}

export class Terrain {
  mesh: Mesh;
  private heightData: Float32Array;
  private segments: number;
  private width: number;
  private depth: number;

  constructor(config: TerrainConfig, scene: Scene) {
    this.segments = config.segments;
    this.width = config.width;
    this.depth = config.depth;

    const noise2D = createNoise2D();

    // CreateGround produces an XZ plane with Y=up, matching the old rotated PlaneGeometry
    this.mesh = MeshBuilder.CreateGround(
      'terrain',
      {
        width: config.width,
        height: config.depth, // "height" in CreateGround is the Z-axis extent
        subdivisions: config.segments,
        updatable: true,
      },
      scene,
    );

    // --- Displace vertices with noise ---
    const positions = this.mesh.getVerticesData(VertexBuffer.PositionKind)!;
    const vertexCount = positions.length / 3;
    this.heightData = new Float32Array(vertexCount);

    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      const ns = config.noiseScale;
      const height =
        noise2D(x * ns * 0.3, z * ns * 0.3) * config.heightScale +
        noise2D(x * ns, z * ns) * config.heightScale * 0.3 +
        noise2D(x * ns * 3, z * ns * 3) * config.heightScale * 0.08;
      positions[i * 3 + 1] = height;
      this.heightData[i] = height;
    }

    this.mesh.updateVerticesData(VertexBuffer.PositionKind, positions);

    // --- Vertex colors for height-based variation ---
    const c1 = hexColor(config.color);
    const c2 = hexColor(config.colorDark);
    const colors = new Float32Array(vertexCount * 4); // Babylon uses RGBA vertex colors

    for (let i = 0; i < vertexCount; i++) {
      const h = positions[i * 3 + 1];
      const t = (h / config.heightScale + 1) * 0.5;
      const r = c1.r + (c2.r - c1.r) * t;
      const g = c1.g + (c2.g - c1.g) * t;
      const b = c1.b + (c2.b - c1.b) * t;
      colors[i * 4] = r;
      colors[i * 4 + 1] = g;
      colors[i * 4 + 2] = b;
      colors[i * 4 + 3] = 1.0;
    }

    this.mesh.setVerticesData(VertexBuffer.ColorKind, colors, true);

    // Recompute normals after displacement
    this.mesh.createNormals(false);

    // --- Material with vertex colors ---
    const material = new StandardMaterial('terrainMat', scene);
    material.diffuseColor = new Color3(1, 1, 1); // let vertex colors drive diffuse
    material.specularColor = new Color3(0.05, 0.05, 0.05);
    material.specularPower = 16;
    // Enable vertex color support
    material.useVertexColors = true;

    this.mesh.material = material;
    this.mesh.receiveShadows = true;
  }

  initPhysics(physics: PhysicsWorld): void {
    physics.createStaticBody(this.mesh);
  }

  getHeightAt(x: number, z: number): number {
    const halfW = this.width / 2;
    const halfD = this.depth / 2;
    const nx = ((x + halfW) / this.width) * this.segments;
    const nz = ((z + halfD) / this.depth) * this.segments;
    const ix = Math.floor(Math.max(0, Math.min(this.segments, nx)));
    const iz = Math.floor(Math.max(0, Math.min(this.segments, nz)));
    const idx = iz * (this.segments + 1) + ix;
    return this.heightData[idx] || 0;
  }
}
