import * as THREE from 'three';
import { Enemy } from './Enemy';
import * as C from '../../utils/colors';

export class Rabbit extends Enemy {
  private jumpTimer = 0;
  private bodyMesh!: THREE.Mesh;
  private ears: THREE.Mesh[] = [];

  constructor(x: number, z: number, isBoss = false) {
    super(isBoss ? 10 : 2, x, z);
    this.speed = isBoss ? 5 : 6;
    this.detectionRadius = isBoss ? 18 : 12;
    this.isBoss = isBoss;
    this.bossName = 'Coelho Gigante';
    this.buildModel(isBoss);
  }

  private buildModel(isBoss: boolean) {
    const scale = isBoss ? 2.5 : 1;
    const toon = (color: number) => new THREE.MeshToonMaterial({ color });
    const bodyColor = isBoss ? C.BOSS_TINT : C.RABBIT_BODY;

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.4, 8, 6);
    this.bodyMesh = new THREE.Mesh(bodyGeo, toon(bodyColor));
    this.bodyMesh.scale.set(0.8, 1, 0.9);
    this.bodyMesh.position.y = 0.4;
    this.mesh.add(this.bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const head = new THREE.Mesh(headGeo, toon(bodyColor));
    head.position.set(0, 0.85, 0.15);
    this.mesh.add(head);

    // Ears (long!)
    for (const side of [-1, 1]) {
      const earGeo = new THREE.CapsuleGeometry(0.06, 0.5, 4, 6);
      const ear = new THREE.Mesh(earGeo, toon(C.RABBIT_EAR));
      ear.position.set(side * 0.12, 1.35, 0.05);
      ear.rotation.z = side * 0.15;
      this.mesh.add(ear);
      this.ears.push(ear);
    }

    // Eyes (red, evil!)
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.06, 5, 5);
      const eye = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: C.RABBIT_EYE }));
      eye.position.set(side * 0.12, 0.9, 0.38);
      this.mesh.add(eye);
    }

    // Tail (puffball)
    const tailGeo = new THREE.SphereGeometry(0.12, 5, 5);
    const tail = new THREE.Mesh(tailGeo, toon(0xffffff));
    tail.position.set(0, 0.35, -0.35);
    this.mesh.add(tail);

    // Feet
    for (const side of [-1, 1]) {
      const footGeo = new THREE.BoxGeometry(0.12, 0.06, 0.25);
      const foot = new THREE.Mesh(footGeo, toon(bodyColor));
      foot.position.set(side * 0.15, 0.03, 0.1);
      this.mesh.add(foot);
    }

    this.mesh.scale.setScalar(scale);

    // Boss crown
    if (isBoss) {
      const crownGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.15, 5);
      const crown = new THREE.Mesh(crownGeo, toon(0xffdd00));
      crown.position.set(0, 1.55, 0.05);
      this.mesh.add(crown);
      // Crown spikes
      for (let i = 0; i < 5; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
        const spike = new THREE.Mesh(spikeGeo, toon(0xffdd00));
        const angle = (i / 5) * Math.PI * 2;
        spike.position.set(
          Math.cos(angle) * 0.15,
          1.65,
          Math.sin(angle) * 0.15 + 0.05
        );
        this.mesh.add(spike);
      }
    }
  }

  updateAI(dt: number, playerPos: THREE.Vector3) {
    super.updateAI(dt, playerPos);
    if (!this.alive || !this.body) return;

    // Random jumps while chasing
    this.jumpTimer -= dt;
    if (this.jumpTimer <= 0 && this.state === 1) { // CHASE
      const vel = this.body.linvel();
      this.body.setLinvel({ x: vel.x * 1.3, y: 6, z: vel.z * 1.3 }, true);
      this.jumpTimer = 1.5 + Math.random() * 2;
    }

    // Ear flop animation
    const t = performance.now() * 0.005;
    this.ears.forEach((ear, i) => {
      ear.rotation.x = Math.sin(t + i) * 0.1;
    });
  }
}
