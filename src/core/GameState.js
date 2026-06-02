import { INITIAL_SPEED } from '../config.js';

export const STATE = {
  IDLE:      'IDLE',
  PLAYING:   'PLAYING',
  GAME_OVER: 'GAME_OVER',
};

export class GameState {
  constructor() {
    this.state            = STATE.IDLE;
    this.speed            = INITIAL_SPEED; // pixels per second
    this.environmentIndex = 0;
  }

  // IDLE → PLAYING
  startGame() {
    if (this.state !== STATE.IDLE) return;
    this.state = STATE.PLAYING;
  }

  // PLAYING → GAME_OVER
  triggerGameOver() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.GAME_OVER;
  }

  // GAME_OVER → PLAYING (resets speed and environment)
  restart() {
    if (this.state !== STATE.GAME_OVER) return;
    this.speed            = INITIAL_SPEED;
    this.environmentIndex = 0;
    this.state            = STATE.PLAYING;
  }
}
