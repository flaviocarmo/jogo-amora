import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeCapsule } from '@babylonjs/core/Physics/v2/physicsShape';
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

  protected scene: Scene | null = null;

  private patrolTarget = new Vector3();
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
    this.scene = physics.scene;

    // Build the visual model now that we have a scene
    this.buildModel(this.scene);

    // Position the mesh at spawn
    this.mesh.position.set(x, y, z);

    // Create capsule physics shape
    const shape = new PhysicsShapeCapsule(
      new Vector3(0, 0.3, 0),   // pointA
      new Vector3(0, -0.3, 0),  // pointB
      radius,                    // radius
      this.scene
    );

    this.body = new PhysicsBody(this.mesh, PhysicsMotionType.DYNAMIC, false, this.scene);
    this.body.shape = shape;
    this.body.setMassProperties({ mass: 1 });
    this.body.setLinearDamping(3);
    // Lock rotations by setting angular damping very high
    this.body.setAngularDamping(1000);
  }

  /** Override in subclasses to build the visual model. Called from initPhysics when scene is available. */
  protected buildModel(_scene: Scene) {
    // Base class does nothing — subclasses create geometry here
  }

  updateAI(dt: number, playerPos: Vector3) {
    super.update(dt);
    if (!this.body || !this.alive) {
      if (!this.alive) {
        this.deathTimer += dt;
        // Shrink and sink on death
        const s = Math.max(0, 1 - this.deathTimer * 2);
        this.mesh.scaling.setAll(s);
        this.mesh.position.y -= dt * 2;
      }
      return;
    }

    const pos = this.mesh.position;
    const distToPlayer = distanceXZ(pos.x, pos.z, playerPos.x, playerPos.z);

    if (this.state === EnemyState.STUNNED) {
      this.stunnedTimer -= dt;
      // Visual: squished
      this.mesh.scaling.y = 0.5;
      if (this.stunnedTimer <= 0) {
        this.state = EnemyState.CHASE;
        this.mesh.scaling.y = 1;
      }
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
  }

  protected moveToward(tx: number, tz: number, speed: number, _dt: number) {
    if (!this.body) return;
    const pos = this.mesh.position;
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.1) return;

    const nx = dx / dist;
    const nz = dz / dist;
    const vel = this.body.getLinearVelocity();
    this.body.setLinearVelocity(new Vector3(nx * speed, vel.y, nz * speed));
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
