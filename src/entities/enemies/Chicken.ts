import * as THREE from 'three';
import { Enemy, EnemyState } from './Enemy';
import * as C from '../../utils/colors';

export class Chicken extends Enemy {
  // Flutter jump state
  private flutterTimer = 0;
  private isFluttering = false;
  private flutterAirborne = false;
  private flutterAirborneTimer = 0;

  // Peck state
  private peckTimer = 0;
  private isPecking = false;
  private peckPhase = 0; // 0=windup, 1=strike, 2=recover

  // Wing flap (airborne)
  private wingFlapTimer = 0;
  private isWingFlapping = false;
  private wingFlapDuration = 0;

  // Walk cycle
  private walkCycle = 0;

  // Mesh parts
  private graphicGroup!: THREE.Group;
  private bodyMesh!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private beakMesh!: THREE.Mesh;
  private wingLeft!: THREE.Mesh;
  private wingRight!: THREE.Mesh;
  private legLeft!: THREE.Group;
  private legRight!: THREE.Group;
  private combParts: THREE.Mesh[] = [];
  private tailFeathers: THREE.Mesh[] = [];

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = 5;
    this.detectionRadius = isBoss ? 18 : 12;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Galinha Furiosa' : '';
    this.buildModel(isBoss);
  }

  private buildModel(isBoss: boolean) {
    const scale = isBoss ? 2.5 : 1;
    const toon = (color: number) => new THREE.MeshToonMaterial({ color });

    // Boss uses golden feathers
    const bodyColor = isBoss ? 0xf0c040 : C.CHICKEN_BODY;
    const combColor = isBoss ? 0xff2200 : C.CHICKEN_COMB;
    const wattleColor = isBoss ? 0xff2200 : C.CHICKEN_COMB;

    this.graphicGroup = new THREE.Group();
    this.mesh.add(this.graphicGroup);

    // --- Body: round sphere ---
    const bodyGeo = new THREE.SphereGeometry(0.4, 8, 7);
    this.bodyMesh = new THREE.Mesh(bodyGeo, toon(bodyColor));
    this.bodyMesh.scale.set(0.85, 0.95, 0.9);
    this.bodyMesh.position.y = 0.45;
    this.graphicGroup.add(this.bodyMesh);

    // --- Head group ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.88, 0.2);
    this.graphicGroup.add(this.headGroup);

    // Head sphere
    const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, toon(bodyColor));
    this.headGroup.add(headMesh);

    // --- Comb (red crest on top of head) ---
    // Three stacked blobs to form a comb
    const combOffsets = isBoss
      ? [{ x: 0, y: 0.24, z: -0.06, r: 0.08 }, { x: 0.06, y: 0.28, z: -0.02, r: 0.065 }, { x: -0.06, y: 0.26, z: -0.04, r: 0.055 }]
      : [{ x: 0, y: 0.22, z: -0.06, r: 0.065 }, { x: 0.055, y: 0.24, z: -0.02, r: 0.052 }, { x: -0.055, y: 0.22, z: -0.04, r: 0.045 }];

    for (const o of combOffsets) {
      const combGeo = new THREE.SphereGeometry(o.r, 5, 5);
      const comb = new THREE.Mesh(combGeo, toon(combColor));
      comb.position.set(o.x, o.y, o.z);
      this.headGroup.add(comb);
      this.combParts.push(comb);
    }

    // --- Beak: small yellow cone pointing forward ---
    const beakGeo = new THREE.ConeGeometry(0.055, 0.14, 5);
    this.beakMesh = new THREE.Mesh(beakGeo, toon(C.CHICKEN_BEAK));
    this.beakMesh.rotation.x = -Math.PI / 2; // point forward (Z+)
    this.beakMesh.position.set(0, 0.02, 0.22);
    this.headGroup.add(this.beakMesh);

    // --- Eyes: angry black dot + orange ring ---
    for (const side of [-1, 1]) {
      // Orange iris ring
      const irisGeo = new THREE.SphereGeometry(0.055, 5, 5);
      const iris = new THREE.Mesh(irisGeo, new THREE.MeshBasicMaterial({ color: 0xff8800 }));
      iris.position.set(side * 0.14, 0.06, 0.17);
      this.headGroup.add(iris);

      // Black pupil on top
      const pupilGeo = new THREE.SphereGeometry(0.032, 4, 4);
      const pupil = new THREE.Mesh(pupilGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
      pupil.position.set(side * 0.14, 0.07, 0.195);
      this.headGroup.add(pupil);

      // Angry brow: thin flat box tilted inward
      const browGeo = new THREE.BoxGeometry(0.09, 0.018, 0.025);
      const brow = new THREE.Mesh(browGeo, new THREE.MeshBasicMaterial({ color: 0x220000 }));
      brow.position.set(side * 0.14, 0.115, 0.175);
      brow.rotation.z = side * -0.45; // tilt inward for angry look
      this.headGroup.add(brow);
    }

    // --- Wattle: small red sphere under beak ---
    const wattleGeo = new THREE.SphereGeometry(0.045, 5, 5);
    const wattle = new THREE.Mesh(wattleGeo, toon(wattleColor));
    wattle.position.set(0, -0.1, 0.18);
    wattle.scale.set(1, 1.3, 1);
    this.headGroup.add(wattle);

    // --- Wings: flat box geometry on each side ---
    const wingGeo = new THREE.BoxGeometry(0.35, 0.08, 0.28);
    this.wingLeft = new THREE.Mesh(wingGeo, toon(bodyColor));
    this.wingLeft.position.set(-0.4, 0.5, 0);
    this.wingLeft.rotation.z = 0.25; // slight droop
    this.graphicGroup.add(this.wingLeft);

    this.wingRight = new THREE.Mesh(wingGeo, toon(bodyColor));
    this.wingRight.position.set(0.4, 0.5, 0);
    this.wingRight.rotation.z = -0.25;
    this.graphicGroup.add(this.wingRight);

    // --- Tail feathers: 3 small cones pointing backward and up ---
    const tailAngles = [-0.25, 0, 0.25];
    for (const angle of tailAngles) {
      const tailGeo = new THREE.ConeGeometry(0.055, 0.22, 5);
      const tail = new THREE.Mesh(tailGeo, toon(bodyColor));
      // Position at back of body, tilted upward and out
      tail.position.set(angle * 0.5, 0.52, -0.38);
      tail.rotation.x = -Math.PI * 0.55; // point backward+up
      tail.rotation.z = angle * 0.8;
      this.graphicGroup.add(tail);
      this.tailFeathers.push(tail);
    }

    // --- Legs: yellow sticks with 3-toe feet ---
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.13, 0.15, 0.05);
      this.graphicGroup.add(legGroup);

      // Upper leg
      const upperLegGeo = new THREE.CylinderGeometry(0.035, 0.028, 0.22, 5);
      const upperLeg = new THREE.Mesh(upperLegGeo, toon(C.CHICKEN_LEG));
      upperLeg.position.y = -0.06;
      legGroup.add(upperLeg);

      // Lower leg
      const lowerLegGroup = new THREE.Group();
      lowerLegGroup.position.y = -0.18;
      legGroup.add(lowerLegGroup);

      const lowerLegGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.18, 5);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, toon(C.CHICKEN_LEG));
      lowerLeg.position.y = -0.06;
      lowerLegGroup.add(lowerLeg);

      // 3-toe feet
      const toeAngles = [-0.4, 0, 0.4];
      for (const toeAngle of toeAngles) {
        const toeGeo = new THREE.CylinderGeometry(0.018, 0.012, 0.14, 4);
        const toe = new THREE.Mesh(toeGeo, toon(C.CHICKEN_LEG));
        toe.position.set(Math.sin(toeAngle) * 0.07, -0.17, Math.cos(toeAngle) * 0.07 + 0.04);
        toe.rotation.x = toeAngle * 0.5 + Math.PI * 0.5;
        lowerLegGroup.add(toe);
      }

      if (side === -1) this.legLeft = legGroup;
      else this.legRight = legGroup;
    }

    this.mesh.scale.setScalar(scale);

    // Boss extras: bigger comb + golden glow on wings
    if (isBoss) {
      // Extra comb spike on top
      const bigCombGeo = new THREE.ConeGeometry(0.07, 0.18, 5);
      const bigComb = new THREE.Mesh(bigCombGeo, toon(combColor));
      bigComb.position.set(0, 0.36, -0.04);
      this.headGroup.add(bigComb);
      this.combParts.push(bigComb);

      // Golden wing tips
      const wingTipGeo = new THREE.BoxGeometry(0.12, 0.06, 0.15);
      const wingTipMat = toon(0xffdd00);
      const wTipL = new THREE.Mesh(wingTipGeo, wingTipMat);
      wTipL.position.set(-0.18, -0.025, 0.06);
      this.wingLeft.add(wTipL);

      const wTipR = new THREE.Mesh(wingTipGeo, wingTipMat);
      wTipR.position.set(0.18, -0.025, 0.06);
      this.wingRight.add(wTipR);
    }
  }

  updateAI(dt: number, playerPos: THREE.Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    const vel = this.body.linvel();
    const pos = this.body.translation();
    const speedSq = vel.x * vel.x + vel.z * vel.z;
    const isMoving = speedSq > 0.1;
    const isGrounded = vel.y >= -0.15 && vel.y <= 0.15 && pos.y < 1.2;

    const distToPlayer = Math.sqrt(
      (pos.x - playerPos.x) ** 2 + (pos.z - playerPos.z) ** 2
    );

    // --- Flutter jumps when chasing (short hops with slight horizontal boost) ---
    if (this.state === EnemyState.CHASE) {
      this.flutterTimer -= dt;
      if (this.flutterTimer <= 0 && isGrounded && !this.isPecking) {
        this.isFluttering = true;
        this.flutterAirborne = true;
        this.flutterAirborneTimer = 0.35;
        // Short hop with horizontal boost toward player
        const dx = playerPos.x - pos.x;
        const dz = playerPos.z - pos.z;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        this.body.setLinvel({
          x: vel.x + (dx / d) * 3.5,
          y: 4.5,
          z: vel.z + (dz / d) * 3.5,
        }, true);
        this.flutterTimer = 1.2 + Math.random() * 1.4;
      }
    }

    if (this.flutterAirborne) {
      this.flutterAirborneTimer -= dt;
      if (this.flutterAirborneTimer <= 0 && isGrounded) {
        this.flutterAirborne = false;
        this.isFluttering = false;
      }
    }

    // --- Peck attack when very close ---
    if (this.state === EnemyState.CHASE && distToPlayer < 1.8 && !this.isPecking && !this.isFluttering) {
      this.peckTimer -= dt;
      if (this.peckTimer <= 0) {
        this.isPecking = true;
        this.peckPhase = 0;
        this.peckTimer = 1.5 + Math.random() * 1.0;
      }
    }

    // --- Peck animation phases ---
    if (this.isPecking) {
      this.peckPhase += dt * 5;
      if (this.peckPhase < 1) {
        // Windup: head tilts back
        this.headGroup.rotation.x = -this.peckPhase * 0.6;
      } else if (this.peckPhase < 2) {
        // Strike: head lunges forward
        const t = this.peckPhase - 1;
        this.headGroup.rotation.x = -0.6 + t * 1.2;
        this.headGroup.position.z = 0.2 + t * 0.15;
      } else {
        // Recover
        this.headGroup.rotation.x *= 0.85;
        this.headGroup.position.z += (0.2 - this.headGroup.position.z) * 0.2;
        if (this.peckPhase > 3) {
          this.isPecking = false;
          this.peckPhase = 0;
          this.headGroup.rotation.x = 0;
          this.headGroup.position.z = 0.2;
        }
      }
    }

    // --- Occasional wing flap to go briefly airborne ---
    if (!this.isFluttering && !this.isPecking && isGrounded && this.state === EnemyState.CHASE) {
      this.wingFlapTimer -= dt;
      if (this.wingFlapTimer <= 0) {
        this.isWingFlapping = true;
        this.wingFlapDuration = 0.6 + Math.random() * 0.4;
        this.wingFlapTimer = 4 + Math.random() * 3;
        // Small vertical burst from wing flap
        this.body.setLinvel({ x: vel.x, y: 3.5, z: vel.z }, true);
      }
    }

    if (this.isWingFlapping) {
      this.wingFlapDuration -= dt;
      if (this.wingFlapDuration <= 0 && isGrounded) {
        this.isWingFlapping = false;
      }
    }

    // --- Wing animation ---
    const inAir = this.isFluttering || this.isWingFlapping || !isGrounded;
    if (inAir) {
      // Rapid wing flap in air
      const flapFreq = this.isWingFlapping ? 18 : 12;
      const flapAmp = 0.7;
      const flapAngle = Math.sin(performance.now() * 0.001 * flapFreq) * flapAmp;
      this.wingLeft.rotation.z = 0.25 + flapAngle;
      this.wingRight.rotation.z = -0.25 - flapAngle;
      // Slight body stretch upward while airborne
      const stretch = Math.min(1.3, Math.max(0.8, 1 + vel.y * 0.04));
      this.graphicGroup.scale.set(1 / stretch, stretch, 1 / stretch);
    } else {
      // Wings fold back when grounded
      this.wingLeft.rotation.z += (0.25 - this.wingLeft.rotation.z) * 8 * dt;
      this.wingRight.rotation.z += (-0.25 - this.wingRight.rotation.z) * 8 * dt;
      // Lerp graphic scale back to normal
      this.graphicGroup.scale.x += (1.0 - this.graphicGroup.scale.x) * 10 * dt;
      this.graphicGroup.scale.y += (1.0 - this.graphicGroup.scale.y) * 10 * dt;
      this.graphicGroup.scale.z += (1.0 - this.graphicGroup.scale.z) * 10 * dt;
    }

    // --- Walk / idle animation ---
    if (isMoving && !inAir) {
      this.walkCycle += dt * 14;
      const sin = Math.sin(this.walkCycle);
      const cos = Math.cos(this.walkCycle);

      // Body bob
      this.bodyMesh.position.y = 0.45 + Math.abs(cos) * 0.06;

      // Head bob (chicken head-bob characteristic movement)
      if (!this.isPecking) {
        this.headGroup.position.z = 0.2 + Math.sin(this.walkCycle * 0.5) * 0.07;
      }

      // Leg stride
      this.legLeft.rotation.x = sin * 0.6;
      this.legRight.rotation.x = -sin * 0.6;

      // Tail feather slight sway
      for (const tail of this.tailFeathers) {
        tail.rotation.x = -Math.PI * 0.55 + Math.sin(this.walkCycle + 1) * 0.08;
      }
    } else if (!inAir) {
      // Idle breathing
      this.walkCycle += dt * 3;
      const breathe = Math.sin(this.walkCycle) * 0.015;
      this.bodyMesh.scale.y = 0.95 + breathe;

      // Idle head bob
      if (!this.isPecking) {
        this.headGroup.position.y = 0.88 + breathe * 1.5;
      }

      // Return legs to rest
      this.legLeft.rotation.x *= 0.85;
      this.legRight.rotation.x *= 0.85;
    }

    // --- Comb jiggle when moving or jumping ---
    if (isMoving || inAir) {
      const t = performance.now() * 0.006;
      this.combParts.forEach((comb, i) => {
        comb.rotation.z = Math.sin(t + i * 1.2) * 0.12;
      });
    }
  }
}
