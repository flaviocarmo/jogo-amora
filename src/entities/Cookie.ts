import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Enemy } from './enemies/Enemy';
import { toonMat, glossMat, basicMat } from '../utils/materials';
import { distanceXZ } from '../utils/math';

// Cookie is a BLACK Pomeranian Spitz — Amora's older, bigger sister ally.
// She is summoned magically and fights enemies autonomously for 10 seconds,
// then fades out. No physics: she moves via mesh position directly.

const COLOR_BODY       = 0x0a0a0a;
const COLOR_MANE       = 0x1a1a1a;
const COLOR_EYE        = 0x010101;
const COLOR_EYE_HL     = 0xffffff;
const COLOR_NOSE       = 0x000000;
const COLOR_TONGUE     = 0xff8888;
const COLOR_BARK_WAVE  = 0xffdd00;

export class Cookie {
  mesh: TransformNode;
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

  private legs: TransformNode[]  = [];
  private torsoGroup!: TransformNode;
  private headGroup!:  TransformNode;
  private tailMesh!:   Mesh;
  private mouthMesh!:  Mesh;
  private summonAura!: PointLight;

  // All materials that need opacity tweaking during fade
  private fadeMaterials: StandardMaterial[]  = [];
  private glossMaterials: PBRMaterial[]      = [];
  private basicMaterials: StandardMaterial[] = [];

  // Bark wave
  barkWaveMesh: Mesh | null = null;
  private barkWaveTimer = 0;

  private scene: Scene | null = null;
  private modelBuilt = false;

  constructor() {
    // mesh is created lazily in init(scene) — no scene available yet
    this.mesh = null as any;
  }

  /** Must be called once we have a scene reference, before first summon. */
  init(scene: Scene) {
    this.scene = scene;
    this.mesh = new TransformNode('cookie', scene);
    this.buildModel(scene);
    this.mesh.setEnabled(false);
  }

  // ---------------------------------------------------------------------------
  // Model construction — all-black fluffy Spitz, scaled 2x
  // ---------------------------------------------------------------------------

  private buildModel(scene: Scene) {
    if (this.modelBuilt) return;
    this.modelBuilt = true;

    const toon = (name: string, color: number): StandardMaterial => {
      const m = toonMat(name, color, scene);
      this.fadeMaterials.push(m);
      return m;
    };

    const gloss = (name: string, color: number): PBRMaterial => {
      const m = glossMat(name, color, scene);
      this.glossMaterials.push(m);
      return m;
    };

    const basic = (name: string, color: number): StandardMaterial => {
      const m = basicMat(name, color, scene);
      this.basicMaterials.push(m);
      return m;
    };

    // ---- Torso group --------------------------------------------------------
    this.torsoGroup = new TransformNode('cookie-torso', scene);
    this.torsoGroup.position.set(0, 0.5, 0);
    this.torsoGroup.parent = this.mesh;

    // Chest mane
    const maneMesh = MeshBuilder.CreateSphere('cookie-mane', { diameter: 1.4, segments: 16 }, scene);
    maneMesh.material = toon('cookie-mane-mat', COLOR_MANE);
    maneMesh.scaling.set(1.05, 1.0, 1.05);
    maneMesh.position.set(0, 0.1, 0.15);
    maneMesh.parent = this.torsoGroup;

    // Inner chest highlight
    const chestMesh = MeshBuilder.CreateSphere('cookie-chest', { diameter: 0.84, segments: 10 }, scene);
    chestMesh.material = toon('cookie-chest-mat', COLOR_MANE);
    chestMesh.scaling.set(1.0, 0.9, 0.45);
    chestMesh.position.set(0, 0.0, 0.7);
    chestMesh.parent = this.torsoGroup;

    // Main body / hindquarters
    const bodyMesh = MeshBuilder.CreateSphere('cookie-body', { diameter: 1.1, segments: 12 }, scene);
    bodyMesh.material = toon('cookie-body-mat', COLOR_BODY);
    bodyMesh.scaling.set(0.95, 1.0, 1.15);
    bodyMesh.position.set(0, 0.0, -0.28);
    bodyMesh.parent = this.torsoGroup;

    // ---- Fluffy curled tail -------------------------------------------------
    this.tailMesh = MeshBuilder.CreateCapsule('cookie-tail', { height: 0.86, radius: 0.22, tessellation: 8 }, scene);
    this.tailMesh.material = toon('cookie-tail-mat', COLOR_BODY);
    this.tailMesh.rotation.x = Math.PI * 0.6;
    this.tailMesh.scaling.set(1.5, 1.0, 0.75);
    this.tailMesh.position.set(0, 0.62, -0.48);
    this.tailMesh.parent = this.torsoGroup;

    const tailTop = MeshBuilder.CreateSphere('cookie-tailtop', { diameter: 0.4, segments: 8 }, scene);
    tailTop.material = toon('cookie-tailtop-mat', COLOR_MANE);
    tailTop.position.set(0, 0.78, -0.38);
    tailTop.parent = this.torsoGroup;

    // ---- Head group ---------------------------------------------------------
    this.headGroup = new TransformNode('cookie-head', scene);
    this.headGroup.position.set(0, 0.65, 0.42);
    this.headGroup.parent = this.torsoGroup;

    // Main head sphere
    const headMesh = MeshBuilder.CreateSphere('cookie-headcore', { diameter: 0.84, segments: 12 }, scene);
    headMesh.material = toon('cookie-headcore-mat', COLOR_BODY);
    headMesh.parent = this.headGroup;

    // Fluffy head halo
    const headPuff = MeshBuilder.CreateSphere('cookie-headpuff', { diameter: 0.92, segments: 10 }, scene);
    headPuff.material = toon('cookie-headpuff-mat', COLOR_MANE);
    headPuff.scaling.set(1.05, 0.9, 0.95);
    headPuff.position.set(0, 0.05, -0.06);
    headPuff.parent = this.headGroup;

    // Short rounded snout
    const snoutMesh = MeshBuilder.CreateSphere('cookie-snout', { diameter: 0.3, segments: 8 }, scene);
    snoutMesh.material = toon('cookie-snout-mat', COLOR_MANE);
    snoutMesh.scaling.set(1.25, 0.8, 1.0);
    snoutMesh.position.set(0, -0.06, 0.36);
    snoutMesh.parent = this.headGroup;

    // Nose
    const noseMesh = MeshBuilder.CreateSphere('cookie-nose', { diameter: 0.09, segments: 6 }, scene);
    noseMesh.material = gloss('cookie-nose-mat', COLOR_NOSE);
    noseMesh.position.set(0, 0.04, 0.48);
    noseMesh.parent = this.headGroup;

    // Eyes
    for (const side of [-1, 1]) {
      const eyeMesh = MeshBuilder.CreateSphere(`cookie-eye${side}`, { diameter: 0.11, segments: 6 }, scene);
      eyeMesh.material = gloss(`cookie-eye-mat${side}`, COLOR_EYE);
      eyeMesh.position.set(side * 0.18, 0.1, 0.34);
      eyeMesh.parent = this.headGroup;

      const hlMesh = MeshBuilder.CreateSphere(`cookie-eyehl${side}`, { diameter: 0.04, segments: 4 }, scene);
      hlMesh.material = basic(`cookie-eyehl-mat${side}`, COLOR_EYE_HL);
      hlMesh.position.set(side * 0.165, 0.12, 0.375);
      hlMesh.parent = this.headGroup;
    }

    // Small pointed ears
    for (const side of [-1, 1]) {
      const earMesh = MeshBuilder.CreateCylinder(`cookie-ear${side}`, {
        diameterTop: 0, diameterBottom: 0.26, height: 0.18, tessellation: 6,
      }, scene);
      earMesh.material = toon(`cookie-ear-mat${side}`, COLOR_BODY);
      earMesh.position.set(side * 0.26, 0.38, 0.04);
      earMesh.rotation.z = side * -0.35;
      earMesh.rotation.x = -0.1;
      earMesh.parent = this.headGroup;

      // Inner ear
      const innerEar = MeshBuilder.CreateCylinder(`cookie-innerear${side}`, {
        diameterTop: 0, diameterBottom: 0.14, height: 0.1, tessellation: 5,
      }, scene);
      innerEar.material = toon(`cookie-innerear-mat${side}`, COLOR_MANE);
      innerEar.position.set(side * 0.26, 0.38, 0.06);
      innerEar.rotation.z = side * -0.35;
      innerEar.rotation.x = -0.1;
      innerEar.parent = this.headGroup;
    }

    // Mouth (tongue — shown when barking)
    this.mouthMesh = MeshBuilder.CreateSphere('cookie-mouth', { diameter: 0.18, segments: 6 }, scene);
    this.mouthMesh.material = toon('cookie-mouth-mat', COLOR_TONGUE);
    this.mouthMesh.position.set(0, -0.12, 0.43);
    this.mouthMesh.setEnabled(false);
    this.mouthMesh.parent = this.headGroup;

    // ---- Four stubby legs ---------------------------------------------------
    const legDefs = [
      { x: -0.32, z:  0.32, y: 0.12 },
      { x:  0.32, z:  0.32, y: 0.12 },
      { x: -0.26, z: -0.38, y: 0.12 },
      { x:  0.26, z: -0.38, y: 0.12 },
    ];

    for (const [i, pos] of legDefs.entries()) {
      const legGroup = new TransformNode(`cookie-leg${i}`, scene);
      legGroup.position.set(pos.x, pos.y, pos.z);
      legGroup.parent = this.mesh;

      const legMesh = MeshBuilder.CreateCylinder(`cookie-legcyl${i}`, {
        diameterTop: 0.2, diameterBottom: 0.22, height: 0.28, tessellation: 6,
      }, scene);
      legMesh.material = toon(`cookie-leg-mat${i}`, COLOR_BODY);
      legMesh.position.y = 0.04;
      legMesh.parent = legGroup;

      const pawMesh = MeshBuilder.CreateSphere(`cookie-paw${i}`, { diameter: 0.26, segments: 6 }, scene);
      pawMesh.material = toon(`cookie-paw-mat${i}`, COLOR_MANE);
      pawMesh.scaling.set(1.1, 0.6, 1.2);
      pawMesh.position.set(0, -0.1, 0.03);
      pawMesh.parent = legGroup;

      this.legs.push(legGroup);
    }

    // ---- Drop shadow --------------------------------------------------------
    const shadowMesh = MeshBuilder.CreateDisc('cookie-shadow', { radius: 0.75, tessellation: 16 }, scene);
    const shadowMat = basicMat('cookie-shadow-mat', 0x000000, scene);
    shadowMat.alpha = 0.25;
    this.basicMaterials.push(shadowMat);
    shadowMesh.material = shadowMat;
    shadowMesh.rotation.x = Math.PI / 2;
    shadowMesh.position.y = 0.01;
    shadowMesh.parent = this.mesh;

    // ---- Summon aura (golden glow point light) ------------------------------
    this.summonAura = new PointLight('cookie-aura', new Vector3(0, 1, 0), scene);
    this.summonAura.diffuse = new Color3(1, 0.87, 0);
    this.summonAura.intensity = 3;
    this.summonAura.range = 6;
    this.summonAura.parent = this.mesh;

    // ---- Scale entire mesh to 2x (Cookie is twice Amora's size) ------------
    this.mesh.scaling.setAll(2.0);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Activate Cookie at the given world position. */
  summon(position: Vector3) {
    this.alive      = true;
    this.isFading   = false;
    this.timer      = 0;
    this.barkTimer  = 0;
    this.fadeTimer  = 0;
    this.target     = null;
    this.walkCycle  = 0;

    // Place her beside the player
    this.mesh.position.set(position.x - 1.5, position.y, position.z);
    this.mesh.setEnabled(true);
    this.mesh.scaling.setAll(2.0);
    this.summonAura.intensity = 3;

    // Reset all material opacities
    for (const m of this.fadeMaterials)  { m.alpha = 1; }
    for (const m of this.glossMaterials) { m.alpha = 1; }
    for (const m of this.basicMaterials) { m.alpha = 1; }
  }

  /**
   * Main update loop. Cookie has no physics body — she moves directly via mesh.
   */
  update(dt: number, enemies: Enemy[]) {
    if (!this.alive) return;

    // --- Phase: active hunting ---
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
      // --- Phase: evaporation fade-out ---
      this.fadeTimer += dt;
      const FADE_DURATION = 1.2;
      const t = Math.min(this.fadeTimer / FADE_DURATION, 1);

      // Scale down
      const s = 2.0 * (1 - t * 0.85);
      this.mesh.scaling.setAll(s);

      // Fade out all materials via visibility
      // In Babylon, we set alpha on each material
      const opacity = 1 - t;
      for (const m of this.fadeMaterials)  { m.alpha = opacity; }
      for (const m of this.glossMaterials) { m.alpha = opacity; }
      for (const m of this.basicMaterials) { m.alpha = opacity * 0.25; }
      this.summonAura.intensity = (1 - t) * 3;

      // Still animate walk
      this.walkCycle += dt * 8;
      this.animateWalk();

      if (this.fadeTimer >= FADE_DURATION) {
        this.alive = false;
        this.mesh.setEnabled(false);
        this.summonAura.intensity = 0;
      }
    }
  }

  /** Clean up scene objects. */
  dispose() {
    for (const m of this.fadeMaterials)  m.dispose();
    for (const m of this.glossMaterials) m.dispose();
    for (const m of this.basicMaterials) m.dispose();
    if (this.barkWaveMesh) {
      this.barkWaveMesh.dispose();
      this.barkWaveMesh = null;
    }
    this.mesh.dispose();
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

    // Stop if already close
    if (dist < 2.5) {
      this.animateIdle(dt);
      return;
    }

    // Move directly (no physics)
    const nx = dx / dist;
    const nz = dz / dist;
    this.mesh.position.x += nx * this.speed * dt;
    this.mesh.position.z += nz * this.speed * dt;

    // Walk animation
    this.walkCycle += dt * 12;
    this.animateWalk();
  }

  private bark(enemies: Enemy[]) {
    const BARK_RANGE  = 6;
    const BARK_DAMAGE = 2;
    const cp = this.mesh.position;

    for (const e of enemies) {
      if (!e.alive) continue;
      const dist = distanceXZ(cp.x, cp.z, e.mesh.position.x, e.mesh.position.z);
      if (dist <= BARK_RANGE * 2) {
        e.takeDamage(BARK_DAMAGE);
      }
    }

    this.showMouthBriefly();
    this.spawnBarkWave();
  }

  private showMouthBriefly() {
    this.mouthMesh.setEnabled(true);
    // Hide when the bark wave expires (in updateBarkWave)
  }

  private spawnBarkWave() {
    if (!this.scene) return;

    // Remove old wave if still active
    if (this.barkWaveMesh) {
      this.barkWaveMesh.dispose();
      this.barkWaveMesh = null;
    }

    const waveMesh = MeshBuilder.CreateTorus('cookie-bark-wave', {
      diameter: 4.0,
      thickness: 0.25,
      tessellation: 20,
    }, this.scene);
    const waveMat = basicMat('cookie-bark-wave-mat', COLOR_BARK_WAVE, this.scene);
    waveMat.alpha = 1;
    waveMat.backFaceCulling = false;
    waveMesh.material = waveMat;

    // Position the wave in front of Cookie's mouth
    const worldPos = this.mesh.position.clone();
    worldPos.y += 2.0;
    const fwd = new Vector3(
      Math.sin(this.mesh.rotation.y),
      0,
      Math.cos(this.mesh.rotation.y),
    );
    worldPos.addInPlace(fwd.scale(1.8));
    waveMesh.position.copyFrom(worldPos);

    this.barkWaveTimer = 0.5;
    this.barkWaveMesh = waveMesh;
  }

  private updateBarkWave(dt: number) {
    if (!this.barkWaveMesh) return;

    this.barkWaveTimer -= dt;

    if (this.barkWaveTimer <= 0) {
      this.barkWaveMesh.dispose();
      this.barkWaveMesh = null;
      this.mouthMesh.setEnabled(false);
    } else {
      // Expand and fade
      const elapsed = 0.5 - this.barkWaveTimer;
      const scale   = 1 + elapsed * 14;
      this.barkWaveMesh.scaling.set(scale, scale, scale);
      const mat = this.barkWaveMesh.material as StandardMaterial;
      mat.alpha = this.barkWaveTimer * 2;
    }
  }

  private startFade() {
    if (this.isFading) return;
    this.isFading  = true;
    this.fadeTimer = 0;

    // Make all materials transparent so opacity tween works
    // In Babylon, StandardMaterial supports alpha directly — no extra flag needed
    // PBRMaterial also supports alpha
    // "Pulse the aura brighter for one frame as a goodbye flash"
    this.summonAura.intensity = 6;
  }

  private animateWalk() {
    const sin = Math.sin(this.walkCycle);
    const cos = Math.cos(this.walkCycle);

    this.legs[0].rotation.x =  sin * 0.55;
    this.legs[1].rotation.x = -sin * 0.55;
    this.legs[2].rotation.x = -sin * 0.55;
    this.legs[3].rotation.x =  sin * 0.55;

    this.torsoGroup.position.y = 0.5 + Math.abs(cos) * 0.06;
    this.headGroup.rotation.x = Math.sin(this.walkCycle * 0.5) * 0.06;
    this.tailMesh.rotation.z = Math.sin(this.walkCycle * 2.2) * 0.28;
  }

  private animateIdle(dt: number) {
    this.walkCycle += dt * 2.5;
    const breathe = Math.sin(this.walkCycle) * 0.025;
    this.torsoGroup.scaling.y = 1.0 + breathe;

    this.tailMesh.rotation.z = Math.sin(this.walkCycle * 1.8) * 0.1;

    for (const leg of this.legs) {
      leg.rotation.x *= 0.88;
    }
  }
}
