// Boot: canvas, fixed-timestep loop, and the first frame. The game updates
// at a fixed 60 Hz so play feels the same on every machine; rendering
// follows the display's own refresh.

import { VIEW_W, VIEW_H } from './config.js';
import { Rng, seedFromUrl } from './rng.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { SpriteCache } from './particles.js';
import { Game, STATES } from './game.js';
import { Backdrop } from './world.js';
import { applyShotParams } from './shots.js';

const STEP = 1 / 60;

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const input = new Input(canvas);
  const sprites = new SpriteCache();
  const renderer = new Renderer(ctx, sprites);
  const game = new Game(canvas, input, renderer);
  game.backdrop = new Backdrop(new Rng(seedFromUrl()));
  game.sprites = sprites;

  const staged = applyShotParams(game);

  // Losing the tab mid-run pauses instead of letting the Gloom feast.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === STATES.PLAYING) game.state = STATES.PAUSED;
  });

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      game.update(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === 5) acc = 0;
    game.render();
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export { VIEW_W, VIEW_H };
