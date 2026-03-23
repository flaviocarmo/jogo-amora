import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';

export class Entity {
  mesh!: TransformNode;
  body: PhysicsBody | null = null;
  health: number;
  maxHealth: number;
  alive = true;
  invincibleTimer = 0;

  constructor(maxHealth: number) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    // NOTE: mesh is NOT created here — subclasses must create it
    // when a Scene is available (e.g. in initPhysics or init(scene))
  }

  /** Call from subclass when scene is available */
  protected initMesh(name: string, scene: Scene): void {
    this.mesh = new TransformNode(name, scene);
  }

  get position(): Vector3 {
    // In Babylon.js + Havok, the physics body is attached to the TransformNode.
    // The mesh position is automatically synced by Havok.
    return this.mesh.position.clone();
  }

  takeDamage(amount: number): boolean {
    if (this.invincibleTimer > 0 || !this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
    }
    return true;
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  syncMeshToBody() {
    // In Babylon.js + Havok, physics bodies are attached directly to TransformNodes,
    // so the sync is automatic. This method is kept for API compatibility.
    // If a subclass uses a separate physics node, override this method.
    if (this.body) {
      const physNode = this.body.transformNode;
      if (physNode !== this.mesh) {
        this.mesh.position.copyFrom(physNode.position);
      }
    }
  }

  update(_dt: number) {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= _dt;
      // Blink effect — setEnabled hides the node and all children
      this.mesh.setEnabled(Math.floor(this.invincibleTimer * 10) % 2 === 0);
    } else {
      this.mesh.setEnabled(true);
    }
  }
}
