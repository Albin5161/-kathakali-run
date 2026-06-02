import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { GameLoop }       from './core/GameLoop.js';
import { GameState, STATE } from './core/GameState.js';
import { Renderer }       from './core/Renderer.js';
import { checkCollision } from './core/CollisionSystem.js';
import { Performer }      from './entities/Performer.js';
import { ObstacleManager } from './entities/ObstacleManager.js';
import { ScoreManager }   from './entities/ScoreManager.js';
import { InputBus, ACTION } from './input/InputBus.js';
import { KeyboardInput }  from './input/KeyboardInput.js';
import { GestureInput }   from './input/GestureInput.js';
import { obstacles as obstacleTypes } from '../data/obstacles.js';

// ── Canvas setup ──────────────────────────────────────────────────────────────
// Physical pixel size = logical size × devicePixelRatio, so sprites are sharp
// on Retina / HiDPI displays. All draw calls use logical coordinates;
// the context transform handles the scaling transparently.
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
const dpr    = window.devicePixelRatio || 1;

canvas.width        = CANVAS_WIDTH  * dpr;
canvas.height       = CANVAS_HEIGHT * dpr;
canvas.style.width  = `${CANVAS_WIDTH}px`;
canvas.style.height = `${CANVAS_HEIGHT}px`;
ctx.scale(dpr, dpr);

// ── Core objects ──────────────────────────────────────────────────────────────
const gameState       = new GameState();
const performer       = new Performer();
const renderer        = new Renderer(ctx);
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
    gameState.restart();   // also resets gameState.speed to INITIAL_SPEED
  }
});

inputBus.on(ACTION.JUMP,       () => performer.jump());
inputBus.on(ACTION.DUCK_START, () => performer.duckStart());
inputBus.on(ACTION.DUCK_END,   () => performer.duckEnd());

keyboard.attach();

// ── Game loop ─────────────────────────────────────────────────────────────────
// The loop always runs. All update logic is gated on PLAYING state.
const loop = new GameLoop((delta) => {
  if (gameState.state === STATE.PLAYING) {
    // Score + tier advancement
    const tieredUp = scoreManager.update(delta);
    if (tieredUp) {
      // Sync world speed to the newly active tier (pixels per second)
      gameState.speed = scoreManager.currentTier.speed;
    }

    // Entity updates — pass current tier's spawn gaps to ObstacleManager
    const tier = scoreManager.currentTier;
    performer.update(delta);
    obstacleManager.update(delta, gameState.speed, tier.minSpawnGap, tier.maxSpawnGap);

    // Collision — save high score then trigger game over
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
  );
});

loop.start();

// ── Webcam toggle ─────────────────────────────────────────────────────────────
// GestureModule is loaded via dynamic import() on the first click so it never
// appears in the initial page bundle — keeping startup unaffected.
const webcamBtn      = document.getElementById('webcam-toggle');
const gestureOverlay = document.getElementById('gesture-overlay');
let   gestureModule  = null;
let   webcamEnabled  = false;

webcamBtn.addEventListener('click', async () => {
  if (!webcamEnabled) {
    webcamBtn.disabled = true;
    webcamBtn.textContent = 'Starting…';

    // Lazy-load on first use
    if (!gestureModule) {
      const { GestureModule } = await import('./gesture/GestureModule.js');
      gestureModule = new GestureModule(gestureOverlay, gestureInput);
    }

    const ok = await gestureModule.enable();

    if (ok) {
      webcamEnabled = true;
      webcamBtn.textContent = 'Disable Webcam';
      webcamBtn.classList.add('active');
    } else {
      webcamBtn.textContent = 'Webcam Unavailable';
      // Leave disabled — access was denied or the API is not present
      return;
    }
    webcamBtn.disabled = false;

  } else {
    gestureModule.disable();
    webcamEnabled = false;
    webcamBtn.textContent = 'Enable Webcam';
    webcamBtn.classList.remove('active');
  }
});
