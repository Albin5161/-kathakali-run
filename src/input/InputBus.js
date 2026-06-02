export const ACTION = {
  JUMP:       'JUMP',
  DUCK_START: 'DUCK_START',
  DUCK_END:   'DUCK_END',
  START:      'START',
};

export class InputBus {
  constructor() {
    this._handlers = {};
  }

  on(action, handler) {
    if (!this._handlers[action]) this._handlers[action] = [];
    this._handlers[action].push(handler);
  }

  off(action, handler) {
    if (!this._handlers[action]) return;
    this._handlers[action] = this._handlers[action].filter(h => h !== handler);
  }

  emit(action) {
    const handlers = this._handlers[action];
    if (!handlers) return;
    handlers.forEach(h => h());
  }
}
