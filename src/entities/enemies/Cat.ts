import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Enemy, EnemyState } from './Enemy';
import { toonMat, basicMat, hexColor } from '../../utils/materials';
import * as C from '../../utils/colors';

// Cat AI states beyond base Enemy states
const enum CatPhase {
  CIRCLING,
  POUNCING,
  RECOVERING,
}

export class Cat extends Enemy {
  // AI
  private catPhase = CatPhase.CIRCLING;
  private circleAngle = 0;
  private pounceTimer = 0;
  private recoverTimer = 0;
  private pounceChargeTimer = 0;

  // Visual parts
  private graphicGroup!: TransformNode;
  private bodyMesh!: Mesh;
  private headGroup!: TransformNode;
  private tailGroup!: TransformNode;
  private tailSegments: Mesh[] = [];
  private legs: TransformNode[] = [];
  private eyeMeshes: Mesh[] = [];
  private walkCycle = 0;
  private tailCycle = 0;

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = 7;
    this.detectionRadius = isBoss ? 20 : 14;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Gato Sombrio' : '';
    this.pounceTimer = 2 + Math.random() * 2;
  }

  protected override buildModel(scene: Scene) {
    const isBoss = this.isBoss;
    const scale = isBoss ? 2.5 : 1;
    const bodyColor = isBoss ? 0x330055 : C.CAT_BODY;
    const eyeColor = isBoss ? 0x88ffaa : C.CAT_EYE;

    this.graphicGroup = new TransformNode('cat-gfx', scene);
    this.graphicGroup.parent = this.mesh;

    // --- Body: sleek elongated sphere ---
    this.bodyMesh = MeshBuilder.CreateSphere('cat-body', { diameter: 0.9, segments: 10 }, scene);
    this.bodyMesh.material = toonMat('cat-body-mat', bodyColor, scene);
    this.bodyMesh.scaling.set(0.75, 0.85, 1.1);
    this.bodyMesh.position.y = 0.42;
    this.bodyMesh.parent = this.graphicGroup;

    // --- Head Group ---
    this.headGroup = new TransformNode('cat-head', scene);
    this.headGroup.position.set(0, 0.78, 0.32);
    this.headGroup.parent = this.graphicGroup;

    // Head core
    const headMesh = MeshBuilder.CreateSphere('cat-headcore', { diameter: 0.5, segments: 8 }, scene);
    headMesh.material = toonMat('cat-headcore-mat', bodyColor, scene);
    headMesh.parent = this.headGroup;

    // Pointed triangular ears
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateCylinder(`cat-ear${side}`, {
        diameterTop: 0, diameterBottom: 0.16, height: 0.2, tessellation: 4,
      }, scene);
      ear.material = toonMat(`cat-ear-mat${side}`, bodyColor, scene);
      ear.position.set(side * 0.14, 0.22, -0.05);
      ear.rotation.z = side * -0.25;
      ear.parent = this.headGroup;

      // Inner ear
      const innerEar = MeshBuilder.CreateCylinder(`cat-innerear${side}`, {
        diameterTop: 0, diameterBottom: 0.09, height: 0.14, tessellation: 4,
      }, scene);
      innerEar.material = toonMat(`cat-innerear-mat${side}`, isBoss ? 0x220033 : 0xffaacc, scene);
      innerEar.position.set(side * 0.14, 0.22, -0.04);
      innerEar.rotation.z = side * -0.25;
      innerEar.parent = this.headGroup;
    }

    // Eyes — green glowing with slit pupils
    for (const side of [-1, 1]) {
      const eyeMesh = MeshBuilder.CreateSphere(`cat-eye${side}`, { diameter: 0.12, segments: 6 }, scene);
      eyeMesh.material = basicMat(`cat-eye-mat${side}`, eyeColor, scene);
      eyeMesh.position.set(side * 0.1, 0.06, 0.2);
      eyeMesh.parent = this.headGroup;
      this.eyeMeshes.push(eyeMesh);

      // Slit pupil
      const pupil = MeshBuilder.CreateSphere(`cat-pupil${side}`, { diameter: 0.05, segments: 5 }, scene);
      pupil.material = basicMat(`cat-pupil-mat${side}`, 0x000000, scene);
      pupil.scaling.set(0.35, 1, 0.35);
      pupil.position.set(side * 0.1, 0.06, 0.255);
      pupil.parent = this.headGroup;
    }

    // Snout
    const snout = MeshBuilder.CreateSphere('cat-snout', { diameter: 0.14, segments: 6 }, scene);
    snout.material = toonMat('cat-snout-mat', bodyColor, scene);
    snout.scaling.set(1.1, 0.6, 0.9);
    snout.position.set(0, -0.02, 0.22);
    snout.parent = this.headGroup;

    // Nose
    const nose = MeshBuilder.CreateSphere('cat-nose', { diameter: 0.05, segments: 4 }, scene);
    nose.material = basicMat('cat-nose-mat', isBoss ? 0x220022 : 0x221122, scene);
    nose.scaling.set(1.2, 0.7, 1);
    nose.position.set(0, -0.015, 0.27);
    nose.parent = this.headGroup;

    // Whiskers (line meshes)
    this.buildWhiskers(scene, isBoss);

    // --- Legs: 4 slim ---
    const legPositions = [
      { x: -0.18, z: 0.2 },
      { x: 0.18, z: 0.2 },
      { x: -0.18, z: -0.2 },
      { x: 0.18, z: -0.2 },
    ];
    for (const [i, lp] of legPositions.entries()) {
      const legGroup = new TransformNode(`cat-leg${i}`, scene);
      legGroup.position.set(lp.x, 0.28, lp.z);
      legGroup.parent = this.graphicGroup;

      // Upper leg
      const upper = MeshBuilder.CreateCapsule(`cat-upper${i}`, {
        height: 0.28, radius: 0.05, tessellation: 5,
      }, scene);
      upper.material = toonMat(`cat-upper-mat${i}`, bodyColor, scene);
      upper.position.set(0, -0.09, 0);
      upper.parent = legGroup;

      // Lower leg / paw
      const lower = MeshBuilder.CreateCapsule(`cat-lower${i}`, {
        height: 0.22, radius: 0.04, tessellation: 5,
      }, scene);
      lower.material = toonMat(`cat-lower-mat${i}`, bodyColor, scene);
      lower.position.set(0, -0.26, 0.04);
      lower.rotation.x = 0.3;
      lower.parent = legGroup;

      // Paw pad
      const paw = MeshBuilder.CreateSphere(`cat-paw${i}`, { diameter: 0.11, segments: 5 }, scene);
      paw.material = toonMat(`cat-paw-mat${i}`, isBoss ? 0x220033 : 0x333333, scene);
      paw.scaling.set(1.1, 0.5, 1.3);
      paw.position.set(0, -0.33, 0.07);
      paw.parent = legGroup;

      this.legs.push(legGroup);
    }

    // --- Tail ---
    this.tailGroup = new TransformNode('cat-tailgroup', scene);
    this.tailGroup.position.set(0, 0.45, -0.48);
    this.tailGroup.parent = this.graphicGroup;
    this.buildTail(scene, bodyColor);

    this.mesh.scaling.setAll(scale);

    // Boss extras: spiked collar
    if (isBoss) {
      this.buildBossCollar(scene);
    }
  }

  private buildWhiskers(scene: Scene, isBoss: boolean) {
    const whiskColor = hexColor(isBoss ? 0xaaaaff : 0xffffff);

    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const points = [
          new Vector3(side * 0.07, -0.02 + i * 0.02, 0.27),
          new Vector3(side * 0.35, -0.03 + i * 0.025, 0.24),
        ];
        const colors = [whiskColor.toColor4(), whiskColor.toColor4()];
        const line = MeshBuilder.CreateLines(`cat-whisker${side}_${i}`, {
          points,
          colors,
        }, scene);
        line.parent = this.headGroup;
      }
    }
  }

  private buildTail(scene: Scene, bodyColor: number) {
    const segCount = 6;
    for (let i = 0; i < segCount; i++) {
      const t = i / (segCount - 1);
      const radius = 0.065 * (1 - t * 0.55);
      const seg = MeshBuilder.CreateCapsule(`cat-tailseg${i}`, {
        height: 0.14 + radius * 2, radius, tessellation: 5,
      }, scene);
      seg.material = toonMat(`cat-tailseg-mat${i}`, bodyColor, scene);
      seg.position.set(0, t * 0.45, -t * 0.2);
      seg.rotation.x = -0.4 - t * 0.6;
      seg.parent = this.tailGroup;
      this.tailSegments.push(seg);
    }

    // Tail tip
    const tip = MeshBuilder.CreateSphere('cat-tailtip', { diameter: 0.08, segments: 5 }, scene);
    tip.material = toonMat('cat-tailtip-mat', 0x222222, scene);
    tip.position.set(0, 0.55, -0.22);
    tip.parent = this.tailGroup;
  }

  private buildBossCollar(scene: Scene) {
    // Collar ring
    const collar = MeshBuilder.CreateTorus('cat-collar', {
      diameter: 0.44, thickness: 0.08, tessellation: 14,
    }, scene);
    collar.material = toonMat('cat-collar-mat', 0x220033, scene);
    collar.position.set(0, 0.65, 0.15);
    collar.rotation.x = Math.PI * 0.35;
    collar.parent = this.graphicGroup;

    // Spikes
    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const spike = MeshBuilder.CreateCylinder(`cat-collarspike${i}`, {
        diameterTop: 0, diameterBottom: 0.06, height: 0.1, tessellation: 4,
      }, scene);
      spike.material = toonMat(`cat-collarspike-mat${i}`, 0x550066, scene);
      spike.position.set(
        Math.cos(angle) * 0.22,
        0.65 + Math.sin(angle) * 0.04 * 0.5,
        0.15 + Math.sin(angle) * 0.22 * 0.6
      );
      spike.rotation.z = angle;
      spike.parent = this.graphicGroup;
    }

    // Glowing gem
    const gem = MeshBuilder.CreatePolyhedron('cat-gem', { type: 1, size: 0.06 }, scene);
    gem.material = basicMat('cat-gem-mat', 0xaa00ff, scene);
    gem.position.set(0, 0.63, 0.37);
    gem.parent = this.graphicGroup;
  }

  updateAI(dt: number, playerPos: Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    const pos = this.mesh.position;
    const vel = this.body.getLinearVelocity();
    const dx = playerPos.x - pos.x;
    const dz = playerPos.z - pos.z;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);
    const speedSq = vel.x * vel.x + vel.z * vel.z;
    const isMoving = speedSq > 0.2;
    const isGrounded = vel.y >= -0.15 && vel.y <= 0.15 && pos.y < 1.0;

    // Only run custom cat AI while in CHASE state
    if (this.state === EnemyState.CHASE) {
      this.updateCatBehavior(dt, playerPos, pos, distToPlayer, dx, dz, isGrounded, vel);
    }

    // --- Animations ---
    this.tailCycle += dt * (this.catPhase === CatPhase.POUNCING ? 8 : 3);

    if (this.catPhase === CatPhase.POUNCING && !isGrounded) {
      this.graphicGroup.scaling.set(0.75, 0.75, 1.35);
      for (const leg of this.legs) leg.rotation.x = 0.7;
    } else if (this.catPhase === CatPhase.RECOVERING) {
      this.graphicGroup.scaling.x += (1 - this.graphicGroup.scaling.x) * 12 * dt;
      this.graphicGroup.scaling.y += (1 - this.graphicGroup.scaling.y) * 12 * dt;
      this.graphicGroup.scaling.z += (1 - this.graphicGroup.scaling.z) * 12 * dt;
    } else if (isMoving) {
      this.walkCycle += dt * 12;
      const sin = Math.sin(this.walkCycle);
      this.bodyMesh.position.y = 0.42 + Math.abs(sin) * 0.06;

      this.legs[0].rotation.x = sin * 0.55;
      this.legs[1].rotation.x = -sin * 0.55;
      this.legs[2].rotation.x = -sin * 0.55;
      this.legs[3].rotation.x = sin * 0.55;

      this.bodyMesh.rotation.x = this.catPhase === CatPhase.CIRCLING ? 0.1 : 0;

      this.graphicGroup.scaling.x += (1 - this.graphicGroup.scaling.x) * 8 * dt;
      this.graphicGroup.scaling.y += (1 - this.graphicGroup.scaling.y) * 8 * dt;
      this.graphicGroup.scaling.z += (1 - this.graphicGroup.scaling.z) * 8 * dt;
    } else {
      this.walkCycle += dt * 3;
      const breathe = Math.sin(this.walkCycle) * 0.015;
      this.bodyMesh.scaling.y = 1 + breathe;
      this.headGroup.position.y = 0.78 + breathe;
      for (const leg of this.legs) leg.rotation.x *= 0.85;

      this.graphicGroup.scaling.x += (1 - this.graphicGroup.scaling.x) * 6 * dt;
      this.graphicGroup.scaling.y += (1 - this.graphicGroup.scaling.y) * 6 * dt;
      this.graphicGroup.scaling.z += (1 - this.graphicGroup.scaling.z) * 6 * dt;
    }

    // Tail animation
    const tailSin = Math.sin(this.tailCycle);
    this.tailGroup.rotation.x = tailSin * 0.18;
    this.tailGroup.rotation.z = Math.sin(this.tailCycle * 0.7) * 0.12;

    // Eye glow pulse during CIRCLING (about to pounce)
    if (this.catPhase === CatPhase.CIRCLING && this.pounceTimer < 1.5) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.01);
      const baseColor = hexColor(this.isBoss ? 0x88ffaa : C.CAT_EYE);
      const scaledColor = baseColor.scale(0.8 + pulse * 0.6);
      for (const eye of this.eyeMeshes) {
        (eye.material as StandardMaterial).emissiveColor = scaledColor;
      }
    } else {
      const baseColor = hexColor(this.isBoss ? 0x88ffaa : C.CAT_EYE);
      for (const eye of this.eyeMeshes) {
        (eye.material as StandardMaterial).emissiveColor = baseColor;
      }
    }
  }

  private updateCatBehavior(
    dt: number,
    playerPos: Vector3,
    pos: Vector3,
    distToPlayer: number,
    dx: number,
    dz: number,
    isGrounded: boolean,
    vel: Vector3
  ) {
    switch (this.catPhase) {
      case CatPhase.CIRCLING: {
        const orbitDist = 6;
        this.circleAngle += dt * 1.8;

        const targetX = playerPos.x + Math.cos(this.circleAngle) * orbitDist;
        const targetZ = playerPos.z + Math.sin(this.circleAngle) * orbitDist;

        const ox = targetX - pos.x;
        const oz = targetZ - pos.z;
        const od = Math.sqrt(ox * ox + oz * oz);
        const circleSpeed = this.speed * 0.65;
        if (od > 0.2 && this.body) {
          this.body.setLinearVelocity(new Vector3(
            (ox / od) * circleSpeed, vel.y, (oz / od) * circleSpeed
          ));
        }

        this.pounceTimer -= dt;
        if (this.pounceTimer <= 0 && distToPlayer < 9 && isGrounded) {
          this.pounceChargeTimer = 0.3;
          this.catPhase = CatPhase.POUNCING;
        }
        break;
      }

      case CatPhase.POUNCING: {
        if (this.pounceChargeTimer > 0) {
          this.pounceChargeTimer -= dt;
          if (this.body) {
            this.body.setLinearVelocity(new Vector3(vel.x * 0.3, vel.y, vel.z * 0.3));
          }
          this.graphicGroup.scaling.set(1.2, 0.7, 1.2);

          if (this.pounceChargeTimer <= 0 && this.body) {
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d > 0) {
              const pounceSpeed = this.speed * 3.2;
              this.body.setLinearVelocity(new Vector3(
                (dx / d) * pounceSpeed,
                6.5,
                (dz / d) * pounceSpeed,
              ));
            }
          }
        } else if (isGrounded) {
          this.catPhase = CatPhase.RECOVERING;
          this.recoverTimer = 0.5 + Math.random() * 0.4;
          this.graphicGroup.scaling.set(1.3, 0.55, 1.3);
        }
        break;
      }

      case CatPhase.RECOVERING: {
        this.recoverTimer -= dt;
        if (this.body) {
          this.body.setLinearVelocity(new Vector3(vel.x * 0.85, vel.y, vel.z * 0.85));
        }
        if (this.recoverTimer <= 0) {
          this.catPhase = CatPhase.CIRCLING;
          this.pounceTimer = 1.8 + Math.random() * 2.2;
          this.circleAngle += Math.PI * 0.5;
        }
        break;
      }
    }
  }
}
