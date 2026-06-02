// Orchestrates camera, preview, MediaPipe detection, landmark rendering,
// and gesture recognition.
// Loaded via dynamic import() on first use so it never affects page load.

import { recognizeGesture } from './GestureRecognizer.js';

const HAND_CONNECTIONS = [
  [0, 1],  [1, 2],  [2, 3],  [3, 4],
  [0, 5],  [5, 6],  [6, 7],  [7, 8],
  [0, 9],  [9, 10], [10, 11],[11, 12],
  [0, 13], [13, 14],[14, 15],[15, 16],
  [0, 17], [17, 18],[18, 19],[19, 20],
  [5, 9],  [9, 13], [13, 17],
];

export class GestureModule {
  constructor(overlayEl, gestureInput = null) {
    this._overlayEl    = overlayEl;
    this._gestureInput = gestureInput; // GestureInput | null
    this._stream       = null;
    this._video        = null;
    this._canvas       = null;
    this._detector     = null;
    this._rafId        = null;
    this._status       = 'idle';  // displayed on the debug panel
    this._gesture      = 'NONE';  // last recognised gesture

    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onBeforeUnload     = this._onBeforeUnload.bind(this);
  }

  async enable() {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[GestureModule] getUserMedia not available.');
      return false;
    }

    console.log('[GestureModule] Requesting camera…');
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
      console.error('[GestureModule] Camera denied:', err.message);
      return false;
    }

    console.log('[GestureModule] Camera started ✓');
    this._status = 'camera ready';

    this._mountPreview();
    console.log('[GestureModule] Preview mounted ✓');

    this._startRenderLoop();
    console.log('[GestureModule] Render loop started ✓');

    // Load detector after preview is visible — user sees camera immediately.
    // Failure here leaves _detector = null; preview still works.
    this._loadDetector();

    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('beforeunload', this._onBeforeUnload);
    return true;
  }

  disable() {
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._detector?.terminate();
    this._detector = null;
    // Force a clean DUCK_END if the performer is ducking when webcam is turned off.
    this._gestureInput?.update('NONE');
    this._gesture  = 'NONE';
    this._stopStream();
    this._unmountPreview();
    this._status = 'idle';
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('beforeunload', this._onBeforeUnload);
    console.log('[GestureModule] Disabled ✓');
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async _loadDetector() {
    console.log('[GestureModule] Loading HandDetector…');
    this._status = 'loading model';

    try {
      const { HandDetector } = await import('./HandDetector.js');
      console.log('[GestureModule] HandDetector module imported ✓');

      this._detector = new HandDetector();
      console.log('[GestureModule] HandDetector instantiated, calling load()…');

      await this._detector.load();
      console.log('[GestureModule] HandDetector.load() resolved — model ready ✓');
      this._status = 'detector ready';

      // DEBUG: dump pipeline state 5 s after the model is ready so we can
      // see whether frames are actually being sent and results received.
      setTimeout(() => {
        const d = this._detector;
        console.log(
          '[GestureModule] DEBUG 5-second pipeline snapshot:',
          `ready=${d?.ready}`,
          `framesSent=${d?._framesSent}`,
          `resultsRecv=${d?._resultsRecv}`,
          `busy=${d?._busy}`,
          `lastError=${d?.lastError}`,
          `result.landmarks.length=${d?.result?.landmarks?.length ?? 'none'}`,
        );
      }, 5000);

    } catch (err) {
      console.error('[GestureModule] HandDetector failed to load:', err);
      this._status = `error: ${err.message ?? err}`;
      this._detector = null;
    }
  }

  _mountPreview() {
    const video       = document.createElement('video');
    video.srcObject   = this._stream;
    video.autoplay    = true;
    video.muted       = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    video.style.cssText = [
      'display: block',
      'width: 100%',
      'height: auto',
      'transform: scaleX(-1)',
    ].join(';');

    const lmCanvas       = document.createElement('canvas');
    lmCanvas.width       = 640;
    lmCanvas.height      = 480;
    lmCanvas.style.cssText = [
      'position: absolute',
      'top: 0',
      'left: 0',
      'width: 100%',
      'height: 100%',
      'pointer-events: none',
    ].join(';');

    this._overlayEl.style.position = 'relative';
    this._video  = video;
    this._canvas = lmCanvas;
    this._overlayEl.appendChild(video);
    this._overlayEl.appendChild(lmCanvas);
    this._overlayEl.style.display = 'block';
  }

  _unmountPreview() {
    if (this._video)  { this._video.srcObject = null;  this._video.remove();  this._video  = null; }
    if (this._canvas) { this._canvas.remove(); this._canvas = null; }
    this._overlayEl.style.display  = 'none';
    this._overlayEl.style.position = '';
  }

  _stopStream() {
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
  }

  _startRenderLoop() {
    const tick = () => {
      this._renderFrame();
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _renderFrame() {
    if (!this._video || !this._canvas) return;

    // Sync canvas pixel resolution to actual video resolution
    const vw = this._video.videoWidth;
    const vh = this._video.videoHeight;
    if (vw > 0 && (this._canvas.width !== vw || this._canvas.height !== vh)) {
      this._canvas.width  = vw;
      this._canvas.height = vh;
      console.log(`[GestureModule] Canvas synced to ${vw}×${vh}`);
    }

    const ctx = this._canvas.getContext('2d');
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    if (!this._detector?.ready) {
      // Always show status panel — even if detector is null (error state)
      this._drawDebugPanel(ctx);
      return;
    }

    this._detector.detect(this._video);

    const lm0 = this._detector.result?.landmarks?.[0];
    this._gesture = lm0 ? recognizeGesture(lm0) : 'NONE';

    // DEBUG ── log every gesture transition so we can see if update() is reached
    if (this._gesture !== this._dbgLastGesture) {
      console.log(
        `[GestureModule] gesture: ${this._dbgLastGesture ?? 'init'} → ${this._gesture}`,
        `| gestureInput=${this._gestureInput ? 'set' : 'NULL'}`,
      );
      this._dbgLastGesture = this._gesture;
    }

    this._gestureInput?.update(this._gesture);

    this._drawLandmarks(ctx);
    this._drawGestureLabel(ctx);
    this._drawDebugPanel(ctx);
  }

  _drawLandmarks(ctx) {
    const result = this._detector?.result;
    if (!result?.landmarks?.length) return;

    const w  = this._canvas.width;
    const h  = this._canvas.height;
    const lm = result.landmarks[0];

    console.log(`[GestureModule] Drawing landmarks — count: ${lm.length}`);

    // Mirror x to match the flipped video
    const mx = (x) => (1 - x) * w;
    const my = (y) => y * h;

    // Connection lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(mx(lm[a].x), my(lm[a].y));
      ctx.lineTo(mx(lm[b].x), my(lm[b].y));
      ctx.stroke();
    }

    // Landmark dots
    ctx.fillStyle = '#00E676';
    for (const pt of lm) {
      ctx.beginPath();
      ctx.arc(mx(pt.x), my(pt.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Confidence badge
    const cats  = result.handedness?.[0] ?? [];
    const score = cats[0]?.score ?? 0;
    const conf  = `CONF ${Math.round(score * 100)}%`;

    ctx.font         = 'bold 11px monospace';
    ctx.textBaseline = 'top';
    const tw = ctx.measureText(conf).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(5, 5, tw + 10, 20);
    ctx.fillStyle = '#00E676';
    ctx.fillText(conf, 10, 9);
  }

  _drawGestureLabel(ctx) {
    if (this._gesture === 'NONE') return;

    const COLORS = { PALM: '#00E676', FIST: '#FF6B35' };
    const color  = COLORS[this._gesture] ?? '#ccc';
    const label  = this._gesture;

    // Scale font proportionally so the label reads at ~28 px in the CSS display.
    // The canvas internal width (camera resolution) is CSS-scaled to 200 px, so:
    //   canvas font size = desired_visual_px × (canvas.width / 200)
    const fontSize = Math.round(this._canvas.width * 0.14);
    ctx.font         = `bold ${fontSize}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    const cx  = this._canvas.width / 2;
    const cy  = Math.round(fontSize * 0.25);
    const tw  = ctx.measureText(label).width;
    const pad = Math.round(fontSize * 0.2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(cx - tw / 2 - pad, cy - pad / 2, tw + pad * 2, fontSize + pad);

    ctx.fillStyle = color;
    ctx.fillText(label, cx, cy);
  }

  // On-canvas debug panel — always visible so pipeline state is readable
  // without opening DevTools.
  _drawDebugPanel(ctx) {
    const result      = this._detector?.result;
    const handCount   = result?.landmarks?.length ?? 0;
    const cats        = result?.handedness?.[0] ?? [];
    const conf        = cats[0]?.score != null
      ? `${Math.round(cats[0].score * 100)}%`
      : '—';

    const lines = [
      `status  : ${this._status}`,
      `detector: ${this._detector
        ? (this._detector.ready ? 'ready' : 'loading…')
        : 'null (failed)'}`,
      `gesture : ${this._gesture}`,
      `hands   : ${handCount}  conf: ${conf}`,
      `frames  : sent=${this._detector?._framesSent ?? 0}  ` +
               `recv=${this._detector?._resultsRecv ?? 0}`,
    ];

    const w       = this._canvas.width;
    const h       = this._canvas.height;
    const lineH   = 14;
    const padding = 5;
    const panelH  = lines.length * lineH + padding * 2;

    ctx.fillStyle    = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, h - panelH, w, panelH);

    ctx.font         = '10px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';

    lines.forEach((line, i) => {
      const isError = line.includes('failed') || line.includes('error');
      ctx.fillStyle = isError ? '#FF6B6B' : '#ccc';
      ctx.fillText(line, padding, h - panelH + padding + i * lineH);
    });
  }

  _onVisibilityChange() {
    if (document.hidden) {
      console.log('[GestureModule] Tab hidden — stopping stream');
      this._stopStream();
      if (this._video) this._video.srcObject = null;
    }
  }

  _onBeforeUnload() {
    this._stopStream();
  }
}
