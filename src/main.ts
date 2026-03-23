import { Engine } from '@babylonjs/core/Engines/engine';
import { Game } from './core/Game';

console.log('[AMORA] main.ts loaded');
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
console.log('[AMORA] canvas:', canvas);

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const game = new Game(engine, canvas);

console.log('[AMORA] game created, initializing...');
game.init().then(() => {
  console.log('[AMORA] game initialized successfully');
}).catch((err) => {
  console.error('[AMORA] init error:', err);
});

window.addEventListener('resize', () => engine.resize());
