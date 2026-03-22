import * as THREE from 'three';
import { Enemy } from './Enemy';
import * as C from '../../utils/colors';

export class Rabbit extends Enemy {
  private jumpTimer = 0;
  private isJumping = false;
  private graphicGroup!: THREE.Group;
  private headGroup!: THREE.Group;
  private bodyMesh!: THREE.Mesh;
  private ears: THREE.Group[] = [];
  private feet: THREE.Group[] = [];
  private walkCycle = 0;

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = isBoss ? 5 : 6;
    this.detectionRadius = isBoss ? 18 : 12;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Coelho Gigante' : '';
    this.buildModel(isBoss);
  }

  private buildModel(isBoss: boolean) {
    const scale = isBoss ? 2.5 : 1;
    const toon = (color: number) => new THREE.MeshToonMaterial({ color });
    const bodyColor = isBoss ? C.BOSS_TINT : C.RABBIT_BODY;

    this.graphicGroup = new THREE.Group();
    this.mesh.add(this.graphicGroup);

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.4, 8, 6);
    this.bodyMesh = new THREE.Mesh(bodyGeo, toon(bodyColor));
    this.bodyMesh.scale.set(0.8, 1, 0.9);
    this.bodyMesh.position.y = 0.4;
    this.graphicGroup.add(this.bodyMesh);

    // Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.85, 0.15);
    this.graphicGroup.add(this.headGroup);

    // Head Core
    const headGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const head = new THREE.Mesh(headGeo, toon(bodyColor));
    this.headGroup.add(head);

    // Ears (long!)
    for (const side of [-1, 1]) {
      // Group to pivot ears from base
      const earPivot = new THREE.Group();
      earPivot.position.set(side * 0.12, 0.25, -0.1);
      this.headGroup.add(earPivot);

      const earGeo = new THREE.CapsuleGeometry(0.06, 0.5, 4, 6);
      const ear = new THREE.Mesh(earGeo, toon(C.RABBIT_EAR));
      ear.position.set(0, 0.25, 0); // Offset so pivot is at base
      ear.rotation.z = side * 0.15;
      earPivot.add(ear);
      this.ears.push(earPivot);
    }

    // Eyes (red, evil!)
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.06, 5, 5);
      const eye = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: C.RABBIT_EYE }));
      eye.position.set(side * 0.12, 0.05, 0.25);
      this.headGroup.add(eye);
    }

    // Tail (puffball)
    const tailGeo = new THREE.SphereGeometry(0.12, 5, 5);
    const tail = new THREE.Mesh(tailGeo, toon(0xffffff));
    tail.position.set(0, 0.35, -0.35);
    this.graphicGroup.add(tail);

    // Feet
    for (const side of [-1, 1]) {
      const footPivot = new THREE.Group();
      footPivot.position.set(side * 0.15, 0.05, 0);
      this.graphicGroup.add(footPivot);

      const footGeo = new THREE.BoxGeometry(0.12, 0.08, 0.25);
      const foot = new THREE.Mesh(footGeo, toon(bodyColor));
      foot.position.set(0, 0, 0.1);
      footPivot.add(foot);
      this.feet.push(footPivot);
    }

    this.mesh.scale.setScalar(scale);

    // Boss crown
    if (isBoss) {
      const crownGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.15, 5);
      const crown = new THREE.Mesh(crownGeo, toon(0xffdd00));
      crown.position.set(0, 0.4, -0.1);
      this.headGroup.add(crown);
      // Crown spikes
      for (let i = 0; i < 5; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
        const spike = new THREE.Mesh(spikeGeo, toon(0xffdd00));
        const angle = (i / 5) * Math.PI * 2;
        spike.position.set(
          Math.cos(angle) * 0.15,
          0.5,
          Math.sin(angle) * 0.15 - 0.1
        );
        this.headGroup.add(spike);
      }
    }
  }

  updateAI(dt: number, playerPos: THREE.Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    const vel = this.body.linvel();
    const speedSq = vel.x * vel.x + vel.z * vel.z;
    const isMoving = speedSq > 0.1;

    // Check if grounded securely
    const pos = this.body.translation();
    const isGrounded = vel.y >= -0.1 && vel.y <= 0.1 && pos.y < 1.0; 

    // Jumping Logic
    this.jumpTimer -= dt;
    if (this.jumpTimer <= 0 && this.state === 1 && isGrounded) { // CHASE
      // Add visual cue just before jump or on jump
      this.isJumping = true;
      this.body.setLinvel({ x: vel.x * 1.5, y: 7, z: vel.z * 1.5 }, true);
      this.jumpTimer = 1.0 + Math.random() * 1.5;
    }

    if (isGrounded && this.isJumping) {
      this.isJumping = false;
    }

    // Squash & Stretch Animation
    if (!isGrounded || this.isJumping) {
       // Stretching while in air
       const stretch = Math.min(1.5, Math.max(0.7, 1 + vel.y * 0.05));
       this.graphicGroup.scale.set(1 / stretch, stretch, 1 / stretch);
       
       // Feet point down
       for(const foot of this.feet) foot.rotation.x = 0.5;
    } else {
       // Squash on landing or just normal scaling
       // Lerp back to normal scale
       this.graphicGroup.scale.x += (1.0 - this.graphicGroup.scale.x) * 10 * dt;
       this.graphicGroup.scale.y += (1.0 - this.graphicGroup.scale.y) * 10 * dt;
       this.graphicGroup.scale.z += (1.0 - this.graphicGroup.scale.z) * 10 * dt;

       if (isMoving) {
         // Hopping animation while moving on ground
         this.walkCycle += dt * 15;
         const sin = Math.sin(this.walkCycle);
         this.bodyMesh.position.y = 0.4 + Math.abs(sin) * 0.1;
         
         // Feet shuffle
         this.feet[0].rotation.x = Math.sin(this.walkCycle) * 0.5;
         this.feet[1].rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.5;
       } else {
         // Idle breathing
         this.walkCycle += dt * 4;
         const breathe = Math.sin(this.walkCycle) * 0.02;
         this.bodyMesh.scale.y = 1 + breathe;
         this.headGroup.position.y = 0.85 + breathe;

         for(const foot of this.feet) foot.rotation.x *= 0.8;
       }
    }

    // Ear flop animation (delay based on movement/velocity)
    const t = performance.now() * 0.005;
    const vY = vel.y;
    this.ears.forEach((ear, i) => {
      // Ears flap back wildly when jumping/falling
      const baseRot = Math.max(-1.0, Math.min(0.5, -vY * 0.15));
      ear.rotation.x = baseRot + Math.sin(t + i) * 0.05;
    });
  }
}
