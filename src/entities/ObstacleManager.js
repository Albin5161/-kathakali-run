import { CANVAS_WIDTH, GROUND_Y, SPAWN_INITIAL_DELAY, ELEPHANT_TEST_MODE } from '../config.js';

export class ObstacleManager {
  constructor(obstacleTypes) {
    this._types    = obstacleTypes;
    this.obstacles = [];
    // Spawn cooldown is measured in pixels of world-scroll.
    // It decrements by (speed × delta) each frame, matching the pixels-per-second unit.
    this._cooldown = SPAWN_INITIAL_DELAY;
  }

  // Called every frame while state is PLAYING.
  // speed    — pixels per second (from GameState, driven by the current tier)
  // minGap   — minimum pixel gap between spawns (from current tier)
  // maxGap   — maximum pixel gap between spawns (from current tier)
  update(delta, speed, minGap, maxGap) {
    const dx = speed * delta; // pixels scrolled this frame

    // Move all live obstacles left
    for (const obs of this.obstacles) {
      obs.x -= dx;
    }

    // Despawn obstacles whose right visual edge has exited the canvas on the left
    this.obstacles = this.obstacles.filter(
      obs => obs.x + obs.type.visualWidth > -4,
    );

    // Decrement spawn cooldown by distance scrolled; spawn when it reaches zero
    this._cooldown -= dx;
    if (this._cooldown <= 0) {
      this._spawn();
      this._cooldown = minGap + Math.random() * (maxGap - minGap);
    }
  }

  // Clears all live obstacles and resets the spawn timer for a fresh run.
  reset() {
    this.obstacles = [];
    this._cooldown = SPAWN_INITIAL_DELAY;
  }

  _spawn() {
    const pool = ELEPHANT_TEST_MODE
      ? this._types.filter(t => t.id === 'festival-elephant')
      : this._types;
    const type = pool[Math.floor(Math.random() * pool.length)];
    this.obstacles.push({
      // x: left edge of the visual bounding box, starting just off the right edge
      x:    CANVAS_WIDTH,
      // y: top of the visual bounding box.
      // floatHeight lifts flying obstacles (e.g. crow) above the ground line.
      y:    GROUND_Y - type.visualHeight - (type.floatHeight ?? 0),
      type,
    });
  }
}
