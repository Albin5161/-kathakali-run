const MAX_DELTA    = 0.1; // seconds — clamps large gaps caused by tab switching
const FPS_LOG_INTERVAL = 1000; // ms — how often to log FPS to console

export class GameLoop {
  constructor(tick) {
    this._tick         = tick;
    this._lastTime     = null;
    this._rafId        = null;
    this._started      = false;
    this._fpsFrames    = 0;
    this._fpsLastLog   = 0;
    this._frame        = this._frame.bind(this);
  }

  // Starts the loop. Calling start() a second time is a no-op (no double-loop).
  start() {
    if (this._started) return;
    this._started    = true;
    this._lastTime   = performance.now();
    this._fpsLastLog = performance.now();
    this._rafId      = requestAnimationFrame(this._frame);
  }

  _frame(timestamp) {
    const raw   = (timestamp - this._lastTime) / 1000;
    const delta = Math.min(raw, MAX_DELTA);
    this._lastTime = timestamp;

    // FPS counter — logs once per second
    this._fpsFrames++;
    const elapsed = timestamp - this._fpsLastLog;
    if (elapsed >= FPS_LOG_INTERVAL) {
      const fps = (this._fpsFrames / (elapsed / 1000)).toFixed(1);
      console.log(`[GameLoop] FPS=${fps}  delta=${delta.toFixed(4)}s`);
      this._fpsFrames  = 0;
      this._fpsLastLog = timestamp;
    }

    this._tick(delta);

    this._rafId = requestAnimationFrame(this._frame);
  }
}
