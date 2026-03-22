import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from '../Entity';
import { PhysicsWorld } from '../../core/PhysicsWorld';
import { distanceXZ, angleBetween, randomRange } from '../../utils/math';

export enum EnemyState {
  IDLE,
  PATROL,
  CHASE,
  STUNNED,
  DEAD,
}

export class Enemy extends Entity {
  state = EnemyState.PATROL;
  detectionRadius = 12;
  speed = 4;
  stunnedTimer = 0;
  deathTimer = 0;
  isBoss = false;
  bossName = '';

  private patrolTarget = new THREE.Vector3();
  private patrolTimer = 0;
  private spawnX: number;
  private spawnZ: number;
  private patrolRadius = 8;

  constructor(maxHealth: number, spawnX: number, spawnZ: number) {
    super(maxHealth);
    this.spawnX = spawnX;
    this.spawnZ = spawnZ;
    this.pickNewPatrolTarget();
  }

  private pickNewPatrolTarget() {
    this.patrolTarget.set(
      this.spawnX + randomRange(-this.patrolRadius, this.patrolRadius),
      0,
      this.spawnZ + randomRange(-this.patrolRadius, this.patrolRadius)
    );
    this.patrolTimer = randomRange(2, 5);
  }

  initPhysics(physics: PhysicsWorld, x: number, y: number, z: number, radius = 0.4) {
    const bodyDesc = physics.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(3)
      .lockRotations();
    this.body = physics.createRigidBody(bodyDesc);

    const colliderDesc = physics.RAPIER.ColliderDesc.capsule(0.3, radius)
      .setFriction(0.5);
    physics.createCollider(colliderDesc, this.body);
  }

  updateAI(dt: number, playerPos: THREE.Vector3) {
    super.update(dt);
    if (!this.body || !this.alive) {
      if (!this.alive) {
        this.deathTimer += dt;
        // Shrink and sink on death
        const s = Math.max(0, 1 - this.deathTimer * 2);
        this.mesh.scale.setScalar(s);
        this.mesh.position.y -= dt * 2;
      }
      return;
    }

    const pos = this.body.translation();
    const distToPlayer = distanceXZ(pos.x, pos.z, playerPos.x, playerPos.z);

    if (this.state === EnemyState.STUNNED) {
      this.stunnedTimer -= dt;
      // Visual: squished
      this.mesh.scale.y = 0.5;
      if (this.stunnedTimer <= 0) {
        this.state = EnemyState.CHASE;
        this.mesh.scale.y = 1;
      }
      this.syncMeshToBody();
      return;
    }

    switch (this.state) {
      case EnemyState.PATROL: {
        this.patrolTimer -= dt;
        const dist = distanceXZ(pos.x, pos.z, this.patrolTarget.x, this.patrolTarget.z);
        if (dist < 1 || this.patrolTimer <= 0) {
          this.pickNewPatrolTarget();
        }
        this.moveToward(this.patrolTarget.x, this.patrolTarget.z, this.speed * 0.4, dt);
        if (distToPlayer < this.detectionRadius) {
          this.state = EnemyState.CHASE;
        }
        break;
      }
      case EnemyState.CHASE: {
        this.moveToward(playerPos.x, playerPos.z, this.speed, dt);
        if (distToPlayer > this.detectionRadius * 1.5) {
          this.state = EnemyState.PATROL;
          this.pickNewPatrolTarget();
        }
        break;
      }
    }

    // Face movement direction
    const angle = angleBetween(pos.x, pos.z, playerPos.x, playerPos.z);
    if (this.state === EnemyState.CHASE) {
      this.mesh.rotation.y = angle;
    }

    this.syncMeshToBody();
  }

  private moveToward(tx: number, tz: number, speed: number, _dt: number) {
    if (!this.body) return;
    const pos = this.body.translation();
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.1) return;

    const nx = dx / dist;
    const nz = dz / dist;
    const vel = this.body.linvel();
    this.body.setLinvel({
      x: nx * speed,
      y: vel.y,
      z: nz * speed,
    }, true);
  }

  stun(duration = 1.0) {
    this.state = EnemyState.STUNNED;
    this.stunnedTimer = duration;
  }

  onTakeDamage() {
    if (this.alive) {
      this.invincibleTimer = 0.5;
    }
  }
}
