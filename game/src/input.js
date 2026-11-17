// Keyboard and mouse state, in the game's own 1280x720 coordinates.
// The game reads edges (justPressed / justClicked) so menus and dashes
// fire exactly once per press, never once per frame.

import { VIEW_W, VIEW_H } from './config.js';

const KEY_ALIASES = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouseX = VIEW_W / 2;
    this.mouseY = VIEW_H / 2 - 80;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.rightClicked = false;
    this.rightDown = false;
    this.anyGesture = false;
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      this.anyGesture = true;
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.pressed.clear();
      this.mouseDown = false;
      this.rightDown = false;
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      this.anyGesture = true;
      if (e.button === 0) {
        this.mouseDown = true;
        this.mouseClicked = true;
      } else if (e.button === 2) {
        this.rightDown = true;
        this.rightClicked = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** True only on the frame the key went down. */
  justPressed(code) {
    return this.pressed.has(code);
  }

  /** True while the key is held. */
  held(code) {
    return this.down.has(code);
  }

  /** True while any of the given codes is held. */
  anyHeld(codes) {
    return codes.some((c) => this.down.has(c));
  }

  /** The movement axis from WASD/arrows, normalized. */
  moveAxis() {
    let x = 0;
    let y = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) x -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) x += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) y -= 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** Whether the pointer is inside a rectangle (logical coords). */
  hover(rect) {
    return this.mouseX >= rect.x && this.mouseX <= rect.x + rect.w
      && this.mouseY >= rect.y && this.mouseY <= rect.y + rect.h;
  }

  /** Consume the click edge: true once per click inside the rect. */
  clicked(rect) {
    return this.mouseClicked && this.hover(rect);
  }

  /** Clear per-frame edges. Called once per update, after the game reads them. */
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
    this.rightClicked = false;
  }
}

export { KEY_ALIASES };
