import { ACTION } from './InputBus.js';
import { STATE }  from '../core/GameState.js';

// Minimum ms between two gesture-triggered jumps.
const JUMP_COOLDOWN_MS = 600;

// How long to persist the last non-NONE gesture when the detector returns NONE.
// Absorbs single bad frames (occlusion, angle shift) without resetting the
// rising-edge detector. Only applies in the gesture→NONE direction; a new
// non-NONE gesture always takes effect immediately.
const GESTURE_PERSISTENCE_MS = 120;

export class GestureInput {
  constructor(inputBus, gameState) {
    this._bus           = inputBus;
    this._gameState     = gameState;
    this._prev          = 'NONE';
    this._lastJumpAt    = 0;
    this._lastNonNone   = 'NONE'; // last gesture that was not NONE
    this._lastNonNoneAt = 0;      // performance.now() when that gesture was last seen
  }

  // Call on every detector result with the raw gesture string.
  // Stabilizes brief NONE frames, then runs edge detection.
  update(rawGesture) {
    const now     = performance.now();
    const playing = this._gameState.state === STATE.PLAYING;

    // Persistence layer — absorb brief NONE frames so they don't reset _prev.
    // A genuine non-NONE gesture always wins immediately (rising direction is
    // never delayed). NONE only wins once it has been stable for GESTURE_PERSISTENCE_MS.
    let gesture;
    if (rawGesture !== 'NONE') {
      this._lastNonNone   = rawGesture;
      this._lastNonNoneAt = now;
      gesture = rawGesture;
    } else if (now - this._lastNonNoneAt < GESTURE_PERSISTENCE_MS) {
      gesture = this._lastNonNone; // hold through brief NONE
    } else {
      gesture = 'NONE';
    }

    const prev = this._prev;

    // Log every stabilized transition; note raw value when persistence fires
    if (gesture !== prev) {
      const rawNote = rawGesture !== gesture ? `  (raw: ${rawGesture})` : '';
      console.log(
        `[GestureInput] ${prev} → ${gesture}${rawNote}`,
        `| state="${this._gameState.state}" playing=${playing}`,
        `| cooldownLeft=${Math.max(0, JUMP_COOLDOWN_MS - (now - this._lastJumpAt)).toFixed(0)}ms`,
      );
    }

    if (playing) {
      // JUMP — rising edge (any → PALM) + cooldown
      if (gesture === 'PALM' && prev !== 'PALM') {
        if (now - this._lastJumpAt >= JUMP_COOLDOWN_MS) {
          console.log('[GestureInput] Emitting ACTION.JUMP');
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

    // Only advance _prev while playing (see original comment for rationale).
    if (playing) this._prev = gesture;
  }
}
