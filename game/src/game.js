// The game itself: state machine, collisions, scoring, combos, the nova,
// screen shake and the flow between title, play, level-up and the end.
// Systems live in their own files; this one only conducts them.

import { VIEW_W, VIEW_H, ARENA, PLAYER, COMBO, SCORE, BEST_KEY, xpForLevel } from './config.js';
import { Rng } from './rng.js';
import { Player } from './player.js';
import { Enemy } from './enemies.js';
import { Pickups } from './pickups.js';
import { Particles, SpriteCache } from './particles.js';
import { UpgradeDeck } from './upgrades.js';
import { Backdrop, WaveDirector } from './world.js';
import { AudioEngine } from './audio.js';
import { titleLayout, pauseLayout, endLayout, cardLayout } from './render.js';

export const STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  LEVELUP: 'levelup',
  PAUSED: 'paused',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
};

export class Game {
  constructor(canvas, input, renderer) {
    this.canvas = canvas;
    this.input = input;
    this.renderer = renderer;
    this.state = STATES.TITLE;
    this.time = 0;
    this.runTime = 0;
    this.seed = 0;
    this.rng = new Rng(1);
    this.audio = new AudioEngine();
    this.particles = new Particles();
    this.sprites = new SpriteCache();
    this.player = new Player(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2 + 60);
    this.enemies = [];
    this.projectiles = [];
    this.globs = [];
    this.pickups = new Pickups();
    this.deck = new UpgradeDeck(this.rng);
    this.backdrop = null;
    this.waves = new WaveDirector(this.rng);
    this.score = 0;
    this.kills = 0;
    this.best = 0;
    this.newBest = false;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboMult = 1;
    this.trauma = 0;
    this.hitStop = 0;
    this.banner = null;
    this.bannerSub = null;
    this.bannerTimer = 0;
    this.bannerDuration = 1;
    this.toast = null;
    this.toastTimer = 0;
    this.levelChoices = [];
    this.waveActive = false;
    this.noHitWave = true;
    this.shotFreeze = false;
    this._loadBest();
  }

  _loadBest() {
    try {
      this.best = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      this.best = 0;
    }
  }

  _saveBest() {
    try {
      window.localStorage.setItem(BEST_KEY, String(this.best));
    } catch {
      // Storage unavailable: the run still counts.
    }
  }

  /** (Re)build the world for a fresh run. */
  startRun(seed) {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.deck = new UpgradeDeck(this.rng);
    this.waves = new WaveDirector(this.rng);
    this.backdrop = new Backdrop(this.rng);
    this.player = new Player(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2 + 60);
    this.enemies = [];
    this.projectiles = [];
    this.globs = [];
    this.pickups = new Pickups();
    this.particles.clear();
    this.score = 0;
    this.kills = 0;
    this.runTime = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboMult = 1;
    this.trauma = 0;
    this.hitStop = 0;
    this.levelUpTime = 0;
    this.newBest = false;
    this.noHitWave = true;
    this.state = STATES.PLAYING;
    this.waves.start();
    this.showBanner('HOLD THE LIGHT', 'Wave 1 is coming — the Gloom stirs at the edges.', 2.2);
  }

  showBanner(text, sub, duration = 1.8) {
    this.banner = text;
    this.bannerSub = sub || null;
    this.bannerTimer = duration;
    this.bannerDuration = duration;
  }

  showToast(text, duration = 2.0) {
    this.toast = text;
    this.toastTimer = duration;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  get shakeOffset() {
    const s = this.trauma * this.trauma;
    if (s <= 0) return { x: 0, y: 0 };
    // Summed sines at unrelated rates: a smooth shudder, never the
    // per-frame random buzz. this.time runs in real time even during
    // hit-stop, so the shake decays instead of freezing off-centre.
    const t = this.time * 30;
    return {
      x: 13 * s * Math.sin(t * 1.7),
      y: 9 * s * Math.sin(t * 2.3),
    };
  }

  // ------------------------------------------------------------ events

  onWaveStart(n) {
    this.waveActive = true;
    this.noHitWave = true;
    if (n === 10) {
      this.showBanner('THE FINAL WAVE', 'Gloomheart comes for the lantern itself.', 2.6);
      this.audio.bossRoar();
    } else {
      this.showBanner(`WAVE ${n}`, n === 1 ? 'The Gloom stirs at the edges.' : '', 1.6);
      this.audio.waveStart();
    }
  }

  onWaveClear(n) {
    this.waveActive = false;
    let bonus = SCORE.waveClear;
    let label = `WAVE ${n} CLEARED  +${bonus}`;
    if (this.noHitWave) {
      bonus += SCORE.noHitWave;
      label = `FLAWLESS WAVE  +${bonus}`;
    }
    this.score += bonus;
    this.showToast(label);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 6);
  }

  onLevelUp() {
    this.score += SCORE.levelBonus;
  }

  onPlayerFired() {
    const p = this.player;
    const mx = p.x + Math.cos(p.aim) * 26;
    const my = p.y + Math.sin(p.aim) * 26;
    this.particles.spawn(mx, my, { life: 0.12, size: 4, color: '#ffe9a8', glow: true });
    this.addTrauma(0.03);
  }

  onPlayerHurt(damage) {
    this.audio.hurt();
    this.addTrauma(0.45);
    this.noHitWave = false;
    this.comboCount = 0;
    this.comboMult = 1;
    this.particles.burst(this.player.x, this.player.y, '#ff5d73', 12, 200, 0.4, 3.5);
    if (this.player.hp <= 0) this.onDefeat();
  }

  onEnemyKilled(enemy) {
    this.kills += 1;
    this.comboCount += 1;
    this.comboTimer = COMBO.window;
    this.comboMult = Math.min(COMBO.maxMult, 1 + Math.floor(this.comboCount / COMBO.stepKills));
    const gained = enemy.score * this.comboMult;
    this.score += gained;
    this.particles.floatText(enemy.x, enemy.y - enemy.radius - 18, `+${gained}`, '#ffd166', 16, 0.8);
    const big = enemy.type === 'brute' || enemy.type === 'boss';
    this.particles.burst(enemy.x, enemy.y, enemy.color, big ? 34 : 16, big ? 300 : 230, big ? 0.7 : 0.5, big ? 4.5 : 3.5);
    this.particles.ring(enemy.x, enemy.y, enemy.color, big ? 130 : 60, 0.4, big ? 5 : 3);
    this.audio.enemyDie(big);
    this.addTrauma(big ? 0.5 : 0.12);
    if (big) this.hitStop = Math.max(this.hitStop, 0.05);
    // Drops.
    for (let i = 0; i < enemy.xp; i++) this.pickups.drop(enemy.x, enemy.y, 'shard', 1);
    const roll = this.rng.float();
    if (enemy.type === 'boss') {
      this.pickups.drop(enemy.x, enemy.y, 'heart');
      this.pickups.drop(enemy.x, enemy.y, 'nova');
      this.pickups.drop(enemy.x, enemy.y, 'heart');
    } else if (roll < 0.035) {
      this.pickups.drop(enemy.x, enemy.y, 'heart');
    } else if (roll < 0.06) {
      this.pickups.drop(enemy.x, enemy.y, 'nova');
    }
  }

  onVictory() {
    if (this.state !== STATES.PLAYING) return;
    this.state = STATES.VICTORY;
    this.score += 1000;
    this.finishRun();
    this.audio.victory();
    for (let i = 0; i < 5; i++) {
      this.particles.ring(VIEW_W / 2 + (Math.random() - 0.5) * 500, 200 + Math.random() * 200, '#ffd166', 120, 0.8, 4);
    }
  }

  onDefeat() {
    if (this.state !== STATES.PLAYING) return;
    this.state = STATES.DEFEAT;
    this.particles.burst(this.player.x, this.player.y, '#ffd166', 40, 280, 0.9, 4);
    this.particles.ring(this.player.x, this.player.y, '#ffd166', 170, 0.8, 5);
    this.finishRun();
    this.audio.defeat();
  }

  finishRun() {
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      this._saveBest();
    }
  }

  // ------------------------------------------------------------ combat

  spawnGlob(from, nx, ny, speed = 185) {
    this.globs.push({
      x: from.x,
      y: from.y,
      vx: nx * speed,
      vy: ny * speed,
      radius: 8,
      damage: 10,
      life: 3.2,
      color: from.type === 'boss' ? '#b388ff' : '#7ddb9e',
    });
    this.particles.spawn(from.x, from.y, { life: 0.2, size: 4, color: '#7ddb9e', glow: true });
  }

  spawnSpread(from, nx, ny, count, step, speed) {
    const base = Math.atan2(ny, nx);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * step;
      this.spawnGlob(from, Math.cos(a), Math.sin(a), speed);
    }
  }

  spawnRadial(from, count, speed) {
    const offset = this.rng.angle();
    for (let i = 0; i < count; i++) {
      const a = offset + (i * Math.PI * 2) / count;
      this.spawnGlob(from, Math.cos(a), Math.sin(a), speed);
    }
  }

  summonMinions(boss, count) {
    for (let i = 0; i < count; i++) {
      const a = this.rng.angle();
      const e = new Enemy('wisp', boss.x + Math.cos(a) * 90, boss.y + Math.sin(a) * 90, this.waves.wave, this.rng);
      e.spawnTimer = 0.4;
      this.enemies.push(e);
      this.particles.ring(e.x, e.y, '#6d4bd8', 36, 0.4, 3);
    }
  }

  castNova() {
    const p = this.player;
    const radius = PLAYER.novaRadius * (1 + 0.15 * (p.build.novaMult - 1));
    const damage = PLAYER.novaDamage * p.build.novaMult;
    this.particles.ring(p.x, p.y, '#ffe9a8', radius, 0.55, 7);
    this.particles.ring(p.x, p.y, '#ff9e4f', radius * 0.7, 0.45, 5);
    this.particles.burst(p.x, p.y, '#ffd166', 30, 420, 0.6, 4);
    this.audio.nova();
    this.addTrauma(0.55);
    this.hitStop = Math.max(this.hitStop, 0.04);
    for (const e of [...this.enemies]) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < radius + e.radius) {
        e.takeHit(damage, this, p.x, p.y, false);
      }
    }
    // Nova also clears enemy globs.
    for (let i = this.globs.length - 1; i >= 0; i--) {
      const g = this.globs[i];
      if (Math.hypot(g.x - p.x, g.y - p.y) < radius) {
        this.particles.spawn(g.x, g.y, { life: 0.25, size: 3, color: '#7bf1ff', glow: true });
        this.globs.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------ update

  update(dt) {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    // A frozen staged shot keeps its particles composed; live play animates them.
    const frozen = this.shotFreeze && (this.state === STATES.PLAYING || this.state === STATES.LEVELUP);
    this.particles.update(frozen ? 0 : dt);
    this.audio.updateMusic(dt, this.state === STATES.PLAYING);

    if (this.input.justPressed('KeyM')) {
      const muted = this.audio.toggleMute();
      this.showToast(muted ? 'SOUND OFF' : 'SOUND ON', 1.2);
    }
    if (this.input.anyGesture) this.audio.unlock();

    // A freeze frame swallows gameplay input unless the edges are buffered.
    const froze = this.state === STATES.PLAYING && this.hitStop > 0;
    switch (this.state) {
      case STATES.TITLE:
        this.updateTitle();
        break;
      case STATES.PLAYING: {
        if (this.hitStop > 0) {
          this.hitStop -= dt;
          break;
        }
        if (this.input.justPressed('KeyP') || this.input.justPressed('Escape')) {
          this.state = STATES.PAUSED;
          break;
        }
        this.runTime += dt;
        this.updatePlaying(dt);
        break;
      }
      case STATES.LEVELUP:
        this.updateLevelUp(dt);
        break;
      case STATES.PAUSED:
        this.updatePause();
        break;
      case STATES.VICTORY:
      case STATES.DEFEAT:
        this.updateEnd();
        break;
      default:
        break;
    }
    if (froze) {
      // Keep dash/nova presses alive through the freeze so they fire the
      // moment time resumes; every other edge is consumed normally.
      const keep = ['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyQ']
        .filter((c) => this.input.pressed.has(c));
      const keepRight = this.input.rightClicked;
      this.input.endFrame();
      for (const c of keep) this.input.pressed.add(c);
      if (keepRight) this.input.rightClicked = true;
    } else {
      this.input.endFrame();
    }
  }

  updateTitle() {
    const layout = titleLayout();
    if (this.input.clicked(layout.start) || this.input.justPressed('Enter') || this.input.justPressed('Space')) {
      this.audio.unlock();
      this.audio.click();
      this.startRun((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    }
  }

  updatePlaying(dt) {
    if (this.shotFreeze) return;
    const p = this.player;
    p.update(dt, this.input, this);

    // Combo decay.
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) {
      this.comboCount = 0;
      this.comboMult = 1;
    }

    this.waves.update(dt, this);

    for (const e of this.enemies) e.update(dt, p, this);

    // Orbit wisps damage.
    const orbs = p.orbiterPositions();
    for (const o of orbs) {
      for (const e of this.enemies) {
        if (!e.alive || e.spawning) continue;
        if (Math.hypot(e.x - o.x, e.y - o.y) < e.radius + 12 && e.hitCooldown <= 0) {
          e.hitCooldown = 0.45;
          e.takeHit(16 * p.build.damageMult, this, p.x, p.y, false);
        }
      }
    }

    // Projectiles.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const b = this.projectiles[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.random() < 0.5) this.particles.emberTrail(b.x, b.y, '#ffd166', 1);
      let dead = b.life <= 0
        || b.x < ARENA.x - 20 || b.x > ARENA.x + ARENA.w + 20
        || b.y < ARENA.y - 20 || b.y > ARENA.y + ARENA.h + 20;
      if (!dead) {
        for (const e of this.enemies) {
          if (!e.alive || e.spawning || b.hitIds.has(e.id)) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
            b.hitIds.add(e.id);
            e.takeHit(b.damage, this, p.x, p.y, b.crit);
            if (b.pierce > 0) {
              b.pierce -= 1;
            } else {
              dead = true;
              break;
            }
          }
        }
      }
      if (dead) {
        this.particles.spawn(b.x, b.y, { life: 0.18, size: 3, color: '#ffe9a8', glow: true });
        this.projectiles.splice(i, 1);
      }
    }

    // Enemy globs.
    for (let i = this.globs.length - 1; i >= 0; i--) {
      const g = this.globs[i];
      g.life -= dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      let dead = g.life <= 0
        || g.x < ARENA.x - 20 || g.x > ARENA.x + ARENA.w + 20
        || g.y < ARENA.y - 20 || g.y > ARENA.y + ARENA.h + 20;
      if (!dead && p.alive && Math.hypot(g.x - p.x, g.y - p.y) < g.radius + p.radius - 2) {
        p.takeHit(g.damage, this, g.x, g.y);
        dead = true;
      }
      if (dead) this.globs.splice(i, 1);
    }

    // Contact damage.
    for (const e of this.enemies) {
      if (!e.alive || e.spawning || !p.alive) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius - 3) {
        p.takeHit(e.damage, this, e.x, e.y);
      }
    }

    // Remove the dead.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) this.enemies.splice(i, 1);
    }

    this.pickups.update(dt, p, this);

    // Pending level-ups open the choice screen.
    if (p.pendingLevels > 0 && p.alive && this.state === STATES.PLAYING) {
      p.pendingLevels -= 1;
      this.levelChoices = this.deck.roll(3);
      this.state = STATES.LEVELUP;
      this.levelUpTime = 0;
      this.audio.levelUp();
      this.particles.ring(p.x, p.y, '#7bf1ff', 110, 0.6, 4);
    }
  }

  updateLevelUp(dt) {
    this.levelUpTime += dt;
    const cards = cardLayout(this.levelChoices.length);
    const keys = ['Digit1', 'Digit2', 'Digit3'];
    for (let i = 0; i < this.levelChoices.length; i++) {
      if (this.input.clicked(cards[i]) || this.input.justPressed(keys[i])) {
        const choice = this.levelChoices[i];
        this.deck.apply(choice, this.player);
        if (choice.id === 'mend') this.score += 250;
        this.audio.click();
        this.particles.floatText(this.player.x, this.player.y - 40, choice.name.toUpperCase(), '#7bf1ff', 22, 1.1);
        this.levelChoices = [];
        this.state = STATES.PLAYING;
        return;
      }
    }
  }

  updatePause() {
    if (this.input.justPressed('KeyP') || this.input.justPressed('Escape') || this.input.justPressed('Enter')) {
      this.state = STATES.PLAYING;
      return;
    }
    const layout = pauseLayout();
    if (this.input.clicked(layout.resume)) {
      this.state = STATES.PLAYING;
    } else if (this.input.clicked(layout.restart)) {
      this.audio.click();
      this.startRun((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    } else if (this.input.clicked(layout.menu)) {
      this.audio.click();
      this.state = STATES.TITLE;
    }
  }

  updateEnd() {
    const layout = endLayout();
    if (this.input.clicked(layout.again) || this.input.justPressed('Enter') || this.input.justPressed('Space')) {
      this.audio.click();
      this.startRun((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    } else if (this.input.clicked(layout.menu)) {
      this.audio.click();
      this.state = STATES.TITLE;
    }
  }

  // ------------------------------------------------------------ render

  render() {
    const ctx = this.renderer.ctx;
    ctx.save();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (this.state === STATES.TITLE) {
      this.renderer.drawTitle(this, this.input);
      ctx.restore();
      return;
    }
    const shake = this.shakeOffset;
    ctx.translate(shake.x, shake.y);
    this.renderer.drawScene(this);
    this.renderer.drawHUD(this);
    this.renderer.drawBanner(this);
    this.renderer.drawWaveClearToast(this);
    ctx.restore();
    if (this.state === STATES.LEVELUP) {
      this.renderer.drawLevelUp(this, this.input, this.levelChoices);
    } else if (this.state === STATES.PAUSED) {
      this.renderer.drawPause(this, this.input);
    } else if (this.state === STATES.VICTORY) {
      this.renderer.drawEndScreen(this, this.input, true);
    } else if (this.state === STATES.DEFEAT) {
      this.renderer.drawEndScreen(this, this.input, false);
    }
  }
}

export { xpForLevel };
