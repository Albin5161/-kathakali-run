import { ACTION } from './InputBus.js';
import { STATE }  from '../core/GameState.js';
import { KEY_BINDINGS } from '../config.js';

export class KeyboardInput {
  constructor(inputBus, gameState) {
    this._bus       = inputBus;
    this._gameState = gameState;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }

  _onKeyDown(e) {
    if (e.repeat) return;

    // Prevent the browser from scrolling the page on game keys
    if ([KEY_BINDINGS.duck, ...KEY_BINDINGS.jump].includes(e.code)) {
      e.preventDefault();
    }

    const state = this._gameState.state;

    // Space / Enter starts or restarts the game when not actively playing
    if (KEY_BINDINGS.start.includes(e.code) && state !== STATE.PLAYING) {
      this._bus.emit(ACTION.START);
      return;
    }

    if (state !== STATE.PLAYING) return;

    if (KEY_BINDINGS.jump.includes(e.code)) {
      this._bus.emit(ACTION.JUMP);
    }

    if (e.code === KEY_BINDINGS.duck) {
      this._bus.emit(ACTION.DUCK_START);
    }
  }

  _onKeyUp(e) {
    if (e.code === KEY_BINDINGS.duck) {
      this._bus.emit(ACTION.DUCK_END);
    }
  }
}
