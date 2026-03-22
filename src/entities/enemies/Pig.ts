import * as THREE from 'three';
import { Enemy } from './Enemy';
import * as C from '../../utils/colors';

export class Pig extends Enemy {
  private chargeTimer = 0;
  private isCharging = false;
  private bodyMesh!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private legs: THREE.Mesh[] = [];
  private walkCycle = 0;
  private originalMaterial!: THREE.Material;

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = isBoss ? 4 : 3;
    this.detectionRadius = isBoss ? 15 : 10;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Porco-Rei' : '';
    this.buildModel(isBoss);
  }

  private buildModel(isBoss: boolean) {
    const scale = isBoss ? 2.8 : 1;
    const toon = (color: number) => new THREE.MeshToonMaterial({ color });
    const bodyColor = isBoss ? C.BOSS_TINT : C.PIG_BODY;

    this.originalMaterial = toon(bodyColor);

    // Body (rotund)
    const bodyGeo = new THREE.SphereGeometry(0.5, 8, 6);
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.originalMaterial);
    this.bodyMesh.scale.set(1.1, 0.85, 1);
    this.bodyMesh.position.y = 0.5;
    this.mesh.add(this.bodyMesh);

    // Head Group for animation
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.75, 0.35);
    this.mesh.add(this.headGroup);

    // Head Mesh
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const head = new THREE.Mesh(headGeo, this.originalMaterial);
    this.headGroup.add(head);

    // Snout
    const snoutGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8);
    const snout = new THREE.Mesh(snoutGeo, toon(C.PIG_SNOUT));
    snout.position.set(0, -0.05, 0.3);
    snout.rotation.x = Math.PI / 2;
    this.headGroup.add(snout);

    // Nostrils
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.03, 4, 4);
      const nostril = new THREE.Mesh(nostrilGeo, new THREE.MeshBasicMaterial({ color: 0x331111 }));
      nostril.position.set(side * 0.06, -0.05, 0.37);
      this.headGroup.add(nostril);
    }

    // Eyes (dark, menacing)
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.06, 5, 5);
      const eye = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: C.PIG_EYE }));
      eye.position.set(side * 0.15, 0.1, 0.2);
      this.headGroup.add(eye);
    }

    // Ears (floppy)
    for (const side of [-1, 1]) {
      const earGeo = new THREE.BoxGeometry(0.15, 0.12, 0.08);
      const ear = new THREE.Mesh(earGeo, this.originalMaterial);
      ear.position.set(side * 0.25, 0.2, -0.1);
      ear.rotation.z = side * 0.5;
      ear.rotation.x = -0.3;
      this.headGroup.add(ear);
    }

    // Legs (stubby)
    const legPositions = [
      { x: -0.3, z: 0.15 },
      { x: 0.3, z: 0.15 },
      { x: -0.3, z: -0.15 },
      { x: 0.3, z: -0.15 },
    ];
    for (const pos of legPositions) {
      const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 6);
      const leg = new THREE.Mesh(legGeo, this.originalMaterial);
      leg.position.set(pos.x, 0.12, pos.z);
      this.mesh.add(leg);
      this.legs.push(leg);
    }

    // Tail (curly)
    const tailGeo = new THREE.TorusGeometry(0.08, 0.025, 4, 8, Math.PI * 1.5);
    const tail = new THREE.Mesh(tailGeo, toon(C.PIG_SNOUT));
    tail.position.set(0, 0.5, -0.45);
    tail.rotation.y = Math.PI;
    this.mesh.add(tail);

    this.mesh.scale.setScalar(scale);

    // Boss armor plates
    if (isBoss) {
      // Helmet
      const helmetGeo = new THREE.SphereGeometry(0.4, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const helmetMat = toon(0x666666);
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(0, 0.2, 0);
      this.headGroup.add(helmet);

      // Crown
      const crownGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.15, 6);
      const crown = new THREE.Mesh(crownGeo, toon(0xffdd00));
      crown.position.set(0, 0.4, -0.05);
      this.headGroup.add(crown);

      // Shoulder pads (Attached to body)
      for (const side of [-1, 1]) {
        const padGeo = new THREE.SphereGeometry(0.2, 5, 4);
        const pad = new THREE.Mesh(padGeo, toon(0x555555));
        pad.position.set(side * 0.55, 0.7, 0.1);
        pad.scale.set(1, 0.7, 1);
        this.mesh.add(pad);
      }
    }
  }

  updateAI(dt: number, playerPos: THREE.Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    const vel = this.body.linvel();
    const speedSq = vel.x * vel.x + vel.z * vel.z;
    const isMoving = speedSq > 0.1;

    // Movement Animation
    if (isMoving) {
      const speedMult = this.isCharging ? 2 : 1;
      this.walkCycle += dt * 10 * Math.sqrt(speedSq) * speedMult;
      
      const sin = Math.sin(this.walkCycle);
      const cos = Math.cos(this.walkCycle);

      // Leg trot
      this.legs[0].rotation.x = sin * 0.6;
      this.legs[1].rotation.x = -sin * 0.6;
      this.legs[2].rotation.x = -sin * 0.6;
      this.legs[3].rotation.x = sin * 0.6;

      // Body trot bob
      this.bodyMesh.position.y = 0.5 + Math.abs(cos) * 0.05;
      
      // Head trot rotation
      if (!this.isCharging) {
        this.headGroup.rotation.x = sin * 0.1;
      }
    } else {
      // Idle reset
      for (const leg of this.legs) leg.rotation.x *= 0.8;
      this.bodyMesh.position.y += (0.5 - this.bodyMesh.position.y) * 0.1;
      if (!this.isCharging) {
        this.headGroup.rotation.x *= 0.8;
      }
    }

    // Charge attack when close
    const pos = this.body.translation();
    const dist = Math.sqrt(
      (pos.x - playerPos.x) ** 2 + (pos.z - playerPos.z) ** 2
    );

    if (this.state === 1 && dist < 6 && !this.isCharging) { // CHASE
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) {
        this.isCharging = true;
        this.chargeTimer = 0.5;
        // Charge boost
        const dx = playerPos.x - pos.x;
        const dz = playerPos.z - pos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0) {
          this.body.setLinvel({
            x: (dx / d) * this.speed * 3.5,
            y: 2.5,
            z: (dz / d) * this.speed * 3.5,
          }, true);
        }
      }
    }

    if (this.isCharging) {
      this.chargeTimer -= dt;
      // Head down for charge
      this.headGroup.rotation.x = -0.5; 
      
      // Color flash
      if (Math.sin(this.chargeTimer * 20) > 0) {
        this.bodyMesh.material = new THREE.MeshToonMaterial({ color: 0xff3333 });
      } else {
        this.bodyMesh.material = this.originalMaterial;
      }

      if (this.chargeTimer <= 0) {
        this.isCharging = false;
        this.chargeTimer = 3 + Math.random() * 2;
        this.bodyMesh.material = this.originalMaterial;
        this.headGroup.rotation.x = 0;
      }
    }
  }
}
