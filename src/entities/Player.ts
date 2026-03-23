import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsCharacterController, CharacterSupportedState } from '@babylonjs/core/Physics/v2/characterController';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import { Entity } from './Entity';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { InputManager } from '../core/InputManager';
import { CameraSystem } from '../systems/CameraSystem';
import { toonMat, glossMat, basicMat } from '../utils/materials';
import * as C from '../utils/colors';
import { clamp } from '../utils/math';

type CharacterState = 'IN_AIR' | 'ON_GROUND' | 'START_JUMP';

export class Player extends Entity {
  // Character controller (replaces raw PhysicsBody)
  private controller!: PhysicsCharacterController;

  // Movement tuning
  private onGroundSpeed = 10;
  private inAirSpeed = 8;
  private runMultiplier = 1.6;
  private jumpHeight = 1.5;
  private characterGravity = new Vector3(0, -18, 0);

  // State machine
  private charState: CharacterState = 'IN_AIR';
  private wantJump = 0;
  private isRunning = false;

  // Stored input (set in updatePlayer, consumed in physics callback)
  private inputDir = new Vector3();
  private characterOrientation = Quaternion.Identity();

  // Power bar
  powerCharge = 0;
  readonly powerChargeTime = 15;
  isPowerReady = false;

  // Super bar
  superCharge = 0;
  readonly superChargeTime = 20;
  isSuperReady = false;

  // Facing
  private facingAngle = 0;

  // Animation
  private walkCycle = 0;
  private legs: TransformNode[] = [];
  private torsoGroup!: TransformNode;
  private headGroup!: TransformNode;
  private tailMesh!: Mesh;
  private mouthMesh!: Mesh;

  // Bark wave
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

    this.torsoGroup = new TransformNode('player-torso', scene);
    this.torsoGroup.position.set(0, 0.5, 0);
    this.torsoGroup.parent = this.mesh;

    const maneMesh = MeshBuilder.CreateSphere('player-mane', { diameter: 1.3, segments: 16 }, scene);
    maneMesh.material = toonMat('player-mane-mat', C.AMORA_BODY, scene);
    maneMesh.scaling.set(1.05, 1.0, 1.05);
    maneMesh.position.set(0, 0.15, 0.15);
    maneMesh.parent = this.torsoGroup;

    const chestMesh = MeshBuilder.CreateSphere('player-chest', { diameter: 0.8, segments: 10 }, scene);
    chestMesh.material = toonMat('player-chest-mat', C.AMORA_CHEST, scene);
    chestMesh.scaling.set(1.1, 0.9, 0.5);
    chestMesh.position.set(0, 0.05, 0.65);
    chestMesh.parent = this.torsoGroup;

    const bodyMesh = MeshBuilder.CreateSphere('player-body', { diameter: 1.0, segments: 12 }, scene);
    bodyMesh.material = toonMat('player-body-mat', C.AMORA_BODY, scene);
    bodyMesh.scaling.set(0.9, 0.95, 1.1);
    bodyMesh.position.set(0, 0.05, -0.25);
    bodyMesh.parent = this.torsoGroup;

    this.tailMesh = MeshBuilder.CreateCapsule('player-tail', { height: 0.8, radius: 0.2, tessellation: 8 }, scene);
    this.tailMesh.material = toonMat('player-tail-mat', C.AMORA_BODY, scene);
    this.tailMesh.rotation.x = Math.PI / 2;
    this.tailMesh.scaling.set(1.4, 1.0, 0.7);
    this.tailMesh.position.set(0, 0.55, -0.4);
    this.tailMesh.parent = this.torsoGroup;

    this.headGroup = new TransformNode('player-head', scene);
    this.headGroup.position.set(0, 0.6, 0.4);
    this.headGroup.parent = this.torsoGroup;

    const headMesh = MeshBuilder.CreateSphere('player-head-sphere', { diameter: 0.76, segments: 12 }, scene);
    headMesh.material = toonMat('player-head-mat', C.AMORA_BODY, scene);
    headMesh.parent = this.headGroup;

    const snoutMesh = MeshBuilder.CreateSphere('player-snout', { diameter: 0.28, segments: 8 }, scene);
    snoutMesh.material = toonMat('player-snout-mat', C.AMORA_CHEST, scene);
    snoutMesh.position.set(0, -0.05, 0.32);
    snoutMesh.scaling.set(1.2, 0.85, 1.0);
    snoutMesh.parent = this.headGroup;

    const noseMesh = MeshBuilder.CreateSphere('player-nose', { diameter: 0.08, segments: 6 }, scene);
    noseMesh.material = glossMat('player-nose-mat', C.AMORA_NOSE, scene);
    noseMesh.position.set(0, 0.04, 0.44);
    noseMesh.parent = this.headGroup;

    for (const side of [-1, 1]) {
      const eyeMesh = MeshBuilder.CreateSphere(`player-eye${side}`, { diameter: 0.1, segments: 6 }, scene);
      eyeMesh.material = glossMat(`player-eye-mat${side}`, C.AMORA_EYE, scene);
      eyeMesh.position.set(side * 0.16, 0.08, 0.32);
      eyeMesh.parent = this.headGroup;

      const hlMesh = MeshBuilder.CreateSphere(`player-eyehl${side}`, { diameter: 0.036, segments: 4 }, scene);
      hlMesh.material = basicMat(`player-eyehl-mat${side}`, C.AMORA_EYE_HIGHLIGHT, scene);
      hlMesh.position.set(side * 0.145, 0.1, 0.355);
      hlMesh.parent = this.headGroup;
    }

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

    this.mouthMesh = MeshBuilder.CreateSphere('player-mouth', { diameter: 0.16, segments: 6 }, scene);
    this.mouthMesh.material = toonMat('player-mouth-mat', C.AMORA_TONGUE, scene);
    this.mouthMesh.position.set(0, -0.1, 0.4);
    this.mouthMesh.setEnabled(false);
    this.mouthMesh.parent = this.headGroup;

    const legPositions = [
      { x: -0.28, z: 0.3, y: 0.15 },
      { x: 0.28, z: 0.3, y: 0.15 },
      { x: -0.22, z: -0.35, y: 0.15 },
      { x: 0.22, z: -0.35, y: 0.15 },
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

      const pawMesh = MeshBuilder.CreateSphere(`player-paw${i}`, { diameter: 0.24, segments: 6 }, scene);
      pawMesh.material = toonMat(`player-paw-mat${i}`, C.AMORA_CHEST, scene);
      pawMesh.scaling.set(1.1, 0.6, 1.2);
      pawMesh.position.set(0, -0.1, 0.03);
      pawMesh.parent = legGroup;

      this.legs.push(legGroup);
    }

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
    // Old controller is already cleaned up when the previous scene was disposed.
    // Just null the reference — do NOT call dispose() as it would corrupt the plugin.
    this.controller = null!;
    // Reset model state so it rebuilds on the new scene
    // (old meshes are destroyed when the previous scene is disposed)
    this.modelBuilt = false;
    this.legs = [];
    this.barkWaveMesh = null;
    this.initMesh('player', this.scene);
    this.buildModel(this.scene);

    // Character controller capsule dimensions
    const h = 1.2;
    const r = 0.4;

    // Create the Havok character controller (NOT a PhysicsBody)
    const startPos = new Vector3(x, y, z);
    this.controller = new PhysicsCharacterController(startPos, { capsuleHeight: h, capsuleRadius: r }, this.scene);
    this.controller.maxCharacterSpeedForSolver = 20;

    // Register physics callback — runs AFTER each physics step
    this.scene.onAfterPhysicsObservable.add(() => {
      this.physicsUpdate();
    });
  }

  /** Called after each Havok physics step to move the character */
  private physicsUpdate() {
    if (!this.scene || !this.alive) return;
    const dt = (this.scene.deltaTime ?? 16.67) / 1000;
    if (dt <= 0) return;

    const down = new Vector3(0, -1, 0);
    const support = this.controller.checkSupport(dt, down);

    const desiredVelocity = this.computeDesiredVelocity(dt, support);
    this.controller.setVelocity(desiredVelocity);
    this.controller.integrate(dt, support, this.characterGravity);
  }

  private getNextState(support: { supportedState: CharacterSupportedState }): CharacterState {
    if (this.charState === 'IN_AIR') {
      if (support.supportedState === CharacterSupportedState.SUPPORTED) {
        return 'ON_GROUND';
      }
      return 'IN_AIR';
    } else if (this.charState === 'ON_GROUND') {
      if (support.supportedState !== CharacterSupportedState.SUPPORTED) {
        return 'IN_AIR';
      }
      if (this.wantJump > 0) {
        this.wantJump--;
        return 'START_JUMP';
      }
      return 'ON_GROUND';
    } else if (this.charState === 'START_JUMP') {
      return 'IN_AIR';
    }
    return this.charState;
  }

  private computeDesiredVelocity(
    dt: number,
    support: { supportedState: CharacterSupportedState; averageSurfaceNormal: Vector3; averageSurfaceVelocity: Vector3 },
  ): Vector3 {
    const nextState = this.getNextState(support);
    if (nextState !== this.charState) {
      this.charState = nextState;
    }

    const upWorld = new Vector3(0, 1, 0);
    const forwardLocal = new Vector3(0, 0, 1);
    const forwardWorld = forwardLocal.applyRotationQuaternion(this.characterOrientation);
    const currentVelocity = this.controller.getVelocity();

    if (this.charState === 'IN_AIR') {
      const speed = this.isRunning ? this.inAirSpeed * this.runMultiplier : this.inAirSpeed;
      const desiredVel = this.inputDir.scale(speed).applyRotationQuaternion(this.characterOrientation);

      const outputVel = this.controller.calculateMovement(
        dt, forwardWorld, upWorld, currentVelocity, Vector3.ZeroReadOnly, desiredVel, upWorld,
      );
      // Restore vertical component from current velocity
      outputVel.addInPlace(upWorld.scale(-outputVel.dot(upWorld)));
      outputVel.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));
      // Apply gravity
      outputVel.addInPlace(this.characterGravity.scale(dt));
      return outputVel;
    } else if (this.charState === 'ON_GROUND') {
      const speed = this.isRunning ? this.onGroundSpeed * this.runMultiplier : this.onGroundSpeed;
      const desiredVel = this.inputDir.scale(speed).applyRotationQuaternion(this.characterOrientation);

      const outputVel = this.controller.calculateMovement(
        dt, forwardWorld, support.averageSurfaceNormal, currentVelocity,
        support.averageSurfaceVelocity, desiredVel, upWorld,
      );
      // Horizontal projection (from Babylon.js character controller example)
      outputVel.subtractInPlace(support.averageSurfaceVelocity);
      const inv1k = 1e-3;
      if (outputVel.dot(upWorld) > inv1k) {
        const velLen = outputVel.length();
        outputVel.normalizeFromLength(velLen);
        const horizLen = velLen / support.averageSurfaceNormal.dot(upWorld);
        const c = support.averageSurfaceNormal.cross(outputVel);
        const projected = c.cross(upWorld);
        projected.scaleInPlace(horizLen);
        projected.addInPlace(support.averageSurfaceVelocity);
        return projected;
      }
      outputVel.addInPlace(support.averageSurfaceVelocity);
      return outputVel;
    } else if (this.charState === 'START_JUMP') {
      const u = Math.sqrt(2 * this.characterGravity.length() * this.jumpHeight);
      const curRelVel = currentVelocity.dot(upWorld);
      return currentVelocity.add(upWorld.scale(u - curRelVel));
    }
    return Vector3.Zero();
  }

  updatePlayer(dt: number, input: InputManager, camera: CameraSystem, _physics: PhysicsWorld) {
    super.update(dt);
    if (!this.alive) return;

    // Sync visual mesh position from character controller
    const controllerPos = this.controller.getPosition();
    this.mesh.position.copyFrom(controllerPos);
    // Offset visual down so the dog model sits at ground level
    // (controller position is capsule center, model origin is at feet)
    this.mesh.position.y -= 0.6;

    // Store input direction in local space (z=forward, x=strafe)
    this.inputDir.set(input.moveRight, 0, input.moveForward);
    if (this.inputDir.lengthSquared() > 1) {
      this.inputDir.normalize();
    }

    // Camera yaw → character orientation
    const fwd = camera.forwardXZ;
    const cameraYaw = Math.atan2(fwd.x, fwd.z);
    Quaternion.RotationYawPitchRollToRef(cameraYaw, 0, 0, this.characterOrientation);

    this.isRunning = input.isDown('ShiftLeft');

    if (input.jump) {
      this.wantJump++;
    }

    // Facing direction (for visual rotation and bark)
    if (this.inputDir.lengthSquared() > 0.01) {
      const worldDir = this.inputDir.applyRotationQuaternion(this.characterOrientation);
      this.facingAngle = Math.atan2(worldDir.x, worldDir.z);
      this.mesh.rotation.y = this.facingAngle;

      this.walkCycle += dt * (this.isRunning ? 15 : 10);
      this.animateWalk();
    } else {
      this.animateIdle(dt);
    }

    // Power charge
    if (!this.isPowerReady) {
      this.powerCharge += dt;
      if (this.powerCharge >= this.powerChargeTime) {
        this.powerCharge = this.powerChargeTime;
        this.isPowerReady = true;
      }
    }

    // Super bar
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

  override get position(): Vector3 {
    if (this.controller) {
      return this.controller.getPosition().clone();
    }
    return this.mesh.position.clone();
  }

  get isGrounded(): boolean {
    return this.charState === 'ON_GROUND';
  }

  usePower(): boolean {
    if (!this.isPowerReady || !this.scene) return false;
    this.isPowerReady = false;
    this.powerCharge = 0;

    this.mouthMesh.setEnabled(true);
    setTimeout(() => { this.mouthMesh.setEnabled(false); }, 500);

    const waveMesh = MeshBuilder.CreateTorus('bark-wave', {
      diameter: 5, thickness: 0.3, tessellation: 16,
    }, this.scene);
    const waveMat = basicMat('bark-wave-mat', C.POWER_WAVE, this.scene);
    waveMat.alpha = 1;
    waveMat.backFaceCulling = false;
    waveMesh.material = waveMat;

    waveMesh.position.copyFrom(this.mesh.position);
    waveMesh.position.y += 1;
    const fwdDir = new Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
    waveMesh.position.addInPlace(fwdDir.scale(1.5));
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
    return new Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
  }

  getVelocityY(): number {
    if (!this.controller) return 0;
    return this.controller.getVelocity().y;
  }

  bounce() {
    if (!this.controller) return;
    const vel = this.controller.getVelocity();
    this.controller.setVelocity(new Vector3(vel.x, 10, vel.z));
  }

  applyKnockback(velocity: Vector3) {
    if (!this.controller) return;
    this.controller.setVelocity(velocity);
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
    this.legs[0].rotation.x = sin * 0.5;
    this.legs[1].rotation.x = -sin * 0.5;
    this.legs[2].rotation.x = -sin * 0.5;
    this.legs[3].rotation.x = sin * 0.5;
    this.torsoGroup.position.y = 0.5 + Math.abs(cos) * 0.05;
    this.headGroup.rotation.x = Math.sin(this.walkCycle * 0.5) * 0.05;
    this.tailMesh.rotation.z = Math.sin(this.walkCycle * 2) * 0.2;
  }

  private animateIdle(dt: number) {
    this.walkCycle += dt * 2;
    const breathe = Math.sin(this.walkCycle) * 0.02;
    this.torsoGroup.scaling.y = 1.0 + breathe;
    for (const leg of this.legs) {
      leg.rotation.x *= 0.9;
    }
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
    this.charState = 'IN_AIR';
    this.wantJump = 0;
    if (this.controller) {
      this.controller.setPosition(new Vector3(x, y, z));
      this.controller.setVelocity(Vector3.Zero());
    }
  }
}
