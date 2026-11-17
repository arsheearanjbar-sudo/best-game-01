// Pickups: light shards (XP), hearts (heal) and nova charges. Shards drift,
// then fly to the Keeper inside the magnet radius, with a little pop.

export class Pickups {
  constructor() {
    this.list = [];
  }

  drop(x, y, kind, amount = 1) {
    // Cap the field so a long run can never grow the list without bound.
    if (this.list.length >= 220) this.list.splice(0, this.list.length - 219);
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 60;
    this.list.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      kind,
      amount,
      age: 0,
      bob: Math.random() * Math.PI * 2,
    });
  }

  update(dt, player, game) {
    const magnet = player.magnetRadius;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < magnet) {
        const pull = p.kind === 'shard' ? 900 : 420;
        p.vx += (dx / dist) * pull * dt * 3;
        p.vy += (dy / dist) * pull * dt * 3;
      } else {
        p.vx *= Math.pow(0.02, dt);
        p.vy *= Math.pow(0.02, dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (dist < player.radius + 14) {
        this.collect(p, game);
        this.list.splice(i, 1);
      }
    }
  }

  collect(p, game) {
    if (p.kind === 'shard') {
      game.player.gainXp(p.amount, game);
      game.audio.pickup(game.comboCount);
      game.particles.spawn(p.x, p.y, { life: 0.3, size: 3, color: '#7bf1ff', glow: true });
    } else if (p.kind === 'heart') {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 22);
      game.audio.heal();
      game.particles.floatText(p.x, p.y - 14, '+22', '#7dffa8', 20);
      game.particles.ring(p.x, p.y, '#7dffa8', 44, 0.4, 3);
    } else if (p.kind === 'nova') {
      game.player.novaCharges = Math.min(game.player.build.novaMax, game.player.novaCharges + 1);
      game.audio.pickup(6);
      game.particles.floatText(p.x, p.y - 14, 'NOVA +1', '#ffd166', 18);
      game.particles.ring(p.x, p.y, '#ffd166', 44, 0.4, 3);
    }
  }

  clear() {
    this.list.length = 0;
  }
}
