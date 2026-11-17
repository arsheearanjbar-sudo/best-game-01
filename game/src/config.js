// LUMENFALL tuning: every number that shapes how the game feels lives here.
// One place to tune, so balancing never means hunting through systems.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const ARENA = { x: 48, y: 96, w: VIEW_W - 96, h: VIEW_H - 156 };

export const PALETTE = {
  skyTop: '#0a0e24',
  skyBottom: '#1a1440',
  floorA: '#141a38',
  floorB: '#10142e',
  border: '#ffd166',
  borderDim: '#8a6a2f',
  gold: '#ffd166',
  goldHot: '#ffe9a8',
  ember: '#ff9e4f',
  cyan: '#4cc9f0',
  shard: '#7bf1ff',
  violet: '#b388ff',
  gloom: '#2d1b4e',
  gloomEdge: '#6d4bd8',
  blood: '#ff5d73',
  heal: '#7dffa8',
  text: '#fff3d6',
  textDim: '#c9b98f',
  panel: 'rgba(12, 14, 38, 0.92)',
  panelEdge: '#ffd166',
};

export const PLAYER = {
  radius: 15,
  speed: 265,
  maxHp: 100,
  fireInterval: 0.24,
  boltDamage: 12,
  boltSpeed: 640,
  boltRadius: 5,
  bolts: 1,
  pierce: 0,
  critChance: 0.08,
  critMult: 2.2,
  dashCooldown: 2.1,
  dashTime: 0.16,
  dashSpeed: 950,
  magnetRadius: 90,
  collectRadius: 30,
  contactGrace: 0.55,
  novaDamage: 90,
  novaRadius: 240,
  novaCharges: 1,
  novaMax: 3,
};

export const COMBO = {
  window: 3.0,
  maxMult: 5,
  stepKills: 6,
};

// Waves: each entry is one wave. `groups` spawn in order; a group is
// [type, count, gapSeconds]. `breather` is the calm before the wave starts.
export const WAVES = [
  { groups: [['wisp', 7, 0.9]], breather: 1.2 },
  { groups: [['wisp', 9, 0.7], ['husk', 2, 1.2]], breather: 2.2 },
  { groups: [['wisp', 8, 0.6], ['spitter', 2, 1.5], ['husk', 3, 1.0]], breather: 2.2 },
  { groups: [['dasher', 4, 0.8], ['wisp', 10, 0.5], ['husk', 3, 1.0]], breather: 2.4 },
  { groups: [['brute', 1, 0.1], ['wisp', 8, 0.6], ['spitter', 3, 1.2]], breather: 2.6 },
  { groups: [['dasher', 6, 0.6], ['spitter', 4, 1.0], ['husk', 4, 0.9]], breather: 2.4 },
  { groups: [['wisp', 16, 0.35], ['brute', 2, 2.0], ['spitter', 3, 1.0]], breather: 2.6 },
  { groups: [['dasher', 8, 0.5], ['husk', 6, 0.8], ['spitter', 4, 0.9]], breather: 2.6 },
  { groups: [['brute', 3, 1.6], ['dasher', 8, 0.5], ['wisp', 14, 0.4]], breather: 3.0 },
  { groups: [['boss', 1, 0.1], ['wisp', 6, 1.4]], breather: 3.2 },
];

export const ENEMIES = {
  wisp: { hp: 18, speed: 128, radius: 13, damage: 8, xp: 1, score: 50, knock: 1.0, color: '#8f6bff' },
  husk: { hp: 95, speed: 52, radius: 26, damage: 16, xp: 3, score: 120, knock: 0.35, color: '#5a3fa8' },
  spitter: { hp: 34, speed: 74, radius: 16, damage: 10, xp: 3, score: 150, knock: 0.8, color: '#3fae8a' },
  dasher: { hp: 42, speed: 96, radius: 15, damage: 14, xp: 3, score: 160, knock: 0.7, color: '#e05d8f' },
  brute: { hp: 340, speed: 38, radius: 38, damage: 24, xp: 8, score: 400, knock: 0.12, color: '#4a2a7a' },
  boss: { hp: 2600, speed: 46, radius: 54, damage: 28, xp: 40, score: 2500, knock: 0.0, color: '#2a1052' },
};

// How much tougher each wave makes the Gloom: hp and speed scale, capped.
export function waveScaling(wave) {
  return {
    hpMult: 1 + (wave - 1) * 0.22,
    speedMult: Math.min(1.35, 1 + (wave - 1) * 0.035),
  };
}

export function xpForLevel(level) {
  return 8 + (level - 1) * 6;
}

// The upgrade pool. `max` stacks; `apply` mutates the player build.
export const UPGRADES = [
  {
    id: 'ember', name: 'Ember Bolts', icon: 'bolt', max: 5,
    desc: '+30% bolt damage. Your lantern burns hotter.',
    apply: (p) => { p.damageMult *= 1.3; },
  },
  {
    id: 'rapid', name: 'Quick Hands', icon: 'wind', max: 5,
    desc: '+18% fire rate. The light answers faster.',
    apply: (p) => { p.fireRateMult *= 1.18; },
  },
  {
    id: 'split', name: 'Split Light', icon: 'prism', max: 3,
    desc: '+1 bolt per shot, in a wider fan.',
    apply: (p) => { p.bolts += 1; },
  },
  {
    id: 'pierce', name: 'Lance of Dawn', icon: 'lance', max: 3,
    desc: 'Bolts pierce +1 enemy.',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'crit', name: "Gloom's Bane", icon: 'star', max: 4,
    desc: '+12% critical chance. Crits deal double damage.',
    apply: (p) => { p.critChance += 0.12; },
  },
  {
    id: 'wisp', name: 'Orbit Wisps', icon: 'orbit', max: 3,
    desc: '+1 orbiting wisp that burns what it touches.',
    apply: (p) => { p.orbiters += 1; },
  },
  {
    id: 'swift', name: 'Swift Steps', icon: 'boot', max: 4,
    desc: '+12% move speed.',
    apply: (p) => { p.speedMult *= 1.12; },
  },
  {
    id: 'heart', name: 'Lantern Heart', icon: 'heart', max: 5,
    desc: '+25 max health and heal 40.',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 40); },
  },
  {
    id: 'magnet', name: 'Shard Lure', icon: 'magnet', max: 3,
    desc: '+60% pickup radius. Shards fly to you.',
    apply: (p) => { p.magnetMult *= 1.6; },
  },
  {
    id: 'nova', name: 'Nova Charge', icon: 'nova', max: 3,
    desc: '+1 nova charge and +25% nova damage.',
    apply: (p) => { p.novaMax += 1; p.novaCharges = Math.min(p.novaMax, p.novaCharges + 1); p.novaMult *= 1.25; },
  },
  {
    id: 'dash', name: 'Ghost Step', icon: 'ghost', max: 3,
    desc: '-25% dash cooldown. Dashing leaves burning embers.',
    apply: (p) => { p.dashCdMult *= 0.75; p.dashEmbers = true; },
  },
  {
    id: 'shield', name: 'Aegis Halo', icon: 'shield', max: 3,
    desc: 'A halo blocks one hit every 18 seconds.',
    apply: (p) => { p.shieldMax += 1; p.shieldCdMax = Math.max(9, p.shieldCdMax - 3); },
  },
];

export const SCORE = {
  waveClear: 250,
  levelBonus: 100,
  noHitWave: 400,
};

// How far from the Keeper a spawn point must sit; the Gloom never appears
// on top of the player.
export const SPAWN_MIN_PLAYER_DIST = 220;

export const BEST_KEY = 'lumenfall-best-score';
