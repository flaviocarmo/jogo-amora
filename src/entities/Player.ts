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

  // Super bar (charges only when power is ready)
  superCharge = 0;
  readonly superChargeTime = 20;
  isSuperReady = false;

  // Animation
  private walkCycle = 0;
  private legs: THREE.Group[] = []; 
  private torsoGroup!: THREE.Group;
  private headGroup!: THREE.Group;
  private tailMesh!: THREE.Mesh; 
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

    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.5, 0);
    this.mesh.add(this.torsoGroup);

    // --- MANE/CHEST (The massive front fluff from the 3D reference) ---
    // O peito enorme e peludo característico da foto
    const maneGeo = new THREE.SphereGeometry(0.65, 16, 12);
    const maneMesh = new THREE.Mesh(maneGeo, toonMat(C.AMORA_BODY));
    maneMesh.scale.set(1.05, 1.0, 1.05); 
    maneMesh.position.set(0, 0.15, 0.15);
    this.torsoGroup.add(maneMesh);

    // Mancha cinza no peito
    const chestGeo = new THREE.SphereGeometry(0.4, 10, 8);
    const chestMesh = new THREE.Mesh(chestGeo, toonMat(C.AMORA_CHEST));
    chestMesh.scale.set(1.1, 0.9, 0.5);
    chestMesh.position.set(0, 0.05, 0.65); // Na frente da juba
    this.torsoGroup.add(chestMesh);

    // --- BODY/HINDQUARTERS ---
    // A parte traseira, consideravelmente menor
    const bodyGeo = new THREE.SphereGeometry(0.5, 12, 10);
    const bodyMesh = new THREE.Mesh(bodyGeo, toonMat(C.AMORA_BODY));
    bodyMesh.scale.set(0.9, 0.95, 1.1);
    bodyMesh.position.set(0, 0.05, -0.25);
    this.torsoGroup.add(bodyMesh);

    // --- CAUDA ---
    // Cauda deitada planamente sobre as costas, como na referência 3D
    const tailGeo = new THREE.CapsuleGeometry(0.2, 0.4, 8, 8);
    this.tailMesh = new THREE.Mesh(tailGeo, toonMat(C.AMORA_BODY));
    this.tailMesh.rotation.x = Math.PI / 2;
    this.tailMesh.scale.set(1.4, 1.0, 0.7);
    this.tailMesh.position.set(0, 0.55, -0.4);
    this.torsoGroup.add(this.tailMesh);

    // --- CABEÇA ---
    this.headGroup = new THREE.Group();
    // Embutida na juba 
    this.headGroup.position.set(0, 0.6, 0.4);
    this.torsoGroup.add(this.headGroup);

    // Esfera principal da cabeça
    const headGeo = new THREE.SphereGeometry(0.38, 12, 10);
    const headMesh = new THREE.Mesh(headGeo, toonMat(C.AMORA_BODY));
    this.headGroup.add(headMesh);

    // Focinho (Muzzle) - Bem curto e projetado em branco, como na imagem
    const snoutGeo = new THREE.SphereGeometry(0.14, 8, 6);
    const snoutMesh = new THREE.Mesh(snoutGeo, toonMat(C.AMORA_CHEST));
    snoutMesh.position.set(0, -0.05, 0.32);
    snoutMesh.scale.set(1.2, 0.85, 1.0);
    this.headGroup.add(snoutMesh);

    // Nariz (Ponto preto brilhante em cima do focinho)
    const noseGeo = new THREE.SphereGeometry(0.04, 6, 5);
    const noseMesh = new THREE.Mesh(noseGeo, glossMat(C.AMORA_NOSE));
    noseMesh.position.set(0, 0.04, 0.44);
    this.headGroup.add(noseMesh);

    // Olhos (Separados, arredondados)
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.05, 6, 5);
      const eyeMesh = new THREE.Mesh(eyeGeo, glossMat(C.AMORA_EYE));
      eyeMesh.position.set(side * 0.16, 0.08, 0.32);
      this.headGroup.add(eyeMesh);

      // Brilho do olho
      const highlightGeo = new THREE.SphereGeometry(0.018, 4, 4);
      const highlightMesh = new THREE.Mesh(highlightGeo, new THREE.MeshBasicMaterial({ color: C.AMORA_EYE_HIGHLIGHT }));
      highlightMesh.position.set(side * 0.145, 0.1, 0.355);
      this.headGroup.add(highlightMesh);
    }

    // Orelhas (Pequenas, largas na base, pontas arredondadas, anguladas pros lados)
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.12, 0.16, 6);
      const earMesh = new THREE.Mesh(earGeo, toonMat(C.AMORA_BODY));
      earMesh.position.set(side * 0.22, 0.32, 0.05);
      earMesh.rotation.z = side * -0.4;
      earMesh.rotation.x = -0.15;
      this.headGroup.add(earMesh);
    }

    // Boca (Para latido)
    const mouthGeo = new THREE.SphereGeometry(0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.mouthMesh = new THREE.Mesh(mouthGeo, toonMat(C.AMORA_TONGUE));
    this.mouthMesh.position.set(0, -0.1, 0.4);
    this.mouthMesh.visible = false;
    this.headGroup.add(this.mouthMesh);

    // --- PERNAS ---
    // Pernas espessas, proporcionais
    const legPositions = [
      { x: -0.28, z: 0.3, y: 0.15 }, // Frente Esq
      { x: 0.28, z: 0.3, y: 0.15 },  // Frente Dir
      { x: -0.22, z: -0.35, y: 0.15 }, // Tras Esq
      { x: 0.22, z: -0.35, y: 0.15 },  // Tras Dir
    ];
    for (const [i, pos] of legPositions.entries()) {
      const legGroup = new THREE.Group();
      legGroup.position.set(pos.x, pos.y, pos.z);
      
      const isFront = i < 2;
      const legColor = isFront ? C.AMORA_CHEST : C.AMORA_BODY;

      const legGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.25, 6);
      const legMesh = new THREE.Mesh(legGeo, toonMat(legColor));
      legMesh.position.y = 0.05; 
      legGroup.add(legMesh);

      // Patas redondas/flat
      const pawGeo = new THREE.SphereGeometry(0.12, 6, 5);
      const pawMesh = new THREE.Mesh(pawGeo, toonMat(C.AMORA_CHEST));
      pawMesh.scale.set(1.1, 0.6, 1.2);
      pawMesh.position.y = -0.1;
      pawMesh.position.z = 0.03;
      legGroup.add(pawMesh);

      this.mesh.add(legGroup);
      this.legs.push(legGroup);
    }

    // --- SOMBRA ---
    const shadowGeo = new THREE.CircleGeometry(0.65, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    this.mesh.add(shadowMesh);
  }

  // ... (initPhysics e update permanecem os mesmos) ...

  initPhysics(physics: PhysicsWorld, x: number, y: number, z: number) {
    const bodyDesc = physics.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(2)
      .lockRotations();
    this.body = physics.createRigidBody(bodyDesc);

    const colliderDesc = physics.RAPIER.ColliderDesc.capsule(0.35, 0.4) // Aumentado um pouco
      .setFriction(0.5)
      .setRestitution(0);
    physics.createCollider(colliderDesc, this.body);
  }

  updatePlayer(dt: number, input: InputManager, camera: CameraSystem, physics: PhysicsWorld) {
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

  useSuper(): boolean {
    if (!this.isSuperReady) return false;
    this.isSuperReady = false;
    this.superCharge = 0;
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
    // Troso bobble
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
    this.torsoGroup.scale.y = 1.0 + breathe;
    
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
      this.body.setTranslation({ x, y, z }, true);
      this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }
}