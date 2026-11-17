// The arena and its mood: a pre-rendered night garden (stars, nebula,
// runes, the great lantern at the center) plus the wave director that
// decides what the Gloom sends and when.

import { VIEW_W, VIEW_H, ARENA, WAVES, PALETTE } from './config.js';
import { Enemy, spawnPoint } from './enemies.js';

export class Backdrop {
  constructor(rng) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.stars = [];
    for (let i = 0; i < 170; i++) {
      this.stars.push({
        x: rng.range(0, VIEW_W),
        y: rng.range(0, VIEW_H),
        r: rng.range(0.6, 1.9),
        tw: rng.range(0, Math.PI * 2),
        sp: rng.range(0.6, 2.2),
      });
    }
    this.embers = [];
    for (let i = 0; i < 26; i++) {
      this.embers.push({
        x: rng.range(ARENA.x, ARENA.x + ARENA.w),
        y: rng.range(ARENA.y, ARENA.y + ARENA.h),
        r: rng.range(1.5, 3.2),
        ph: rng.range(0, Math.PI * 2),
        sp: rng.range(0.2, 0.6),
      });
    }
    this._paint(rng);
  }

  _paint(rng) {
    const g = this.canvas.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, '#141038');
    sky.addColorStop(1, PALETTE.skyBottom);
    g.fillStyle = sky;
    g.fillRect(0, 0, VIEW_W, VIEW_H);

    // Nebula blobs: soft violet and teal washes.
    const blobs = [
      [220, 180, 320, 'rgba(109, 75, 216, 0.20)'],
      [1060, 240, 300, 'rgba(76, 201, 240, 0.12)'],
      [640, 620, 380, 'rgba(224, 93, 143, 0.10)'],
      [900, 90, 220, 'rgba(255, 209, 102, 0.08)'],
    ];
    for (const [x, y, r, color] of blobs) {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Arena floor: a soft inset panel with a faint rune grid.
    g.fillStyle = PALETTE.floorA;
    g.beginPath();
    g.roundRect(ARENA.x - 6, ARENA.y - 6, ARENA.w + 12, ARENA.h + 12, 18);
    g.fill();
    g.fillStyle = PALETTE.floorB;
    g.beginPath();
    g.roundRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h, 14);
    g.fill();
    g.strokeStyle = 'rgba(255, 209, 102, 0.10)';
    g.lineWidth = 1;
    for (let x = ARENA.x + 44; x < ARENA.x + ARENA.w; x += 88) {
      g.beginPath();
      g.moveTo(x, ARENA.y + 8);
      g.lineTo(x, ARENA.y + ARENA.h - 8);
      g.stroke();
    }
    for (let y = ARENA.y + 44; y < ARENA.y + ARENA.h; y += 88) {
      g.beginPath();
      g.moveTo(ARENA.x + 8, y);
      g.lineTo(ARENA.x + ARENA.w - 8, y);
      g.stroke();
    }
    // Rune circles at the corners.
    g.strokeStyle = 'rgba(255, 209, 102, 0.16)';
    g.lineWidth = 2;
    for (const [cx, cy] of [
      [ARENA.x + 40, ARENA.y + 40],
      [ARENA.x + ARENA.w - 40, ARENA.y + 40],
      [ARENA.x + 40, ARENA.y + ARENA.h - 40],
      [ARENA.x + ARENA.w - 40, ARENA.y + ARENA.h - 40],
    ]) {
      g.beginPath();
      g.arc(cx, cy, 22, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, 12, 0, Math.PI * 2);
      g.stroke();
    }
    // The great lantern's glow at the arena center, under everything.
    const cx = ARENA.x + ARENA.w / 2;
    const cy = ARENA.y + ARENA.h / 2;
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, 190);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.16)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    g.fillStyle = glow;
    g.fillRect(cx - 190, cy - 190, 380, 380);
    g.strokeStyle = 'rgba(255, 209, 102, 0.22)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, 58, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, 46, 0, Math.PI * 2);
    g.stroke();
  }

  /** Twinkling stars and drifting embers, drawn over the static paint. */
  drawAnimated(ctx, time) {
    for (const s of this.stars) {
      const a = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time * s.sp + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e8e4ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const e of this.embers) {
      const yy = e.y - ((time * 14 * e.sp + e.ph * 40) % 130);
      const xx = e.x + Math.sin(time * e.sp + e.ph) * 12;
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.4 + e.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(xx, yy, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export class WaveDirector {
  constructor(rng) {
    this.rng = rng;
    this.wave = 0;
    this.queue = [];
    this.spawnTimer = 0;
    this.betweenTimer = 0;
    this.active = false;
    this.announced = false;
  }

  get totalWaves() {
    return WAVES.length;
  }

  get remaining() {
    return this.queue.length;
  }

  start() {
    this.wave = 0;
    this.queue = [];
    this.active = false;
    this.betweenTimer = 0.8;
    this.announced = false;
  }

  /** Begin the next wave's spawn queue. Returns the wave number. */
  beginWave() {
    this.wave += 1;
    const def = WAVES[this.wave - 1];
    this.queue = [];
    for (const [type, count, gap] of def.groups) {
      for (let i = 0; i < count; i++) this.queue.push({ type, gap });
    }
    this.active = true;
    this.spawnTimer = 0.3;
    this.announced = true;
    return this.wave;
  }

  update(dt, game) {
    if (!this.active) {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0 && this.wave < this.totalWaves) {
        const n = this.beginWave();
        game.onWaveStart(n);
      }
      return;
    }
    if (this.queue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const next = this.queue.shift();
        const p = spawnPoint(this.rng, game.player);
        game.enemies.push(new Enemy(next.type, p.x, p.y, this.wave, this.rng));
        game.particles.ring(p.x, p.y, '#6d4bd8', 40, 0.5, 3);
        this.spawnTimer = next.gap;
      }
    } else if (game.enemies.length === 0) {
      // Wave cleared.
      this.active = false;
      const cleared = this.wave;
      if (cleared >= this.totalWaves) {
        game.onVictory();
      } else {
        this.betweenTimer = WAVES[cleared].breather;
        this.announced = false;
        game.onWaveClear(cleared);
      }
    }
  }
}
