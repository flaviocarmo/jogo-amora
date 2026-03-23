import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Enemy, EnemyState } from './Enemy';
import { toonMat, basicMat } from '../../utils/materials';
import * as C from '../../utils/colors';

export class Rat extends Enemy {
  // Zigzag AI state
  private zigzagTimer = 0;
  private zigzagInterval = 0.5;

  // Graphic references for animation
  private graphicGroup!: TransformNode;
  private bodyMesh!: Mesh;
  private headGroup!: TransformNode;
  private legs: Mesh[] = [];
  private tailMesh!: Mesh;
  private walkCycle = 0;

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = 8;
    this.detectionRadius = isBoss ? 16 : 10;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Rato-Rei' : '';
  }

  protected override buildModel(scene: Scene) {
    const isBoss = this.isBoss;
    const scale = isBoss ? 2.2 : 1;
    const bodyColor = isBoss ? C.BOSS_TINT : C.RAT_BODY;

    this.graphicGroup = new TransformNode('rat-gfx', scene);
    this.graphicGroup.parent = this.mesh;

    // Body: small elongated sphere
    this.bodyMesh = MeshBuilder.CreateSphere('rat-body', { diameter: 0.6, segments: 8 }, scene);
    this.bodyMesh.material = toonMat('rat-body-mat', bodyColor, scene);
    this.bodyMesh.scaling.set(0.85, 0.8, 1.4);
    this.bodyMesh.position.y = 0.3;
    this.bodyMesh.parent = this.graphicGroup;

    // Head Group
    this.headGroup = new TransformNode('rat-head', scene);
    this.headGroup.position.set(0, 0.42, 0.38);
    this.headGroup.parent = this.graphicGroup;

    // Head: slightly elongated sphere
    const head = MeshBuilder.CreateSphere('rat-headcore', { diameter: 0.4, segments: 8 }, scene);
    head.material = toonMat('rat-headcore-mat', bodyColor, scene);
    head.scaling.set(0.85, 0.85, 1.25);
    head.parent = this.headGroup;

    // Ears: round, large relative to head
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateSphere(`rat-ear${side}`, { diameter: 0.2, segments: 8 }, scene);
      ear.material = toonMat(`rat-ear-mat${side}`, C.RAT_TAIL, scene);
      ear.scaling.set(1, 1.15, 0.4);
      ear.position.set(side * 0.14, 0.14, -0.06);
      ear.rotation.z = side * 0.2;
      ear.parent = this.headGroup;
    }

    // Eyes: small, red
    for (const side of [-1, 1]) {
      const eye = MeshBuilder.CreateSphere(`rat-eye${side}`, { diameter: 0.08, segments: 5 }, scene);
      eye.material = basicMat(`rat-eye-mat${side}`, C.RAT_EYE, scene);
      eye.position.set(side * 0.09, 0.06, 0.17);
      eye.parent = this.headGroup;
    }

    // Teeth: two small white rectangles
    for (const side of [-1, 1]) {
      const tooth = MeshBuilder.CreateBox(`rat-tooth${side}`, {
        width: 0.04, height: 0.05, depth: 0.03,
      }, scene);
      tooth.material = toonMat(`rat-tooth-mat${side}`, 0xffffff, scene);
      tooth.position.set(side * 0.03, -0.1, 0.18);
      tooth.parent = this.headGroup;
    }

    // Legs: 4 very small
    const legPositions = [
      { x: -0.18, z: 0.15 },
      { x:  0.18, z: 0.15 },
      { x: -0.18, z: -0.1 },
      { x:  0.18, z: -0.1 },
    ];
    for (const [i, lp] of legPositions.entries()) {
      const leg = MeshBuilder.CreateCylinder(`rat-leg${i}`, {
        diameterTop: 0.08, diameterBottom: 0.1, height: 0.18, tessellation: 5,
      }, scene);
      leg.material = toonMat(`rat-leg-mat${i}`, bodyColor, scene);
      leg.position.set(lp.x, 0.08, lp.z);
      leg.parent = this.graphicGroup;
      this.legs.push(leg);
    }

    // Tail: long thin cylinder, slightly pink
    this.tailMesh = MeshBuilder.CreateCylinder('rat-tail', {
      diameterTop: 0.04, diameterBottom: 0.03, height: 0.55, tessellation: 5,
    }, scene);
    this.tailMesh.material = toonMat('rat-tail-mat', C.RAT_TAIL, scene);
    this.tailMesh.rotation.x = Math.PI / 2 + 0.3;
    this.tailMesh.position.set(0, 0.22, -0.4);
    this.tailMesh.parent = this.graphicGroup;

    this.mesh.scaling.setAll(scale);

    // Boss crown
    if (isBoss) {
      const crown = MeshBuilder.CreateCylinder('rat-crown', {
        diameterTop: 0.28, diameterBottom: 0.36, height: 0.12, tessellation: 6,
      }, scene);
      crown.material = toonMat('rat-crown-mat', 0xffdd00, scene);
      crown.position.set(0, 0.3, -0.05);
      crown.parent = this.headGroup;

      for (let i = 0; i < 6; i++) {
        const spike = MeshBuilder.CreateCylinder(`rat-spike${i}`, {
          diameterTop: 0, diameterBottom: 0.06, height: 0.1, tessellation: 4,
        }, scene);
        spike.material = toonMat(`rat-spike-mat${i}`, 0xffdd00, scene);
        const angle = (i / 6) * Math.PI * 2;
        spike.position.set(
          Math.cos(angle) * 0.14,
          0.41,
          Math.sin(angle) * 0.14 - 0.05
        );
        spike.parent = this.headGroup;
      }
    }
  }

  updateAI(dt: number, playerPos: Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.hasController) return;

    // Erratic zigzag: add random lateral velocity every 0.5s while chasing
    if (this.state === EnemyState.CHASE) {
      this.zigzagTimer -= dt;
      if (this.zigzagTimer <= 0) {
        this.zigzagTimer = this.zigzagInterval;
        const vel = this.getControllerVelocity();
        const lateralX = -vel.z;
        const lateralZ = vel.x;
        const lateralLen = Math.sqrt(lateralX * lateralX + lateralZ * lateralZ);
        if (lateralLen > 0.01) {
          const nx = lateralX / lateralLen;
          const nz = lateralZ / lateralLen;
          const kick = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 3);
          this.setDirectVelocity(new Vector3(
            vel.x + nx * kick,
            vel.y,
            vel.z + nz * kick,
          ));
        }
      }
    } else {
      this.zigzagTimer = 0;
    }

    // Animation
    const vel = this.getControllerVelocity();
    const speedSq = vel.x * vel.x + vel.z * vel.z;
    const isMoving = speedSq > 0.1;

    if (isMoving) {
      this.walkCycle += dt * 18 * Math.sqrt(speedSq) * 0.25;
      const sin = Math.sin(this.walkCycle);
      const cos = Math.cos(this.walkCycle);

      this.legs[0].rotation.x =  sin * 0.7;
      this.legs[1].rotation.x = -sin * 0.7;
      this.legs[2].rotation.x = -sin * 0.7;
      this.legs[3].rotation.x =  sin * 0.7;

      this.bodyMesh.position.y = 0.3 + Math.abs(cos) * 0.04;
      this.headGroup.rotation.x = sin * 0.08;
      this.tailMesh.rotation.z = sin * 0.25;
    } else {
      for (const leg of this.legs) leg.rotation.x *= 0.8;
      this.bodyMesh.position.y += (0.3 - this.bodyMesh.position.y) * 0.1;
      this.headGroup.rotation.x *= 0.8;
      this.tailMesh.rotation.z *= 0.8;

      // Idle nose-twitch
      this.walkCycle += dt * 6;
      const breathe = Math.sin(this.walkCycle) * 0.015;
      this.headGroup.scaling.setAll(1 + breathe);
    }
  }
}
