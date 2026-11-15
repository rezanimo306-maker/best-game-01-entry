// input.js — keyboard + mouse input, one clear job: what the player is pressing.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0; // -1..1 across the window
    this.mouseY = 0; // -1..1 down the window
    this.mouseDown = false;
    this.mouseActive = false;
    this._pressHandlers = [];
    this._anyHandlers = [];
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
      if (e.button === 0) {
        this.mouseDown = true;
        for (const fn of this._anyHandlers) fn('MouseDown');
      }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onPress(fn) { this._pressHandlers.push(fn); }
  onAny(fn) { this._anyHandlers.push(fn); }

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
}
