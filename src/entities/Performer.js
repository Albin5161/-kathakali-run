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

    this._jumpStartTime = 0;
    this._jumpStartY    = 0;
    this._apexY         = 0;
    this._apexTime      = 0;
    this._apexReached   = false;
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

    this._jumpStartTime = performance.now();
    this._jumpStartY    = this.y;
    this._apexY         = this.y;
    this._apexTime      = 0;
    this._apexReached   = false;

    console.log(
      `[Jump] START  t=${this._jumpStartTime.toFixed(2)}ms` +
      `  velocityY=${JUMP_VELOCITY}px/s  gravity=${GRAVITY}px/s²` +
      `  startY=${this.y.toFixed(2)}`
    );
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
  // velocityY is never written by any external code while airborne:
  //   duckStart() and duckEnd() return early when state === JUMPING.
  //   GestureInput can only call jump() (ignored) or duckStart() (ignored).
  update(delta) {
    if (this.state !== PERFORMER_STATE.JUMPING) return;

    const prevVY = this.velocityY;
    this.velocityY += GRAVITY * delta;
    this.y         += this.velocityY * delta;

    // Apex: velocityY crosses from negative (rising) to non-negative (falling).
    if (!this._apexReached && prevVY < 0 && this.velocityY >= 0) {
      this._apexReached = true;
      this._apexY       = this.y;
      this._apexTime    = performance.now();
      const timeToApex  = this._apexTime - this._jumpStartTime;
      const apexHeight  = this._jumpStartY - this._apexY;
      console.log(
        `[Jump] APEX  y=${this._apexY.toFixed(2)}` +
        `  height=${apexHeight.toFixed(2)}px` +
        `  timeToApex=${timeToApex.toFixed(2)}ms`
      );
    }

    // Clamp to ground and transition back to running on landing.
    if (this.y >= GROUND_Y - PERFORMER_STAND_HEIGHT) {
      this.y         = GROUND_Y - PERFORMER_STAND_HEIGHT;
      this.velocityY = 0;
      this.state     = PERFORMER_STATE.RUNNING;

      const landTime   = performance.now();
      const airTime    = landTime - this._jumpStartTime;
      const apexHeight = this._jumpStartY - this._apexY;
      const timeToApex = this._apexTime - this._jumpStartTime;

      // Theoretical values for direct comparison
      const theoreticalApex    = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
      const theoreticalAirTime = (2 * Math.abs(JUMP_VELOCITY) / GRAVITY) * 1000;
      const theoreticalApexT   = theoreticalAirTime / 2;

      console.log(`[Jump] LAND  t=${landTime.toFixed(2)}ms`);
      console.table({
        'Jump Velocity (px/s)':        { measured: JUMP_VELOCITY,              expected: JUMP_VELOCITY },
        'Gravity (px/s²)':             { measured: GRAVITY,                    expected: GRAVITY       },
        'Apex Height (px)':            { measured: +apexHeight.toFixed(2),     expected: +theoreticalApex.toFixed(2)    },
        'Time to Apex (ms)':           { measured: +timeToApex.toFixed(2),     expected: +theoreticalApexT.toFixed(2)   },
        'Total Air Time (ms)':         { measured: +airTime.toFixed(2),        expected: +theoreticalAirTime.toFixed(2) },
      });
    }
  }

  // Returns the performer to its initial standing position.
  reset() {
    this.y         = GROUND_Y - PERFORMER_STAND_HEIGHT;
    this.velocityY = 0;
    this.state     = PERFORMER_STATE.RUNNING;
  }
}
