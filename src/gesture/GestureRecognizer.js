// Classifies a single hand's 21 MediaPipe landmarks into a named gesture.
//
// MediaPipe Hand Landmark indices:
//
//   Wrist:  0
//   Thumb:  CMC=1  MCP=2  IP=3   TIP=4
//   Index:  MCP=5  PIP=6  DIP=7  TIP=8
//   Middle: MCP=9  PIP=10 DIP=11 TIP=12
//   Ring:   MCP=13 PIP=14 DIP=15 TIP=16
//   Pinky:  MCP=17 PIP=18 DIP=19 TIP=20
//
// Coordinates are normalized: x/y are 0–1 relative to the image dimensions,
// y=0 is the TOP of the frame, y=1 is the BOTTOM.
//
// Finger-extension rule:
//   A finger is EXTENDED when its TIP is higher in the frame than its PIP joint,
//   i.e. lm[tip].y < lm[pip].y.
//
// Thumb is excluded: it moves laterally (left↔right) rather than up↔down, so
// the y-axis check is unreliable across different hand orientations.

// [tipIndex, pipIndex] for the four non-thumb fingers
const FINGER_PAIRS = [
  [8,  6],  // index
  [12, 10], // middle
  [16, 14], // ring
  [20, 18], // pinky
];

/**
 * @param {Array<{x:number, y:number, z:number}>} lm  21 normalized landmarks
 * @returns {'PALM' | 'FIST' | 'NONE'}
 */
export function recognizeGesture(lm) {
  if (!lm || lm.length < 21) return 'NONE';

  let extended = 0;
  for (const [tip, pip] of FINGER_PAIRS) {
    if (lm[tip].y < lm[pip].y) extended++;
  }

  if (extended >= 3) return 'PALM'; // most fingers open
  if (extended <= 1) return 'FIST'; // most fingers curled
  return 'NONE';                    // transitioning / ambiguous angle
}
