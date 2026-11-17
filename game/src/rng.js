// A small deterministic random source: the same seed plays the same game.
// Screenshot staging and any future replay both lean on this.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed) {
    this.next = mulberry32(seed);
  }
  /** A float in [0, 1). */
  float() {
    return this.next();
  }
  /** A float in [min, max). Tolerates swapped bounds. */
  range(min, max) {
    if (max < min) [min, max] = [max, min];
    return min + this.next() * (max - min);
  }
  /** An integer in [min, max] inclusive. */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  /** One element of an array, uniformly. */
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
  /** True with probability p. */
  chance(p) {
    return this.next() < p;
  }
  /** An angle in [0, 2π). */
  angle() {
    return this.next() * Math.PI * 2;
  }
  /** A unit vector at a random angle. */
  direction() {
    const a = this.angle();
    return { x: Math.cos(a), y: Math.sin(a) };
  }
}

/** A seed from the page URL (?seed=123), or a fresh one from the clock. */
export function seedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('seed');
  if (raw !== null && raw !== '' && Number.isFinite(Number(raw))) return Number(raw) >>> 0;
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}
