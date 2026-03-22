import * as THREE from 'three';
import * as C from '../../utils/colors';

export class Biscuit {
  mesh: THREE.Group;
  collected = false;
  private spinSpeed = 2;
  private bobSpeed = 3;
  private bobHeight = 0.3;
  private baseY: number;

  constructor(x: number, y: number, z: number) {
    this.mesh = new THREE.Group();
    this.baseY = y + 1;

    // Biscuit shape (flattened cylinder with bumps)
    const biscuitGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12);
    const biscuitMat = new THREE.MeshToonMaterial({ color: C.BISCUIT_COLOR });
    const biscuit = new THREE.Mesh(biscuitGeo, biscuitMat);
    this.mesh.add(biscuit);

    // Chocolate chips
    for (let i = 0; i < 5; i++) {
      const chipGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const chip = new THREE.Mesh(chipGeo, new THREE.MeshToonMaterial({ color: C.BISCUIT_DARK }));
      const angle = (i / 5) * Math.PI * 2 + Math.random();
      chip.position.set(
        Math.cos(angle) * 0.15,
        0.05,
        Math.sin(angle) * 0.15
      );
      this.mesh.add(chip);
    }

    // Glow ring
    const glowGeo = new THREE.RingGeometry(0.35, 0.45, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffdd88,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.1;
    this.mesh.add(glow);

    this.mesh.position.set(x, this.baseY, z);
  }

  update(dt: number) {
    if (this.collected) return;
    const t = performance.now() * 0.001;
    this.mesh.rotation.y += dt * this.spinSpeed;
    this.mesh.position.y = this.baseY + Math.sin(t * this.bobSpeed) * this.bobHeight;
  }

  collect() {
    this.collected = true;
    this.mesh.visible = false;
  }
}
