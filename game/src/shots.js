// Screenshot staging: ?shot=start|play|upgrade|victory|defeat&seed=N builds
// a real game state through the game's own systems and lets the normal
// render loop draw it. Nothing here draws anything itself — every pixel
// in a screenshot comes from the same code a player sees.

import { ARENA, VIEW_W, VIEW_H, ENEMIES } from './config.js';
import { Rng } from './rng.js';
import { Enemy } from './enemies.js';
import { Backdrop } from './world.js';
import { STATES } from './game.js';

function stageBattle(game, seed, wave, level) {
  const rng = new Rng(seed);
  game.startRun(seed);
  game.waves.wave = wave;
  game.waves.active = true;
  game.waveActive = true;
  game.score = 4250 + wave * 900;
  game.kills = 34 + wave * 12;
  game.best = 12400;
  game.runTime = 187 + wave * 24;
  const p = game.player;
  p.level = level;
  p.xp = 5;
  p.xpNext = 8 + (level - 1) * 6;
  p.hp = Math.round(p.maxHp * 0.72);
  p.x = ARENA.x + ARENA.w * 0.42;
  p.y = ARENA.y + ARENA.h * 0.55;
  // A mid-build loadout so the shot shows progression.
  p.build.bolts = 2;
  p.build.pierce = 1;
  p.build.orbiters = 2;
  p.build.damageMult = 1.6;
  p.build.fireRateMult = 1.35;
  p.novaCharges = 2;
  p.build.novaMax = 3;
  p.shield = 1;
  p.build.shieldMax = 1;
  p.aim = -0.6;

  // A staged crowd: every kind, at fighting distance, mid-animation.
  const spots = [
    ['wisp', 0.68, 0.30], ['wisp', 0.74, 0.52], ['wisp', 0.60, 0.72],
    ['wisp', 0.30, 0.24], ['husk', 0.80, 0.38], ['husk', 0.24, 0.66],
    ['spitter', 0.86, 0.62], ['spitter', 0.16, 0.40], ['dasher', 0.72, 0.78],
    ['dasher', 0.52, 0.22], ['brute', 0.88, 0.30], ['wisp', 0.44, 0.82],
    ['wisp', 0.58, 0.16], ['husk', 0.12, 0.58],
  ];
  for (const [type, fx, fy] of spots) {
    const e = new Enemy(type, ARENA.x + ARENA.w * fx, ARENA.y + ARENA.h * fy, wave, rng);
    e.spawnTimer = 0;
    e.age = rng.range(0.4, 2.5);
    if (type === 'dasher' && fx > 0.7) {
      e.state = 'aim';
      e.stateTimer = 0.4;
      e.lungeX = -0.8;
      e.lungeY = 0.4;
    }
    if (type === 'husk' && fx < 0.3) e.hp = Math.round(e.maxHp * 0.45);
    game.enemies.push(e);
  }
  // Bolts mid-flight toward the crowd.
  for (let i = 0; i < 4; i++) {
    const a = -0.6 + (i - 1.5) * 0.14;
    const d = 90 + i * 70;
    game.projectiles.push({
      x: p.x + Math.cos(a) * d,
      y: p.y + Math.sin(a) * d,
      vx: Math.cos(a) * 640,
      vy: Math.sin(a) * 640,
      radius: 5,
      damage: 12,
      pierce: 1,
      crit: i === 2,
      life: 0.8,
      hitIds: new Set(),
    });
  }
  // A glob arcing in, shards on the ground, sparks in the air.
  game.globs.push({
    x: ARENA.x + ARENA.w * 0.62, y: ARENA.y + ARENA.h * 0.4,
    vx: -160, vy: 60, radius: 8, damage: 10, life: 2.5, color: '#7ddb9e',
  });
  for (let i = 0; i < 7; i++) {
    game.pickups.drop(
      ARENA.x + ARENA.w * rng.range(0.3, 0.7),
      ARENA.y + ARENA.h * rng.range(0.3, 0.75),
      'shard', 1,
    );
  }
  game.pickups.drop(ARENA.x + ARENA.w * 0.34, ARENA.y + ARENA.h * 0.3, 'heart');
  game.particles.burst(ARENA.x + ARENA.w * 0.66, ARENA.y + ARENA.h * 0.42, '#8f6bff', 16, 200, 0.6, 3.5);
  game.particles.burst(ARENA.x + ARENA.w * 0.5, ARENA.y + ARENA.h * 0.6, '#ffd166', 10, 160, 0.5, 3);
  game.particles.ring(ARENA.x + ARENA.w * 0.66, ARENA.y + ARENA.h * 0.42, '#b388ff', 70, 0.5, 3);
  game.particles.floatText(ARENA.x + ARENA.w * 0.62, ARENA.y + ARENA.h * 0.34, '27', '#ffe9a8', 22, 0.9);
  game.particles.floatText(ARENA.x + ARENA.w * 0.72, ARENA.y + ARENA.h * 0.55, '14', '#fff3d6', 16, 0.9);
  game.comboCount = 11;
  game.comboTimer = 2.2;
  game.comboMult = 2;
  game.showBanner(`WAVE ${wave}`, '', 0.001);
  game.bannerTimer = 0;
}

function stageUpgrade(game, seed) {
  stageBattle(game, seed, 3, 4);
  game.enemies = game.enemies.slice(0, 6);
  game.projectiles = [];
  game.globs = [];
  game.particles.clearTexts();
  game.levelChoices = game.deck.roll(3);
  game.state = STATES.LEVELUP;
  game.shotFreeze = true;
}

function stageEnd(game, seed, victory) {
  const rng = new Rng(seed);
  game.startRun(seed);
  game.banner = null;
  game.bannerTimer = 0;
  game.state = victory ? STATES.VICTORY : STATES.DEFEAT;
  game.score = victory ? 24750 : 8930;
  game.kills = victory ? 214 : 96;
  game.runTime = victory ? 512 : 341;
  game.waves.wave = victory ? 10 : 6;
  game.player.level = victory ? 12 : 7;
  game.player.hp = victory ? 64 : 0;
  game.best = Math.max(game.best, game.score);
  game.newBest = true;
  game.shotFreeze = true;
  if (victory) {
    for (let i = 0; i < 26; i++) {
      game.particles.spawn(
        rng.range(80, VIEW_W - 80), rng.range(60, 260),
        {
          vx: rng.range(-30, 30), vy: rng.range(20, 70),
          life: rng.range(1.2, 2.4), size: rng.range(2, 4),
          color: rng.pick(['#ffd166', '#7bf1ff', '#b388ff', '#7dffa8']),
          glow: true,
        },
      );
    }
  } else {
    game.enemies = [
      new Enemy('husk', ARENA.x + ARENA.w * 0.3, ARENA.y + ARENA.h * 0.4, 6, rng),
      new Enemy('wisp', ARENA.x + ARENA.w * 0.68, ARENA.y + ARENA.h * 0.6, 6, rng),
    ];
    for (const e of game.enemies) e.spawnTimer = 0;
  }
}

/** Read ?shot= and ?seed= and stage the game. Returns true when staged. */
export function applyShotParams(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const seedRaw = params.get('seed');
  const seed = seedRaw !== null && Number.isFinite(Number(seedRaw)) ? Number(seedRaw) >>> 0 : 7;
  if (shot === 'start') {
    game.backdrop = new Backdrop(new Rng(seed));
    game.time = 2.5;
    return true;
  }
  if (shot === 'play') {
    stageBattle(game, seed, 4, 5);
    game.shotFreeze = true;
    return true;
  }
  if (shot === 'upgrade') {
    stageUpgrade(game, seed);
    return true;
  }
  if (shot === 'victory') {
    stageEnd(game, seed, true);
    return true;
  }
  if (shot === 'defeat') {
    stageEnd(game, seed, false);
    return true;
  }
  return false;
}

export { ENEMIES };
