import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsCharacterController, CharacterSupportedState } from '@babylonjs/core/Physics/v2/characterController';
import { Entity } from '../Entity';
import { PhysicsWorld } from '../../core/PhysicsWorld';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
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
  protected _facingAngle = 0;

  // Character controller (replaces PhysicsBody)
  private controller!: PhysicsCharacterController;
  private enemyGravity = new Vector3(0, -18, 0);

  // Stored desired velocity (set in updateAI, consumed in physics callback)
  private _desiredVelocity = new Vector3();
  private _knockbackVelocity: Vector3 | null = null;
  // Direct velocity override for subclass special moves (jumps, pounces, etc.)
  private _directVelocityOverride: Vector3 | null = null;
  // Ground state (set in physicsUpdate, read by subclasses)
  protected _isGrounded = false;

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

    // Create the root TransformNode now that we have a scene
    this.initMesh('enemy', this.scene);

    // Build the visual model now that we have a scene
    this.buildModel(this.scene);

    // Position the mesh at spawn (will be synced from controller)
    this.mesh.position.set(x, y, z);

    // Create character controller (same approach as Player)
    const h = this.isBoss ? 2.0 : 1.0;
    const startPos = new Vector3(x, y, z);
    this.controller = new PhysicsCharacterController(startPos, { capsuleHeight: h, capsuleRadius: radius }, this.scene);
    this.controller.maxCharacterSpeedForSolver = 15;

    // Physics callback — sync position + rotation after each step
    this.scene.onAfterPhysicsObservable.add(() => {
      this.physicsUpdate();
    });
  }

  /** Called after each Havok physics step */
  private physicsUpdate() {
    if (!this.scene || !this.alive) return;
    const dt = (this.scene.deltaTime ?? 16.67) / 1000;
    if (dt <= 0) return;

    const down = new Vector3(0, -1, 0);
    const support = this.controller.checkSupport(dt, down);
    const currentVel = this.controller.getVelocity();
    this._isGrounded = support.supportedState === CharacterSupportedState.SUPPORTED;

    let velocity: Vector3;

    // Direct velocity overrides (knockback or subclass special moves)
    if (this._knockbackVelocity) {
      velocity = this._knockbackVelocity;
      this._knockbackVelocity = null;
    } else if (this._directVelocityOverride) {
      velocity = this._directVelocityOverride;
      this._directVelocityOverride = null;
    } else if (this.state === EnemyState.STUNNED || this.state === EnemyState.DEAD) {
      // When stunned/dead, keep vertical velocity (gravity) but stop horizontal
      if (support.supportedState === CharacterSupportedState.SUPPORTED) {
        velocity = Vector3.Zero();
      } else {
        velocity = new Vector3(0, currentVel.y + this.enemyGravity.y * dt, 0);
      }
    } else {
      // Normal AI movement
      if (support.supportedState === CharacterSupportedState.SUPPORTED) {
        velocity = this._desiredVelocity.clone();
      } else {
        // In air: keep horizontal momentum, add gravity
        velocity = new Vector3(
          this._desiredVelocity.x,
          currentVel.y + this.enemyGravity.y * dt,
          this._desiredVelocity.z,
        );
      }
    }

    this.controller.setVelocity(velocity);
    this.controller.integrate(dt, support, this.enemyGravity);

    // Sync visual mesh from controller
    const pos = this.controller.getPosition();
    this.mesh.position.copyFrom(pos);
    this.mesh.position.y -= (this.isBoss ? 1.0 : 0.5);

    // Apply facing rotation
    if (!this.mesh.rotationQuaternion) {
      this.mesh.rotationQuaternion = Quaternion.Identity();
    }
    Quaternion.RotationYawPitchRollToRef(this._facingAngle, 0, 0, this.mesh.rotationQuaternion);
  }

  /** Override in subclasses to build the visual model. Called from initPhysics when scene is available. */
  protected buildModel(_scene: Scene) {
    // Base class does nothing — subclasses create geometry here
  }

  updateAI(dt: number, playerPos: Vector3) {
    super.update(dt);
    if (!this.alive) {
      this.deathTimer += dt;
      // Shrink and sink on death
      const s = Math.max(0, 1 - this.deathTimer * 2);
      this.mesh.scaling.setAll(s);
      this.mesh.position.y -= dt * 2;
      return;
    }

    if (!this.controller) return;

    const pos = this.controller.getPosition();
    const distToPlayer = distanceXZ(pos.x, pos.z, playerPos.x, playerPos.z);

    if (this.state === EnemyState.STUNNED) {
      this.stunnedTimer -= dt;
      // Visual: squished
      this.mesh.scaling.y = 0.5;
      this._desiredVelocity.set(0, 0, 0);
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
        this.moveToward(this.patrolTarget.x, this.patrolTarget.z, this.speed * 0.4);
        if (distToPlayer < this.detectionRadius) {
          this.state = EnemyState.CHASE;
        }
        break;
      }
      case EnemyState.CHASE: {
        this.moveToward(playerPos.x, playerPos.z, this.speed);
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
      this._facingAngle = angle;
    }
  }

  protected moveToward(tx: number, tz: number, speed: number) {
    const pos = this.controller.getPosition();
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.1) {
      this._desiredVelocity.set(0, 0, 0);
      return;
    }
    const nx = dx / dist;
    const nz = dz / dist;
    this._desiredVelocity.set(nx * speed, 0, nz * speed);

    // Face movement direction during patrol
    if (this.state === EnemyState.PATROL) {
      this._facingAngle = Math.atan2(nx, nz);
    }
  }

  /** Get the controller position (used by combat system) */
  override get position(): Vector3 {
    if (this.controller) {
      return this.controller.getPosition().clone();
    }
    return this.mesh.position.clone();
  }

  /** Check if enemy has active physics */
  get hasController(): boolean {
    return !!this.controller;
  }

  /** Get current velocity from character controller (for subclass special moves) */
  protected getControllerVelocity(): Vector3 {
    if (this.controller) return this.controller.getVelocity();
    return Vector3.Zero();
  }

  /** Set direct velocity override (for subclass jumps, pounces, dashes) */
  protected setDirectVelocity(vel: Vector3) {
    this._directVelocityOverride = vel;
  }

  stun(duration = 1.0) {
    this.state = EnemyState.STUNNED;
    this.stunnedTimer = duration;
  }

  /** Apply knockback velocity (used by bark attack) */
  applyKnockback(velocity: Vector3) {
    if (this.controller) {
      this._knockbackVelocity = velocity;
    }
  }

  onTakeDamage() {
    if (this.alive) {
      this.invincibleTimer = 0.5;
    }
  }
}
