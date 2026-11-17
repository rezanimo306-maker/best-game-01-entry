// input.js — keyboard + mouse input: what the player is pressing right now.
// One clear job: gather raw input; the game decides what it means.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0; // -1..1 across the window
    this.mouseY = 0; // -1..1 down the window
    this.mouseDown = false;
    this.mouseActive = false;
    this._pressHandlers = [];
    this._anyHandlers = [];
    this._downHandlers = [];
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.keys.add(e.code);
        for (const fn of this._pressHandlers) fn(e.code);
      }
      for (const fn of this._anyHandlers) fn(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      this.mouseActive = true;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouseDown = true;
      for (const fn of this._downHandlers) fn(e.clientX, e.clientY);
      for (const fn of this._anyHandlers) fn('MouseDown');
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Fired once per non-repeat key press. */
  onPress(fn) { this._pressHandlers.push(fn); }
  /** Fired on every key event and on mouse down. */
  onAny(fn) { this._anyHandlers.push(fn); }
  /** Fired on mouse down with client coordinates. */
  onMouseDown(fn) { this._downHandlers.push(fn); }

  /** Steering vector from keys, -1..1 on each axis. */
  steer() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    return { x, y };
  }

  firing() { return this.mouseDown || this.keys.has('Space'); }

  /** True while one of the draft keys (1/2/3/0) is held. */
  draftKey() {
    if (this.keys.has('Digit1')) return 1;
    if (this.keys.has('Digit2')) return 2;
    if (this.keys.has('Digit3')) return 3;
    if (this.keys.has('Digit0')) return 0;
    return -1;
  }
}
