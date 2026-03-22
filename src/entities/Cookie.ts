import * as THREE from 'three';
import { Enemy } from './enemies/Enemy';
import { distanceXZ } from '../utils/math';

// Cookie is a BLACK Pomeranian Spitz — Amora's older, bigger sister ally.
// She is summoned magically and fights enemies autonomously for 10 seconds,
// then fades out. No physics: she moves via mesh position directly.

const COLOR_BODY       = 0x0a0a0a; // Deep matte black fur
const COLOR_MANE       = 0x1a1a1a; // Slightly lighter black for chest mane highlights
const COLOR_EYE        = 0x010101; // Near-black eyes
const COLOR_EYE_HL     = 0xffffff; // White eye highlight
const COLOR_NOSE       = 0x000000; // Pure black nose
const COLOR_TONGUE     = 0xff8888; // Pink tongue for bark
const COLOR_BARK_WAVE  = 0xffdd00; // Golden bark wave (matches summon aura)

export class Cookie {
  mesh: THREE.Group;
  alive = false;

  private timer    = 0;
  private readonly DURATION      = 10;
  private barkTimer              = 0;
  private readonly BARK_INTERVAL = 2;
  private fadeTimer  = 0;
  private isFading   = false;
  private target: Enemy | null = null;
  private speed  = 7;
  private walkCycle = 0;

  private legs: THREE.Group[]  = [];
  private torsoGroup!: THREE.Group;
  private headGroup!:  THREE.Group;
  private tailMesh!:   THREE.Mesh;
  private mouthMesh!:  THREE.Mesh;
  private summonAura!: THREE.PointLight;

  // All materials that need opacity tweaking during fade
  private fadeMaterials: THREE.MeshToonMaterial[]   = [];
  private glossMaterials: THREE.MeshPhongMaterial[] = [];
  private basicMaterials: THREE.MeshBasicMaterial[] = [];

  // Bark wave
  barkWaveMesh: THREE.Mesh | null = null;
  private barkWaveTimer = 0;

  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.visible = false;
    this.buildModel();
  }

  // ---------------------------------------------------------------------------
  // Model construction — all-black fluffy Spitz, scaled 2x
  // ---------------------------------------------------------------------------

  private buildModel() {
    const toon = (color: number, transparent = false): THREE.MeshToonMaterial => {
      const m = new THREE.MeshToonMaterial({ color, transparent, opacity: 1 });
      this.fadeMaterials.push(m);
      return m;
    };

    const gloss = (color: number, transparent = false): THREE.MeshPhongMaterial => {
      const m = new THREE.MeshPhongMaterial({ color, shininess: 120, transparent, opacity: 1 });
      this.glossMaterials.push(m);
      return m;
    };

    const basic = (color: number, transparent = false): THREE.MeshBasicMaterial => {
      const m = new THREE.MeshBasicMaterial({ color, transparent, opacity: 1 });
      this.basicMaterials.push(m);
      return m;
    };

    // ---- Torso group --------------------------------------------------------
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.5, 0);
    this.mesh.add(this.torsoGroup);

    // Chest mane — large fluffy sphere (the defining feature of a Spitz)
    const maneGeo = new THREE.SphereGeometry(0.7, 16, 12);
    const maneMesh = new THREE.Mesh(maneGeo, toon(COLOR_MANE));
    maneMesh.scale.set(1.05, 1.0, 1.05);
    maneMesh.position.set(0, 0.1, 0.15);
    this.torsoGroup.add(maneMesh);

    // Inner chest highlight — slightly lighter patch
    const chestGeo = new THREE.SphereGeometry(0.42, 10, 8);
    const chestMesh = new THREE.Mesh(chestGeo, toon(COLOR_MANE));
    chestMesh.scale.set(1.0, 0.9, 0.45);
    chestMesh.position.set(0, 0.0, 0.7);
    this.torsoGroup.add(chestMesh);

    // Main body / hindquarters — rounder than Amora
    const bodyGeo = new THREE.SphereGeometry(0.55, 12, 10);
    const bodyMesh = new THREE.Mesh(bodyGeo, toon(COLOR_BODY));
    bodyMesh.scale.set(0.95, 1.0, 1.15);
    bodyMesh.position.set(0, 0.0, -0.28);
    this.torsoGroup.add(bodyMesh);

    // ---- Fluffy curled tail -------------------------------------------------
    // Two overlapping capsules to suggest fluffiness
    const tailGeo = new THREE.CapsuleGeometry(0.22, 0.42, 8, 8);
    this.tailMesh = new THREE.Mesh(tailGeo, toon(COLOR_BODY));
    this.tailMesh.rotation.x = Math.PI * 0.6;
    this.tailMesh.scale.set(1.5, 1.0, 0.75);
    this.tailMesh.position.set(0, 0.62, -0.48);
    this.torsoGroup.add(this.tailMesh);

    const tailTopGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const tailTop = new THREE.Mesh(tailTopGeo, toon(COLOR_MANE));
    tailTop.position.set(0, 0.78, -0.38);
    this.torsoGroup.add(tailTop);

    // ---- Head group ---------------------------------------------------------
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.65, 0.42);
    this.torsoGroup.add(this.headGroup);

    // Main head sphere — rounder than Amora's
    const headGeo = new THREE.SphereGeometry(0.42, 12, 10);
    const headMesh = new THREE.Mesh(headGeo, toon(COLOR_BODY));
    this.headGroup.add(headMesh);

    // Fluffy head halo (extra puff of fur around the head)
    const headPuffGeo = new THREE.SphereGeometry(0.46, 10, 8);
    const headPuff = new THREE.Mesh(headPuffGeo, toon(COLOR_MANE));
    headPuff.scale.set(1.05, 0.9, 0.95);
    headPuff.position.set(0, 0.05, -0.06);
    this.headGroup.add(headPuff);

    // Short rounded snout — darker than Amora's (no white patch)
    const snoutGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const snoutMesh = new THREE.Mesh(snoutGeo, toon(COLOR_MANE));
    snoutMesh.scale.set(1.25, 0.8, 1.0);
    snoutMesh.position.set(0, -0.06, 0.36);
    this.headGroup.add(snoutMesh);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.045, 6, 5);
    const noseMesh = new THREE.Mesh(noseGeo, gloss(COLOR_NOSE));
    noseMesh.position.set(0, 0.04, 0.48);
    this.headGroup.add(noseMesh);

    // Eyes — dark and shiny
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.055, 6, 5);
      const eyeMesh = new THREE.Mesh(eyeGeo, gloss(COLOR_EYE));
      eyeMesh.position.set(side * 0.18, 0.1, 0.34);
      this.headGroup.add(eyeMesh);

      // Highlight dot
      const hlGeo = new THREE.SphereGeometry(0.02, 4, 4);
      const hlMesh = new THREE.Mesh(hlGeo, basic(COLOR_EYE_HL));
      hlMesh.position.set(side * 0.165, 0.12, 0.375);
      this.headGroup.add(hlMesh);
    }

    // Small pointed ears — Spitz characteristic
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.13, 0.18, 6);
      const earMesh = new THREE.Mesh(earGeo, toon(COLOR_BODY));
      earMesh.position.set(side * 0.26, 0.38, 0.04);
      earMesh.rotation.z = side * -0.35;
      earMesh.rotation.x = -0.1;
      this.headGroup.add(earMesh);

      // Inner ear (slightly lighter)
      const innerEarGeo = new THREE.ConeGeometry(0.07, 0.1, 5);
      const innerEar = new THREE.Mesh(innerEarGeo, toon(COLOR_MANE));
      innerEar.position.set(side * 0.26, 0.38, 0.06);
      innerEar.rotation.z = side * -0.35;
      innerEar.rotation.x = -0.1;
      this.headGroup.add(innerEar);
    }

    // Mouth (tongue — shown when barking)
    const mouthGeo = new THREE.SphereGeometry(0.09, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.mouthMesh = new THREE.Mesh(mouthGeo, toon(COLOR_TONGUE));
    this.mouthMesh.position.set(0, -0.12, 0.43);
    this.mouthMesh.visible = false;
    this.headGroup.add(this.mouthMesh);

    // ---- Four stubby legs ---------------------------------------------------
    const legDefs = [
      { x: -0.32, z:  0.32, y: 0.12 }, // front-left
      { x:  0.32, z:  0.32, y: 0.12 }, // front-right
      { x: -0.26, z: -0.38, y: 0.12 }, // rear-left
      { x:  0.26, z: -0.38, y: 0.12 }, // rear-right
    ];

    for (const [i, pos] of legDefs.entries()) {
      const legGroup = new THREE.Group();
      legGroup.position.set(pos.x, pos.y, pos.z);

      // Leg shaft — short and thick (Spitz proportions)
      const legGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.28, 6);
      const legMesh = new THREE.Mesh(legGeo, toon(COLOR_BODY));
      legMesh.position.y = 0.04;
      legGroup.add(legMesh);

      // Fluffy paw
      const pawGeo = new THREE.SphereGeometry(0.13, 6, 5);
      const pawMesh = new THREE.Mesh(pawGeo, toon(COLOR_MANE));
      pawMesh.scale.set(1.1, 0.6, 1.2);
      pawMesh.position.y  = -0.1;
      pawMesh.position.z  =  0.03;
      legGroup.add(pawMesh);

      void i; // suppress unused-variable lint
      this.mesh.add(legGroup);
      this.legs.push(legGroup);
    }

    // ---- Drop shadow --------------------------------------------------------
    const shadowGeo = new THREE.CircleGeometry(0.75, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
    });
    this.basicMaterials.push(shadowMat);
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    this.mesh.add(shadowMesh);

    // ---- Summon aura (golden glow point light) ------------------------------
    this.summonAura = new THREE.PointLight(0xffdd00, 3, 6);
    this.summonAura.position.set(0, 1, 0);
    this.mesh.add(this.summonAura);

    // ---- Scale entire mesh to 2x (Cookie is twice Amora's size) ------------
    this.mesh.scale.setScalar(2.0);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Activate Cookie at the given world position. */
  summon(position: THREE.Vector3) {
    this.alive      = true;
    this.isFading   = false;
    this.timer      = 0;
    this.barkTimer  = 0;
    this.fadeTimer  = 0;
    this.target     = null;
    this.walkCycle  = 0;

    // Place her beside the player (slightly to the left)
    this.mesh.position.set(position.x - 1.5, position.y, position.z);
    this.mesh.visible  = true;
    this.mesh.scale.setScalar(2.0);
    this.summonAura.intensity = 3;

    // Reset all material opacities
    for (const m of this.fadeMaterials)  { m.transparent = false; m.opacity = 1; }
    for (const m of this.glossMaterials) { m.transparent = false; m.opacity = 1; }
    for (const m of this.basicMaterials) { m.opacity = 1; }
  }

  /**
   * Main update loop. Call every frame from Game.ts (or wherever entities
   * are ticked). Cookie has no physics body — she moves directly via mesh.
   */
  update(dt: number, enemies: Enemy[]) {
    if (!this.alive) return;

    // --- Phase: active hunting ---------------------------------------------
    if (!this.isFading) {
      this.timer += dt;

      // Find a target if we don't have one (or it died)
      if (!this.target || !this.target.alive) {
        this.target = this.findNearestEnemy(enemies);
      }

      if (this.target && this.target.alive) {
        this.moveTowardTarget(dt);
      } else {
        this.animateIdle(dt);
      }

      // Bark on cooldown
      this.barkTimer -= dt;
      if (this.barkTimer <= 0) {
        this.bark(enemies);
        this.barkTimer = this.BARK_INTERVAL;
      }

      // Bark wave visual update
      this.updateBarkWave(dt);

      // Begin fading when duration expires
      if (this.timer >= this.DURATION) {
        this.startFade();
      }
    } else {
      // --- Phase: evaporation fade-out --------------------------------------
      this.fadeTimer += dt;
      const FADE_DURATION = 1.2;
      const t = Math.min(this.fadeTimer / FADE_DURATION, 1);

      // Scale down (deflate / evaporate)
      const s = 2.0 * (1 - t * 0.85); // shrinks to 15 % of original size
      this.mesh.scale.setScalar(s);

      // Fade out all materials
      const opacity = 1 - t;
      for (const m of this.fadeMaterials)  { m.opacity = opacity; }
      for (const m of this.glossMaterials) { m.opacity = opacity; }
      for (const m of this.basicMaterials) { m.opacity = opacity * 0.25; } // shadow fades faster
      this.summonAura.intensity = (1 - t) * 3;

      // Still animate walk (looks like a ghost dissolving)
      this.walkCycle += dt * 8;
      this.animateWalk();

      if (this.fadeTimer >= FADE_DURATION) {
        this.alive         = false;
        this.mesh.visible  = false;
        this.summonAura.intensity = 0;
      }
    }
  }

  /** Clean up scene objects. Call when scene is disposed. */
  dispose() {
    for (const m of this.fadeMaterials)  m.dispose();
    for (const m of this.glossMaterials) m.dispose();
    for (const m of this.basicMaterials) m.dispose();
    if (this.barkWaveMesh) {
      this.barkWaveMesh.parent?.remove(this.barkWaveMesh);
      (this.barkWaveMesh.material as THREE.Material).dispose();
      this.barkWaveMesh.geometry.dispose();
      this.barkWaveMesh = null;
    }
    this.mesh.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private findNearestEnemy(enemies: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;

    for (const e of enemies) {
      if (!e.alive) continue;
      const ep  = e.mesh.position;
      const cp  = this.mesh.position;
      const dist = distanceXZ(cp.x, cp.z, ep.x, ep.z);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest     = e;
      }
    }
    return nearest;
  }

  private moveTowardTarget(dt: number) {
    if (!this.target) return;

    const tp  = this.target.mesh.position;
    const cp  = this.mesh.position;
    const dx  = tp.x - cp.x;
    const dz  = tp.z - cp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Face the target
    this.mesh.rotation.y = Math.atan2(dx, dz);

    // Stop if already close (within bark range / 2)
    if (dist < 2.5) {
      this.animateIdle(dt);
      return;
    }

    // Move directly (no physics)
    const nx = dx / dist;
    const nz = dz / dist;
    // Scale already applied to mesh; move in world space
    this.mesh.position.x += nx * this.speed * dt;
    this.mesh.position.z += nz * this.speed * dt;

    // Walk animation
    this.walkCycle += dt * 12;
    this.animateWalk();
  }

  private bark(enemies: Enemy[]) {
    const BARK_RANGE  = 6;   // world units (pre-scale)
    const BARK_DAMAGE = 2;
    const cp = this.mesh.position;

    let hit = false;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dist = distanceXZ(cp.x, cp.z, e.mesh.position.x, e.mesh.position.z);
      // The mesh is scaled 2x, so effective range in world units is BARK_RANGE * 2
      if (dist <= BARK_RANGE * 2) {
        e.takeDamage(BARK_DAMAGE);
        hit = true;
      }
    }

    // Visual bark wave regardless of hit (Cookie is an enthusiastic barker)
    this.showMouthBriefly();
    this.spawnBarkWave();

    void hit;
  }

  private showMouthBriefly() {
    this.mouthMesh.visible = true;
    // Hide after 400 ms using a simple timer tracked in barkWaveTimer
    // (we'll hide it in updateBarkWave when the wave expires)
  }

  private spawnBarkWave() {
    // Remove old wave if still active
    if (this.barkWaveMesh) {
      this.barkWaveMesh.parent?.remove(this.barkWaveMesh);
      (this.barkWaveMesh.material as THREE.Material).dispose();
      this.barkWaveMesh.geometry.dispose();
      this.barkWaveMesh = null;
    }

    const waveGeo = new THREE.RingGeometry(0.4, 2.0, 20);
    const waveMat = new THREE.MeshBasicMaterial({
      color: COLOR_BARK_WAVE,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });

    this.barkWaveMesh = new THREE.Mesh(waveGeo, waveMat);

    // Position the wave in front of Cookie's mouth
    const worldPos = this.mesh.position.clone();
    worldPos.y += 2.0; // offset up by roughly the mesh scale factor
    const fwd = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
    worldPos.addScaledVector(fwd, 1.8);

    this.barkWaveMesh.position.copy(worldPos);
    this.barkWaveMesh.lookAt(worldPos.clone().add(new THREE.Vector3(0, 1, 0)));

    this.barkWaveTimer = 0.5;

    // The wave lives in the parent scene — caller must add it.
    // We attach it to the mesh so it inherits scene membership.
    this.mesh.parent?.add(this.barkWaveMesh);
  }

  private updateBarkWave(dt: number) {
    if (!this.barkWaveMesh) return;

    this.barkWaveTimer -= dt;

    if (this.barkWaveTimer <= 0) {
      this.barkWaveMesh.parent?.remove(this.barkWaveMesh);
      (this.barkWaveMesh.material as THREE.Material).dispose();
      this.barkWaveMesh.geometry.dispose();
      this.barkWaveMesh = null;
      this.mouthMesh.visible = false;
    } else {
      // Expand and fade
      const elapsed = 0.5 - this.barkWaveTimer;
      const scale   = 1 + elapsed * 14;
      this.barkWaveMesh.scale.set(scale, scale, scale);
      (this.barkWaveMesh.material as THREE.MeshBasicMaterial).opacity =
        this.barkWaveTimer * 2;
    }
  }

  private startFade() {
    if (this.isFading) return;
    this.isFading  = true;
    this.fadeTimer = 0;

    // Make all materials transparent so opacity tween works
    for (const m of this.fadeMaterials)  { m.transparent = true; }
    for (const m of this.glossMaterials) { m.transparent = true; }

    // Pulse the aura brighter for one frame as a goodbye flash
    this.summonAura.intensity = 6;
  }

  private animateWalk() {
    const sin = Math.sin(this.walkCycle);
    const cos = Math.cos(this.walkCycle);

    // Diagonal gait (front-left + rear-right move together)
    this.legs[0].rotation.x =  sin * 0.55;
    this.legs[1].rotation.x = -sin * 0.55;
    this.legs[2].rotation.x = -sin * 0.55;
    this.legs[3].rotation.x =  sin * 0.55;

    // Torso bob
    this.torsoGroup.position.y = 0.5 + Math.abs(cos) * 0.06;

    // Head nod
    this.headGroup.rotation.x = Math.sin(this.walkCycle * 0.5) * 0.06;

    // Tail wag (enthusiastic — she's happy to fight for her little sister)
    this.tailMesh.rotation.z = Math.sin(this.walkCycle * 2.2) * 0.28;
  }

  private animateIdle(dt: number) {
    this.walkCycle += dt * 2.5;
    const breathe = Math.sin(this.walkCycle) * 0.025;
    this.torsoGroup.scale.y = 1.0 + breathe;

    // Slow tail wag at rest
    this.tailMesh.rotation.z = Math.sin(this.walkCycle * 1.8) * 0.1;

    // Gentle leg reset
    for (const leg of this.legs) {
      leg.rotation.x *= 0.88;
    }
  }
}
