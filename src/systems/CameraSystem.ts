import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';

export class CameraSystem {
  camera: ArcRotateCamera;
  private target = Vector3.Zero();

  constructor(scene: Scene) {
    this.camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 12, Vector3.Zero(), scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 500;
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 20;
    this.camera.lowerBetaLimit = 0.3;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.1;
    // Disable default input (we handle input manually)
    this.camera.inputs.clear();
  }

  get forwardXZ(): Vector3 {
    const alpha = this.camera.alpha;
    return new Vector3(Math.sin(alpha), 0, Math.cos(alpha)).normalize();
  }

  get rightXZ(): Vector3 {
    const alpha = this.camera.alpha;
    return new Vector3(Math.cos(alpha), 0, -Math.sin(alpha)).normalize();
  }

  update(playerPos: Vector3, mouseDX: number, mouseDY: number, dt: number) {
    // Rotate camera
    this.camera.alpha -= mouseDX * 0.003;
    this.camera.beta -= mouseDY * 0.003;
    // Clamp beta
    this.camera.beta = Math.max(this.camera.lowerBetaLimit!, Math.min(this.camera.upperBetaLimit!, this.camera.beta));

    // Smoothly follow player (dt-independent exponential lerp)
    const lerpFactor = 1 - Math.pow(0.001, dt);
    const targetPos = new Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z);
    Vector3.LerpToRef(this.target, targetPos, lerpFactor, this.target);
    this.camera.setTarget(this.target);
  }

  resize(_aspectRatio: number) {
    // ArcRotateCamera handles this automatically
  }
}
