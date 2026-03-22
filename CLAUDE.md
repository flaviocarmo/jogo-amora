# Jogo Amora - Projeto

## Stack
- **Engine**: Three.js + Rapier3D (physics)
- **Linguagem**: TypeScript
- **Build**: Vite
- **Audio**: Web Audio API (procedural)

## Arquitetura
- `src/core/` - Game loop, InputManager, PhysicsWorld, AudioManager
- `src/entities/` - Player (Amora), Enemy base, Rabbit, Pig, Biscuit
- `src/scenes/` - Level1-6 (factory functions que retornam LevelData)
- `src/systems/` - CameraSystem, CombatSystem, ParticleSystem
- `src/ui/` - HUD (hearts, power bar, boss health)
- `src/world/` - Terrain, Vegetation, Rocks, Skybox
- `src/utils/` - colors.ts (paletas por fase), math.ts

## Fases
1. Prado Verde - campo aberto, coelhos
2. Floresta Sombria - floresta densa, porcos + coelhos
3. Montanha do Trovao - montanhas, raios, muitos inimigos
4. Caverna Cristalina - cristais brilhantes, cogumelos, escuro
5. Pantano Nebuloso - neblina, poças, cipós
6. Castelo do Rei Porco - fortaleza vulcanica, lava, boss final

## Workflow de Execucao
- **SEMPRE usar equipe de agentes paralelos** para executar tarefas
- Nunca fazer tarefas sozinho - delegar para subagentes
- Usar modelo mais barato que da conta (haiku > sonnet > opus)
- Um objetivo por agente para execucao focada

## Padroes
- Cada Level e uma funcao `createLevelN(physics)` que retorna `LevelData`
- Cores definidas em `src/utils/colors.ts` com prefixo `L{N}_`
- Bosses usam `isBoss = true` no construtor (10 coracoes)
- Inimigos normais tem 2 coracoes
- Game.ts gerencia transicao entre fases via `loadLevel(index)`
