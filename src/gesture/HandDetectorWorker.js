// Web Worker (classic, not module) — MediaPipe inference runs here, never on the main thread.
//
// Why classic Worker, not { type: 'module' }:
//   FilesetResolver.forVisionTasks() internally fetches vision_wasm_internal.js, an
//   emscripten-generated WASM loader that calls importScripts() to load the .wasm binary.
//   importScripts() throws TypeError in a module Worker ("Module scripts don't support
//   importScripts()"). MediaPipe catches that TypeError internally so forVisionTasks()
//   appears to succeed, but the module factory is never set — causing
//   HandLandmarker.createFromOptions() to throw "ModuleFactory not set".
//   In a classic Worker importScripts() is allowed, so the WASM loader runs normally.
//
// Why dynamic import() instead of importScripts() for the CDN bundle:
//   importScripts() executes synchronously at the top level, which makes it impossible
//   to wrap in a Promise or send a meaningful error back to the main thread.
//   Dynamic import() inside the 'load' handler gives us try/catch and the ability to
//   postMessage({type:'error'}) when the CDN fetch or model load fails.
//
// Protocol:
//   main → worker  { type: 'load' }
//   worker → main  { type: 'ready' }  |  { type: 'error', message }
//
//   main → worker  { type: 'detect', frame: ImageBitmap }   [frame is transferred]
//   worker → main  { type: 'result', landmarks, handedness }  (plain arrays, not class instances)

console.log('[Worker] Script evaluated — awaiting messages');

let detector = null;

self.onmessage = async ({ data }) => {
  console.log('[Worker] Message received:', data.type);

  // ── Load ────────────────────────────────────────────────────────────────────
  if (data.type === 'load') {
    try {
      console.log('[Worker] Importing @mediapipe/tasks-vision from CDN…');

      const { HandLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs'
      );

      console.log('[Worker] CDN import succeeded. Fetching WASM + model…');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
      );

      console.log('[Worker] WASM resolved. Creating HandLandmarker (CPU delegate)…');

      detector = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          // CPU delegate is mandatory in a Worker — WebGL / GPU is unavailable there.
          delegate: 'CPU',
        },
        numHands:    1,
        runningMode: 'IMAGE', // each frame independent — no timestamp required
      });

      console.log('[Worker] HandLandmarker ready ✓');
      self.postMessage({ type: 'ready' });

    } catch (err) {
      console.error('[Worker] Load failed:', err);
      self.postMessage({ type: 'error', message: String(err) });
    }
    return;
  }

  // ── Detect ───────────────────────────────────────────────────────────────────
  if (data.type === 'detect') {
    if (!detector) {
      console.warn('[Worker] detect called but detector not ready');
      data.frame.close();
      return;
    }

    try {
      const raw = detector.detect(data.frame);

      // DEBUG: log the raw result once every 60 detections so we can verify
      // the result shape after the 0.10.35 upgrade without flooding the log.
      if (!self._dbgCount) self._dbgCount = 0;
      if (++self._dbgCount <= 3 || self._dbgCount % 60 === 0) {
        console.log(
          `[Worker] DEBUG raw result #${self._dbgCount}:`,
          `type=${typeof raw}`,
          `null=${raw === null}`,
          `landmarks type=${typeof raw?.landmarks}`,
          `landmarks length=${raw?.landmarks?.length ?? 'n/a'}`,
          `handedness length=${raw?.handedness?.length ?? 'n/a'}`,
          raw,
        );
      }

      // Serialize to plain arrays before postMessage.
      // HandLandmarkerResult may contain class instances whose prototype chain
      // is lost across the structured-clone boundary, leaving empty objects.
      const landmarks   = raw.landmarks?.map(
        hand => hand.map(({ x, y, z }) => ({ x, y, z }))
      ) ?? [];

      // handedness[i] is a Classifications object with a .categories array.
      // Some versions surface it as a plain Category[]; handle both shapes.
      const handedness  = raw.handedness?.map(h => {
        const cats = Array.isArray(h) ? h : (h.categories ?? []);
        return cats.map(c => ({ score: c.score, categoryName: c.categoryName ?? '' }));
      }) ?? [];

      console.log(`[Worker] Detection done — hands: ${landmarks.length}`);
      self.postMessage({ type: 'result', landmarks, handedness });

    } catch (err) {
      // No longer swallowed — send the error back so the overlay can show it.
      console.error('[Worker] detect() threw:', err);
      self.postMessage({ type: 'detectError', message: String(err) });
    } finally {
      data.frame.close();
    }
  }
};
