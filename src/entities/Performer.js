import {
  GRAVITY,
  JUMP_VELOCITY,
  GROUND_Y,
  PERFORMER_X,
  PERFORMER_STAND_WIDTH,
  PERFORMER_STAND_HEIGHT,
  PERFORMER_DUCK_HEIGHT,
} from '../config.js';

export const PERFORMER_STATE = {
  RUNNING: 'RUNNING',
  JUMPING: 'JUMPING',
  DUCKING: 'DUCKING',
};

export class Performer {
  constructor() {
    this.x         = PERFORMER_X;
    this.y         = GROUND_Y - PERFORMER_STAND_HEIGHT;
    this.velocityY = 0;
    this.state     = PERFORMER_STATE.RUNNING;
  }

  // Returns the current axis-aligned hitbox in logical canvas coordinates.
  // Height shrinks when ducking; x and width are always fixed.
  get hitbox() {
    const height = this.state === PERFORMER_STATE.DUCKING
      ? PERFORMER_DUCK_HEIGHT
      : PERFORMER_STAND_HEIGHT;
    return {
      x:      this.x,
      y:      this.y,
      width:  PERFORMER_STAND_WIDTH,
      height,
    };
  }

  // Initiates a jump. Ignored if already airborne (no double-jump).
  jump() {
    if (this.state === PERFORMER_STATE.JUMPING) return;
    this.state     = PERFORMER_STATE.JUMPING;
    this.velocityY = JUMP_VELOCITY;
    console.log(`[Jump] START  velocityY=${JUMP_VELOCITY}  y=${this.y.toFixed(2)}`);
  }

  // Switches to the ducking stance. Ignored while airborne.
  duckStart() {
    if (this.state === PERFORMER_STATE.JUMPING) return;
    this.state = PERFORMER_STATE.DUCKING;
    this.y     = GROUND_Y - PERFORMER_DUCK_HEIGHT;
  }

  // Returns to the running stance from a duck.
  duckEnd() {
    if (this.state !== PERFORMER_STATE.DUCKING) return;
    this.state = PERFORMER_STATE.RUNNING;
    this.y     = GROUND_Y - PERFORMER_STAND_HEIGHT;
  }

  // Advances physics by deltaSeconds. Only the JUMPING state applies gravity.
  update(delta) {
    if (this.state !== PERFORMER_STATE.JUMPING) return;

    const prevVY = this.velocityY;
    this.velocityY += GRAVITY * delta;
    this.y         += this.velocityY * delta;

    console.log(
      `[Jump] GRAVITY  delta=${delta.toFixed(4)}s` +
      `  vy: ${prevVY.toFixed(1)}→${this.velocityY.toFixed(1)}` +
      `  y=${this.y.toFixed(2)}`
    );

    // Clamp to ground and transition back to running on landing
    if (this.y >= GROUND_Y - PERFORMER_STAND_HEIGHT) {
      this.y         = GROUND_Y - PERFORMER_STAND_HEIGHT;
      this.velocityY = 0;
      this.state     = PERFORMER_STATE.RUNNING;
      console.log(`[Jump] LAND  y=${this.y.toFixed(2)}`);
    }
  }

  // Returns the performer to its initial standing position.
  reset() {
    this.y         = GROUND_Y - PERFORMER_STAND_HEIGHT;
    this.velocityY = 0;
    this.state     = PERFORMER_STATE.RUNNING;
  }
}
