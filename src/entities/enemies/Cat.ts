import * as THREE from 'three';
import { Enemy, EnemyState } from './Enemy';
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
  private pounceChargeTimer = 0; // brief windup before leaping

  // Visual parts
  private graphicGroup!: THREE.Group;
  private bodyMesh!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private tailGroup!: THREE.Group;
  private tailSegments: THREE.Mesh[] = [];
  private legs: THREE.Group[] = [];
  private eyeMeshes: THREE.Mesh[] = [];
  private walkCycle = 0;
  private tailCycle = 0;

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = 7;
    this.detectionRadius = isBoss ? 20 : 14;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Gato Sombrio' : '';
    this.pounceTimer = 2 + Math.random() * 2;
    this.buildModel(isBoss);
  }

  private buildModel(isBoss: boolean) {
    const scale = isBoss ? 2.5 : 1;
    const toon = (color: number) => new THREE.MeshToonMaterial({ color });
    // Boss is dark purple-tinted body, normal cat uses CAT_BODY
    const bodyColor = isBoss ? 0x330055 : C.CAT_BODY;
    const eyeColor = isBoss ? 0x88ffaa : C.CAT_EYE;

    this.graphicGroup = new THREE.Group();
    this.mesh.add(this.graphicGroup);

    // --- Body: sleek elongated sphere ---
    const bodyGeo = new THREE.SphereGeometry(0.45, 10, 8);
    this.bodyMesh = new THREE.Mesh(bodyGeo, toon(bodyColor));
    this.bodyMesh.scale.set(0.75, 0.85, 1.1); // elongated
    this.bodyMesh.position.y = 0.42;
    this.graphicGroup.add(this.bodyMesh);

    // --- Head Group ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.78, 0.32);
    this.graphicGroup.add(this.headGroup);

    // Head core
    const headGeo = new THREE.SphereGeometry(0.25, 8, 7);
    const headMesh = new THREE.Mesh(headGeo, toon(bodyColor));
    this.headGroup.add(headMesh);

    // Pointed triangular ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
      const ear = new THREE.Mesh(earGeo, toon(bodyColor));
      ear.position.set(side * 0.14, 0.22, -0.05);
      ear.rotation.z = side * -0.25;
      this.headGroup.add(ear);

      // Inner ear (slightly smaller, darker pink)
      const innerEarGeo = new THREE.ConeGeometry(0.045, 0.14, 4);
      const innerEar = new THREE.Mesh(innerEarGeo, toon(isBoss ? 0x220033 : 0xffaacc));
      innerEar.position.set(side * 0.14, 0.22, -0.04);
      innerEar.rotation.z = side * -0.25;
      this.headGroup.add(innerEar);
    }

    // Eyes — green glowing with slit pupils
    for (const side of [-1, 1]) {
      // Iris (glowing green)
      const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const eyeMesh = new THREE.Mesh(
        eyeGeo,
        new THREE.MeshBasicMaterial({ color: eyeColor })
      );
      eyeMesh.position.set(side * 0.1, 0.06, 0.2);
      this.headGroup.add(eyeMesh);
      this.eyeMeshes.push(eyeMesh);

      // Slit pupil (flat dark ellipse on top of iris)
      const pupilGeo = new THREE.SphereGeometry(0.025, 5, 5);
      const pupil = new THREE.Mesh(
        pupilGeo,
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      pupil.scale.set(0.35, 1, 0.35); // vertical slit
      pupil.position.set(side * 0.1, 0.06, 0.255);
      this.headGroup.add(pupil);
    }

    // Snout (small sphere offset forward)
    const snoutGeo = new THREE.SphereGeometry(0.07, 6, 5);
    const snout = new THREE.Mesh(snoutGeo, toon(bodyColor));
    snout.scale.set(1.1, 0.6, 0.9);
    snout.position.set(0, -0.02, 0.22);
    this.headGroup.add(snout);

    // Nose (tiny dark triangle/sphere)
    const noseGeo = new THREE.SphereGeometry(0.025, 4, 4);
    const nose = new THREE.Mesh(
      noseGeo,
      new THREE.MeshBasicMaterial({ color: isBoss ? 0x220022 : 0x221122 })
    );
    nose.scale.set(1.2, 0.7, 1);
    nose.position.set(0, -0.015, 0.27);
    this.headGroup.add(nose);

    // Whiskers (thin LineSegments from snout sides)
    this.buildWhiskers(isBoss);

    // --- Legs: 4 slim ---
    const legPositions = [
      { x: -0.18, z: 0.2, front: true },
      { x: 0.18, z: 0.2, front: true },
      { x: -0.18, z: -0.2, front: false },
      { x: 0.18, z: -0.2, front: false },
    ];
    for (const lp of legPositions) {
      const legGroup = new THREE.Group();
      legGroup.position.set(lp.x, 0.28, lp.z);
      this.graphicGroup.add(legGroup);

      // Upper leg
      const upperGeo = new THREE.CapsuleGeometry(0.05, 0.18, 3, 5);
      const upper = new THREE.Mesh(upperGeo, toon(bodyColor));
      upper.position.set(0, -0.09, 0);
      legGroup.add(upper);

      // Lower leg / paw
      const lowerGeo = new THREE.CapsuleGeometry(0.04, 0.14, 3, 5);
      const lower = new THREE.Mesh(lowerGeo, toon(bodyColor));
      lower.position.set(0, -0.26, 0.04);
      lower.rotation.x = 0.3;
      legGroup.add(lower);

      // Paw pad (tiny sphere)
      const pawGeo = new THREE.SphereGeometry(0.055, 5, 4);
      const paw = new THREE.Mesh(pawGeo, toon(isBoss ? 0x220033 : 0x333333));
      paw.scale.set(1.1, 0.5, 1.3);
      paw.position.set(0, -0.33, 0.07);
      legGroup.add(paw);

      this.legs.push(legGroup);
    }

    // --- Tail: long curved tube made of capsule segments ---
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 0.45, -0.48);
    this.graphicGroup.add(this.tailGroup);
    this.buildTail(toon, bodyColor);

    this.mesh.scale.setScalar(scale);

    // Boss extras: spiked collar + brighter tint on body
    if (isBoss) {
      this.buildBossCollar(toon);
    }
  }

  private buildWhiskers(isBoss: boolean) {
    const whiskColor = isBoss ? 0xaaaaff : 0xffffff;
    const mat = new THREE.LineBasicMaterial({ color: whiskColor });

    // 3 whiskers per side
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const points = [
          new THREE.Vector3(side * 0.07, -0.02 + i * 0.02, 0.27),
          new THREE.Vector3(side * 0.35, -0.03 + i * 0.025, 0.24),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, mat);
        this.headGroup.add(line);
      }
    }
  }

  private buildTail(
    toon: (color: number) => THREE.MeshToonMaterial,
    bodyColor: number
  ) {
    const segCount = 6;
    for (let i = 0; i < segCount; i++) {
      const t = i / (segCount - 1); // 0..1
      const radius = 0.065 * (1 - t * 0.55); // tapers toward tip
      const segGeo = new THREE.CapsuleGeometry(radius, 0.14, 3, 5);
      const seg = new THREE.Mesh(segGeo, toon(bodyColor));

      // Arc the tail upward: each segment rotates back and up
      seg.position.set(0, t * 0.45, -t * 0.2);
      seg.rotation.x = -0.4 - t * 0.6; // curves upward
      this.tailGroup.add(seg);
      this.tailSegments.push(seg);
    }

    // Tail tip (slightly darker)
    const tipGeo = new THREE.SphereGeometry(0.04, 5, 4);
    const tip = new THREE.Mesh(tipGeo, toon(0x222222));
    tip.position.set(0, 0.55, -0.22);
    this.tailGroup.add(tip);
  }

  private buildBossCollar(toon: (color: number) => THREE.MeshToonMaterial) {
    // Collar ring around base of neck
    const collarGeo = new THREE.TorusGeometry(0.22, 0.04, 6, 14);
    const collar = new THREE.Mesh(collarGeo, toon(0x220033));
    collar.position.set(0, 0.65, 0.15);
    collar.rotation.x = Math.PI * 0.35;
    this.graphicGroup.add(collar);

    // Spikes on collar
    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const spikeGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
      const spike = new THREE.Mesh(spikeGeo, toon(0x550066));
      // Position around the collar torus
      spike.position.set(
        Math.cos(angle) * 0.22,
        0.65 + Math.sin(angle) * 0.04 * 0.5,
        0.15 + Math.sin(angle) * 0.22 * 0.6
      );
      spike.rotation.z = angle;
      this.graphicGroup.add(spike);
    }

    // Glowing gem on collar front
    const gemGeo = new THREE.OctahedronGeometry(0.06, 0);
    const gem = new THREE.Mesh(
      gemGeo,
      new THREE.MeshBasicMaterial({ color: 0xaa00ff })
    );
    gem.position.set(0, 0.63, 0.37);
    this.graphicGroup.add(gem);
  }

  updateAI(dt: number, playerPos: THREE.Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    const pos = this.body.translation();
    const vel = this.body.linvel();
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
      // Pounce stretch: elongate forward
      this.graphicGroup.scale.set(0.75, 0.75, 1.35);
      for (const leg of this.legs) leg.rotation.x = 0.7;
    } else if (this.catPhase === CatPhase.RECOVERING) {
      // Recovery squash
      this.graphicGroup.scale.x += (1 - this.graphicGroup.scale.x) * 12 * dt;
      this.graphicGroup.scale.y += (1 - this.graphicGroup.scale.y) * 12 * dt;
      this.graphicGroup.scale.z += (1 - this.graphicGroup.scale.z) * 12 * dt;
    } else if (isMoving) {
      // Walk/stalk cycle — smooth subtle undulation
      this.walkCycle += dt * 12;
      const sin = Math.sin(this.walkCycle);
      this.bodyMesh.position.y = 0.42 + Math.abs(sin) * 0.06;

      // Alternate front/back leg pairs
      this.legs[0].rotation.x = sin * 0.55;
      this.legs[1].rotation.x = -sin * 0.55;
      this.legs[2].rotation.x = -sin * 0.55;
      this.legs[3].rotation.x = sin * 0.55;

      // Subtle body lean forward while stalking
      this.bodyMesh.rotation.x = this.catPhase === CatPhase.CIRCLING ? 0.1 : 0;

      // Lerp graphicGroup scale back to normal
      this.graphicGroup.scale.x += (1 - this.graphicGroup.scale.x) * 8 * dt;
      this.graphicGroup.scale.y += (1 - this.graphicGroup.scale.y) * 8 * dt;
      this.graphicGroup.scale.z += (1 - this.graphicGroup.scale.z) * 8 * dt;
    } else {
      // Idle: slow breathing + tail sway
      this.walkCycle += dt * 3;
      const breathe = Math.sin(this.walkCycle) * 0.015;
      this.bodyMesh.scale.y = 1 + breathe;
      this.headGroup.position.y = 0.78 + breathe;
      for (const leg of this.legs) leg.rotation.x *= 0.85;

      this.graphicGroup.scale.x += (1 - this.graphicGroup.scale.x) * 6 * dt;
      this.graphicGroup.scale.y += (1 - this.graphicGroup.scale.y) * 6 * dt;
      this.graphicGroup.scale.z += (1 - this.graphicGroup.scale.z) * 6 * dt;
    }

    // Tail animation: sinuous sway, tip waves more than base
    const tailSin = Math.sin(this.tailCycle);
    this.tailGroup.rotation.x = tailSin * 0.18;
    this.tailGroup.rotation.z = Math.sin(this.tailCycle * 0.7) * 0.12;

    // Eye glow pulse during CIRCLING (about to pounce)
    if (this.catPhase === CatPhase.CIRCLING && this.pounceTimer < 1.5) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.01);
      for (const eye of this.eyeMeshes) {
        (eye.material as THREE.MeshBasicMaterial).color.setHex(
          this.isBoss ? 0x88ffaa : C.CAT_EYE
        );
        (eye.material as THREE.MeshBasicMaterial).color.multiplyScalar(
          0.8 + pulse * 0.6
        );
      }
    } else {
      for (const eye of this.eyeMeshes) {
        (eye.material as THREE.MeshBasicMaterial).color.setHex(
          this.isBoss ? 0x88ffaa : C.CAT_EYE
        );
      }
    }
  }

  private updateCatBehavior(
    dt: number,
    playerPos: THREE.Vector3,
    pos: { x: number; y: number; z: number },
    distToPlayer: number,
    dx: number,
    dz: number,
    isGrounded: boolean,
    vel: { x: number; y: number; z: number }
  ) {
    // State machine: CIRCLING -> windup -> POUNCING -> RECOVERING -> CIRCLING
    switch (this.catPhase) {
      case CatPhase.CIRCLING: {
        // Orbit the player at medium distance (5-8 units), creeping inward
        const orbitDist = 6;
        this.circleAngle += dt * 1.8; // angular speed around player

        const targetX = playerPos.x + Math.cos(this.circleAngle) * orbitDist;
        const targetZ = playerPos.z + Math.sin(this.circleAngle) * orbitDist;

        // Move toward orbit point at stalking speed
        const ox = targetX - pos.x;
        const oz = targetZ - pos.z;
        const od = Math.sqrt(ox * ox + oz * oz);
        const circleSpeed = this.speed * 0.65;
        if (od > 0.2) {
          this.body!.setLinvel(
            { x: (ox / od) * circleSpeed, y: vel.y, z: (oz / od) * circleSpeed },
            true
          );
        }

        // Count down to pounce
        this.pounceTimer -= dt;
        if (this.pounceTimer <= 0 && distToPlayer < 9 && isGrounded) {
          // Enter windup
          this.pounceChargeTimer = 0.3;
          this.catPhase = CatPhase.POUNCING;
        }
        break;
      }

      case CatPhase.POUNCING: {
        if (this.pounceChargeTimer > 0) {
          // Brief crouch / windup — nearly stop
          this.pounceChargeTimer -= dt;
          this.body!.setLinvel({ x: vel.x * 0.3, y: vel.y, z: vel.z * 0.3 }, true);

          // Visual crouch: squish body down
          this.graphicGroup.scale.set(1.2, 0.7, 1.2);

          if (this.pounceChargeTimer <= 0) {
            // LEAP toward player with speed burst
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d > 0) {
              const pounceSpeed = this.speed * 3.2;
              this.body!.setLinvel(
                {
                  x: (dx / d) * pounceSpeed,
                  y: 6.5,
                  z: (dz / d) * pounceSpeed,
                },
                true
              );
            }
          }
        } else if (isGrounded) {
          // Landed — enter recovery
          this.catPhase = CatPhase.RECOVERING;
          this.recoverTimer = 0.5 + Math.random() * 0.4;
          // Squash on landing
          this.graphicGroup.scale.set(1.3, 0.55, 1.3);
        }
        break;
      }

      case CatPhase.RECOVERING: {
        // Slow down, stand back up, then re-enter circling
        this.recoverTimer -= dt;
        this.body!.setLinvel(
          { x: vel.x * 0.85, y: vel.y, z: vel.z * 0.85 },
          true
        );
        if (this.recoverTimer <= 0) {
          this.catPhase = CatPhase.CIRCLING;
          this.pounceTimer = 1.8 + Math.random() * 2.2;
          // Offset circle angle so it doesn't re-orbit from same spot
          this.circleAngle += Math.PI * 0.5;
        }
        break;
      }
    }
  }
}
