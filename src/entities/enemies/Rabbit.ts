import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Enemy } from './Enemy';
import { toonMat, basicMat } from '../../utils/materials';
import * as C from '../../utils/colors';

export class Rabbit extends Enemy {
  private jumpTimer = 0;
  private isJumping = false;
  private graphicGroup!: TransformNode;
  private headGroup!: TransformNode;
  private bodyMesh!: Mesh;
  private ears: TransformNode[] = [];
  private feet: TransformNode[] = [];
  private walkCycle = 0;

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = isBoss ? 5 : 6;
    this.detectionRadius = isBoss ? 18 : 12;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Coelho Gigante' : '';
  }

  protected override buildModel(scene: Scene) {
    const isBoss = this.isBoss;
    const scale = isBoss ? 2.5 : 1;
    const bodyColor = isBoss ? C.BOSS_TINT : C.RABBIT_BODY;

    this.graphicGroup = new TransformNode('rabbit-gfx', scene);
    this.graphicGroup.parent = this.mesh;

    // Body
    this.bodyMesh = MeshBuilder.CreateSphere('rabbit-body', { diameter: 0.8, segments: 8 }, scene);
    this.bodyMesh.material = toonMat('rabbit-body-mat', bodyColor, scene);
    this.bodyMesh.scaling.set(0.8, 1, 0.9);
    this.bodyMesh.position.y = 0.4;
    this.bodyMesh.parent = this.graphicGroup;

    // Head Group
    this.headGroup = new TransformNode('rabbit-head', scene);
    this.headGroup.position.set(0, 0.85, 0.15);
    this.headGroup.parent = this.graphicGroup;

    // Head Core
    const head = MeshBuilder.CreateSphere('rabbit-headcore', { diameter: 0.6, segments: 8 }, scene);
    head.material = toonMat('rabbit-headcore-mat', bodyColor, scene);
    head.parent = this.headGroup;

    // Ears (long!)
    for (const side of [-1, 1]) {
      const earPivot = new TransformNode(`rabbit-earpivot${side}`, scene);
      earPivot.position.set(side * 0.12, 0.25, -0.1);
      earPivot.parent = this.headGroup;

      const ear = MeshBuilder.CreateCapsule(`rabbit-ear${side}`, {
        height: 0.62, radius: 0.06, tessellation: 6,
      }, scene);
      ear.material = toonMat(`rabbit-ear-mat${side}`, C.RABBIT_EAR, scene);
      ear.position.set(0, 0.25, 0);
      ear.rotation.z = side * 0.15;
      ear.parent = earPivot;
      this.ears.push(earPivot);
    }

    // Eyes (red, evil!)
    for (const side of [-1, 1]) {
      const eye = MeshBuilder.CreateSphere(`rabbit-eye${side}`, { diameter: 0.12, segments: 5 }, scene);
      eye.material = basicMat(`rabbit-eye-mat${side}`, C.RABBIT_EYE, scene);
      eye.position.set(side * 0.12, 0.05, 0.25);
      eye.parent = this.headGroup;
    }

    // Tail (puffball)
    const tail = MeshBuilder.CreateSphere('rabbit-tail', { diameter: 0.24, segments: 5 }, scene);
    tail.material = toonMat('rabbit-tail-mat', 0xffffff, scene);
    tail.position.set(0, 0.35, -0.35);
    tail.parent = this.graphicGroup;

    // Feet
    for (const side of [-1, 1]) {
      const footPivot = new TransformNode(`rabbit-foot${side}`, scene);
      footPivot.position.set(side * 0.15, 0.05, 0);
      footPivot.parent = this.graphicGroup;

      const foot = MeshBuilder.CreateBox(`rabbit-footbox${side}`, {
        width: 0.12, height: 0.08, depth: 0.25,
      }, scene);
      foot.material = toonMat(`rabbit-foot-mat${side}`, bodyColor, scene);
      foot.position.set(0, 0, 0.1);
      foot.parent = footPivot;
      this.feet.push(footPivot);
    }

    this.mesh.scaling.setAll(scale);

    // Boss crown
    if (isBoss) {
      const crown = MeshBuilder.CreateCylinder('rabbit-crown', {
        diameterTop: 0.3, diameterBottom: 0.4, height: 0.15, tessellation: 5,
      }, scene);
      crown.material = toonMat('rabbit-crown-mat', 0xffdd00, scene);
      crown.position.set(0, 0.4, -0.1);
      crown.parent = this.headGroup;

      // Crown spikes
      for (let i = 0; i < 5; i++) {
        const spike = MeshBuilder.CreateCylinder(`rabbit-spike${i}`, {
          diameterTop: 0, diameterBottom: 0.08, height: 0.12, tessellation: 4,
        }, scene);
        spike.material = toonMat(`rabbit-spike-mat${i}`, 0xffdd00, scene);
        const angle = (i / 5) * Math.PI * 2;
        spike.position.set(
          Math.cos(angle) * 0.15,
          0.5,
          Math.sin(angle) * 0.15 - 0.1
        );
        spike.parent = this.headGroup;
      }
    }
  }

  updateAI(dt: number, playerPos: Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    const vel = this.body.getLinearVelocity();
    const speedSq = vel.x * vel.x + vel.z * vel.z;
    const isMoving = speedSq > 0.1;

    const pos = this.mesh.position;
    const isGrounded = vel.y >= -0.1 && vel.y <= 0.1 && pos.y < 1.0;

    // Jumping Logic
    this.jumpTimer -= dt;
    if (this.jumpTimer <= 0 && this.state === 1 && isGrounded) { // CHASE
      this.isJumping = true;
      this.body.setLinearVelocity(new Vector3(vel.x * 1.5, 7, vel.z * 1.5));
      this.jumpTimer = 1.0 + Math.random() * 1.5;
    }

    if (isGrounded && this.isJumping) {
      this.isJumping = false;
    }

    // Squash & Stretch Animation
    if (!isGrounded || this.isJumping) {
      const stretch = Math.min(1.5, Math.max(0.7, 1 + vel.y * 0.05));
      this.graphicGroup.scaling.set(1 / stretch, stretch, 1 / stretch);

      for (const foot of this.feet) foot.rotation.x = 0.5;
    } else {
      // Lerp back to normal scale
      this.graphicGroup.scaling.x += (1.0 - this.graphicGroup.scaling.x) * 10 * dt;
      this.graphicGroup.scaling.y += (1.0 - this.graphicGroup.scaling.y) * 10 * dt;
      this.graphicGroup.scaling.z += (1.0 - this.graphicGroup.scaling.z) * 10 * dt;

      if (isMoving) {
        // Hopping animation
        this.walkCycle += dt * 15;
        const sin = Math.sin(this.walkCycle);
        this.bodyMesh.position.y = 0.4 + Math.abs(sin) * 0.1;

        this.feet[0].rotation.x = Math.sin(this.walkCycle) * 0.5;
        this.feet[1].rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.5;
      } else {
        // Idle breathing
        this.walkCycle += dt * 4;
        const breathe = Math.sin(this.walkCycle) * 0.02;
        this.bodyMesh.scaling.y = 1 + breathe;
        this.headGroup.position.y = 0.85 + breathe;

        for (const foot of this.feet) foot.rotation.x *= 0.8;
      }
    }

    // Ear flop animation
    const t = performance.now() * 0.005;
    const vY = vel.y;
    this.ears.forEach((ear, i) => {
      const baseRot = Math.max(-1.0, Math.min(0.5, -vY * 0.15));
      ear.rotation.x = baseRot + Math.sin(t + i) * 0.05;
    });
  }
}
