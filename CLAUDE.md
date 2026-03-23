# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
- **Engine**: Babylon.js 8 + Havok Physics
- **Linguagem**: TypeScript (strict, ES2020)
- **Build**: Vite (base: `/jogo-amora/`, target: es2020)
- **Audio**: Web Audio API (procedural)
- **Dependencias**: simplex-noise (terrain generation)

## Comandos
- `npm run dev` — dev server na porta 3000 (auto-open)
- `npm run build` — build para GitHub Pages
- `npm run preview` — preview do build local

## Arquitetura

### Core Loop
`Game.ts` orquestra tudo: inicializa physics, gerencia `GameState` (MENU → PLAYING → GAME_OVER/VICTORY/TRANSITION), e roda o game loop via `requestAnimationFrame` → `update(dt)` → `scene.render()`.

### Physics (Havok)
- HavokPlugin criado UMA VEZ e reutilizado entre niveis
- `scene.enablePhysics(gravity, plugin)` chamado a cada nivel
- **Padrao dual-node**: physics body em node invisivel (capsule), visual mesh sincronizado por copia de posicao
- Ground check via raycast a cada 50ms (nao a cada frame)
- Damping linear: 0.3-0.5, angular: 100-1000 (lock rotations)
- `@babylonjs/havok` excluido de `optimizeDeps` no Vite (WASM)

### Entidades
- `Entity` (base): position, health, invincibility timer
- `Player`: physicsNode (capsule) + mesh visual separado, lazy model build, 5 HP, power/super charge bars
- `Enemy`: state machine (IDLE → PATROL → CHASE → STUNNED → DEAD), patrol radius=8, detection radius=12
  - Subclasses: `Rabbit`, `Pig`, `Cat`, `Rat`, `Chicken`
- `Cookie`: aliado invocavel (sem physics body)
- `Biscuit`: item coletavel (spinner)

### Systems
- `CombatSystem`: stomp detection (player acima + velY < -2), bark (cone 8m/72°/3dmg/1.5s stun), dano por toque (knockback 8m/s)
- `CameraSystem`: ArcRotateCamera (3rd person), mouse input para alpha/beta, smooth follow com exponential lerp
- `ParticleSystem`: emitStars, emitDamage, emitHeal

### Niveis (12 fases)
1. Prado Verde — campo aberto, coelhos
2. Floresta Sombria — floresta densa, porcos + coelhos
3. Montanha do Trovao — montanhas, raios
4. Caverna Cristalina — cristais, cogumelos, escuro
5. Pantano Nebuloso — neblina, pocas, cipos
6. Castelo do Rei Porco — fortaleza vulcanica, boss final
7-12. Fases adicionais (Praia, Cidade, Jardim, Vulcao, Cemiterio, Torre)

### Input
- WASD (movimento), Space (pulo), Shift (correr), E (bark), Q (super)
- Mouse pointer-lock para camera
- Suporte touch/mobile: joystick virtual + botoes de acao

## Padroes
- Cada Level: funcao `createLevelN(scene, physics)` retorna `LevelData` (scene, terrain, enemies, biscuits, spawnPoint, name, boss)
- Cores definidas em `src/utils/colors.ts` com prefixo `L{N}_`
- Bosses: `isBoss = true` (10 HP, 2.5m stomp range) vs inimigos normais (2 HP, 1.2m stomp range)
- Modelos: MeshBuilder (esferas, cilindros, capsulas) com TransformNode hierarchies
- Transicao entre fases: `Game.loadLevel(index)` com fade overlay CSS (2-3s)
- Morte por queda: Y < -20

## Workflow de Execucao
- **SEMPRE usar equipe de agentes paralelos** para executar tarefas
- Nunca fazer tarefas sozinho — delegar para subagentes
- Usar modelo mais barato que da conta (haiku > sonnet > opus)
- Um objetivo por agente para execucao focada
