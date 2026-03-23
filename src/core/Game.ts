import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';

import { InputManager } from './InputManager';
import { PhysicsWorld } from './PhysicsWorld';
import { AudioManager } from './AudioManager';
import { HUD } from '../ui/HUD';
import { CameraSystem } from '../systems/CameraSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { Player } from '../entities/Player';
import { Cookie } from '../entities/Cookie';

import { createLevel1, type LevelData } from '../scenes/Level1';
import { createLevel2 } from '../scenes/Level2';
import { createLevel3 } from '../scenes/Level3';
import { createLevel4 } from '../scenes/Level4';
import { createLevel5 } from '../scenes/Level5';
import { createLevel6 } from '../scenes/Level6';
import { createLevel7 } from '../scenes/Level7';
import { createLevel8 } from '../scenes/Level8';
import { createLevel9 } from '../scenes/Level9';
import { createLevel10 } from '../scenes/Level10';
import { createLevel11 } from '../scenes/Level11';
import { createLevel12 } from '../scenes/Level12';

enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  VICTORY,
  TRANSITION,
}

const LEVEL_NAMES = [
  'Prado Verde', 'Floresta Sombria', 'Montanha do Trovao',
  'Caverna Cristalina', 'Pantano Nebuloso', 'Castelo do Rei Porco',
  'Praia Tropical', 'Cidade Abandonada', 'Jardim Encantado',
  'Vulcao Ardente', 'Cemiterio Sombrio', 'Torre do Imperador',
];

export class Game {
  private engine: Engine;
  private canvas: HTMLCanvasElement;
  private input: InputManager;
  private physics: PhysicsWorld;
  private audio: AudioManager;
  private hud: HUD;

  private player: Player;
  private cookie: Cookie;
  private cameraSystem!: CameraSystem;
  private combatSystem: CombatSystem;
  private particleSystem!: ParticleSystem;

  // Menu/game-over ambient camera
  private menuCamera: ArcRotateCamera | null = null;

  private state = GameState.MENU;
  private currentLevel = 0;
  private levelData: LevelData | null = null;
  private scene: Scene | null = null;

  private readonly FIXED_STEP = 1 / 60;
  private accumulator = 0;
  private lastTime = 0;
  private killCount = 0;
  private totalEnemies = 0;
  private isTransitioning = false;

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this.engine = engine;
    this.canvas = canvas;

    this.input = new InputManager(canvas);
    this.physics = new PhysicsWorld();
    this.audio = new AudioManager();
    this.hud = new HUD();

    this.player = new Player();
    this.cookie = new Cookie();
    this.combatSystem = new CombatSystem();

    // Menu buttons
    document.getElementById('start-btn')!.addEventListener('click', () => this.startGame());
    document.getElementById('retry-btn')!.addEventListener('click', () => this.startGame());
    document.getElementById('replay-btn')!.addEventListener('click', () => this.startGame());

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  async init() {
    console.log('[GAME] init: starting physics...');
    // Create a temporary boot scene so physics can initialise its Havok instance
    const bootScene = new Scene(this.engine);
    await this.physics.init(bootScene);
    console.log('[GAME] init: physics ready, starting game loop');

    this.lastTime = performance.now();
    this.gameLoop();
  }

  // ─── Game lifecycle ───────────────────────────────────────────────

  private async startGame() {
    console.log('[GAME] startGame called');
    this.hud.hideMenu();
    this.hud.hideGameOver();
    this.hud.hideVictory();
    this.currentLevel = 0;
    this.isTransitioning = false;

    // Reset player for a fresh run
    this.player = new Player();

    console.log('[GAME] loading level 0...');
    try {
      await this.loadLevel(0);
      console.log('[GAME] level 0 loaded, state:', this.state);
    } catch (err) {
      console.error('[GAME] loadLevel error:', err);
    }
  }

  private async loadLevel(levelIndex: number) {
    console.log('[GAME] loadLevel:', levelIndex);
    this.state = GameState.TRANSITION;

    // Dispose previous scene — this cleans up all meshes, materials, lights and
    // physics bodies attached to it, so we get a clean slate for the new level.
    if (this.scene) {
      this.scene.dispose();
    }

    // Create a fresh Babylon scene for this level
    const scene = new Scene(this.engine);
    scene.clearColor = new Color4(0.4, 0.6, 1.0, 1.0);

    // Re-initialise physics on the new scene (Havok plugin is reused)
    await this.physics.init(scene);
    console.log('[GAME] physics re-initialized for level', levelIndex);

    // Show level title overlay and wait for the CSS transition to finish
    await this.hud.showLevelTransition(LEVEL_NAMES[levelIndex] ?? 'Fase ???');
    console.log('[GAME] level transition shown');

    // Build the level geometry, enemies and biscuits
    let data: LevelData;
    switch (levelIndex) {
      case 0:  data = createLevel1(scene, this.physics);  break;
      case 1:  data = createLevel2(scene, this.physics);  break;
      case 2:  data = createLevel3(scene, this.physics);  break;
      case 3:  data = createLevel4(scene, this.physics);  break;
      case 4:  data = createLevel5(scene, this.physics);  break;
      case 5:  data = createLevel6(scene, this.physics);  break;
      case 6:  data = createLevel7(scene, this.physics);  break;
      case 7:  data = createLevel8(scene, this.physics);  break;
      case 8:  data = createLevel9(scene, this.physics);  break;
      case 9:  data = createLevel10(scene, this.physics); break;
      case 10: data = createLevel11(scene, this.physics); break;
      case 11: data = createLevel12(scene, this.physics); break;
      default:
        throw new Error(`[GAME] No level creator for index ${levelIndex}`);
    }

    this.levelData = data;
    this.scene = scene;

    // Camera and particle systems must be recreated per scene
    this.cameraSystem = new CameraSystem(scene);
    this.particleSystem = new ParticleSystem(scene);

    // Spawn player at the level's designated spawn point
    const sp = data.spawnPoint;
    this.player.initPhysics(this.physics, sp.x, sp.y, sp.z);

    // Cookie needs a scene reference before it can be summoned
    this.cookie = new Cookie();
    this.cookie.init(scene);

    // Enemy and biscuit counts
    this.killCount = 0;
    this.totalEnemies = data.enemies.length;

    // Announce boss (if present)
    if (data.boss) {
      this.hud.showBossHealth(data.name, 1);
      this.audio.playBossAppear();
    } else {
      this.hud.hideBossHealth();
    }

    // Sync HUD to player starting state
    this.hud.updateHearts(this.player.health, this.player.maxHealth);
    this.hud.updatePowerBar(this.player.powerPercent, this.player.isPowerReady);
    this.hud.updateSuperBar(this.player.superPercent, this.player.isSuperReady);

    this.menuCamera = null;
    this.state = GameState.PLAYING;
  }

  // ─── Game loop ────────────────────────────────────────────────────

  private gameLoop = () => {
    requestAnimationFrame(this.gameLoop);

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.1); // Cap delta to avoid spiral-of-death on tab switch

    if (this.state === GameState.PLAYING) {
      this.input.update();

      this.accumulator += dt;
      while (this.accumulator >= this.FIXED_STEP) {
        this.fixedUpdate(this.FIXED_STEP);
        this.accumulator -= this.FIXED_STEP;
      }

      this.render();
      this.input.afterUpdate();
    } else if (
      this.state === GameState.MENU ||
      this.state === GameState.GAME_OVER ||
      this.state === GameState.VICTORY
    ) {
      // Gently rotate an ambient camera so the scene is still visible behind
      // the UI overlay — or just render the last loaded scene if available.
      if (this.scene) {
        if (!this.menuCamera) {
          // Lazily create a rotating ambient camera attached to the current scene
          this.menuCamera = new ArcRotateCamera(
            'menu-cam', -Math.PI / 2, Math.PI / 4, 18, Vector3.Zero(), this.scene,
          );
          this.menuCamera.minZ = 0.1;
          this.menuCamera.maxZ = 500;
        }
        this.menuCamera.alpha += 0.0003;
        this.scene.render();
      }
    }
  };

  private fixedUpdate(dt: number) {
    if (!this.levelData || !this.scene) return;

    // Havok advances automatically inside scene.render(), but we call step()
    // here to keep the API consistent and allow future manual stepping.
    this.physics.step(dt);

    // Player update (movement, jump, bark wave animation, power/super bars)
    this.player.updatePlayer(dt, this.input, this.cameraSystem, this.physics);

    // Bark power attack (E key or touch button)
    if (this.input.bark) {
      this.combatSystem.executeBark(
        this.player,
        this.levelData.enemies,
        this.audio,
        this.scene,
        () => {
          this.killCount++;
          this.particleSystem.emitStars(this.player.position);
          void this.checkLevelComplete();
        },
      );
    }

    // Super summon — Cookie (Q key or touch button)
    if (this.input.isSuperPressed && this.player.isSuperReady) {
      if (this.player.useSuper()) {
        const spawnPos = this.player.position.clone();
        spawnPos.x += Math.sin(this.player.mesh.rotation.y) * 3;
        spawnPos.z += Math.cos(this.player.mesh.rotation.y) * 3;
        this.cookie.summon(spawnPos);
        this.audio.playPowerReady();
      }
    }

    // Update Cookie ally (autonomous AI, no physics body)
    if (this.cookie.alive && this.levelData) {
      this.cookie.update(dt, this.levelData.enemies);
    }

    // Follow player with third-person camera
    this.cameraSystem.update(
      this.player.position,
      this.input.mouseDX,
      this.input.mouseDY,
      dt,
    );

    // Enemy AI
    const playerPos = this.player.position;
    for (const enemy of this.levelData.enemies) {
      enemy.updateAI(dt, playerPos);
    }

    // Biscuit spin animation
    for (const biscuit of this.levelData.biscuits) {
      biscuit.update(dt);
    }

    // Combat: stomps, damage, collection, power-ready notification
    this.combatSystem.update(
      this.player,
      this.levelData.enemies,
      this.levelData.biscuits,
      this.audio,
      () => {
        // onDamage — flash and update hearts
        this.hud.flashDamage();
        this.hud.updateHearts(this.player.health, this.player.maxHealth);
        this.particleSystem.emitDamage(this.player.position);
        if (!this.player.alive) {
          this.gameOver();
        }
      },
      () => {
        // onHeal
        this.hud.updateHearts(this.player.health, this.player.maxHealth);
        this.particleSystem.emitHeal(this.player.position);
      },
      () => {
        // onPowerReady — already handled by CombatSystem internal flag
      },
      () => {
        // onEnemyKill (stomp)
        this.killCount++;
        void this.checkLevelComplete();
      },
    );

    // Particle system tick
    this.particleSystem.update(dt);

    // Update HUD bars every frame
    this.hud.updatePowerBar(this.player.powerPercent, this.player.isPowerReady);
    this.hud.updateSuperBar(this.player.superPercent, this.player.isSuperReady);

    // Update boss health bar if a boss is present and alive
    if (this.levelData.boss && this.levelData.boss.alive) {
      const bossHpPercent = this.levelData.boss.health / this.levelData.boss.maxHealth;
      this.hud.showBossHealth(this.levelData.name, bossHpPercent);
    } else if (this.levelData.boss && !this.levelData.boss.alive) {
      this.hud.hideBossHealth();
    }

    // Fall-off-world instant death (no mercy)
    if (this.player.position.y < -20) {
      this.player.health = 0;
      this.player.alive = false;
      this.gameOver();
    }
  }

  private render() {
    if (!this.scene) return;
    this.scene.render();
  }

  // ─── Level progression ────────────────────────────────────────────

  private async checkLevelComplete() {
    if (!this.levelData || this.isTransitioning) return;

    // Level is only complete once the boss (if any) is defeated
    const bossDefeated = this.levelData.boss ? !this.levelData.boss.alive : true;
    if (!bossDefeated) return;

    this.isTransitioning = true;

    if (this.currentLevel < 11) {
      this.audio.playLevelComplete();
      this.currentLevel++;
      await this.loadLevel(this.currentLevel);
    } else {
      this.victory();
    }

    this.isTransitioning = false;
  }

  private gameOver() {
    if (this.state === GameState.GAME_OVER) return; // already handled
    this.state = GameState.GAME_OVER;
    this.audio.playGameOver();
    this.hud.showGameOver();
    document.exitPointerLock();
  }

  private victory() {
    this.state = GameState.VICTORY;
    this.audio.playVictory();
    this.hud.showVictory();
    document.exitPointerLock();
  }
}
