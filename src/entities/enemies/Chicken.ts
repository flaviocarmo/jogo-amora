import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Enemy, EnemyState } from './Enemy';
import { toonMat, basicMat } from '../../utils/materials';
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
  private peckPhase = 0;

  // Wing flap (airborne)
  private wingFlapTimer = 0;
  private isWingFlapping = false;
  private wingFlapDuration = 0;

  // Walk cycle
  private walkCycle = 0;

  // Mesh parts
  private graphicGroup!: TransformNode;
  private bodyMesh!: Mesh;
  private headGroup!: TransformNode;
  private beakMesh!: Mesh;
  private wingLeft!: Mesh;
  private wingRight!: Mesh;
  private legLeft!: TransformNode;
  private legRight!: TransformNode;
  private combParts: Mesh[] = [];
  private tailFeathers: Mesh[] = [];

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = 5;
    this.detectionRadius = isBoss ? 18 : 12;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Galinha Furiosa' : '';
  }

  protected override buildModel(scene: Scene) {
    const isBoss = this.isBoss;
    const scale = isBoss ? 2.5 : 1;

    const bodyColor = isBoss ? 0xf0c040 : C.CHICKEN_BODY;
    const combColor = isBoss ? 0xff2200 : C.CHICKEN_COMB;
    const wattleColor = isBoss ? 0xff2200 : C.CHICKEN_COMB;

    this.graphicGroup = new TransformNode('chicken-gfx', scene);
    this.graphicGroup.parent = this.mesh;

    // --- Body: round sphere ---
    this.bodyMesh = MeshBuilder.CreateSphere('chicken-body', { diameter: 0.8, segments: 8 }, scene);
    this.bodyMesh.material = toonMat('chicken-body-mat', bodyColor, scene);
    this.bodyMesh.scaling.set(0.85, 0.95, 0.9);
    this.bodyMesh.position.y = 0.45;
    this.bodyMesh.parent = this.graphicGroup;

    // --- Head group ---
    this.headGroup = new TransformNode('chicken-head', scene);
    this.headGroup.position.set(0, 0.88, 0.2);
    this.headGroup.parent = this.graphicGroup;

    // Head sphere
    const headMesh = MeshBuilder.CreateSphere('chicken-headcore', { diameter: 0.44, segments: 8 }, scene);
    headMesh.material = toonMat('chicken-headcore-mat', bodyColor, scene);
    headMesh.parent = this.headGroup;

    // --- Comb (red crest on top of head) ---
    const combOffsets = isBoss
      ? [{ x: 0, y: 0.24, z: -0.06, r: 0.08 }, { x: 0.06, y: 0.28, z: -0.02, r: 0.065 }, { x: -0.06, y: 0.26, z: -0.04, r: 0.055 }]
      : [{ x: 0, y: 0.22, z: -0.06, r: 0.065 }, { x: 0.055, y: 0.24, z: -0.02, r: 0.052 }, { x: -0.055, y: 0.22, z: -0.04, r: 0.045 }];

    for (const [i, o] of combOffsets.entries()) {
      const comb = MeshBuilder.CreateSphere(`chicken-comb${i}`, { diameter: o.r * 2, segments: 5 }, scene);
      comb.material = toonMat(`chicken-comb-mat${i}`, combColor, scene);
      comb.position.set(o.x, o.y, o.z);
      comb.parent = this.headGroup;
      this.combParts.push(comb);
    }

    // --- Beak: small yellow cone pointing forward ---
    this.beakMesh = MeshBuilder.CreateCylinder('chicken-beak', {
      diameterTop: 0, diameterBottom: 0.11, height: 0.14, tessellation: 5,
    }, scene);
    this.beakMesh.material = toonMat('chicken-beak-mat', C.CHICKEN_BEAK, scene);
    this.beakMesh.rotation.x = -Math.PI / 2;
    this.beakMesh.position.set(0, 0.02, 0.22);
    this.beakMesh.parent = this.headGroup;

    // --- Eyes: angry ---
    for (const side of [-1, 1]) {
      // Orange iris ring
      const iris = MeshBuilder.CreateSphere(`chicken-iris${side}`, { diameter: 0.11, segments: 5 }, scene);
      iris.material = basicMat(`chicken-iris-mat${side}`, 0xff8800, scene);
      iris.position.set(side * 0.14, 0.06, 0.17);
      iris.parent = this.headGroup;

      // Black pupil
      const pupil = MeshBuilder.CreateSphere(`chicken-pupil${side}`, { diameter: 0.064, segments: 4 }, scene);
      pupil.material = basicMat(`chicken-pupil-mat${side}`, 0x000000, scene);
      pupil.position.set(side * 0.14, 0.07, 0.195);
      pupil.parent = this.headGroup;

      // Angry brow
      const brow = MeshBuilder.CreateBox(`chicken-brow${side}`, {
        width: 0.09, height: 0.018, depth: 0.025,
      }, scene);
      brow.material = basicMat(`chicken-brow-mat${side}`, 0x220000, scene);
      brow.position.set(side * 0.14, 0.115, 0.175);
      brow.rotation.z = side * -0.45;
      brow.parent = this.headGroup;
    }

    // --- Wattle ---
    const wattle = MeshBuilder.CreateSphere('chicken-wattle', { diameter: 0.09, segments: 5 }, scene);
    wattle.material = toonMat('chicken-wattle-mat', wattleColor, scene);
    wattle.position.set(0, -0.1, 0.18);
    wattle.scaling.set(1, 1.3, 1);
    wattle.parent = this.headGroup;

    // --- Wings ---
    const wingGeo = { width: 0.35, height: 0.08, depth: 0.28 };
    this.wingLeft = MeshBuilder.CreateBox('chicken-wingL', wingGeo, scene);
    this.wingLeft.material = toonMat('chicken-wingL-mat', bodyColor, scene);
    this.wingLeft.position.set(-0.4, 0.5, 0);
    this.wingLeft.rotation.z = 0.25;
    this.wingLeft.parent = this.graphicGroup;

    this.wingRight = MeshBuilder.CreateBox('chicken-wingR', wingGeo, scene);
    this.wingRight.material = toonMat('chicken-wingR-mat', bodyColor, scene);
    this.wingRight.position.set(0.4, 0.5, 0);
    this.wingRight.rotation.z = -0.25;
    this.wingRight.parent = this.graphicGroup;

    // --- Tail feathers ---
    const tailAngles = [-0.25, 0, 0.25];
    for (const [i, angle] of tailAngles.entries()) {
      const tail = MeshBuilder.CreateCylinder(`chicken-tail${i}`, {
        diameterTop: 0, diameterBottom: 0.11, height: 0.22, tessellation: 5,
      }, scene);
      tail.material = toonMat(`chicken-tail-mat${i}`, bodyColor, scene);
      tail.position.set(angle * 0.5, 0.52, -0.38);
      tail.rotation.x = -Math.PI * 0.55;
      tail.rotation.z = angle * 0.8;
      tail.parent = this.graphicGroup;
      this.tailFeathers.push(tail);
    }

    // --- Legs ---
    for (const side of [-1, 1]) {
      const legGroup = new TransformNode(`chicken-leggroup${side}`, scene);
      legGroup.position.set(side * 0.13, 0.15, 0.05);
      legGroup.parent = this.graphicGroup;

      // Upper leg
      const upperLeg = MeshBuilder.CreateCylinder(`chicken-upperleg${side}`, {
        diameterTop: 0.07, diameterBottom: 0.056, height: 0.22, tessellation: 5,
      }, scene);
      upperLeg.material = toonMat(`chicken-upperleg-mat${side}`, C.CHICKEN_LEG, scene);
      upperLeg.position.y = -0.06;
      upperLeg.parent = legGroup;

      // Lower leg group
      const lowerLegGroup = new TransformNode(`chicken-lowerleg${side}`, scene);
      lowerLegGroup.position.y = -0.18;
      lowerLegGroup.parent = legGroup;

      const lowerLeg = MeshBuilder.CreateCylinder(`chicken-lowercyl${side}`, {
        diameterTop: 0.05, diameterBottom: 0.04, height: 0.18, tessellation: 5,
      }, scene);
      lowerLeg.material = toonMat(`chicken-lowercyl-mat${side}`, C.CHICKEN_LEG, scene);
      lowerLeg.position.y = -0.06;
      lowerLeg.parent = lowerLegGroup;

      // 3-toe feet
      const toeAngles = [-0.4, 0, 0.4];
      for (const [ti, toeAngle] of toeAngles.entries()) {
        const toe = MeshBuilder.CreateCylinder(`chicken-toe${side}_${ti}`, {
          diameterTop: 0.036, diameterBottom: 0.024, height: 0.14, tessellation: 4,
        }, scene);
        toe.material = toonMat(`chicken-toe-mat${side}_${ti}`, C.CHICKEN_LEG, scene);
        toe.position.set(
          Math.sin(toeAngle) * 0.07,
          -0.17,
          Math.cos(toeAngle) * 0.07 + 0.04
        );
        toe.rotation.x = toeAngle * 0.5 + Math.PI * 0.5;
        toe.parent = lowerLegGroup;
      }

      if (side === -1) this.legLeft = legGroup;
      else this.legRight = legGroup;
    }

    this.mesh.scaling.setAll(scale);

    // Boss extras
    if (isBoss) {
      // Extra comb spike
      const bigComb = MeshBuilder.CreateCylinder('chicken-bigcomb', {
        diameterTop: 0, diameterBottom: 0.14, height: 0.18, tessellation: 5,
      }, scene);
      bigComb.material = toonMat('chicken-bigcomb-mat', combColor, scene);
      bigComb.position.set(0, 0.36, -0.04);
      bigComb.parent = this.headGroup;
      this.combParts.push(bigComb);

      // Golden wing tips
      const wingTipGeo = { width: 0.12, height: 0.06, depth: 0.15 };
      const wingTipMat = toonMat('chicken-wingtip-mat', 0xffdd00, scene);
      const wTipL = MeshBuilder.CreateBox('chicken-wingtipL', wingTipGeo, scene);
      wTipL.material = wingTipMat;
      wTipL.position.set(-0.18, -0.025, 0.06);
      wTipL.parent = this.wingLeft;

      const wTipR = MeshBuilder.CreateBox('chicken-wingtipR', wingTipGeo, scene);
      wTipR.material = wingTipMat;
      wTipR.position.set(0.18, -0.025, 0.06);
      wTipR.parent = this.wingRight;
    }
  }

  updateAI(dt: number, playerPos: Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    const vel = this.body.getLinearVelocity();
    const pos = this.mesh.position;
    const speedSq = vel.x * vel.x + vel.z * vel.z;
    const isMoving = speedSq > 0.1;
    const isGrounded = vel.y >= -0.15 && vel.y <= 0.15 && pos.y < 1.2;

    const distToPlayer = Math.sqrt(
      (pos.x - playerPos.x) ** 2 + (pos.z - playerPos.z) ** 2
    );

    // --- Flutter jumps when chasing ---
    if (this.state === EnemyState.CHASE) {
      this.flutterTimer -= dt;
      if (this.flutterTimer <= 0 && isGrounded && !this.isPecking) {
        this.isFluttering = true;
        this.flutterAirborne = true;
        this.flutterAirborneTimer = 0.35;
        const dx = playerPos.x - pos.x;
        const dz = playerPos.z - pos.z;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        this.body.setLinearVelocity(new Vector3(
          vel.x + (dx / d) * 3.5,
          4.5,
          vel.z + (dz / d) * 3.5,
        ));
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
        this.headGroup.rotation.x = -this.peckPhase * 0.6;
      } else if (this.peckPhase < 2) {
        const t = this.peckPhase - 1;
        this.headGroup.rotation.x = -0.6 + t * 1.2;
        this.headGroup.position.z = 0.2 + t * 0.15;
      } else {
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

    // --- Occasional wing flap ---
    if (!this.isFluttering && !this.isPecking && isGrounded && this.state === EnemyState.CHASE) {
      this.wingFlapTimer -= dt;
      if (this.wingFlapTimer <= 0) {
        this.isWingFlapping = true;
        this.wingFlapDuration = 0.6 + Math.random() * 0.4;
        this.wingFlapTimer = 4 + Math.random() * 3;
        this.body.setLinearVelocity(new Vector3(vel.x, 3.5, vel.z));
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
      const flapFreq = this.isWingFlapping ? 18 : 12;
      const flapAmp = 0.7;
      const flapAngle = Math.sin(performance.now() * 0.001 * flapFreq) * flapAmp;
      this.wingLeft.rotation.z = 0.25 + flapAngle;
      this.wingRight.rotation.z = -0.25 - flapAngle;

      const stretch = Math.min(1.3, Math.max(0.8, 1 + vel.y * 0.04));
      this.graphicGroup.scaling.set(1 / stretch, stretch, 1 / stretch);
    } else {
      this.wingLeft.rotation.z += (0.25 - this.wingLeft.rotation.z) * 8 * dt;
      this.wingRight.rotation.z += (-0.25 - this.wingRight.rotation.z) * 8 * dt;

      this.graphicGroup.scaling.x += (1.0 - this.graphicGroup.scaling.x) * 10 * dt;
      this.graphicGroup.scaling.y += (1.0 - this.graphicGroup.scaling.y) * 10 * dt;
      this.graphicGroup.scaling.z += (1.0 - this.graphicGroup.scaling.z) * 10 * dt;
    }

    // --- Walk / idle animation ---
    if (isMoving && !inAir) {
      this.walkCycle += dt * 14;
      const sin = Math.sin(this.walkCycle);
      const cos = Math.cos(this.walkCycle);

      this.bodyMesh.position.y = 0.45 + Math.abs(cos) * 0.06;

      if (!this.isPecking) {
        this.headGroup.position.z = 0.2 + Math.sin(this.walkCycle * 0.5) * 0.07;
      }

      this.legLeft.rotation.x = sin * 0.6;
      this.legRight.rotation.x = -sin * 0.6;

      for (const tail of this.tailFeathers) {
        tail.rotation.x = -Math.PI * 0.55 + Math.sin(this.walkCycle + 1) * 0.08;
      }
    } else if (!inAir) {
      this.walkCycle += dt * 3;
      const breathe = Math.sin(this.walkCycle) * 0.015;
      this.bodyMesh.scaling.y = 0.95 + breathe;

      if (!this.isPecking) {
        this.headGroup.position.y = 0.88 + breathe * 1.5;
      }

      this.legLeft.rotation.x *= 0.85;
      this.legRight.rotation.x *= 0.85;
    }

    // --- Comb jiggle ---
    if (isMoving || inAir) {
      const t = performance.now() * 0.006;
      this.combParts.forEach((comb, i) => {
        comb.rotation.z = Math.sin(t + i * 1.2) * 0.12;
      });
    }
  }
}
