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
// The canvas keeps its 800×300 logical size; CSS scales it to fit the stage.
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
const dpr    = window.devicePixelRatio || 1;

canvas.width  = CANVAS_WIDTH  * dpr;
canvas.height = CANVAS_HEIGHT * dpr;
ctx.scale(dpr, dpr);

// ── Core objects (synchronous — created before asset load) ────────────────────
const gameState       = new GameState();
const performer       = new Performer();
const obstacleManager = new ObstacleManager(obstacleTypes);
const scoreManager    = new ScoreManager();
const inputBus        = new InputBus();
const keyboard        = new KeyboardInput(inputBus, gameState);
const gestureInput    = new GestureInput(inputBus, gameState);

// ── Page UI (curtain, score, hints) ───────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const stage      = $('stage');
const curtain    = $('curtain');
const hud        = $('hud');
const panelStart = $('panel-start');
const panelOver  = $('panel-over');
const btnStart   = $('btn-start');

// A restart is ignored for this long after a crash, so a jump pressed at the
// moment of impact does not skip the game-over curtain.
const RESTART_GUARD_MS = 500;

const isTouch = window.matchMedia('(pointer: coarse)').matches;

let assetsReady   = false;
let webcamEnabled = false;
let gameOverAt    = 0;
let newBest       = false;
let shownState    = STATE.IDLE;
let shownScore    = -1;

const fmt = (n) => String(Math.floor(n)).padStart(5, '0');

function updateHints() {
  const text = webcamEnabled ? 'or show your palm'
             : isTouch       ? ''
             :                 'or press Space';
  $('hint-start').textContent = text;
  $('hint-again').textContent = text;
}

function showState(state) {
  if (state === STATE.PLAYING) {
    curtain.classList.add('down');
    hud.hidden = false;
    $('hud-best').textContent = fmt(scoreManager.highScore);
    $('hud-best-row').hidden  = scoreManager.highScore === 0;
  } else if (state === STATE.GAME_OVER) {
    $('over-score').textContent      = fmt(scoreManager.score);
    $('over-best').textContent       = fmt(scoreManager.highScore);
    $('over-best-label').textContent = newBest ? 'New best' : 'Best';
    panelStart.hidden = true;
    panelOver.hidden  = false;
    curtain.classList.remove('down');
  }
}

updateHints();

// ── Input subscribers ─────────────────────────────────────────────────────────
inputBus.on(ACTION.START, () => {
  if (!assetsReady) return;

  if (gameState.state === STATE.IDLE) {
    gameState.startGame();
  } else if (gameState.state === STATE.GAME_OVER) {
    if (performance.now() - gameOverAt < RESTART_GUARD_MS) return;
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

// Buttons on the curtain
for (const id of ['btn-start', 'btn-again']) {
  $(id).addEventListener('click', (e) => {
    e.currentTarget.blur(); // so Space afterwards jumps instead of pressing the button again
    inputBus.emit(ACTION.START);
  });
}

// Click or tap the stage to jump
stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  if (gameState.state === STATE.PLAYING) inputBus.emit(ACTION.JUMP);
});

// Touch buttons (shown on phones and tablets)
$('pad-jump').addEventListener('pointerdown', () => {
  inputBus.emit(gameState.state === STATE.PLAYING ? ACTION.JUMP : ACTION.START);
});

const padDuck = $('pad-duck');
padDuck.addEventListener('pointerdown', () => inputBus.emit(ACTION.DUCK_START));
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  padDuck.addEventListener(type, () => inputBus.emit(ACTION.DUCK_END));
}

// ── Loading screen ────────────────────────────────────────────────────────────
// Show something on the canvas while images are fetched (top-level await below
// pauses the rest of module execution until all assets have loaded or failed).
// The curtain covers the stage meanwhile; its Start button unlocks after load.
ctx.fillStyle = '#dff0f8';
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

// ── Webcam toggle ─────────────────────────────────────────────────────────────
const webcamBtn      = $('webcam-toggle');
const gestureOverlay = $('gesture-overlay');
const camStatus      = $('cam-status');
const chips          = { PALM: $('g-palm'), FIST: $('g-fist') };
let   gestureModule  = null;
let   shownGesture   = 'NONE';

const CAM_TEXT = {
  off      : 'Turn on your camera and hold your hand up. Your video stays on this device.',
  loading  : 'Loading hand tracking…',
  ready    : 'Ready. Show your palm to start.',
  denied   : 'The camera is blocked. Allow it in your browser, then try again.',
  missing  : 'This browser has no camera access. Use the keyboard instead.',
  failed   : 'Hand tracking did not load. You can still use the keyboard.',
};

// GestureModule reports its pipeline status here (see GestureModule._setStatus).
function onCamStatus(status) {
  if (status === 'loading model')       camStatus.textContent = CAM_TEXT.loading;
  else if (status === 'detector ready') camStatus.textContent = CAM_TEXT.ready;
  else if (status.startsWith('error'))  camStatus.textContent = CAM_TEXT.failed;
}

// Sits between GestureModule and GestureInput: forwards every result to the
// game, lights up the matching guide, and lets an open palm start a run.
const gestureSink = {
  update(gesture) {
    gestureInput.update(gesture);
    if (gesture === shownGesture) return;

    const rising = gesture === 'PALM' && shownGesture !== 'PALM';
    shownGesture = gesture;
    chips.PALM.classList.toggle('on', gesture === 'PALM');
    chips.FIST.classList.toggle('on', gesture === 'FIST');

    if (rising && gameState.state !== STATE.PLAYING) {
      inputBus.emit(ACTION.START);
      // The palm that started the run should not also count as a jump.
      if (gameState.state === STATE.PLAYING) gestureInput.prime('PALM');
    }
  },
};

webcamBtn.addEventListener('click', async () => {
  if (!webcamEnabled) {
    webcamBtn.disabled    = true;
    webcamBtn.textContent = 'Starting…';

    if (!gestureModule) {
      const { GestureModule } = await import('./gesture/GestureModule.js');
      gestureModule = new GestureModule(gestureOverlay, gestureSink, onCamStatus);
    }

    const ok = await gestureModule.enable();
    webcamBtn.disabled = false;

    if (ok) {
      webcamEnabled         = true;
      webcamBtn.textContent = 'Turn off camera';
      webcamBtn.classList.add('is-on');
    } else {
      webcamBtn.textContent = 'Turn on camera';
      camStatus.textContent = navigator.mediaDevices?.getUserMedia ? CAM_TEXT.denied : CAM_TEXT.missing;
    }

  } else {
    gestureModule.disable();
    webcamEnabled         = false;
    webcamBtn.textContent = 'Turn on camera';
    webcamBtn.classList.remove('is-on');
    camStatus.textContent = CAM_TEXT.off;
  }
  updateHints();
});

// ── Player counter ────────────────────────────────────────────────────────────
(async () => {
  const LS_FLAG = 'kathakali_run_played';
  const el      = $('player-counter');
  if (!el) return;

  try {
    const firstVisit = !localStorage.getItem(LS_FLAG);
    if (firstVisit) localStorage.setItem(LS_FLAG, '1');
    const res = await fetch('/api/counter', { method: firstVisit ? 'POST' : 'GET' });
    if (!res.ok) throw new Error();
    const { count } = await res.json();
    el.textContent = `${count.toLocaleString()} players so far`;
    el.hidden      = false;
  } catch {
    // counter stays hidden
  }
})();

// ── Asset loading ─────────────────────────────────────────────────────────────
const assets   = await loadAssets();
const renderer = new Renderer(ctx, assets);

assetsReady          = true;
btnStart.disabled    = false;
btnStart.textContent = 'Start';

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
      newBest    = Math.floor(scoreManager.score) > scoreManager.highScore;
      gameOverAt = performance.now();
      scoreManager.saveHighScore();
      gameState.triggerGameOver();
    }
  }

  renderer.draw(
    gameState,
    performer,
    obstacleManager.obstacles,
    delta,
    gameState.speed,
  );

  // Keep the page UI in step with the game
  if (gameState.state !== shownState) {
    shownState = gameState.state;
    showState(shownState);
  }

  const score = Math.floor(scoreManager.score);
  if (score !== shownScore) {
    shownScore = score;
    $('hud-score').textContent = fmt(score);
  }
});

loop.start();
