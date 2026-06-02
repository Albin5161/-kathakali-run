// Main-thread manager for the MediaPipe Web Worker.
// Exposes { ready, result } for GestureModule to poll each animation frame.

const INFER_EVERY_N_FRAMES = 2; // ~30 fps inference vs 60 fps display

export class HandDetector {
  constructor() {
    this._worker      = null;
    this._busy        = false;
    this._frameCount  = 0;
    this._framesSent  = 0;
    this._resultsRecv = 0;
    this.ready        = false;
    this.result       = null;   // { landmarks, handedness } — plain arrays
    this.lastError    = null;   // last worker error string, or null
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
          console.log(
            `[HandDetector] Result #${this._resultsRecv} — hands: ${data.landmarks.length}`,
            data.landmarks.length > 0 ? `conf: ${(data.handedness?.[0]?.[0]?.score * 100 | 0)}%` : '',
          );

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

    this._busy = true;
    this._framesSent++;
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
