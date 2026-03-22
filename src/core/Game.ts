import * as THREE from 'three';
import { InputManager } from './InputManager';
import { PhysicsWorld } from './PhysicsWorld';
import { AudioManager } from './AudioManager';
import { CameraSystem } from '../systems/CameraSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Biscuit } from '../entities/items/Biscuit';
import { HUD } from '../ui/HUD';
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

export class Game {
  private renderer: THREE.WebGLRenderer;
  private input: InputManager;
  private physics: PhysicsWorld;
  private audio: AudioManager;
  private cameraSystem: CameraSystem;
  private combatSystem: CombatSystem;
  private particleSystem!: ParticleSystem;
  private hud: HUD;
  private player: Player;
  private cookie: Cookie;

  private state = GameState.MENU;
  private currentLevel = 0;
  private levelData: LevelData | null = null;
  private scene: THREE.Scene | null = null;

  private readonly FIXED_STEP = 1 / 60;
  private accumulator = 0;
  private lastTime = 0;
  private killCount = 0;
  private totalEnemies = 0;
  private isTransitioning = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.input = new InputManager(canvas);
    this.physics = new PhysicsWorld();
    this.audio = new AudioManager();
    this.cameraSystem = new CameraSystem(window.innerWidth / window.innerHeight);
    this.combatSystem = new CombatSystem();
    this.hud = new HUD();
    this.player = new Player();
    this.cookie = new Cookie();

    window.addEventListener('resize', () => this.onResize());

    // Menu buttons
    document.getElementById('start-btn')!.addEventListener('click', () => this.startGame());
    document.getElementById('retry-btn')!.addEventListener('click', () => this.startGame());
    document.getElementById('replay-btn')!.addEventListener('click', () => this.startGame());
  }

  async init() {
    console.log('[GAME] init: starting physics...');
    await this.physics.init();
    console.log('[GAME] init: physics ready, starting game loop');
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private async startGame() {
    console.log('[GAME] startGame called');
    this.hud.hideMenu();
    this.hud.hideGameOver();
    this.hud.hideVictory();
    this.currentLevel = 0;
    this.isTransitioning = false;
    this.player = new Player();
    console.log('[GAME] loading level 0...');
    try {
      await this.loadLevel(0);
      console.log('[GAME] level 0 loaded, state:', this.state);
    } catch (err) {
      console.error('[GAME] loadLevel error:', err);
    }
    this.state = GameState.PLAYING;
    console.log('[GAME] state set to PLAYING');
  }

  private async loadLevel(levelIndex: number) {
    console.log('[GAME] loadLevel:', levelIndex);
    this.state = GameState.TRANSITION;

    // Cleanup previous physics bodies
    if (this.levelData) {
      // Rapier world is re-created per level for simplicity
    }
    console.log('[GAME] re-initializing physics...');
    await this.physics.init(); // Reset physics world
    console.log('[GAME] physics re-initialized');

    const levelNames = [
      'Prado Verde', 'Floresta Sombria', 'Montanha do Trovao',
      'Caverna Cristalina', 'Pantano Nebuloso', 'Castelo do Rei Porco',
      'Praia Tropical', 'Cidade Abandonada', 'Jardim Encantado',
      'Vulcao Ardente', 'Cemiterio Sombrio', 'Torre do Imperador',
    ];
    await this.hud.showLevelTransition(levelNames[levelIndex] || 'Fase ???');
    console.log('[GAME] level transition shown');

    // Create level
    console.log('[GAME] creating level data...');
    let data: LevelData;
    switch (levelIndex) {
      case 0: data = createLevel1(this.physics); break;
      case 1: data = createLevel2(this.physics); break;
      case 2: data = createLevel3(this.physics); break;
      case 3: data = createLevel4(this.physics); break;
      case 4: data = createLevel5(this.physics); break;
      case 5: data = createLevel6(this.physics); break;
      case 6: data = createLevel7(this.physics); break;
      case 7: data = createLevel8(this.physics); break;
      case 8: data = createLevel9(this.physics); break;
      case 9: data = createLevel10(this.physics); break;
      case 10: data = createLevel11(this.physics); break;
      case 11: data = createLevel12(this.physics); break;
      default: data = createLevel1(this.physics);
    }
    console.log('[GAME] level created, enemies:', data.enemies.length, 'biscuits:', data.biscuits.length);

    this.levelData = data;
    this.scene = data.scene;

    // Add player to scene
    this.player.initPhysics(this.physics, data.spawnPoint.x, data.spawnPoint.y, data.spawnPoint.z);
    this.scene.add(this.player.mesh);

    // Add Cookie (ally) to scene
    this.cookie = new Cookie();
    this.scene.add(this.cookie.mesh);

    // Particle system
    this.particleSystem = new ParticleSystem(this.scene);

    // Track enemies
    this.killCount = 0;
    this.totalEnemies = data.enemies.length;

    // Update HUD
    this.hud.updateHearts(this.player.health, this.player.maxHealth);
    this.hud.updatePowerBar(0, false);
    this.hud.updateSuperBar(0, false);

    if (data.boss) {
      this.audio.playBossAppear();
    }

    this.state = GameState.PLAYING;
  }

  private gameLoop = () => {
    requestAnimationFrame(this.gameLoop);

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.1); // Cap delta

    if (this.state === GameState.PLAYING) {
      this.input.update();

      this.accumulator += dt;
      while (this.accumulator >= this.FIXED_STEP) {
        this.fixedUpdate(this.FIXED_STEP);
        this.accumulator -= this.FIXED_STEP;
      }

      this.render();
      this.input.afterUpdate();
    } else if (this.state === GameState.MENU || this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
      // Simple rotating camera for menu
      if (this.scene) {
        this.cameraSystem.camera.position.x = Math.sin(now * 0.0003) * 15;
        this.cameraSystem.camera.position.z = Math.cos(now * 0.0003) * 15;
        this.cameraSystem.camera.position.y = 10;
        this.cameraSystem.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.cameraSystem.camera);
      }
    }
  };

  private fixedUpdate(dt: number) {
    if (!this.levelData || !this.scene) return;

    // Physics step
    this.physics.step(dt);

    // Player update
    this.player.updatePlayer(dt, this.input, this.cameraSystem, this.physics);

    // Bark input
    if (this.input.bark) {
      this.combatSystem.executeBark(
        this.player,
        this.levelData.enemies,
        this.audio,
        this.scene,
        () => {
          this.killCount++;
          this.checkLevelComplete();
        }
      );
    }

    // Super summon input (Q key)
    if (this.input.isSuperPressed && this.player.isSuperReady) {
      if (this.player.useSuper()) {
        const spawnPos = this.player.position.clone();
        spawnPos.x += Math.sin(this.player.mesh.rotation.y) * 3;
        spawnPos.z += Math.cos(this.player.mesh.rotation.y) * 3;
        this.cookie.summon(spawnPos);
        this.audio.playPowerReady(); // Reuse power ready sound for summon
      }
    }

    // Update Cookie ally
    if (this.cookie.alive && this.levelData) {
      this.cookie.update(dt, this.levelData.enemies);
      // Add bark wave to scene if created
      if (this.cookie.barkWaveMesh && !this.cookie.barkWaveMesh.parent) {
        this.scene.add(this.cookie.barkWaveMesh);
      }
      // Check if Cookie killed any enemies
      for (const enemy of this.levelData.enemies) {
        if (!enemy.alive) {
          // Will be caught by existing kill tracking
        }
      }
    }

    // Camera
    this.cameraSystem.update(
      this.player.position,
      this.input.mouseDX,
      this.input.mouseDY,
      dt
    );

    // Enemies
    const playerPos = this.player.position;
    for (const enemy of this.levelData.enemies) {
      enemy.updateAI(dt, playerPos);
    }

    // Biscuits
    for (const biscuit of this.levelData.biscuits) {
      biscuit.update(dt);
    }

    // Combat
    this.combatSystem.update(
      this.player,
      this.levelData.enemies,
      this.levelData.biscuits,
      this.audio,
      () => {
        // onDamage
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
        // onPowerReady
        this.hud.updatePowerBar(1, true);
      },
      () => {
        // onEnemyKill
        this.killCount++;
        this.particleSystem.emitStars(this.player.position);
        this.checkLevelComplete();
      }
    );

    // Update HUD
    this.hud.updatePowerBar(this.player.powerPercent, this.player.isPowerReady);
    this.hud.updateSuperBar(this.player.superPercent, this.player.isSuperReady);

    // Boss health bar
    if (this.levelData.boss && this.levelData.boss.alive) {
      this.hud.showBossHealth(
        this.levelData.boss.bossName,
        this.levelData.boss.health / this.levelData.boss.maxHealth
      );
    } else {
      this.hud.hideBossHealth();
    }

    // Particles
    this.particleSystem.update(dt);

    // Fall off world check — instant death
    if (this.player.position.y < -20) {
      this.player.health = 0;
      this.player.alive = false;
      this.hud.updateHearts(0, this.player.maxHealth);
      this.hud.flashDamage();
      this.gameOver();
    }
  }

  private render() {
    if (!this.scene) return;
    this.renderer.render(this.scene, this.cameraSystem.camera);
  }

  private async checkLevelComplete() {
    if (!this.levelData || this.isTransitioning) return;

    // Level complete when boss is defeated
    const bossDefeated = this.levelData.boss ? !this.levelData.boss.alive : true;
    if (!bossDefeated) return;

    this.isTransitioning = true;

    if (this.currentLevel < 11) {
      this.audio.playLevelComplete();
      this.currentLevel++;
      // Preserve player health across levels
      const currentHealth = this.player.health;
      const currentPower = this.player.powerCharge;
      await this.loadLevel(this.currentLevel);
      this.player.health = currentHealth;
      this.player.powerCharge = currentPower;
    } else {
      this.victory();
    }

    this.isTransitioning = false;
  }

  private gameOver() {
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

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraSystem.resize(w / h);
  }
}
