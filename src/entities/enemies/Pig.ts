import * as THREE from 'three';
import { Enemy } from './Enemy';
import * as C from '../../utils/colors';

export class Pig extends Enemy {
  private chargeTimer = 0;
  private isCharging = false;
  private bodyMesh!: THREE.Mesh;

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

    // Body (rotund)
    const bodyGeo = new THREE.SphereGeometry(0.5, 8, 6);
    this.bodyMesh = new THREE.Mesh(bodyGeo, toon(bodyColor));
    this.bodyMesh.scale.set(1.1, 0.85, 1);
    this.bodyMesh.position.y = 0.5;
    this.mesh.add(this.bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const head = new THREE.Mesh(headGeo, toon(bodyColor));
    head.position.set(0, 0.75, 0.35);
    this.mesh.add(head);

    // Snout
    const snoutGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8);
    const snout = new THREE.Mesh(snoutGeo, toon(C.PIG_SNOUT));
    snout.position.set(0, 0.7, 0.65);
    snout.rotation.x = Math.PI / 2;
    this.mesh.add(snout);

    // Nostrils
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.03, 4, 4);
      const nostril = new THREE.Mesh(nostrilGeo, new THREE.MeshBasicMaterial({ color: 0x331111 }));
      nostril.position.set(side * 0.06, 0.7, 0.72);
      this.mesh.add(nostril);
    }

    // Eyes (dark, menacing)
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.06, 5, 5);
      const eye = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: C.PIG_EYE }));
      eye.position.set(side * 0.15, 0.85, 0.55);
      this.mesh.add(eye);
    }

    // Ears (floppy)
    for (const side of [-1, 1]) {
      const earGeo = new THREE.BoxGeometry(0.15, 0.12, 0.08);
      const ear = new THREE.Mesh(earGeo, toon(bodyColor));
      ear.position.set(side * 0.25, 0.95, 0.25);
      ear.rotation.z = side * 0.5;
      ear.rotation.x = -0.3;
      this.mesh.add(ear);
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
      const leg = new THREE.Mesh(legGeo, toon(bodyColor));
      leg.position.set(pos.x, 0.12, pos.z);
      this.mesh.add(leg);
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
      helmet.position.set(0, 0.95, 0.35);
      this.mesh.add(helmet);

      // Crown
      const crownGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.15, 6);
      const crown = new THREE.Mesh(crownGeo, toon(0xffdd00));
      crown.position.set(0, 1.15, 0.3);
      this.mesh.add(crown);

      // Shoulder pads
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
            x: (dx / d) * this.speed * 3,
            y: 2,
            z: (dz / d) * this.speed * 3,
          }, true);
        }
      }
    }

    if (this.isCharging) {
      this.chargeTimer -= dt;
      // Red tint during charge
      this.bodyMesh.material = new THREE.MeshToonMaterial({ color: 0xff4444 });
      if (this.chargeTimer <= 0) {
        this.isCharging = false;
        this.chargeTimer = 3 + Math.random() * 2;
        this.bodyMesh.material = new THREE.MeshToonMaterial({
          color: this.isBoss ? C.BOSS_TINT : C.PIG_BODY
        });
      }
    }
  }
}
