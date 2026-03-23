import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import * as C from '../../utils/colors';
import { toonMat, hexColor } from '../../utils/materials';

export class Biscuit {
  mesh: TransformNode;
  collected = false;
  private spinSpeed = 2;
  private bobSpeed = 3;
  private bobHeight = 0.3;
  private baseY: number;

  constructor(x: number, y: number, z: number, scene: Scene) {
    this.mesh = new TransformNode('biscuit', scene);
    this.baseY = y + 1;

    // Biscuit shape (flattened cylinder)
    const biscuit = MeshBuilder.CreateCylinder(
      'biscuitDisc',
      { diameter: 0.6, height: 0.08, tessellation: 12 },
      scene,
    );
    biscuit.material = toonMat('biscuitMat', C.BISCUIT_COLOR, scene);
    biscuit.parent = this.mesh;

    // Chocolate chips
    for (let i = 0; i < 5; i++) {
      const chip = MeshBuilder.CreateSphere(
        `chip_${i}`,
        { diameter: 0.08, segments: 4 },
        scene,
      );
      chip.material = toonMat(`chipMat_${i}`, C.BISCUIT_DARK, scene);
      const angle = (i / 5) * Math.PI * 2 + Math.random();
      chip.position.set(
        Math.cos(angle) * 0.15,
        0.05,
        Math.sin(angle) * 0.15,
      );
      chip.parent = this.mesh;
    }

    // Glow effect — replace RingGeometry with a PointLight
    const glow = new PointLight('biscuitGlow', new Vector3(0, -0.1, 0), scene);
    glow.diffuse = hexColor(0xffdd88);
    glow.intensity = 0.5;
    glow.range = 2;
    glow.parent = this.mesh;

    this.mesh.position.set(x, this.baseY, z);
  }

  update(dt: number): void {
    if (this.collected) return;
    const t = performance.now() * 0.001;
    this.mesh.rotation.y += dt * this.spinSpeed;
    this.mesh.position.y = this.baseY + Math.sin(t * this.bobSpeed) * this.bobHeight;
  }

  collect(): void {
    this.collected = true;
    this.mesh.setEnabled(false);
  }
}
