// Juice: particles, shockwave rings, floating damage numbers, and the
// pre-rendered glow sprites everything draws with (radial gradients baked
// once to offscreen canvases, so the frame stays fast and pretty).

export const MAX_PARTICLES = 700;

function makeGlowSprite(color, inner = 'rgba(255,255,255,1)') {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export class SpriteCache {
  constructor() {
    this.cache = new Map();
  }
  glow(color) {
    let sprite = this.cache.get(color);
    if (!sprite) {
      sprite = makeGlowSprite(color);
      this.cache.set(color, sprite);
    }
    return sprite;
  }
  /** Draw a glow centered at (x, y) with the given radius. */
  draw(ctx, color, x, y, radius, alpha = 1) {
    const sprite = this.glow(color);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }
}

export class Particles {
  constructor() {
    this.list = [];
    this.rings = [];
    this.texts = [];
    this.sprites = new SpriteCache();
  }

  spawn(x, y, opts = {}) {
    if (this.list.length >= MAX_PARTICLES) this.list.splice(0, this.list.length - MAX_PARTICLES + 1);
    this.list.push({
      x, y,
      vx: opts.vx ?? 0,
      vy: opts.vy ?? 0,
      life: opts.life ?? 0.5,
      maxLife: opts.life ?? 0.5,
      size: opts.size ?? 3,
      color: opts.color ?? '#ffd166',
      drag: opts.drag ?? 0.9,
      gravity: opts.gravity ?? 0,
      shrink: opts.shrink ?? true,
      glow: opts.glow ?? false,
      streak: opts.streak ?? false,
    });
  }

  /** A burst of sparks flying out from a point. */
  burst(x, y, color, count = 14, speed = 220, life = 0.5, size = 3.5) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      this.spawn(x, y, {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.7),
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 0.88,
        glow: true,
      });
    }
  }

  /** A ring shockwave expanding from a point. */
  ring(x, y, color, maxRadius = 90, life = 0.45, width = 4) {
    this.rings.push({ x, y, color, radius: 6, maxRadius, life, maxLife: life, width });
  }

  /** Floating combat text: damage, pickups, announcements. */
  floatText(x, y, text, color = '#fff3d6', size = 18, life = 0.9) {
    this.texts.push({ x: x + (Math.random() - 0.5) * 14, y, text, color, size, life, maxLife: life, vy: -64 });
  }

  /** A trail of embers behind something moving fast. */
  emberTrail(x, y, color, count = 2) {
    for (let i = 0; i < count; i++) {
      this.spawn(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, {
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 50,
        life: 0.4 + Math.random() * 0.3,
        size: 2 + Math.random() * 2.5,
        color,
        glow: true,
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy *= drag;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const t = 1 - Math.max(0, r.life / r.maxLife);
      r.radius = 6 + (r.maxRadius - 6) * (1 - Math.pow(1 - t, 3));
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.pow(0.92, dt * 60);
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const t = p.life / p.maxLife;
      const size = p.shrink ? p.size * t : p.size;
      if (p.glow) {
        this.sprites.draw(ctx, p.color, p.x, p.y, size * 3, t * 0.8);
      }
      if (p.streak) {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = t;
        ctx.lineWidth = Math.max(1, size * 0.6);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    for (const r of this.rings) {
      const t = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = t * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, r.width * t);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = Math.min(1, (t.life / t.maxLife) * 2);
      ctx.globalAlpha = a;
      ctx.font = `800 ${t.size}px Georgia, serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10, 8, 30, 0.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.list.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
  }

  /** Drop floating texts only; bursts and rings stay. */
  clearTexts() {
    this.texts.length = 0;
  }
}
