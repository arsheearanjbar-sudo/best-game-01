// Level-up choices: roll three distinct upgrades the build can still take,
// weight the ones the player has not stacked yet, and apply the pick.

import { UPGRADES } from './config.js';

export class UpgradeDeck {
  constructor(rng) {
    this.rng = rng;
    this.stacks = new Map();
    this.takenOrder = [];
  }

  reset() {
    this.stacks.clear();
    this.takenOrder.length = 0;
  }

  stacksOf(id) {
    return this.stacks.get(id) ?? 0;
  }

  available() {
    return UPGRADES.filter((u) => this.stacksOf(u.id) < u.max);
  }

  /** Roll three distinct choices. Never empty while the pool has room. */
  roll(count = 3) {
    const pool = this.available();
    if (pool.length === 0) {
      // Everything maxed: offer healing instead.
      return [{
        id: 'mend', name: 'Mend the Flame', icon: 'heart', max: 99,
        desc: 'Heal 50 and gain 250 score. The lantern endures.',
        apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + 50); },
      }];
    }
    const picks = [];
    const bag = [...pool];
    while (picks.length < Math.min(count, bag.length)) {
      // Weight unstacked upgrades higher so builds branch out.
      let total = 0;
      const weights = bag.map((u) => {
        const w = this.stacksOf(u.id) === 0 ? 3 : 1;
        total += w;
        return w;
      });
      let roll = this.rng.float() * total;
      let idx = 0;
      for (let i = 0; i < bag.length; i++) {
        roll -= weights[i];
        if (roll <= 0) {
          idx = i;
          break;
        }
      }
      picks.push(bag.splice(idx, 1)[0]);
    }
    return picks;
  }

  apply(upgrade, player) {
    upgrade.apply(player);
    // Stacks never pass the card's own cap, even if apply is called twice.
    this.stacks.set(upgrade.id, Math.min(upgrade.max, this.stacksOf(upgrade.id) + 1));
    this.takenOrder.push(upgrade.id);
  }
}
