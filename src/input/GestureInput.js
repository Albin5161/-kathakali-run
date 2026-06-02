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

    // DEBUG ── log every transition so we can verify state and edge conditions
    if (gesture !== prev) {
      console.log(
        `[GestureInput] ${prev} → ${gesture}`,
        `| state="${this._gameState.state}" playing=${playing}`,
        `| cooldownLeft=${Math.max(0, JUMP_COOLDOWN_MS - (now - this._lastJumpAt)).toFixed(0)}ms`,
      );
    }

    if (playing) {
      // JUMP — rising edge (any → PALM) + cooldown against detector flicker
      if (gesture === 'PALM' && prev !== 'PALM') {
        if (now - this._lastJumpAt >= JUMP_COOLDOWN_MS) {
          console.log('[GestureInput] emitting JUMP');
          this._bus.emit(ACTION.JUMP);
          this._lastJumpAt = now;
        } else {
          console.log(`[GestureInput] JUMP suppressed by cooldown`);
        }
      }

      // DUCK_START — rising edge (any → FIST)
      if (gesture === 'FIST' && prev !== 'FIST') {
        console.log('[GestureInput] emitting DUCK_START');
        this._bus.emit(ACTION.DUCK_START);
      }

      // DUCK_END — falling edge (FIST → anything else)
      if (prev === 'FIST' && gesture !== 'FIST') {
        console.log('[GestureInput] emitting DUCK_END');
        this._bus.emit(ACTION.DUCK_END);
      }
    }

    // Only advance _prev while the game is actually playing.
    // If we advanced it when not playing, a palm/fist shown before the game
    // starts would load _prev with a non-NONE value, and the rising edge would
    // never fire once the game starts (because prev already equals gesture).
    // Keeping _prev='NONE' while idle means the first in-game gesture always
    // triggers its action.
    if (playing) this._prev = gesture;
  }
}
