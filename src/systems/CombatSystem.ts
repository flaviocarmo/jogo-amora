import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Biscuit } from '../entities/items/Biscuit';
import { AudioManager } from '../core/AudioManager';
import { distanceXZ } from '../utils/math';

export class CombatSystem {
  private lastPowerReady = false;

  update(
    player: Player,
    enemies: Enemy[],
    biscuits: Biscuit[],
    audio: AudioManager,
    onDamage: () => void,
    onHeal: () => void,
    onPowerReady: () => void,
    onEnemyKill: () => void,
  ) {
    if (!player.alive) return;

    const playerPos = player.position;

    // Check stomp on enemies
    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.body) continue;

      const enemyPos = enemy.position;
      const dist = distanceXZ(playerPos.x, playerPos.z, enemyPos.x, enemyPos.z);
      const stompRange = enemy.isBoss ? 2.5 : 1.2;

      // Stomp detection: player above enemy and falling
      if (dist < stompRange && player.getVelocityY() < -2) {
        const heightDiff = playerPos.y - enemyPos.y;
        if (heightDiff > 0.5) {
          // Stomp!
          if (enemy.takeDamage(1)) {
            enemy.onTakeDamage();
            enemy.stun(0.8);
            player.bounce();
            audio.playStomp();
            if (!enemy.alive) {
              onEnemyKill();
            }
          }
          continue;
        }
      }

      // Enemy touches player = damage
      if (dist < stompRange * 0.8 && player.invincibleTimer <= 0) {
        const heightDiff = playerPos.y - enemyPos.y;
        if (heightDiff < 0.5) { // Not above = touching
          if (player.takeDamage(1)) {
            player.invincibleTimer = 1.5;
            audio.playDamage();
            onDamage();
            // Knockback
            if (player.body) {
              const dx = playerPos.x - enemyPos.x;
              const dz = playerPos.z - enemyPos.z;
              const d = Math.sqrt(dx * dx + dz * dz) || 1;
              player.body.setLinvel({
                x: (dx / d) * 8,
                y: 5,
                z: (dz / d) * 8,
              }, true);
            }
          }
        }
      }
    }

    // Bark power attack
    if (!this.lastPowerReady && player.isPowerReady) {
      audio.playPowerReady();
      onPowerReady();
    }
    this.lastPowerReady = player.isPowerReady;

    // Biscuit collection
    for (const biscuit of biscuits) {
      if (biscuit.collected) continue;
      const dist = playerPos.distanceTo(biscuit.mesh.position);
      if (dist < 1.5) {
        biscuit.collect();
        if (player.health < player.maxHealth) {
          player.heal(1);
          audio.playHeal();
          onHeal();
        } else {
          audio.playCollect();
        }
      }
    }
  }

  executeBark(player: Player, enemies: Enemy[], audio: AudioManager, scene: THREE.Scene, onEnemyKill: () => void) {
    if (!player.usePower()) return;
    audio.playBark();

    // Add bark wave to scene
    if (player.barkWaveMesh) {
      scene.add(player.barkWaveMesh);
    }

    // Damage enemies in front cone
    const playerPos = player.position;
    const barkDir = player.getBarkDirection();
    const barkRange = 8;
    const barkAngle = Math.PI * 0.4; // ~72 degree cone

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const enemyPos = enemy.position;
      const dist = distanceXZ(playerPos.x, playerPos.z, enemyPos.x, enemyPos.z);
      if (dist > barkRange) continue;

      // Check if enemy is in front cone
      const toEnemy = new THREE.Vector3(
        enemyPos.x - playerPos.x, 0, enemyPos.z - playerPos.z
      ).normalize();
      const dot = barkDir.dot(toEnemy);
      if (dot > Math.cos(barkAngle)) {
        // Hit!
        if (enemy.takeDamage(3)) {
          enemy.onTakeDamage();
          enemy.stun(1.5);
          // Knockback from bark
          if (enemy.body) {
            enemy.body.setLinvel({
              x: toEnemy.x * 15,
              y: 5,
              z: toEnemy.z * 15,
            }, true);
          }
          if (!enemy.alive) {
            onEnemyKill();
          }
        }
      }
    }
  }
}
