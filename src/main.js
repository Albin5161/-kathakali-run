import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { GameLoop }        from './core/GameLoop.js';
import { GameState, STATE } from './core/GameState.js';
import { Renderer }        from './core/Renderer.js';
import { checkCollision }  from './core/CollisionSystem.js';
import { loadAssets }      from './core/AssetLoader.js';
import { Performer }       from './entities/Performer.js';
import { ObstacleManager } from './entities/ObstacleManager.js';
import { ScoreManager }    from './entities/ScoreManager.js';
import { InputBus, ACTION } from './input/InputBus.js';
import { KeyboardInput }   from './input/KeyboardInput.js';
import { GestureInput }    from './input/GestureInput.js';
import { obstacles as obstacleTypes } from '../data/obstacles.js';

// ── Canvas setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
const dpr    = window.devicePixelRatio || 1;

canvas.width        = CANVAS_WIDTH  * dpr;
canvas.height       = CANVAS_HEIGHT * dpr;
canvas.style.width  = `${CANVAS_WIDTH}px`;
canvas.style.height = `${CANVAS_HEIGHT}px`;
ctx.scale(dpr, dpr);

// ── Core objects (synchronous — created before asset load) ────────────────────
const gameState       = new GameState();
const performer       = new Performer();
const obstacleManager = new ObstacleManager(obstacleTypes);
const scoreManager    = new ScoreManager();
const inputBus        = new InputBus();
const keyboard        = new KeyboardInput(inputBus, gameState);
const gestureInput    = new GestureInput(inputBus, gameState);

// ── Input subscribers ─────────────────────────────────────────────────────────
inputBus.on(ACTION.START, () => {
  if (gameState.state === STATE.IDLE) {
    gameState.startGame();
  } else if (gameState.state === STATE.GAME_OVER) {
    performer.reset();
    obstacleManager.reset();
    scoreManager.reset();
    gameState.restart();
  }
});

inputBus.on(ACTION.JUMP,       () => performer.jump());
inputBus.on(ACTION.DUCK_START, () => performer.duckStart());
inputBus.on(ACTION.DUCK_END,   () => performer.duckEnd());

keyboard.attach();

// ── Loading screen ────────────────────────────────────────────────────────────
// Show something on the canvas while images are fetched (top-level await below
// pauses the rest of module execution until all assets have loaded or failed).
ctx.fillStyle    = '#dff0f8';
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
ctx.fillStyle    = '#2c3e50';
ctx.font         = '16px monospace';
ctx.textAlign    = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Loading…', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

// ── Asset loading ─────────────────────────────────────────────────────────────
const assets   = await loadAssets();
const renderer = new Renderer(ctx, assets);

// ── Game loop ─────────────────────────────────────────────────────────────────
const loop = new GameLoop((delta) => {
  if (gameState.state === STATE.PLAYING) {
    const tieredUp = scoreManager.update(delta);
    if (tieredUp) {
      gameState.speed = scoreManager.currentTier.speed;
    }

    const tier = scoreManager.currentTier;
    performer.update(delta);
    obstacleManager.update(delta, gameState.speed, tier.minSpawnGap, tier.maxSpawnGap);

    if (checkCollision(performer, obstacleManager.obstacles)) {
      scoreManager.saveHighScore();
      gameState.triggerGameOver();
    }
  }

  renderer.draw(
    gameState,
    performer,
    obstacleManager.obstacles,
    scoreManager.score,
    scoreManager.highScore,
    delta,
    gameState.speed,
  );
});

loop.start();

// ── Player counter ────────────────────────────────────────────────────────────
(async () => {
  const LS_FLAG = 'kathakali_run_played';
  const el      = document.getElementById('player-counter');
  if (!el) return;

  try {
    const firstVisit = !localStorage.getItem(LS_FLAG);
    if (firstVisit) localStorage.setItem(LS_FLAG, '1');
    const res = await fetch('/api/counter', { method: firstVisit ? 'POST' : 'GET' });
    if (!res.ok) throw new Error();
    const { count } = await res.json();
    el.textContent = `Total Players: ${count.toLocaleString()}`;
  } catch {
    // el retains "Total Players: --"
  }
})();

// ── Webcam toggle ─────────────────────────────────────────────────────────────
const webcamBtn      = document.getElementById('webcam-toggle');
const gestureOverlay = document.getElementById('gesture-overlay');
let   gestureModule  = null;
let   webcamEnabled  = false;

webcamBtn.addEventListener('click', async () => {
  if (!webcamEnabled) {
    webcamBtn.disabled    = true;
    webcamBtn.textContent = 'Starting…';

    if (!gestureModule) {
      const { GestureModule } = await import('./gesture/GestureModule.js');
      gestureModule = new GestureModule(gestureOverlay, gestureInput);
    }

    const ok = await gestureModule.enable();

    if (ok) {
      webcamEnabled         = true;
      webcamBtn.textContent = 'Disable Webcam';
      webcamBtn.classList.add('active');
    } else {
      webcamBtn.textContent = 'Webcam Unavailable';
      return;
    }
    webcamBtn.disabled = false;

  } else {
    gestureModule.disable();
    webcamEnabled         = false;
    webcamBtn.textContent = 'Enable Webcam';
    webcamBtn.classList.remove('active');
  }
});
