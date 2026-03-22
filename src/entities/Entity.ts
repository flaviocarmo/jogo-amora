import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export class Entity {
  mesh: THREE.Group;
  body: RAPIER.RigidBody | null = null;
  health: number;
  maxHealth: number;
  alive = true;
  invincibleTimer = 0;

  constructor(maxHealth: number) {
    this.mesh = new THREE.Group();
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }

  get position(): THREE.Vector3 {
    if (this.body) {
      const t = this.body.translation();
      return new THREE.Vector3(t.x, t.y, t.z);
    }
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
    if (this.body) {
      const t = this.body.translation();
      this.mesh.position.set(t.x, t.y - 0.5, t.z);
    }
  }

  update(_dt: number) {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= _dt;
      // Blink effect
      this.mesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }
  }
}
