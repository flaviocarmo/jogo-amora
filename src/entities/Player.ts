import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { InputManager } from '../core/InputManager';
import { CameraSystem } from '../systems/CameraSystem';
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

  // Animation
  private walkCycle = 0;
  private legs: THREE.Mesh[] = [];
  private bodyMesh!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private tailParts: THREE.Mesh[] = [];
  private mouthMesh!: THREE.Mesh;

  // Bark wave visual
  barkWaveMesh: THREE.Mesh | null = null;
  private barkWaveTimer = 0;

  constructor() {
    super(5);
    this.buildModel();
  }

  private buildModel() {
    const toonMat = (color: number) => new THREE.MeshToonMaterial({ color });
    const glossMat = (color: number) => new THREE.MeshPhongMaterial({ color, shininess: 100 });

    // Body - fluffy sphere
    const bodyGeo = new THREE.SphereGeometry(0.6, 12, 10);
    this.bodyMesh = new THREE.Mesh(bodyGeo, toonMat(C.AMORA_BODY));
    this.bodyMesh.scale.set(1, 0.75, 0.85);
    this.bodyMesh.position.y = 0.5;
    this.mesh.add(this.bodyMesh);

    // Fur puffs around body
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const puffGeo = new THREE.SphereGeometry(0.2 + Math.random() * 0.12, 6, 5);
      const puff = new THREE.Mesh(puffGeo, toonMat(i % 3 === 0 ? C.AMORA_FUR_HIGHLIGHT : C.AMORA_FUR_DARK));
      puff.position.set(
        Math.cos(angle) * 0.55,
        0.4 + Math.random() * 0.3,
        Math.sin(angle) * 0.45
      );
      this.mesh.add(puff);
    }

    // Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.1, 0.25);
    this.mesh.add(this.headGroup);

    const headGeo = new THREE.SphereGeometry(0.42, 10, 8);
    const headMesh = new THREE.Mesh(headGeo, toonMat(C.AMORA_BODY));
    this.headGroup.add(headMesh);

    // Head fur puffs (Pomeranian mane)
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const puffGeo = new THREE.SphereGeometry(0.15 + Math.random() * 0.08, 5, 4);
      const puff = new THREE.Mesh(puffGeo, toonMat(i % 2 === 0 ? C.AMORA_BODY : C.AMORA_FUR_HIGHLIGHT));
      puff.position.set(
        Math.cos(angle) * 0.38,
        Math.sin(angle) * 0.2 - 0.05,
        Math.sin(angle) * 0.35
      );
      this.headGroup.add(puff);
    }

    // Snout
    const snoutGeo = new THREE.SphereGeometry(0.13, 6, 5);
    const snout = new THREE.Mesh(snoutGeo, toonMat(C.AMORA_FUR_HIGHLIGHT));
    snout.position.set(0, -0.08, 0.35);
    snout.scale.set(1, 0.7, 1.1);
    this.headGroup.add(snout);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.06, 6, 5);
    const nose = new THREE.Mesh(noseGeo, glossMat(C.AMORA_NOSE));
    nose.position.set(0, -0.02, 0.45);
    this.headGroup.add(nose);

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.07, 6, 5);
      const eye = new THREE.Mesh(eyeGeo, glossMat(C.AMORA_EYE));
      eye.position.set(side * 0.15, 0.06, 0.32);
      this.headGroup.add(eye);

      // Eye highlight
      const highlightGeo = new THREE.SphereGeometry(0.025, 4, 4);
      const highlight = new THREE.Mesh(highlightGeo, new THREE.MeshBasicMaterial({ color: C.AMORA_EYE_HIGHLIGHT }));
      highlight.position.set(side * 0.13, 0.09, 0.38);
      this.headGroup.add(highlight);
    }

    // Ears (pointed, typical Spitz)
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.1, 0.22, 4);
      const ear = new THREE.Mesh(earGeo, toonMat(C.AMORA_BODY));
      ear.position.set(side * 0.2, 0.35, 0);
      ear.rotation.z = side * -0.2;
      this.headGroup.add(ear);
    }

    // Mouth (for bark animation)
    const mouthGeo = new THREE.SphereGeometry(0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.mouthMesh = new THREE.Mesh(mouthGeo, toonMat(C.AMORA_TONGUE));
    this.mouthMesh.position.set(0, -0.15, 0.35);
    this.mouthMesh.visible = false;
    this.headGroup.add(this.mouthMesh);

    // Tail (curled up, typical Pomeranian)
    for (let i = 0; i < 5; i++) {
      const radius = 0.1 - i * 0.01;
      const tailGeo = new THREE.SphereGeometry(radius, 5, 4);
      const tailPart = new THREE.Mesh(tailGeo, toonMat(i % 2 === 0 ? C.AMORA_BODY : C.AMORA_FUR_HIGHLIGHT));
      const angle = (i / 5) * Math.PI * 0.8;
      tailPart.position.set(
        0,
        0.7 + Math.sin(angle) * 0.4,
        -0.4 - Math.cos(angle) * 0.3
      );
      this.mesh.add(tailPart);
      this.tailParts.push(tailPart);
    }

    // Legs
    const legPositions = [
      { x: -0.25, z: 0.2 },
      { x: 0.25, z: 0.2 },
      { x: -0.25, z: -0.2 },
      { x: 0.25, z: -0.2 },
    ];
    for (const pos of legPositions) {
      const legGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.35, 6);
      const leg = new THREE.Mesh(legGeo, toonMat(C.AMORA_FUR_DARK));
      leg.position.set(pos.x, 0.1, pos.z);
      this.mesh.add(leg);
      this.legs.push(leg);
    }

    // Shadow blob
    const shadowGeo = new THREE.CircleGeometry(0.5, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.mesh.add(shadow);
  }

  initPhysics(physics: PhysicsWorld, x: number, y: number, z: number) {
    const bodyDesc = physics.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(2)
      .lockRotations();
    this.body = physics.createRigidBody(bodyDesc);

    const colliderDesc = physics.RAPIER.ColliderDesc.capsule(0.3, 0.35)
      .setFriction(0.5)
      .setRestitution(0);
    physics.createCollider(colliderDesc, this.body);
  }

  update(dt: number, input: InputManager, camera: CameraSystem, physics: PhysicsWorld) {
    super.update(dt);
    if (!this.body || !this.alive) return;

    // Ground check via raycast
    this.groundCheckTimer -= dt;
    if (this.groundCheckTimer <= 0) {
      this.groundCheckTimer = 0.05;
      const pos = this.body.translation();
      const hit = physics.castRay(
        { x: pos.x, y: pos.y - 0.3, z: pos.z },
        { x: 0, y: -1, z: 0 },
        0.5
      );
      this.isGrounded = hit !== null;
    }

    // Movement
    const forward = camera.forwardXZ;
    const right = camera.rightXZ;
    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, input.moveForward);
    moveDir.addScaledVector(right, input.moveRight);

    const speed = input.isDown('ShiftLeft') ? this.runSpeed : this.walkSpeed;
    const vel = this.body.linvel();

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.body.setLinvel({
        x: moveDir.x * speed,
        y: vel.y,
        z: moveDir.z * speed
      }, true);

      // Face movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = targetAngle;

      // Walk animation
      this.walkCycle += dt * (input.isDown('ShiftLeft') ? 15 : 10);
      this.animateWalk();
    } else {
      this.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
      this.animateIdle(dt);
    }

    // Jump
    if (input.jump && this.isGrounded) {
      const vel = this.body.linvel();
      this.body.setLinvel({ x: vel.x, y: this.jumpForce, z: vel.z }, true);
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

    // Bark wave update
    if (this.barkWaveMesh) {
      this.barkWaveTimer -= dt;
      if (this.barkWaveTimer <= 0) {
        this.barkWaveMesh.parent?.remove(this.barkWaveMesh);
        this.barkWaveMesh = null;
      } else {
        const scale = 1 + (0.5 - this.barkWaveTimer) * 15;
        this.barkWaveMesh.scale.set(scale, scale, scale);
        (this.barkWaveMesh.material as THREE.MeshBasicMaterial).opacity = this.barkWaveTimer * 2;
      }
    }

    this.syncMeshToBody();
  }

  usePower(): boolean {
    if (!this.isPowerReady) return false;
    this.isPowerReady = false;
    this.powerCharge = 0;

    // Show mouth for bark
    this.mouthMesh.visible = true;
    setTimeout(() => { this.mouthMesh.visible = false; }, 500);

    // Create bark wave visual
    const waveGeo = new THREE.RingGeometry(0.5, 2.5, 16);
    const waveMat = new THREE.MeshBasicMaterial({
      color: C.POWER_WAVE,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    this.barkWaveMesh = new THREE.Mesh(waveGeo, waveMat);
    this.barkWaveMesh.position.copy(this.mesh.position);
    this.barkWaveMesh.position.y += 1;
    const fwd = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
    this.barkWaveMesh.position.add(fwd.multiplyScalar(1.5));
    this.barkWaveMesh.lookAt(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
    this.barkWaveTimer = 0.5;

    return true;
  }

  getBarkDirection(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
  }

  getVelocityY(): number {
    if (!this.body) return 0;
    return this.body.linvel().y;
  }

  bounce() {
    if (!this.body) return;
    const vel = this.body.linvel();
    this.body.setLinvel({ x: vel.x, y: 10, z: vel.z }, true);
  }

  get powerPercent(): number {
    return clamp(this.powerCharge / this.powerChargeTime, 0, 1);
  }

  private animateWalk() {
    const sin = Math.sin(this.walkCycle);
    const cos = Math.cos(this.walkCycle);
    // Front legs
    this.legs[0].rotation.x = sin * 0.4;
    this.legs[1].rotation.x = -sin * 0.4;
    // Back legs
    this.legs[2].rotation.x = -sin * 0.4;
    this.legs[3].rotation.x = sin * 0.4;
    // Body bobble
    this.bodyMesh.position.y = 0.5 + Math.abs(cos) * 0.05;
    // Head bobble
    this.headGroup.rotation.x = sin * 0.05;
    // Tail wag
    this.tailParts.forEach((t, i) => {
      t.position.x = Math.sin(this.walkCycle * 2 + i * 0.3) * 0.08;
    });
  }

  private animateIdle(dt: number) {
    this.walkCycle += dt * 2;
    const breathe = Math.sin(this.walkCycle) * 0.02;
    this.bodyMesh.scale.y = 0.75 + breathe;
    // Reset legs
    for (const leg of this.legs) {
      leg.rotation.x *= 0.9;
    }
    // Gentle tail wag
    this.tailParts.forEach((t, i) => {
      t.position.x = Math.sin(this.walkCycle * 1.5 + i * 0.5) * 0.04;
    });
  }

  reset(x: number, y: number, z: number) {
    this.health = this.maxHealth;
    this.alive = true;
    this.powerCharge = 0;
    this.isPowerReady = false;
    this.invincibleTimer = 0;
    if (this.body) {
      this.body.setTranslation({ x, y, z }, true);
      this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }
}
