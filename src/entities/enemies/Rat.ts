import * as THREE from 'three';
import { Enemy, EnemyState } from './Enemy';
import * as C from '../../utils/colors';

export class Rat extends Enemy {
  // Zigzag AI state
  private zigzagTimer = 0;
  private zigzagInterval = 0.5;

  // Graphic references for animation
  private graphicGroup!: THREE.Group;
  private bodyMesh!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private legs: THREE.Mesh[] = [];
  private tailMesh!: THREE.Mesh;
  private walkCycle = 0;

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = 8;
    this.detectionRadius = isBoss ? 16 : 10;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Rato-Rei' : '';
    this.buildModel(isBoss);
  }

  private buildModel(isBoss: boolean) {
    const scale = isBoss ? 2.2 : 1;
    const toon = (color: number) => new THREE.MeshToonMaterial({ color });
    const bodyColor = isBoss ? C.BOSS_TINT : C.RAT_BODY;

    this.graphicGroup = new THREE.Group();
    this.mesh.add(this.graphicGroup);

    // Body: small elongated sphere (stretched on Z axis)
    const bodyGeo = new THREE.SphereGeometry(0.3, 8, 6);
    this.bodyMesh = new THREE.Mesh(bodyGeo, toon(bodyColor));
    this.bodyMesh.scale.set(0.85, 0.8, 1.4); // elongated along Z
    this.bodyMesh.position.y = 0.3;
    this.graphicGroup.add(this.bodyMesh);

    // Head Group — positioned at front of elongated body
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.42, 0.38);
    this.graphicGroup.add(this.headGroup);

    // Head: slightly elongated sphere (snout-like)
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const head = new THREE.Mesh(headGeo, toon(bodyColor));
    head.scale.set(0.85, 0.85, 1.25); // pointed forward for snout shape
    this.headGroup.add(head);

    // Ears: round, large relative to head
    for (const side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(0.1, 8, 6);
      const ear = new THREE.Mesh(earGeo, toon(C.RAT_TAIL)); // slightly pink
      ear.scale.set(1, 1.15, 0.4); // flattened disc shape
      ear.position.set(side * 0.14, 0.14, -0.06);
      ear.rotation.z = side * 0.2;
      this.headGroup.add(ear);
    }

    // Eyes: small, red
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 5, 5);
      const eye = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: C.RAT_EYE }));
      eye.position.set(side * 0.09, 0.06, 0.17);
      this.headGroup.add(eye);
    }

    // Teeth: two small white rectangles protruding from mouth
    for (const side of [-1, 1]) {
      const toothGeo = new THREE.BoxGeometry(0.04, 0.05, 0.03);
      const tooth = new THREE.Mesh(toothGeo, new THREE.MeshToonMaterial({ color: 0xffffff }));
      tooth.position.set(side * 0.03, -0.1, 0.18);
      this.headGroup.add(tooth);
    }

    // Legs: 4 very small legs under body
    const legPositions = [
      { x: -0.18, z: 0.15 },
      { x:  0.18, z: 0.15 },
      { x: -0.18, z: -0.1 },
      { x:  0.18, z: -0.1 },
    ];
    for (const lp of legPositions) {
      const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.18, 5);
      const leg = new THREE.Mesh(legGeo, toon(bodyColor));
      leg.position.set(lp.x, 0.08, lp.z);
      this.graphicGroup.add(leg);
      this.legs.push(leg);
    }

    // Tail: long thin cylinder, slightly pink
    const tailGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.55, 5);
    this.tailMesh = new THREE.Mesh(tailGeo, toon(C.RAT_TAIL));
    // Rotate so it extends backward from body
    this.tailMesh.rotation.x = Math.PI / 2 + 0.3;
    this.tailMesh.position.set(0, 0.22, -0.4);
    this.graphicGroup.add(this.tailMesh);

    this.mesh.scale.setScalar(scale);

    // Boss crown
    if (isBoss) {
      // Crown base
      const crownGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.12, 6);
      const crown = new THREE.Mesh(crownGeo, toon(0xffdd00));
      crown.position.set(0, 0.3, -0.05);
      this.headGroup.add(crown);

      // Crown spikes
      for (let i = 0; i < 6; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
        const spike = new THREE.Mesh(spikeGeo, toon(0xffdd00));
        const angle = (i / 6) * Math.PI * 2;
        spike.position.set(
          Math.cos(angle) * 0.14,
          0.41,
          Math.sin(angle) * 0.14 - 0.05
        );
        this.headGroup.add(spike);
      }
    }
  }

  updateAI(dt: number, playerPos: THREE.Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    // Erratic zigzag: add random lateral velocity every 0.5s while chasing
    if (this.state === EnemyState.CHASE) {
      this.zigzagTimer -= dt;
      if (this.zigzagTimer <= 0) {
        this.zigzagTimer = this.zigzagInterval;
        const vel = this.body.linvel();
        // Compute a lateral vector perpendicular to current velocity (XZ plane)
        const lateralX = -vel.z;
        const lateralZ = vel.x;
        const lateralLen = Math.sqrt(lateralX * lateralX + lateralZ * lateralZ);
        if (lateralLen > 0.01) {
          const nx = lateralX / lateralLen;
          const nz = lateralZ / lateralLen;
          // Kick sideways with random sign and magnitude
          const kick = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 3);
          this.body.setLinvel({
            x: vel.x + nx * kick,
            y: vel.y,
            z: vel.z + nz * kick,
          }, true);
        }
      }
    } else {
      // Reset timer so first zigzag fires quickly on entering chase
      this.zigzagTimer = 0;
    }

    // Animation
    const vel = this.body.linvel();
    const speedSq = vel.x * vel.x + vel.z * vel.z;
    const isMoving = speedSq > 0.1;

    if (isMoving) {
      // Fast scurry cycle — speed proportional to actual velocity
      this.walkCycle += dt * 18 * Math.sqrt(speedSq) * 0.25;
      const sin = Math.sin(this.walkCycle);
      const cos = Math.cos(this.walkCycle);

      // Legs scurry in pairs
      this.legs[0].rotation.x =  sin * 0.7;
      this.legs[1].rotation.x = -sin * 0.7;
      this.legs[2].rotation.x = -sin * 0.7;
      this.legs[3].rotation.x =  sin * 0.7;

      // Body low, fast bob
      this.bodyMesh.position.y = 0.3 + Math.abs(cos) * 0.04;

      // Head bobs slightly
      this.headGroup.rotation.x = sin * 0.08;

      // Tail sways side to side
      this.tailMesh.rotation.z = sin * 0.25;
    } else {
      // Idle: reset leg angles, tail rests, subtle breathing
      for (const leg of this.legs) leg.rotation.x *= 0.8;
      this.bodyMesh.position.y += (0.3 - this.bodyMesh.position.y) * 0.1;
      this.headGroup.rotation.x *= 0.8;
      this.tailMesh.rotation.z *= 0.8;

      // Idle nose-twitch
      this.walkCycle += dt * 6;
      const breathe = Math.sin(this.walkCycle) * 0.015;
      this.headGroup.scale.setScalar(1 + breathe);
    }
  }
}
