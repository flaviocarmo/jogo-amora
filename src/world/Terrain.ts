import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createNoise2D } from 'simplex-noise';
import { PhysicsWorld } from '../core/PhysicsWorld';

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
  mesh: THREE.Mesh;
  private heightData: Float32Array;
  private segments: number;
  private width: number;
  private depth: number;

  constructor(config: TerrainConfig) {
    this.segments = config.segments;
    this.width = config.width;
    this.depth = config.depth;

    const noise2D = createNoise2D();
    const geometry = new THREE.PlaneGeometry(
      config.width, config.depth,
      config.segments, config.segments
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const count = (config.segments + 1) * (config.segments + 1);
    this.heightData = new Float32Array(count);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const ns = config.noiseScale;
      const height =
        noise2D(x * ns * 0.3, z * ns * 0.3) * config.heightScale +
        noise2D(x * ns, z * ns) * config.heightScale * 0.3 +
        noise2D(x * ns * 3, z * ns * 3) * config.heightScale * 0.08;
      positions.setY(i, height);
      this.heightData[i] = height;
    }

    geometry.computeVertexNormals();

    // Vertex colors for variation
    const colors = new Float32Array(positions.count * 3);
    const c1 = new THREE.Color(config.color);
    const c2 = new THREE.Color(config.colorDark);
    for (let i = 0; i < positions.count; i++) {
      const h = positions.getY(i);
      const t = (h / config.heightScale + 1) * 0.5;
      const c = c1.clone().lerp(c2, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
  }

  initPhysics(physics: PhysicsWorld) {
    // Use trimesh collider from the terrain geometry (more reliable than heightfield)
    const geo = this.mesh.geometry;
    const vertices = new Float32Array(geo.attributes.position.array);
    const indicesAttr = geo.index;
    if (!indicesAttr) return;
    const indices = new Uint32Array(indicesAttr.array);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const body = physics.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(1.0);
    physics.createCollider(colliderDesc, body);
  }

  getHeightAt(x: number, z: number): number {
    // Approximate height at world position
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
