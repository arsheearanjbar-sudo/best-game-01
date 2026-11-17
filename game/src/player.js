// The Keeper: movement, aim, bolts, dash, nova, orbit wisps and the shield
// halo. Upgrades mutate the `build` multipliers; this file only reads them.

import { PLAYER, ARENA } from './config.js';

export class PlayerBuild {
  constructor() {
    this.damageMult = 1;
    this.fireRateMult = 1;
    this.bolts = PLAYER.bolts;
    this.pierce = PLAYER.pierce;
    this.critChance = PLAYER.critChance;
    this.speedMult = 1;
    this.magnetMult = 1;
    this.dashCdMult = 1;
    this.dashEmbers = false;
    this.orbiters = 0;
    this.novaMult = 1;
    this.novaMax = PLAYER.novaMax;
    this.shieldMax = 0;
    this.shieldCdMax = 18;
  }
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = PLAYER.radius;
    this.hp = PLAYER.maxHp;
    this.maxHp = PLAYER.maxHp;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 8;
    this.aim = -Math.PI / 2;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashBuffer = 0;
    this.dashTimeLeft = 0;
    this.dashDirX = 1;
    this.dashDirY = 0;
    this.grace = 0;
    this.flash = 0;
    this.novaCharges = PLAYER.novaCharges;
    this.shield = 0;
    this.shieldTimer = 0;
    this.orbAngle = 0;
    this.walkPhase = 0;
    this.moving = false;
    this.build = new PlayerBuild();
    this.pendingLevels = 0;
  }

  get alive() {
    return this.hp > 0;
  }

  get speed() {
    return PLAYER.speed * this.build.speedMult;
  }

  get magnetRadius() {
    return PLAYER.magnetRadius * this.build.magnetMult;
  }

  get dashCooldown() {
    return PLAYER.dashCooldown * this.build.dashCdMult;
  }

  get dashing() {
    return this.dashTimeLeft > 0;
  }

  reset(x, y) {
    const fresh = new Player(x, y);
    Object.assign(this, fresh);
  }

  gainXp(amount, game) {
    this.xp += amount;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level += 1;
      this.xpNext = 8 + (this.level - 1) * 6;
      this.pendingLevels += 1;
      game.onLevelUp();
    }
  }

  /** Try to start a dash in the current move direction (or aim if still). */
  tryDash(mx, my) {
    if (this.dashTimer > 0 || this.dashTimeLeft > 0) return false;
    let dx = mx;
    let dy = my;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.aim);
      dy = Math.sin(this.aim);
    }
    const len = Math.hypot(dx, dy) || 1;
    this.dashDirX = dx / len;
    this.dashDirY = dy / len;
    this.dashTimeLeft = PLAYER.dashTime;
    this.dashTimer = this.dashCooldown;
    this.grace = Math.max(this.grace, PLAYER.dashTime + 0.05);
    return true;
  }

  /** Fire bolts toward the aim. Returns the spawned projectiles. */
  fire(rng, projectiles) {
    const n = this.build.bolts;
    const spread = 0.11;
    const spawned = [];
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * spread;
      const a = this.aim + offset + (rng ? rng.range(-0.015, 0.015) : 0);
      const crit = rng ? rng.chance(this.build.critChance) : Math.random() < this.build.critChance;
      const dmg = PLAYER.boltDamage * this.build.damageMult * (crit ? 2.2 : 1);
      const bolt = {
        x: this.x + Math.cos(a) * 22,
        y: this.y + Math.sin(a) * 22,
        vx: Math.cos(a) * PLAYER.boltSpeed,
        vy: Math.sin(a) * PLAYER.boltSpeed,
        radius: PLAYER.boltRadius,
        damage: dmg,
        pierce: this.build.pierce,
        crit,
        life: 1.1,
        hitIds: new Set(),
      };
      projectiles.push(bolt);
      spawned.push(bolt);
    }
    return spawned;
  }

  update(dt, input, game) {
    this.grace = Math.max(0, this.grace - dt);
    this.flash = Math.max(0, this.flash - dt * 6);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.dashBuffer = Math.max(0, this.dashBuffer - dt);
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.orbAngle += dt * 3.4;

    // Shield halo recharges over time.
    if (this.build.shieldMax > 0 && this.shield < this.build.shieldMax) {
      this.shieldTimer += dt;
      if (this.shieldTimer >= this.build.shieldCdMax) {
        this.shieldTimer = 0;
        this.shield += 1;
      }
    }

    // Aim follows the mouse.
    this.aim = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    const axis = input.moveAxis();
    this.moving = axis.x !== 0 || axis.y !== 0;
    if (this.moving) this.walkPhase += dt * 11;

    if (this.dashTimeLeft > 0) {
      this.dashTimeLeft -= dt;
      this.vx = this.dashDirX * PLAYER.dashSpeed;
      this.vy = this.dashDirY * PLAYER.dashSpeed;
      if (this.build.dashEmbers && Math.random() < 0.8) {
        game.particles.emberTrail(this.x, this.y, '#ff9e4f', 1);
      }
    } else {
      const targetVx = axis.x * this.speed;
      const targetVy = axis.y * this.speed;
      const k = 1 - Math.pow(0.0001, dt);
      this.vx += (targetVx - this.vx) * k;
      this.vy += (targetVy - this.vy) * k;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(ARENA.x + this.radius, Math.min(ARENA.x + ARENA.w - this.radius, this.x));
    this.y = Math.max(ARENA.y + this.radius, Math.min(ARENA.y + ARENA.h - this.radius, this.y));

    // Dash input, buffered: a press landing just before the cooldown ends
    // still fires instead of being swallowed.
    if (input.justPressed('ShiftLeft') || input.justPressed('ShiftRight') || input.rightClicked) {
      this.dashBuffer = 0.12;
    }
    if (this.dashBuffer > 0 && this.tryDash(axis.x, axis.y)) {
      this.dashBuffer = 0;
      game.audio.dash();
      game.particles.ring(this.x, this.y, '#ffe9a8', 46, 0.3, 3);
    }

    // Fire: hold mouse or Space.
    const firing = input.mouseDown || input.held('Space');
    if (firing && this.fireTimer <= 0) {
      this.fireTimer = PLAYER.fireInterval / this.build.fireRateMult;
      this.fire(game.rng, game.projectiles);
      game.audio.shoot();
      game.onPlayerFired();
    }

    // Nova: E or Q.
    if ((input.justPressed('KeyE') || input.justPressed('KeyQ')) && this.novaCharges > 0) {
      this.novaCharges -= 1;
      game.castNova();
    }
  }

  /** Positions of the orbiting wisps, for damage and drawing. */
  orbiterPositions() {
    const out = [];
    const n = this.build.orbiters;
    for (let i = 0; i < n; i++) {
      const a = this.orbAngle + (i * Math.PI * 2) / n;
      out.push({ x: this.x + Math.cos(a) * 52, y: this.y + Math.sin(a) * 52, angle: a });
    }
    return out;
  }

  /** Apply contact damage. Returns true when the hit landed. */
  takeHit(damage, game, fromX, fromY) {
    if (this.grace > 0 || !this.alive) return false;
    if (this.shield > 0) {
      this.shield -= 1;
      this.shieldTimer = 0;
      this.grace = 0.6;
      game.particles.ring(this.x, this.y, '#7bf1ff', 70, 0.4, 5);
      game.audio.click();
      return false;
    }
    this.hp -= damage;
    this.grace = PLAYER.contactGrace;
    this.flash = 1;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.vx += Math.cos(a) * 260;
    this.vy += Math.sin(a) * 260;
    game.onPlayerHurt(damage);
    return true;
  }
}

