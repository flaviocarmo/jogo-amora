import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeCapsule } from '@babylonjs/core/Physics/v2/physicsShape';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Entity } from './Entity';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { InputManager } from '../core/InputManager';
import { CameraSystem } from '../systems/CameraSystem';
import { toonMat, glossMat, basicMat } from '../utils/materials';
import * as C from '../utils/colors';
import { clamp } from '../utils/math';

export class Player extends Entity {
  private walkSpeed = 8;
  private runSpeed = 12;
  private jumpForce = 12;
  private isGrounded = false;
  private groundCheckTimer = 0;

  // Power bar
  powerCharge = 0;
  readonly powerChargeTime = 15;
  isPowerReady = false;

  // Super bar (charges only when power is ready)
  superCharge = 0;
  readonly superChargeTime = 20;
  isSuperReady = false;

  // Animation
  private walkCycle = 0;
  private legs: TransformNode[] = [];
  private torsoGroup!: TransformNode;
  private headGroup!: TransformNode;
  private tailMesh!: Mesh;
  private mouthMesh!: Mesh;

  // Bark wave visual
  barkWaveMesh: Mesh | null = null;
  private barkWaveTimer = 0;

  private scene: Scene | null = null;
  private modelBuilt = false;

  constructor() {
    super(5);
  }

  private buildModel(scene: Scene) {
    if (this.modelBuilt) return;
    this.modelBuilt = true;

    // --- TORSO GROUP ---
    this.torsoGroup = new TransformNode('player-torso', scene);
    this.torsoGroup.position.set(0, 0.5, 0);
    this.torsoGroup.parent = this.mesh;

    // --- MANE/CHEST ---
    const maneMesh = MeshBuilder.CreateSphere('player-mane', { diameter: 1.3, segments: 16 }, scene);
    maneMesh.material = toonMat('player-mane-mat', C.AMORA_BODY, scene);
    maneMesh.scaling.set(1.05, 1.0, 1.05);
    maneMesh.position.set(0, 0.15, 0.15);
    maneMesh.parent = this.torsoGroup;

    // Chest grey patch
    const chestMesh = MeshBuilder.CreateSphere('player-chest', { diameter: 0.8, segments: 10 }, scene);
    chestMesh.material = toonMat('player-chest-mat', C.AMORA_CHEST, scene);
    chestMesh.scaling.set(1.1, 0.9, 0.5);
    chestMesh.position.set(0, 0.05, 0.65);
    chestMesh.parent = this.torsoGroup;

    // --- BODY/HINDQUARTERS ---
    const bodyMesh = MeshBuilder.CreateSphere('player-body', { diameter: 1.0, segments: 12 }, scene);
    bodyMesh.material = toonMat('player-body-mat', C.AMORA_BODY, scene);
    bodyMesh.scaling.set(0.9, 0.95, 1.1);
    bodyMesh.position.set(0, 0.05, -0.25);
    bodyMesh.parent = this.torsoGroup;

    // --- TAIL ---
    this.tailMesh = MeshBuilder.CreateCapsule('player-tail', { height: 0.8, radius: 0.2, tessellation: 8 }, scene);
    this.tailMesh.material = toonMat('player-tail-mat', C.AMORA_BODY, scene);
    this.tailMesh.rotation.x = Math.PI / 2;
    this.tailMesh.scaling.set(1.4, 1.0, 0.7);
    this.tailMesh.position.set(0, 0.55, -0.4);
    this.tailMesh.parent = this.torsoGroup;

    // --- HEAD ---
    this.headGroup = new TransformNode('player-head', scene);
    this.headGroup.position.set(0, 0.6, 0.4);
    this.headGroup.parent = this.torsoGroup;

    // Head sphere
    const headMesh = MeshBuilder.CreateSphere('player-head-sphere', { diameter: 0.76, segments: 12 }, scene);
    headMesh.material = toonMat('player-head-mat', C.AMORA_BODY, scene);
    headMesh.parent = this.headGroup;

    // Snout (muzzle)
    const snoutMesh = MeshBuilder.CreateSphere('player-snout', { diameter: 0.28, segments: 8 }, scene);
    snoutMesh.material = toonMat('player-snout-mat', C.AMORA_CHEST, scene);
    snoutMesh.position.set(0, -0.05, 0.32);
    snoutMesh.scaling.set(1.2, 0.85, 1.0);
    snoutMesh.parent = this.headGroup;

    // Nose
    const noseMesh = MeshBuilder.CreateSphere('player-nose', { diameter: 0.08, segments: 6 }, scene);
    noseMesh.material = glossMat('player-nose-mat', C.AMORA_NOSE, scene);
    noseMesh.position.set(0, 0.04, 0.44);
    noseMesh.parent = this.headGroup;

    // Eyes
    for (const side of [-1, 1]) {
      const eyeMesh = MeshBuilder.CreateSphere(`player-eye${side}`, { diameter: 0.1, segments: 6 }, scene);
      eyeMesh.material = glossMat(`player-eye-mat${side}`, C.AMORA_EYE, scene);
      eyeMesh.position.set(side * 0.16, 0.08, 0.32);
      eyeMesh.parent = this.headGroup;

      // Eye highlight
      const hlMesh = MeshBuilder.CreateSphere(`player-eyehl${side}`, { diameter: 0.036, segments: 4 }, scene);
      hlMesh.material = basicMat(`player-eyehl-mat${side}`, C.AMORA_EYE_HIGHLIGHT, scene);
      hlMesh.position.set(side * 0.145, 0.1, 0.355);
      hlMesh.parent = this.headGroup;
    }

    // Ears
    for (const side of [-1, 1]) {
      const earMesh = MeshBuilder.CreateCylinder(`player-ear${side}`, {
        diameterTop: 0, diameterBottom: 0.24, height: 0.16, tessellation: 6,
      }, scene);
      earMesh.material = toonMat(`player-ear-mat${side}`, C.AMORA_BODY, scene);
      earMesh.position.set(side * 0.22, 0.32, 0.05);
      earMesh.rotation.z = side * -0.4;
      earMesh.rotation.x = -0.15;
      earMesh.parent = this.headGroup;
    }

    // Mouth (for bark)
    this.mouthMesh = MeshBuilder.CreateSphere('player-mouth', { diameter: 0.16, segments: 6 }, scene);
    this.mouthMesh.material = toonMat('player-mouth-mat', C.AMORA_TONGUE, scene);
    this.mouthMesh.position.set(0, -0.1, 0.4);
    this.mouthMesh.setEnabled(false);
    this.mouthMesh.parent = this.headGroup;

    // --- LEGS ---
    const legPositions = [
      { x: -0.28, z: 0.3, y: 0.15 },  // Front Left
      { x: 0.28, z: 0.3, y: 0.15 },   // Front Right
      { x: -0.22, z: -0.35, y: 0.15 }, // Back Left
      { x: 0.22, z: -0.35, y: 0.15 },  // Back Right
    ];
    for (const [i, pos] of legPositions.entries()) {
      const legGroup = new TransformNode(`player-leg${i}`, scene);
      legGroup.position.set(pos.x, pos.y, pos.z);
      legGroup.parent = this.mesh;

      const isFront = i < 2;
      const legColor = isFront ? C.AMORA_CHEST : C.AMORA_BODY;

      const legMesh = MeshBuilder.CreateCylinder(`player-legcyl${i}`, {
        diameterTop: 0.16, diameterBottom: 0.18, height: 0.25, tessellation: 6,
      }, scene);
      legMesh.material = toonMat(`player-leg-mat${i}`, legColor, scene);
      legMesh.position.y = 0.05;
      legMesh.parent = legGroup;

      // Paw
      const pawMesh = MeshBuilder.CreateSphere(`player-paw${i}`, { diameter: 0.24, segments: 6 }, scene);
      pawMesh.material = toonMat(`player-paw-mat${i}`, C.AMORA_CHEST, scene);
      pawMesh.scaling.set(1.1, 0.6, 1.2);
      pawMesh.position.set(0, -0.1, 0.03);
      pawMesh.parent = legGroup;

      this.legs.push(legGroup);
    }

    // --- SHADOW ---
    const shadowMesh = MeshBuilder.CreateDisc('player-shadow', { radius: 0.65, tessellation: 16 }, scene);
    const shadowMat = basicMat('player-shadow-mat', 0x000000, scene);
    shadowMat.alpha = 0.3;
    shadowMesh.material = shadowMat;
    shadowMesh.rotation.x = Math.PI / 2;
    shadowMesh.position.y = 0.02;
    shadowMesh.parent = this.mesh;
  }

  initPhysics(physics: PhysicsWorld, x: number, y: number, z: number) {
    this.scene = physics.scene;
    this.initMesh('player', this.scene);
    this.buildModel(this.scene);

    this.mesh.position.set(x, y, z);

    const shape = new PhysicsShapeCapsule(
      new Vector3(0, 0.35, 0),
      new Vector3(0, -0.35, 0),
      0.4,
      this.scene
    );

    this.body = new PhysicsBody(this.mesh, PhysicsMotionType.DYNAMIC, false, this.scene);
    this.body.shape = shape;
    this.body.setMassProperties({ mass: 1 });
    this.body.setLinearDamping(0.3);
    this.body.setAngularDamping(100);
  }

  updatePlayer(dt: number, input: InputManager, camera: CameraSystem, physics: PhysicsWorld) {
    super.update(dt);
    if (!this.body || !this.alive) return;

    // Ground check via raycast
    this.groundCheckTimer -= dt;
    if (this.groundCheckTimer <= 0) {
      this.groundCheckTimer = 0.05;
      const pos = this.mesh.position;
      // Ray starts from bottom of capsule (capsule pointB is at -0.35, radius 0.4)
      const hit = physics.castRay(
        { x: pos.x, y: pos.y - 0.75, z: pos.z },
        { x: 0, y: -1, z: 0 },
        0.3
      );
      this.isGrounded = hit !== null;
    }

    // Movement
    const forward = camera.forwardXZ;
    const right = camera.rightXZ;
    const moveDir = new Vector3();
    moveDir.addInPlace(forward.scale(input.moveForward));
    moveDir.addInPlace(right.scale(input.moveRight));

    const speed = input.isDown('ShiftLeft') ? this.runSpeed : this.walkSpeed;
    const vel = this.body.getLinearVelocity();

    if (moveDir.lengthSquared() > 0) {
      moveDir.normalize();
      this.body.setLinearVelocity(new Vector3(
        moveDir.x * speed,
        vel.y,
        moveDir.z * speed,
      ));

      // Face movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = targetAngle;

      // Walk animation
      this.walkCycle += dt * (input.isDown('ShiftLeft') ? 15 : 10);
      this.animateWalk();
    } else {
      this.body.setLinearVelocity(new Vector3(0, vel.y, 0));
      this.animateIdle(dt);
    }

    // Jump
    if (input.jump && this.isGrounded) {
      const curVel = this.body.getLinearVelocity();
      this.body.setLinearVelocity(new Vector3(curVel.x, this.jumpForce, curVel.z));
      this.isGrounded = false;
    }

    // Power charge
    if (!this.isPowerReady) {
      this.powerCharge += dt;
      if (this.powerCharge >= this.powerChargeTime) {
        this.powerCharge = this.powerChargeTime;
        this.isPowerReady = true;
      }
    }

    // Super bar charges only when bark power is full
    if (this.isPowerReady && !this.isSuperReady) {
      this.superCharge += dt;
      if (this.superCharge >= this.superChargeTime) {
        this.superCharge = this.superChargeTime;
        this.isSuperReady = true;
      }
    }

    // Bark wave update
    if (this.barkWaveMesh) {
      this.barkWaveTimer -= dt;
      if (this.barkWaveTimer <= 0) {
        this.barkWaveMesh.dispose();
        this.barkWaveMesh = null;
      } else {
        const scale = 1 + (0.5 - this.barkWaveTimer) * 15;
        this.barkWaveMesh.scaling.set(scale, scale, scale);
        const mat = this.barkWaveMesh.material as StandardMaterial;
        mat.alpha = this.barkWaveTimer * 2;
      }
    }
  }

  usePower(): boolean {
    if (!this.isPowerReady || !this.scene) return false;
    this.isPowerReady = false;
    this.powerCharge = 0;

    // Show mouth for bark
    this.mouthMesh.setEnabled(true);
    setTimeout(() => { this.mouthMesh.setEnabled(false); }, 500);

    // Create bark wave visual (torus instead of ring)
    const waveMesh = MeshBuilder.CreateTorus('bark-wave', {
      diameter: 5,
      thickness: 0.3,
      tessellation: 16,
    }, this.scene);
    const waveMat = basicMat('bark-wave-mat', C.POWER_WAVE, this.scene);
    waveMat.alpha = 1;
    waveMat.backFaceCulling = false;
    waveMesh.material = waveMat;

    waveMesh.position.copyFrom(this.mesh.position);
    waveMesh.position.y += 1;
    const fwd = new Vector3(
      Math.sin(this.mesh.rotation.y),
      0,
      Math.cos(this.mesh.rotation.y),
    );
    waveMesh.position.addInPlace(fwd.scale(1.5));
    this.barkWaveTimer = 0.5;
    this.barkWaveMesh = waveMesh;

    return true;
  }

  useSuper(): boolean {
    if (!this.isSuperReady) return false;
    this.isSuperReady = false;
    this.superCharge = 0;
    return true;
  }

  getBarkDirection(): Vector3 {
    return new Vector3(
      Math.sin(this.mesh.rotation.y),
      0,
      Math.cos(this.mesh.rotation.y),
    );
  }

  getVelocityY(): number {
    if (!this.body) return 0;
    return this.body.getLinearVelocity().y;
  }

  bounce() {
    if (!this.body) return;
    const vel = this.body.getLinearVelocity();
    this.body.setLinearVelocity(new Vector3(vel.x, 10, vel.z));
  }

  get powerPercent(): number {
    return clamp(this.powerCharge / this.powerChargeTime, 0, 1);
  }

  get superPercent(): number {
    return clamp(this.superCharge / this.superChargeTime, 0, 1);
  }

  private animateWalk() {
    const sin = Math.sin(this.walkCycle);
    const cos = Math.cos(this.walkCycle);
    // Front legs
    this.legs[0].rotation.x = sin * 0.5;
    this.legs[1].rotation.x = -sin * 0.5;
    // Back legs
    this.legs[2].rotation.x = -sin * 0.5;
    this.legs[3].rotation.x = sin * 0.5;
    // Torso bobble
    this.torsoGroup.position.y = 0.5 + Math.abs(cos) * 0.05;
    // Head rotation
    this.headGroup.rotation.x = Math.sin(this.walkCycle * 0.5) * 0.05;
    // Tail wag
    this.tailMesh.rotation.z = Math.sin(this.walkCycle * 2) * 0.2;
  }

  private animateIdle(dt: number) {
    this.walkCycle += dt * 2;
    const breathe = Math.sin(this.walkCycle) * 0.02;

    // Scale on Y handles the breathing
    this.torsoGroup.scaling.y = 1.0 + breathe;

    // Reset legs
    for (const leg of this.legs) {
      leg.rotation.x *= 0.9;
    }
    // Gentle tail wag
    this.tailMesh.rotation.z = Math.sin(this.walkCycle * 1.5) * 0.05;
  }

  reset(x: number, y: number, z: number) {
    this.health = this.maxHealth;
    this.alive = true;
    this.powerCharge = 0;
    this.isPowerReady = false;
    this.superCharge = 0;
    this.isSuperReady = false;
    this.invincibleTimer = 0;
    if (this.body) {
      this.mesh.position.set(x, y, z);
      this.body.setLinearVelocity(Vector3.Zero());
    }
  }
}
