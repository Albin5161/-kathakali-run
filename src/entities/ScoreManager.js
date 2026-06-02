import { SCORE_RATE, SPEED_TIERS } from '../config.js';

const LS_KEY = 'kathakali-run:highScore';

export class ScoreManager {
  constructor() {
    this.score          = 0;
    this.highScore      = this._loadHighScore();
    this._tierIndex     = 0;
  }

  // Increments score by delta × SCORE_RATE.
  // Returns true if a tier boundary was crossed this frame (caller should sync
  // GameState.speed from currentTier.speed). Uses a while-loop so multiple tiers
  // crossed in one large delta (e.g. after a long tab-away) are all consumed.
  update(delta) {
    this.score += delta * SCORE_RATE;

    let advanced = false;
    while (true) {
      const next = SPEED_TIERS[this._tierIndex + 1];
      if (!next || this.score < next.scoreThreshold) break;
      this._tierIndex++;
      advanced = true;
    }
    return advanced;
  }

  // The active tier object: { scoreThreshold, speed, minSpawnGap, maxSpawnGap }
  get currentTier() {
    return SPEED_TIERS[this._tierIndex];
  }

  // Resets score and tier for a new run. Does NOT reset highScore.
  reset() {
    this.score      = 0;
    this._tierIndex = 0;
  }

  // Persists highScore to localStorage if the current score exceeds it.
  // Call once when the run ends (on collision).
  saveHighScore() {
    const rounded = Math.floor(this.score);
    if (rounded > this.highScore) {
      this.highScore = rounded;
      try {
        localStorage.setItem(LS_KEY, this.highScore);
      } catch (_) { /* storage unavailable — silently ignore */ }
    }
  }

  _loadHighScore() {
    try {
      const raw    = localStorage.getItem(LS_KEY);
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    } catch (_) {
      return 0;
    }
  }
}
