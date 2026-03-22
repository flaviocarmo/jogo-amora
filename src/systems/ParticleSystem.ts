import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  emit(position: THREE.Vector3, color: number, count: number, speed = 5) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + 2,
        (Math.random() - 0.5) * speed
      );

      const life = 0.5 + Math.random() * 0.5;
      this.particles.push({ mesh, velocity, life, maxLife: life });
      this.group.add(mesh);
    }
  }

  emitStars(position: THREE.Vector3, count = 5) {
    this.emit(position, 0xffdd00, count, 4);
  }

  emitDamage(position: THREE.Vector3) {
    this.emit(position, 0xff4444, 8, 3);
  }

  emitHeal(position: THREE.Vector3) {
    this.emit(position, 0x44ff44, 6, 3);
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 10 * dt; // Gravity
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.y += dt * 3;

      const alpha = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      p.mesh.scale.setScalar(alpha);
    }
  }

  clear() {
    for (const p of this.particles) {
      this.group.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
