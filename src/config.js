// ─── Canvas ───────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH  = 800;  // logical pixels
export const CANVAS_HEIGHT = 300;  // logical pixels
export const GROUND_Y      = 250;  // y-coordinate of the ground surface (logical pixels)

// ─── Physics ──────────────────────────────────────────────────────────────────
export const GRAVITY       = 2000; // pixels per second squared
export const JUMP_VELOCITY = -600; // pixels per second (negative = upward)

// ─── Speed ────────────────────────────────────────────────────────────────────
// All speed values in this project are in pixels per second.
export const INITIAL_SPEED = 300;  // pixels per second — starting world scroll speed
export const MAX_SPEED     = 900;  // pixels per second — ceiling for difficulty scaling

// ─── Performer hitbox ─────────────────────────────────────────────────────────
// Defined here, independent of sprite art, so CollisionSystem never reads sprite sizes.
export const PERFORMER_X            = 80;  // fixed horizontal position (logical pixels)
export const PERFORMER_STAND_WIDTH  = 40;  // logical pixels
export const PERFORMER_STAND_HEIGHT = 60;  // logical pixels
export const PERFORMER_DUCK_HEIGHT  = 30;  // logical pixels

// ─── Scoring ──────────────────────────────────────────────────────────────────
export const SCORE_RATE = 10; // points per second of survival

// ─── Difficulty tiers ─────────────────────────────────────────────────────────
// Each tier activates when `score` crosses its `scoreThreshold`.
// speed is in pixels per second; gap values are in pixels of world-scroll.
// minSpawnGap is validated to keep the game beatable at every tier:
//   at max speed (780 px/s), 310 px gap ≈ 0.4 s between obstacles;
//   the player sees obstacles from ~800 px away (~1 s of warning), so this is safe.
export const SPEED_TIERS = [
  { scoreThreshold:    0, speed: 300, minSpawnGap: 400, maxSpawnGap: 700 },
  { scoreThreshold:  150, speed: 340, minSpawnGap: 390, maxSpawnGap: 680 },
  { scoreThreshold:  300, speed: 380, minSpawnGap: 380, maxSpawnGap: 660 },
  { scoreThreshold:  500, speed: 430, minSpawnGap: 370, maxSpawnGap: 640 },
  { scoreThreshold:  800, speed: 480, minSpawnGap: 360, maxSpawnGap: 620 },
  { scoreThreshold: 1200, speed: 540, minSpawnGap: 350, maxSpawnGap: 600 },
  { scoreThreshold: 1800, speed: 600, minSpawnGap: 340, maxSpawnGap: 580 },
  { scoreThreshold: 2500, speed: 660, minSpawnGap: 330, maxSpawnGap: 560 },
  { scoreThreshold: 3500, speed: 720, minSpawnGap: 320, maxSpawnGap: 540 },
  { scoreThreshold: 5000, speed: 780, minSpawnGap: 310, maxSpawnGap: 520 },
];

// ─── Obstacle spawning ────────────────────────────────────────────────────────
export const SPAWN_INITIAL_DELAY = 600; // pixels of world-scroll before the first obstacle

// ─── Debug ────────────────────────────────────────────────────────────────────
export const DEBUG_HITBOXES      = false; // overlay hitbox rectangles for QA
export const ELEPHANT_TEST_MODE  = false; // set true to spawn only elephants for QA

// ─── Key bindings ─────────────────────────────────────────────────────────────
// KeyboardInput reads this map; key codes are never hard-coded in that module.
export const KEY_BINDINGS = {
  jump:  ['ArrowUp', 'Space'],
  duck:  'ArrowDown',
  start: ['Space', 'Enter'],
};
