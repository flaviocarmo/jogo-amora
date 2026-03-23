import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Enemy } from './Enemy';
import { toonMat, basicMat } from '../../utils/materials';
import * as C from '../../utils/colors';

export class Pig extends Enemy {
  private chargeTimer = 0;
  private isCharging = false;
  private bodyMesh!: Mesh;
  private headGroup!: TransformNode;
  private legs: Mesh[] = [];
  private walkCycle = 0;
  private originalMaterial!: StandardMaterial;
  private chargeMaterial!: StandardMaterial;

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = isBoss ? 4 : 3;
    this.detectionRadius = isBoss ? 15 : 10;
    this.isBoss = isBoss;
    this.bossName = isBoss ? 'Porco-Rei' : '';
  }

  protected override buildModel(scene: Scene) {
    const isBoss = this.isBoss;
    const scale = isBoss ? 2.8 : 1;
    const bodyColor = isBoss ? C.BOSS_TINT : C.PIG_BODY;

    this.originalMaterial = toonMat('pig-body-mat', bodyColor, scene);
    this.chargeMaterial = toonMat('pig-charge-mat', 0xff3333, scene);

    // Body (rotund)
    this.bodyMesh = MeshBuilder.CreateSphere('pig-body', { diameter: 1.0, segments: 8 }, scene);
    this.bodyMesh.material = this.originalMaterial;
    this.bodyMesh.scaling.set(1.1, 0.85, 1);
    this.bodyMesh.position.y = 0.5;
    this.bodyMesh.parent = this.mesh;

    // Head Group
    this.headGroup = new TransformNode('pig-head', scene);
    this.headGroup.position.set(0, 0.75, 0.35);
    this.headGroup.parent = this.mesh;

    // Head Mesh
    const head = MeshBuilder.CreateSphere('pig-headcore', { diameter: 0.7, segments: 8 }, scene);
    head.material = this.originalMaterial;
    head.parent = this.headGroup;

    // Snout
    const snout = MeshBuilder.CreateCylinder('pig-snout', {
      diameterTop: 0.3, diameterBottom: 0.3, height: 0.12, tessellation: 8,
    }, scene);
    snout.material = toonMat('pig-snout-mat', C.PIG_SNOUT, scene);
    snout.position.set(0, -0.05, 0.3);
    snout.rotation.x = Math.PI / 2;
    snout.parent = this.headGroup;

    // Nostrils
    for (const side of [-1, 1]) {
      const nostril = MeshBuilder.CreateSphere(`pig-nostril${side}`, { diameter: 0.06, segments: 4 }, scene);
      nostril.material = basicMat(`pig-nostril-mat${side}`, 0x331111, scene);
      nostril.position.set(side * 0.06, -0.05, 0.37);
      nostril.parent = this.headGroup;
    }

    // Eyes
    for (const side of [-1, 1]) {
      const eye = MeshBuilder.CreateSphere(`pig-eye${side}`, { diameter: 0.12, segments: 5 }, scene);
      eye.material = basicMat(`pig-eye-mat${side}`, C.PIG_EYE, scene);
      eye.position.set(side * 0.15, 0.1, 0.2);
      eye.parent = this.headGroup;
    }

    // Ears (floppy)
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateBox(`pig-ear${side}`, {
        width: 0.15, height: 0.12, depth: 0.08,
      }, scene);
      ear.material = this.originalMaterial;
      ear.position.set(side * 0.25, 0.2, -0.1);
      ear.rotation.z = side * 0.5;
      ear.rotation.x = -0.3;
      ear.parent = this.headGroup;
    }

    // Legs (stubby)
    const legPositions = [
      { x: -0.3, z: 0.15 },
      { x: 0.3, z: 0.15 },
      { x: -0.3, z: -0.15 },
      { x: 0.3, z: -0.15 },
    ];
    for (const [i, pos] of legPositions.entries()) {
      const leg = MeshBuilder.CreateCylinder(`pig-leg${i}`, {
        diameterTop: 0.16, diameterBottom: 0.2, height: 0.3, tessellation: 6,
      }, scene);
      leg.material = this.originalMaterial;
      leg.position.set(pos.x, 0.12, pos.z);
      leg.parent = this.mesh;
      this.legs.push(leg);
    }

    // Tail (curly)
    const tail = MeshBuilder.CreateTorus('pig-tail', {
      diameter: 0.16, thickness: 0.05, tessellation: 8,
    }, scene);
    tail.material = toonMat('pig-tail-mat', C.PIG_SNOUT, scene);
    tail.position.set(0, 0.5, -0.45);
    tail.rotation.y = Math.PI;
    tail.parent = this.mesh;

    this.mesh.scaling.setAll(scale);

    // Boss armor plates
    if (isBoss) {
      // Helmet
      const helmet = MeshBuilder.CreateSphere('pig-helmet', { diameter: 0.8, segments: 6 }, scene);
      helmet.material = toonMat('pig-helmet-mat', 0x666666, scene);
      helmet.scaling.y = 0.5;
      helmet.position.set(0, 0.2, 0);
      helmet.parent = this.headGroup;

      // Crown
      const crown = MeshBuilder.CreateCylinder('pig-crown', {
        diameterTop: 0.4, diameterBottom: 0.5, height: 0.15, tessellation: 6,
      }, scene);
      crown.material = toonMat('pig-crown-mat', 0xffdd00, scene);
      crown.position.set(0, 0.4, -0.05);
      crown.parent = this.headGroup;

      // Shoulder pads
      for (const side of [-1, 1]) {
        const pad = MeshBuilder.CreateSphere(`pig-pad${side}`, { diameter: 0.4, segments: 5 }, scene);
        pad.material = toonMat(`pig-pad-mat${side}`, 0x555555, scene);
        pad.position.set(side * 0.55, 0.7, 0.1);
        pad.scaling.set(1, 0.7, 1);
        pad.parent = this.mesh;
      }
    }
  }

  updateAI(dt: number, playerPos: Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    const vel = this.body.getLinearVelocity();
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
    const pos = this.mesh.position;
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
          this.body.setLinearVelocity(new Vector3(
            (dx / d) * this.speed * 3.5,
            2.5,
            (dz / d) * this.speed * 3.5,
          ));
        }
      }
    }

    if (this.isCharging) {
      this.chargeTimer -= dt;
      // Head down for charge
      this.headGroup.rotation.x = -0.5;

      // Color flash
      if (Math.sin(this.chargeTimer * 20) > 0) {
        this.bodyMesh.material = this.chargeMaterial;
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
