const MAX_DELTA = 0.1; // seconds — clamps large gaps caused by tab switching

export class GameLoop {
  constructor(tick) {
    this._tick      = tick;
    this._lastTime  = null;
    this._rafId     = null;
    this._started   = false;
    this._frame     = this._frame.bind(this);
  }

  // Starts the loop. Calling start() a second time is a no-op (no double-loop).
  start() {
    if (this._started) return;
    this._started  = true;
    this._lastTime = performance.now();
    this._rafId    = requestAnimationFrame(this._frame);
  }

  _frame(timestamp) {
    const raw   = (timestamp - this._lastTime) / 1000;
    const delta = Math.min(raw, MAX_DELTA);
    this._lastTime = timestamp;

    this._tick(delta);

    this._rafId = requestAnimationFrame(this._frame);
  }
}
