import { ACTION } from './InputBus.js';
import { STATE }  from '../core/GameState.js';

// Minimum ms between two gesture-triggered jumps.
// Without this, if the detector briefly drops to NONE and returns to PALM
// while the player holds their hand open, a second jump fires unintentionally.
const JUMP_COOLDOWN_MS = 600;

export class GestureInput {
  constructor(inputBus, gameState) {
    this._bus        = inputBus;
    this._gameState  = gameState;
    this._prev       = 'NONE';
    this._lastJumpAt = 0;
  }

  // Call every animation frame with the current gesture string.
  // All edge detection happens here so GestureModule stays focused on rendering.
  update(gesture) {
    const playing = this._gameState.state === STATE.PLAYING;
    const prev    = this._prev;
    const now     = performance.now();

    if (playing) {
      // JUMP — rising edge (any → PALM) + cooldown against detector flicker
      if (gesture === 'PALM' && prev !== 'PALM') {
        if (now - this._lastJumpAt >= JUMP_COOLDOWN_MS) {
          this._bus.emit(ACTION.JUMP);
          this._lastJumpAt = now;
        }
      }

      // DUCK_START — rising edge (any → FIST)
      if (gesture === 'FIST' && prev !== 'FIST') {
        this._bus.emit(ACTION.DUCK_START);
      }

      // DUCK_END — falling edge (FIST → anything else)
      if (prev === 'FIST' && gesture !== 'FIST') {
        this._bus.emit(ACTION.DUCK_END);
      }
    }

    // Always advance _prev, even when not playing, so edge detection is clean
    // when the game state changes mid-gesture.
    this._prev = gesture;
  }
}
