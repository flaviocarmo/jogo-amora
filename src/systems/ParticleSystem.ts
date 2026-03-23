import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: Scene;
  private particles: Particle[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  emit(position: Vector3, color: number, count: number, speed = 5) {
    for (let i = 0; i < count; i++) {
      const mesh = MeshBuilder.CreateBox('particle', { size: 0.1 }, this.scene);
      const mat = new StandardMaterial('pmat', this.scene);
      mat.emissiveColor = Color3.FromHexString('#' + color.toString(16).padStart(6, '0'));
      mat.disableLighting = true;
      mat.alpha = 1;
      mesh.material = mat;
      mesh.position.copyFrom(position);

      const velocity = new Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + 2,
        (Math.random() - 0.5) * speed,
      );

      const life = 0.5 + Math.random() * 0.5;
      this.particles.push({ mesh, velocity, life, maxLife: life });
    }
  }

  emitStars(position: Vector3, count = 8) {
    this.emit(position, 0xffdd00, count, 4);
  }

  emitDamage(position: Vector3) {
    this.emit(position, 0xff4444, 6, 3);
  }

  emitHeal(position: Vector3) {
    this.emit(position, 0x44ff44, 6, 3);
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        p.mesh.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 10 * dt; // gravity
      p.mesh.position.addInPlace(p.velocity.scale(dt));
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.y += dt * 3;

      const alpha = p.life / p.maxLife;
      p.mesh.scaling.setAll(alpha);
      (p.mesh.material as StandardMaterial).alpha = alpha;
    }
  }

  clear() {
    for (const p of this.particles) {
      p.mesh.dispose();
    }
    this.particles = [];
  }
}
