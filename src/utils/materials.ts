import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

// Toon material: StandardMaterial with diffuse color, edge rendering enabled per-mesh
export function toonMat(name: string, color: number, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  const c = Color3.FromHexString('#' + color.toString(16).padStart(6, '0'));
  mat.diffuseColor = c;
  mat.specularColor = new Color3(0.1, 0.1, 0.1);
  mat.specularPower = 64;
  return mat;
}

// Glossy material for eyes, noses - PBR with reflectivity
export function glossMat(name: string, color: number, scene: Scene): PBRMaterial {
  const mat = new PBRMaterial(name, scene);
  const c = Color3.FromHexString('#' + color.toString(16).padStart(6, '0'));
  mat.albedoColor = c;
  mat.metallic = 0.3;
  mat.roughness = 0.1;
  mat.microSurface = 0.95;
  return mat;
}

// Basic unlit material (for highlights, effects)
export function basicMat(name: string, color: number, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  const c = Color3.FromHexString('#' + color.toString(16).padStart(6, '0'));
  mat.emissiveColor = c;
  mat.disableLighting = true;
  return mat;
}

// Helper to convert hex number to Color3
export function hexColor(hex: number): Color3 {
  return Color3.FromHexString('#' + hex.toString(16).padStart(6, '0'));
}
