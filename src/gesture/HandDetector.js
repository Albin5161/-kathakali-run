// Main-thread manager for the MediaPipe Web Worker.
// Exposes { ready, result } for GestureModule to poll each animation frame.
// onResult(result) is called immediately when the worker returns — no rAF wait.

const INFER_EVERY_N_FRAMES = 1; // send every display frame; worker _busy flag prevents flooding

export class HandDetector {
  constructor() {
    this._worker        = null;
    this._busy          = false;
    this._frameCount    = 0;
    this._framesSent    = 0;
    this._resultsRecv   = 0;
    this._detectSentAt  = 0;    // performance.now() when the last frame was dispatched
    this.ready          = false;
    this.result         = null;  // { landmarks, handedness } — plain arrays
    this.lastError      = null;  // last worker error string, or null
    this.onResult       = null;  // (result) => void — set by GestureModule for immediate dispatch
  }

  // Creates the Worker, sends 'load', resolves when ready.
  load() {
    return new Promise((resolve, reject) => {
      console.log('[HandDetector] Creating Worker…');

      this._worker = new Worker(
        new URL('./HandDetectorWorker.js', import.meta.url),
        { type: 'classic' },
      );

      console.log('[HandDetector] Worker created, sending load…');
      this._worker.postMessage({ type: 'load' });

      this._worker.onmessage = ({ data }) => {
        console.log('[HandDetector] Message from Worker:', data.type, data);

        if (data.type === 'ready') {
          console.log('[HandDetector] Worker ready ✓');
          this.ready = true;
          resolve();

        } else if (data.type === 'error') {
          console.error('[HandDetector] Worker load error:', data.message);
          this.lastError = data.message;
          reject(new Error(data.message));

        } else if (data.type === 'result') {
          this._busy = false;
          this._resultsRecv++;
          this.result = { landmarks: data.landmarks, handedness: data.handedness };

          const inferenceMs = (performance.now() - this._detectSentAt).toFixed(1);
          console.log(
            `[HandDetector] Result #${this._resultsRecv} — hands: ${data.landmarks.length}` +
            (data.landmarks.length > 0 ? `  conf: ${(data.handedness?.[0]?.[0]?.score * 100 | 0)}%` : '') +
            `  inference: ${inferenceMs}ms`,
          );

          // Fire immediately — gesture recognition and input update happen here,
          // not on the next rAF tick.
          this.onResult?.(this.result);

        } else if (data.type === 'detectError') {
          console.error('[HandDetector] Worker detect error:', data.message);
          this._busy = false;
          this.lastError = data.message;
        }
      };

      this._worker.onerror = (e) => {
        const msg = e.message ?? 'Unknown Worker error';
        console.error('[HandDetector] Worker onerror:', msg, e);
        this.lastError = msg;
        if (!this.ready) {
          reject(new Error(msg));
        } else {
          this._busy = false;
        }
      };
    });
  }

  // Call each animation frame. Sends a frame to the Worker every N frames.
  detect(videoEl) {
    this._frameCount++;

    if (!this.ready)                                          return;
    if (this._busy)                                           return;
    if (this._frameCount % INFER_EVERY_N_FRAMES !== 0)        return;
    if (videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      // DEBUG: log once every 120 frames so the console isn't flooded
      if (this._frameCount % 120 === 0) {
        console.warn(
          `[HandDetector] DEBUG readyState=${videoEl.readyState} (need ≥2) — frames will not be sent until video has data`,
          `videoWidth=${videoEl.videoWidth} videoHeight=${videoEl.videoHeight}`,
          `paused=${videoEl.paused} ended=${videoEl.ended}`,
        );
      }
      return;
    }

    this._busy         = true;
    this._framesSent++;
    this._detectSentAt = performance.now();
    console.log(`[HandDetector] Sending frame #${this._framesSent} to Worker`);

    createImageBitmap(videoEl)
      .then(bmp => {
        this._worker.postMessage({ type: 'detect', frame: bmp }, [bmp]);
      })
      .catch(err => {
        console.error('[HandDetector] createImageBitmap failed:', err);
        this._busy = false;
      });
  }

  terminate() {
    console.log('[HandDetector] Terminating Worker');
    this._worker?.terminate();
    this._worker = null;
    this.ready   = false;
    this._busy   = false;
    this.result  = null;
  }
}
