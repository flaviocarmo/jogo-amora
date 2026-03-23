import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

export class Skybox {
  mesh: Mesh;

  constructor(topColor: number, bottomColor: number, scene: Scene) {
    // Create a large sky sphere
    this.mesh = MeshBuilder.CreateSphere('skybox', { diameter: 400, segments: 16 }, scene);
    this.mesh.infiniteDistance = true;

    const mat = new StandardMaterial('skyMat', scene);
    const top = Color3.FromHexString('#' + topColor.toString(16).padStart(6, '0'));
    const bottom = Color3.FromHexString('#' + bottomColor.toString(16).padStart(6, '0'));
    // Use emissive for unlit sky
    mat.emissiveColor = Color3.Lerp(top, bottom, 0.5);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    this.mesh.material = mat;
    this.mesh.isPickable = false;
  }
}
