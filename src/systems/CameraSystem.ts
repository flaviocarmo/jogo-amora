import * as THREE from 'three';
import { clamp, smoothDamp } from '../utils/math';

export class CameraSystem {
  camera: THREE.PerspectiveCamera;
  private distance = 10;
  private theta = 0;
  private phi = 0.5;
  private readonly PHI_MIN = 0.15;
  private readonly PHI_MAX = Math.PI * 0.45;
  private currentPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(0, 8, 12);
  }

  update(target: THREE.Vector3, mouseDX: number, mouseDY: number, dt: number) {
    this.theta -= mouseDX * 0.003;
    this.phi = clamp(this.phi - mouseDY * 0.003, this.PHI_MIN, this.PHI_MAX);

    const x = target.x + this.distance * Math.sin(this.theta) * Math.cos(this.phi);
    const y = target.y + this.distance * Math.sin(this.phi) + 2;
    const z = target.z + this.distance * Math.cos(this.theta) * Math.cos(this.phi);

    const desiredPos = new THREE.Vector3(x, y, z);

    this.currentPos.x = smoothDamp(this.currentPos.x, desiredPos.x, 8, dt);
    this.currentPos.y = smoothDamp(this.currentPos.y, desiredPos.y, 8, dt);
    this.currentPos.z = smoothDamp(this.currentPos.z, desiredPos.z, 8, dt);

    this.camera.position.copy(this.currentPos);

    this.targetLookAt.lerp(target.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.1);
    this.camera.lookAt(this.targetLookAt);
  }

  get forwardXZ(): THREE.Vector3 {
    const dir = new THREE.Vector3(
      -Math.sin(this.theta),
      0,
      -Math.cos(this.theta)
    ).normalize();
    return dir;
  }

  get rightXZ(): THREE.Vector3 {
    const forward = this.forwardXZ;
    return new THREE.Vector3(-forward.z, 0, forward.x);
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
