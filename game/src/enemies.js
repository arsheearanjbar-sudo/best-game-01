// The Gloom: five enemy kinds plus the boss, each with its own way of
// hunting the Keeper, and the spawn director that feeds them in per wave.

import { ENEMIES, ARENA, waveScaling, SPAWN_MIN_PLAYER_DIST } from './config.js';

let nextId = 1;

export class Enemy {
  constructor(type, x, y, wave, rng) {
    const base = ENEMIES[type];
    const scale = waveScaling(wave);
    this.id = nextId++;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = base.radius;
    this.maxHp = Math.round(base.hp * scale.hpMult * (type === 'boss' ? 1 : 1));
    this.hp = this.maxHp;
    this.speed = base.speed * scale.speedMult * rng.range(0.9, 1.1);
    this.damage = base.damage;
    this.xp = base.xp;
    this.score = base.score;
    this.knockResist = base.knock;
    this.color = base.color;
    this.flash = 0;
    this.wobble = rng.range(0, Math.PI * 2);
    this.age = 0;
    this.attackTimer = rng.range(0.5, 1.5);
    this.state = 'seek';
    this.stateTimer = 0;
    this.lungeX = 0;
    this.lungeY = 0;
    this.spawnTimer = 0.55;
    this.hitCooldown = 0;
    this.bossPhase = 0;
    this.summonTimer = 6;
    this.spitTimer = 2.0;
  }

  get alive() {
    return this.hp > 0;
  }

  get spawning() {
    return this.spawnTimer > 0;
  }

  /** Steering toward the player with a per-kind flavor. */
  update(dt, player, game) {
    this.age += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      return;
    }
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    switch (this.type) {
      case 'wisp': {
        const wob = Math.sin(this.age * 3.2 + this.wobble) * 0.55;
        const px = -ny * wob;
        const py = nx * wob;
        this.vx += ((nx + px) * this.speed - this.vx) * Math.min(1, dt * 4);
        this.vy += ((ny + py) * this.speed - this.vy) * Math.min(1, dt * 4);
        break;
      }
      case 'husk':
      case 'brute': {
        this.vx += (nx * this.speed - this.vx) * Math.min(1, dt * 2.2);
        this.vy += (ny * this.speed - this.vy) * Math.min(1, dt * 2.2);
        break;
      }
      case 'spitter': {
        // Keeps a firing distance and strafes sideways.
        const want = 300;
        const toward = dist > want + 40 ? 1 : dist < want - 60 ? -1 : 0;
        const strafe = Math.sin(this.age * 0.9 + this.wobble) > 0 ? 1 : -1;
        const tx = nx * toward + -ny * strafe * 0.7;
        const ty = ny * toward + nx * strafe * 0.7;
        const tl = Math.hypot(tx, ty) || 1;
        this.vx += ((tx / tl) * this.speed - this.vx) * Math.min(1, dt * 3);
        this.vy += ((ty / tl) * this.speed - this.vy) * Math.min(1, dt * 3);
        this.spitTimer -= dt;
        if (this.spitTimer <= 0 && dist < 560) {
          this.spitTimer = 2.4;
          game.spawnGlob(this, nx, ny);
        }
        break;
      }
      case 'dasher': {
        this.stateTimer -= dt;
        if (this.state === 'seek') {
          this.vx += (nx * this.speed - this.vx) * Math.min(1, dt * 3.5);
          this.vy += (ny * this.speed - this.vy) * Math.min(1, dt * 3.5);
          if (dist < 260 && this.stateTimer <= 0) {
            this.state = 'aim';
            this.stateTimer = 0.5;
          }
        } else if (this.state === 'aim') {
          this.vx *= Math.pow(0.001, dt);
          this.vy *= Math.pow(0.001, dt);
          this.lungeX = nx;
          this.lungeY = ny;
          if (this.stateTimer <= 0) {
            this.state = 'lunge';
            this.stateTimer = 0.34;
            this.vx = this.lungeX * 540;
            this.vy = this.lungeY * 540;
            game.particles.emberTrail(this.x, this.y, '#e05d8f', 4);
          }
        } else if (this.state === 'lunge') {
          if (this.stateTimer <= 0) {
            this.state = 'rest';
            this.stateTimer = 0.7;
          }
        } else {
          this.vx *= Math.pow(0.01, dt);
          this.vy *= Math.pow(0.01, dt);
          if (this.stateTimer <= 0) {
            this.state = 'seek';
            this.stateTimer = 0.4;
          }
        }
        break;
      }
      case 'boss': {
        this.updateBoss(dt, player, game, nx, ny, dist);
        break;
      }
      default:
        break;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(ARENA.x + this.radius * 0.5, Math.min(ARENA.x + ARENA.w - this.radius * 0.5, this.x));
    this.y = Math.max(ARENA.y + this.radius * 0.5, Math.min(ARENA.y + ARENA.h - this.radius * 0.5, this.y));
  }

  updateBoss(dt, player, game, nx, ny, dist) {
    // Slow advance, always. Attacks cycle by phase.
    this.vx += (nx * this.speed - this.vx) * Math.min(1, dt * 1.6);
    this.vy += (ny * this.speed - this.vy) * Math.min(1, dt * 1.6);
    const hpFrac = this.hp / this.maxHp;
    const phase = hpFrac > 0.66 ? 0 : hpFrac > 0.33 ? 1 : 2;
    if (phase !== this.bossPhase) {
      this.bossPhase = phase;
      this.attackTimer = 0.4;
      game.particles.ring(this.x, this.y, '#b388ff', 200, 0.6, 6);
      game.addTrauma(0.5);
    }
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      if (phase === 0) {
        // Radial burst of slow globs.
        game.spawnRadial(this, 10, 150);
        this.attackTimer = 2.6;
      } else if (phase === 1) {
        // Aimed triple spread.
        game.spawnSpread(this, nx, ny, 3, 0.22, 230);
        this.attackTimer = 1.9;
      } else {
        // Spiral stream.
        const base = this.age * 2.4;
        for (let i = 0; i < 3; i++) {
          const a = base + (i * Math.PI * 2) / 3;
          game.spawnGlob(this, Math.cos(a), Math.sin(a), 190);
        }
        this.attackTimer = 0.55;
      }
    }
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = 7;
      game.summonMinions(this, 3);
    }
  }

  takeHit(damage, game, fromX, fromY, crit) {
    if (!this.alive || this.spawning) return false;
    this.hp -= damage;
    this.flash = 1;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    const push = 130 * this.knockResist;
    this.vx += Math.cos(a) * push;
    this.vy += Math.sin(a) * push;
    game.particles.floatText(this.x, this.y - this.radius - 6, String(Math.round(damage)), crit ? '#ffe9a8' : '#fff3d6', crit ? 22 : 16);
    game.particles.burst(this.x, this.y, this.color, crit ? 8 : 4, 160, 0.35, 3);
    game.audio.enemyHit();
    if (this.hp <= 0) game.onEnemyKilled(this);
    return true;
  }
}

/** Where a new enemy appears: just inside a random arena edge. */
/** A point on a random arena edge. When `avoid` is given (the Keeper), the
 *  point is re-rolled a few times until it is a fair distance away. */
export function spawnPoint(rng, avoid = null) {
  let best = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const edge = rng.int(0, 3);
    const m = 26;
    let p;
    if (edge === 0) p = { x: rng.range(ARENA.x + m, ARENA.x + ARENA.w - m), y: ARENA.y + m };
    else if (edge === 1) p = { x: rng.range(ARENA.x + m, ARENA.x + ARENA.w - m), y: ARENA.y + ARENA.h - m };
    else if (edge === 2) p = { x: ARENA.x + m, y: rng.range(ARENA.y + m, ARENA.y + ARENA.h - m) };
    else p = { x: ARENA.x + ARENA.w - m, y: rng.range(ARENA.y + m, ARENA.y + ARENA.h - m) };
    best = p;
    if (!avoid) return p;
    const d = Math.hypot(p.x - avoid.x, p.y - avoid.y);
    if (d >= SPAWN_MIN_PLAYER_DIST) return p;
  }
  return best;
}
