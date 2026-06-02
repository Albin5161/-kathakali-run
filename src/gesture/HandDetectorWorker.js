// Web Worker — MediaPipe inference runs here, never on the main thread.
//
// FIX: imports are now dynamic (inside the message handler), not static.
// A static top-level import would execute at parse time before self.onmessage
// is registered. If the CDN fetch failed the Worker died silently, the main
// thread received a generic onerror, and the detector was set to null with no
// visible indication to the user.
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

      // @0.10.35 is required for module Worker compatibility.
      //
      // @0.10.14 and earlier call importScripts() without a try/catch inside their
      // WASM loader. In a module Worker, importScripts() throws TypeError
      // ("Module scripts don't support importScripts()") and the whole load fails.
      //
      // @0.10.35 wraps that call in try/catch and falls back to dynamic import()
      // when a TypeError is caught — which is exactly the module Worker case.
      // This matches what the official mediapipe-samples-web repo pins to (^0.10.35).
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
