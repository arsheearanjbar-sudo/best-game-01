// Everything the eye sees: the arena, the Keeper, the Gloom, the HUD and
// every menu. Layout helpers are pure functions of the view size so the
// game can hit-test the same rectangles it draws.

import { VIEW_W, VIEW_H, ARENA, PALETTE, PLAYER, SCORE, BEST_KEY } from './config.js';

const FONT_DISPLAY = 'Georgia, "Times New Roman", serif';
const FONT_BODY = 'Verdana, Geneva, sans-serif';

export function titleLayout() {
  return {
    start: { x: VIEW_W / 2 - 150, y: 478, w: 300, h: 62 },
    mute: { x: VIEW_W - 64, y: 20, w: 44, h: 44 },
  };
}

export function pauseLayout() {
  return {
    resume: { x: VIEW_W / 2 - 150, y: 330, w: 300, h: 54 },
    restart: { x: VIEW_W / 2 - 150, y: 398, w: 300, h: 54 },
    menu: { x: VIEW_W / 2 - 150, y: 466, w: 300, h: 54 },
  };
}

export function endLayout() {
  return {
    again: { x: VIEW_W / 2 - 150, y: 496, w: 300, h: 58 },
    menu: { x: VIEW_W / 2 - 150, y: 566, w: 300, h: 46 },
  };
}

export function cardLayout(count) {
  const w = 250;
  const h = 300;
  const gap = 26;
  const total = count * w + (count - 1) * gap;
  const x0 = (VIEW_W - total) / 2;
  const y = 210;
  const cards = [];
  for (let i = 0; i < count; i++) cards.push({ x: x0 + i * (w + gap), y, w, h });
  return cards;
}

export class Renderer {
  constructor(ctx, sprites) {
    this.ctx = ctx;
    this.sprites = sprites;
  }

  // ------------------------------------------------------------ helpers

  panel(x, y, w, h, radius = 16) {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  button(rect, label, hover, opts = {}) {
    const ctx = this.ctx;
    const { fontSize = 24, fill = '#2a1f4d', edge = PALETTE.gold } = opts;
    ctx.fillStyle = hover ? '#3d2c6e' : fill;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = hover ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = hover ? '#ffe9a8' : PALETTE.text;
    ctx.font = `800 ${fontSize}px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  }

  bar(x, y, w, h, frac, fill, back = 'rgba(0,0,0,0.55)', edge = 'rgba(255,255,255,0.25)') {
    const ctx = this.ctx;
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, Math.max(4, (w - 4) * Math.min(1, frac)), h - 4, (h - 4) / 2);
      ctx.fill();
    }
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.stroke();
  }

  text(str, x, y, font, fill, align = 'center', glow = null) {
    const ctx = this.ctx;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (glow) {
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 18;
      ctx.fillStyle = fill;
      ctx.fillText(str, x, y);
      ctx.restore();
    } else {
      ctx.fillStyle = fill;
      ctx.fillText(str, x, y);
    }
  }

  // ------------------------------------------------------------ world

  drawScene(game) {
    const ctx = this.ctx;
    ctx.drawImage(game.backdrop.canvas, 0, 0);
    game.backdrop.drawAnimated(ctx, game.time);
    this.drawArenaBorder(game);
    this.drawPickups(game);
    this.drawGlobs(game);
    this.drawEnemies(game);
    this.drawProjectiles(game);
    this.drawPlayer(game);
    game.particles.draw(ctx);
    this.drawVignette(game);
    game.particles.drawTexts(ctx);
  }

  drawArenaBorder(game) {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 1.6);
    ctx.strokeStyle = `rgba(255, 209, 102, ${0.35 + pulse * 0.25})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(ARENA.x - 6, ARENA.y - 6, ARENA.w + 12, ARENA.h + 12, 18);
    ctx.stroke();
  }

  drawPickups(game) {
    const ctx = this.ctx;
    for (const p of game.pickups.list) {
      const bob = Math.sin(game.time * 3 + p.bob) * 3;
      if (p.kind === 'shard') {
        this.sprites.draw(ctx, '#4cc9f0', p.x, p.y + bob, 20, 0.8);
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#7bf1ff';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.fillStyle = '#e8fbff';
        ctx.fillRect(-2.5, -2.5, 5, 5);
        ctx.restore();
      } else if (p.kind === 'heart') {
        this.sprites.draw(ctx, '#7dffa8', p.x, p.y + bob, 24, 0.8);
        ctx.fillStyle = '#7dffa8';
        ctx.beginPath();
        ctx.arc(p.x - 4.5, p.y + bob - 2, 6, 0, Math.PI * 2);
        ctx.arc(p.x + 4.5, p.y + bob - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.x - 9.5, p.y + bob + 1);
        ctx.lineTo(p.x, p.y + bob + 11);
        ctx.lineTo(p.x + 9.5, p.y + bob + 1);
        ctx.closePath();
        ctx.fill();
      } else {
        this.sprites.draw(ctx, '#ffd166', p.x, p.y + bob, 26, 0.9);
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + game.time;
          const r = i % 2 === 0 ? 11 : 5;
          const px = p.x + Math.cos(a) * r;
          const py = p.y + bob + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawGlobs(game) {
    const ctx = this.ctx;
    for (const g of game.globs) {
      this.sprites.draw(ctx, g.color, g.x, g.y, 26, 0.85);
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(g.x - 2.5, g.y - 2.5, g.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawProjectiles(game) {
    const ctx = this.ctx;
    for (const b of game.projectiles) {
      const a = Math.atan2(b.vy, b.vx);
      this.sprites.draw(ctx, b.crit ? '#ffe9a8' : '#ffd166', b.x, b.y, b.crit ? 26 : 20, 0.9);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(a);
      ctx.fillStyle = b.crit ? '#fff6d8' : '#ffe9a8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9e4f';
      ctx.beginPath();
      ctx.ellipse(-6, 0, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawEnemies(game) {
    const ctx = this.ctx;
    for (const e of game.enemies) {
      if (e.spawning) {
        const t = 1 - e.spawnTimer / 0.55;
        ctx.globalAlpha = 0.3 + t * 0.7;
        this.sprites.draw(ctx, '#6d4bd8', e.x, e.y, e.radius * 2.4, 0.7 * t);
        ctx.strokeStyle = `rgba(179, 136, 255, ${0.8 * t})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (1.6 - t * 0.6), game.time * 3, game.time * 3 + Math.PI * 1.4);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      const squash = 1 + Math.sin(e.age * 6 + e.wobble) * 0.05;
      // Hit pop: the body swells with the white flash, then settles back to
      // exactly its rest size as the flash decays.
      const pop = 1 + e.flash * 0.16;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale((1 / squash) * pop, squash * pop);
      this.drawEnemyBody(game, e);
      ctx.restore();
      if (e.flash > 0) {
        ctx.globalAlpha = e.flash * 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (e.hp < e.maxHp && e.type !== 'boss') {
        this.bar(e.x - e.radius, e.y - e.radius - 12, e.radius * 2, 5, e.hp / e.maxHp, '#b388ff', 'rgba(0,0,0,0.6)');
      }
    }
  }

  drawEnemyBody(game, e) {
    const ctx = this.ctx;
    const r = e.radius;
    this.sprites.draw(ctx, e.color, 0, 0, r * 2.1, 0.55);
    if (e.type === 'wisp') {
      ctx.fillStyle = '#3b2a6e';
      ctx.beginPath();
      ctx.moveTo(0, -r - 6);
      ctx.quadraticCurveTo(r, -r * 0.2, r * 0.8, r * 0.6);
      ctx.quadraticCurveTo(r * 0.4, r + 4, 0, r);
      ctx.quadraticCurveTo(-r * 0.4, r + 4, -r * 0.8, r * 0.6);
      ctx.quadraticCurveTo(-r, -r * 0.2, 0, -r - 6);
      ctx.fill();
      ctx.fillStyle = '#e8dcff';
      ctx.beginPath();
      ctx.arc(-4.5, -3, 2.6, 0, Math.PI * 2);
      ctx.arc(4.5, -3, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'husk') {
      ctx.fillStyle = '#4a357e';
      ctx.beginPath();
      ctx.roundRect(-r, -r * 0.85, r * 2, r * 1.7, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.5);
      ctx.lineTo(-r * 0.1, 0);
      ctx.lineTo(-r * 0.4, r * 0.5);
      ctx.moveTo(r * 0.5, -r * 0.4);
      ctx.lineTo(r * 0.2, r * 0.1);
      ctx.stroke();
      ctx.fillStyle = '#b388ff';
      ctx.beginPath();
      ctx.arc(0, -2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5d73';
      ctx.beginPath();
      ctx.arc(-9, -10, 3, 0, Math.PI * 2);
      ctx.arc(9, -10, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'spitter') {
      ctx.fillStyle = '#2e6e58';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + e.age * 0.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
        ctx.lineTo(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8));
        ctx.lineTo(Math.cos(a + 0.3) * r * 0.7, Math.sin(a + 0.3) * r * 0.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#3fae8a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d2b20';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eafff6';
      ctx.beginPath();
      ctx.arc(-6, -8, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'dasher') {
      const aiming = e.state === 'aim';
      ctx.fillStyle = aiming ? '#ff8fb3' : '#8f2d56';
      const dir = Math.atan2(e.vy, e.vx);
      ctx.save();
      ctx.rotate(Number.isFinite(dir) ? dir : 0);
      ctx.beginPath();
      ctx.moveTo(r + 10, 0);
      ctx.lineTo(-r * 0.7, -r * 0.8);
      ctx.lineTo(-r * 0.3, 0);
      ctx.lineTo(-r * 0.7, r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd6e4';
      ctx.beginPath();
      ctx.arc(r * 0.3, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (aiming) {
        ctx.strokeStyle = 'rgba(255, 93, 115, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(e.lungeX * 130, e.lungeY * 130);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (e.type === 'brute') {
      ctx.fillStyle = '#3a2560';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a4a';
      ctx.beginPath();
      ctx.moveTo(-r + 6, -r * 0.5);
      ctx.lineTo(-r - 14, -r - 12);
      ctx.lineTo(-r * 0.4, -r + 4);
      ctx.closePath();
      ctx.moveTo(r - 6, -r * 0.5);
      ctx.lineTo(r + 14, -r - 12);
      ctx.lineTo(r * 0.4, -r + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5d73';
      ctx.beginPath();
      ctx.arc(-11, -8, 4.5, 0, Math.PI * 2);
      ctx.arc(11, -8, 4.5, 0, Math.PI * 2);
      ctx.fill();
      this.sprites.draw(ctx, '#ff5d73', 0, 8, 26, 0.5);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 8, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'boss') {
      // Rotating crown ring.
      ctx.save();
      ctx.rotate(e.age * 0.5);
      ctx.strokeStyle = 'rgba(179, 136, 255, 0.8)';
      ctx.lineWidth = 4;
      ctx.setLineDash([18, 14]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.fillStyle = '#1e0b3d';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6d4bd8';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Crown spikes.
      ctx.fillStyle = '#6d4bd8';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 2 + Math.sin(e.age) * 0.05;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.18) * r * 0.85, Math.sin(a - 0.18) * r * 0.85);
        ctx.lineTo(Math.cos(a) * (r + 20), Math.sin(a) * (r + 20));
        ctx.lineTo(Math.cos(a + 0.18) * r * 0.85, Math.sin(a + 0.18) * r * 0.85);
        ctx.closePath();
        ctx.fill();
      }
      // The core eye.
      const pulse = 1 + Math.sin(e.age * 3) * 0.12;
      this.sprites.draw(ctx, '#ff5d73', 0, 0, 40 * pulse, 0.8);
      ctx.fillStyle = '#ff5d73';
      ctx.beginPath();
      ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e0b3d';
      ctx.beginPath();
      ctx.arc(0, 0, 7 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(game) {
    const ctx = this.ctx;
    const p = game.player;
    if (!p.alive) return;
    const blink = p.grace > 0 && p.dashTimeLeft <= 0 && Math.floor(game.time * 18) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    // Dash ghosts.
    if (p.dashing) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(p.x - p.dashDirX * 26, p.y - p.dashDirY * 26, p.radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = blink ? 0.45 : 1;
    }
    // Halo glow.
    this.sprites.draw(ctx, '#ffd166', p.x, p.y, 64, 0.75);
    // Orbit wisps.
    for (const o of p.orbiterPositions()) {
      this.sprites.draw(ctx, '#7bf1ff', o.x, o.y, 20, 0.85);
      ctx.fillStyle = '#e8fbff';
      ctx.beginPath();
      ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cloak body.
    const bob = p.moving ? Math.sin(p.walkPhase) * 1.5 : Math.sin(game.time * 2.2) * 1.2;
    ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = '#3d2c6e';
    ctx.beginPath();
    ctx.moveTo(0, -p.radius - 4);
    ctx.quadraticCurveTo(p.radius + 2, -p.radius * 0.3, p.radius - 2, p.radius);
    ctx.quadraticCurveTo(0, p.radius + 5, -p.radius + 2, p.radius);
    ctx.quadraticCurveTo(-p.radius - 2, -p.radius * 0.3, 0, -p.radius - 4);
    ctx.fill();
    ctx.fillStyle = '#2a1f4d';
    ctx.beginPath();
    ctx.ellipse(0, p.radius * 0.35, p.radius * 0.62, p.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hood face glow.
    this.sprites.draw(ctx, '#ffe9a8', 0, -4, 22, 0.9);
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(-3.5, -5, 2.2, 0, Math.PI * 2);
    ctx.arc(3.5, -5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The lantern: held toward the aim.
    const lx = p.x + Math.cos(p.aim) * 26;
    const ly = p.y + Math.sin(p.aim) * 26 + bob;
    this.sprites.draw(ctx, '#ffb703', lx, ly, 30, 0.95);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(lx, ly, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, ly, 9, 0, Math.PI * 2);
    ctx.stroke();
    // Shield halo.
    if (p.shield > 0) {
      ctx.strokeStyle = `rgba(123, 241, 255, ${0.55 + 0.25 * Math.sin(game.time * 4)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.flash > 0) {
      ctx.globalAlpha = p.flash * 0.5;
      ctx.fillStyle = '#ff5d73';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawVignette(game) {
    const ctx = this.ctx;
    const p = game.player;
    const lowHp = p.alive && p.hp / p.maxHp < 0.3;
    const hurt = p.flash > 0;
    if (!lowHp && !hurt) return;
    const strength = hurt ? 0.35 * p.flash : 0.16 + 0.08 * Math.sin(game.time * 4);
    const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.32, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
    grad.addColorStop(0, 'rgba(255, 40, 70, 0)');
    grad.addColorStop(1, `rgba(255, 40, 70, ${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // ------------------------------------------------------------ HUD

  drawHUD(game) {
    const ctx = this.ctx;
    const p = game.player;
    // Health + XP, top left.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    this.text(`LEVEL ${p.level}`, 28, 34, `800 15px ${FONT_BODY}`, PALETTE.gold, 'left');
    this.bar(28, 42, 260, 18, p.hp / p.maxHp, '#ff5d73');
    this.text(`${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`, 300, 57, `700 14px ${FONT_BODY}`, PALETTE.text, 'left');
    this.bar(28, 66, 260, 10, p.xp / p.xpNext, '#4cc9f0');
    // Wave, top center.
    const waveLabel = game.waveActive ? `WAVE ${game.waves.wave} / ${game.waves.totalWaves}` : game.waves.wave >= game.waves.totalWaves ? 'FINAL WAVE' : 'THE GLOOM GATHERS';
    this.text(waveLabel, VIEW_W / 2, 34, `800 22px ${FONT_DISPLAY}`, PALETTE.text, 'center', '#ffd166');
    const left = game.enemies.length + game.waves.remaining;
    this.text(left > 0 ? `${left} shadows remain` : 'The garden is quiet…', VIEW_W / 2, 60, `600 14px ${FONT_BODY}`, PALETTE.textDim);
    // Boss bar.
    const boss = game.enemies.find((e) => e.type === 'boss');
    if (boss) {
      this.text('GLOOMHEART, THE HOLLOW CROWN', VIEW_W / 2, 86, `800 14px ${FONT_BODY}`, '#b388ff');
      this.bar(VIEW_W / 2 - 260, 94, 520, 12, boss.hp / boss.maxHp, '#8f6bff');
    }
    // Score, top right.
    this.text(`${game.score.toLocaleString('en-US')}`, VIEW_W - 28, 36, `800 26px ${FONT_DISPLAY}`, PALETTE.gold, 'right');
    this.text(`BEST ${game.best.toLocaleString('en-US')}  •  ${game.kills} FELLED`, VIEW_W - 28, 60, `600 13px ${FONT_BODY}`, PALETTE.textDim, 'right');
    if (game.comboMult > 1) {
      this.text(`COMBO ×${game.comboMult}`, VIEW_W - 28, 80, `800 17px ${FONT_BODY}`, '#ffe9a8', 'right', '#ff9e4f');
    }
    // Dash + nova, bottom corners, clear of the arena border.
    const dashFrac = 1 - p.dashTimer / p.dashCooldown;
    this.text('DASH', 28, VIEW_H - 44, `800 13px ${FONT_BODY}`, PALETTE.textDim, 'left');
    this.bar(28, VIEW_H - 36, 120, 11, dashFrac, dashFrac >= 1 ? '#ffd166' : '#8a6a2f');
    this.text('SHIFT / RIGHT-CLICK', 156, VIEW_H - 30, `600 11px ${FONT_BODY}`, PALETTE.textDim, 'left');
    this.text('NOVA  [E]', VIEW_W - 28, VIEW_H - 44, `800 13px ${FONT_BODY}`, PALETTE.textDim, 'right');
    for (let i = 0; i < p.build.novaMax; i++) {
      const cx = VIEW_W - 40 - i * 26;
      const cy = VIEW_H - 30;
      this.sprites.draw(ctx, '#ffd166', cx, cy, 16, i < p.novaCharges ? 0.9 : 0.25);
      ctx.fillStyle = i < p.novaCharges ? '#ffe9a8' : '#5a4a2a';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mute hint.
    this.text(game.audio.muted ? 'M — SOUND OFF' : 'M — SOUND ON', VIEW_W / 2, VIEW_H - 12, `600 12px ${FONT_BODY}`, PALETTE.textDim);
  }

  drawBanner(game) {
    if (!game.banner || game.bannerTimer <= 0) return;
    const t = game.bannerTimer / game.bannerDuration;
    const alpha = t > 0.8 ? (1 - t) / 0.2 : t < 0.25 ? t / 0.25 : 1;
    // Ease-out-back pop on entry: overshoots, then rests at exactly 1.
    const ep = Math.min(1, (1 - t) / 0.18);
    const ease = 1 + 2.70158 * Math.pow(ep - 1, 3) + 1.70158 * Math.pow(ep - 1, 2);
    const scale = 0.7 + 0.3 * ease;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(VIEW_W / 2, 190);
    ctx.scale(scale, scale);
    ctx.font = `800 46px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#fff3d6';
    ctx.fillText(game.banner, 0, 0);
    ctx.restore();
    if (game.bannerSub) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      this.text(game.bannerSub, VIEW_W / 2, 228, `600 17px ${FONT_BODY}`, PALETTE.textDim);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ overlays

  drawTitle(game, input) {
    const ctx = this.ctx;
    ctx.drawImage(game.backdrop.canvas, 0, 0);
    game.backdrop.drawAnimated(ctx, game.time);
    // Drifting title wisps for life.
    for (let i = 0; i < 4; i++) {
      const x = VIEW_W * (0.18 + i * 0.21) + Math.sin(game.time * 0.5 + i * 1.7) * 30;
      const y = 150 + i * 26 + Math.cos(game.time * 0.7 + i) * 12;
      this.sprites.draw(ctx, '#8f6bff', x, y, 26, 0.5);
    }
    this.sprites.draw(ctx, '#ffd166', VIEW_W / 2, 210, 190, 0.5);
    this.text('LUMENFALL', VIEW_W / 2, 196, `800 84px ${FONT_DISPLAY}`, '#ffe9a8', 'center', '#ffb703');
    this.text('— THE LAST LANTERN —', VIEW_W / 2, 248, `700 20px ${FONT_BODY}`, PALETTE.gold, 'center');
    this.text('The Gloom is coming for the garden. Hold the light through 10 waves.', VIEW_W / 2, 292, `600 18px ${FONT_BODY}`, PALETTE.text);
    this.text('WASD / ARROWS move   •   MOUSE aims   •   HOLD CLICK or SPACE to fire', VIEW_W / 2, 330, `600 16px ${FONT_BODY}`, PALETTE.textDim);
    this.text('SHIFT / RIGHT-CLICK dash   •   E nova blast   •   P pause   •   M sound', VIEW_W / 2, 354, `600 16px ${FONT_BODY}`, PALETTE.textDim);
    // The lantern emblem, resting in the arena's heart.
    this.sprites.draw(ctx, '#ffb703', VIEW_W / 2, 414, 48, 0.9);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, 414, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, 414, 17, 0, Math.PI * 2);
    ctx.stroke();
    const layout = titleLayout();
    this.button(layout.start, 'LIGHT THE LANTERN', input.hover(layout.start), { fontSize: 22 });
    this.text('or press ENTER', VIEW_W / 2, 566, `600 14px ${FONT_BODY}`, PALETTE.textDim);
    if (game.best > 0) {
      this.text(`BEST SCORE  ${game.best.toLocaleString('en-US')}`, VIEW_W / 2, 606, `800 17px ${FONT_BODY}`, PALETTE.gold);
    }
    this.text('A tiny original game: code, art and sound made for this bounty.', VIEW_W / 2, 688, `600 13px ${FONT_BODY}`, 'rgba(201, 185, 143, 0.7)');
  }

  drawPause(game, input) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 8, 24, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.text('PAUSED', VIEW_W / 2, 218, `800 52px ${FONT_DISPLAY}`, '#ffe9a8', 'center', '#ffb703');
    this.text(`Wave ${game.waves.wave}  •  Score ${game.score.toLocaleString('en-US')}  •  ${game.kills} felled`, VIEW_W / 2, 272, `600 17px ${FONT_BODY}`, PALETTE.textDim);
    const layout = pauseLayout();
    this.button(layout.resume, 'RESUME', input.hover(layout.resume));
    this.button(layout.restart, 'RESTART RUN', input.hover(layout.restart));
    this.button(layout.menu, 'BACK TO TITLE', input.hover(layout.menu));
  }

  drawLevelUp(game, input, choices) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 8, 24, 0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.text('THE LANTERN GROWS', VIEW_W / 2, 128, `800 40px ${FONT_DISPLAY}`, '#ffe9a8', 'center', '#ffb703');
    this.text(`Level ${game.player.level} — choose one gift of light`, VIEW_W / 2, 168, `600 17px ${FONT_BODY}`, PALETTE.textDim);
    const cards = cardLayout(choices.length);
    choices.forEach((u, i) => {
      const rect = cards[i];
      const hover = input.hover(rect);
      // Staggered ease-out entrance: each card rises into place.
      const ep = Math.min(1, Math.max(0, (game.levelUpTime - i * 0.07) / 0.28));
      const ease = 1 - Math.pow(1 - ep, 3);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75 * ease;
      ctx.translate(0, (1 - ease) * 26);
      ctx.fillStyle = hover ? 'rgba(46, 32, 86, 0.97)' : 'rgba(20, 17, 46, 0.97)';
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 16);
      ctx.fill();
      ctx.strokeStyle = hover ? '#ffe9a8' : 'rgba(255, 209, 102, 0.6)';
      ctx.lineWidth = hover ? 3 : 2;
      ctx.stroke();
      this.drawUpgradeIcon(u.icon, rect.x + rect.w / 2, rect.y + 74, hover ? 1.15 : 1);
      this.text(u.name, rect.x + rect.w / 2, rect.y + 148, `800 21px ${FONT_DISPLAY}`, '#ffe9a8');
      this.wrapText(u.desc, rect.x + 22, rect.y + 182, rect.w - 44, 17, PALETTE.text);
      const stacks = game.deck.stacksOf(u.id);
      if (u.max < 99) {
        this.text(`●`.repeat(stacks) + `○`.repeat(Math.max(0, u.max - stacks)), rect.x + rect.w / 2, rect.y + 262, `700 15px ${FONT_BODY}`, PALETTE.gold);
      }
      this.text(`[${i + 1}]`, rect.x + rect.w / 2, rect.y + 286, `700 14px ${FONT_BODY}`, PALETTE.textDim);
      ctx.restore();
    });
  }

  wrapText(str, x, y, maxW, size, fill) {
    const ctx = this.ctx;
    ctx.font = `600 ${size}px ${FONT_BODY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const words = str.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillStyle = fill;
        ctx.fillText(line, x, yy);
        line = word;
        yy += size + 6;
      } else {
        line = test;
      }
    }
    ctx.fillStyle = fill;
    ctx.fillText(line, x, yy);
  }

  drawUpgradeIcon(icon, x, y, scale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    this.sprites.draw(ctx, '#ffd166', 0, 0, 44, 0.55);
    ctx.strokeStyle = '#ffe9a8';
    ctx.fillStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    switch (icon) {
      case 'bolt':
        ctx.beginPath();
        ctx.moveTo(6, -26);
        ctx.lineTo(-10, 2);
        ctx.lineTo(0, 2);
        ctx.lineTo(-6, 26);
        ctx.lineTo(12, -4);
        ctx.lineTo(2, -4);
        ctx.closePath();
        ctx.fill();
        break;
      case 'wind':
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-20, -14 + i * 13);
          ctx.quadraticCurveTo(6, -20 + i * 13, 18, -12 + i * 13);
          ctx.stroke();
        }
        break;
      case 'prism':
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(20, 16);
        ctx.lineTo(-20, 16);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(0, 16);
        ctx.stroke();
        break;
      case 'lance':
        ctx.beginPath();
        ctx.moveTo(-18, 18);
        ctx.lineTo(14, -14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(20, -20);
        ctx.lineTo(8, -18);
        ctx.lineTo(12, -8);
        ctx.closePath();
        ctx.fill();
        break;
      case 'star':
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = i % 2 === 0 ? 24 : 10;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case 'orbit':
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 21, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(21, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-15, 15, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'boot':
        ctx.beginPath();
        ctx.moveTo(-12, -22);
        ctx.lineTo(-12, 8);
        ctx.quadraticCurveTo(-12, 16, -4, 16);
        ctx.lineTo(14, 16);
        ctx.quadraticCurveTo(20, 16, 20, 10);
        ctx.lineTo(2, 4);
        ctx.lineTo(2, -22);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'heart':
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.bezierCurveTo(-26, 0, -18, -22, -7, -16);
        ctx.bezierCurveTo(-2, -13, 0, -9, 0, -9);
        ctx.bezierCurveTo(0, -9, 2, -13, 7, -16);
        ctx.bezierCurveTo(18, -22, 26, 0, 0, 20);
        ctx.fill();
        break;
      case 'magnet':
        ctx.beginPath();
        ctx.arc(0, -2, 18, Math.PI, 0, false);
        ctx.lineTo(18, 8);
        ctx.arc(0, 8, 18, 0, Math.PI, true);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-18, -2);
        ctx.lineTo(-18, 12);
        ctx.moveTo(18, -2);
        ctx.lineTo(18, 12);
        ctx.stroke();
        break;
      case 'nova':
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          const r = i % 2 === 0 ? 24 : 9;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'ghost':
        ctx.beginPath();
        ctx.arc(0, -6, 16, Math.PI, 0);
        ctx.lineTo(16, 18);
        ctx.lineTo(8, 10);
        ctx.lineTo(0, 18);
        ctx.lineTo(-8, 10);
        ctx.lineTo(-16, 18);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-5, -8, 2.5, 0, Math.PI * 2);
        ctx.arc(5, -8, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'shield':
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.quadraticCurveTo(20, -16, 20, -4);
        ctx.quadraticCurveTo(20, 14, 0, 24);
        ctx.quadraticCurveTo(-20, 14, -20, -4);
        ctx.quadraticCurveTo(-20, -16, 0, -24);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  drawEndScreen(game, input, victory) {
    const ctx = this.ctx;
    ctx.fillStyle = victory ? 'rgba(20, 16, 4, 0.55)' : 'rgba(6, 8, 24, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (victory) {
      this.sprites.draw(ctx, '#ffd166', VIEW_W / 2, 170, 220, 0.55);
      this.text('DAWN BREAKS', VIEW_W / 2, 168, `800 64px ${FONT_DISPLAY}`, '#ffe9a8', 'center', '#ffb703');
      this.text('The Gloom recedes. The lantern burns on — and the garden wakes.', VIEW_W / 2, 222, `600 18px ${FONT_BODY}`, PALETTE.text);
    } else {
      this.text('THE LIGHT FADES', VIEW_W / 2, 168, `800 60px ${FONT_DISPLAY}`, '#b388ff', 'center', '#6d4bd8');
      this.text(`The Gloom took the garden on wave ${game.waves.wave}. The lantern can be lit again.`, VIEW_W / 2, 222, `600 18px ${FONT_BODY}`, PALETTE.text);
    }
    // Stats panel.
    const px = VIEW_W / 2 - 260;
    const py = 258;
    this.panel(px, py, 520, 190, 16);
    const mins = Math.floor(game.runTime / 60);
    const secs = Math.floor(game.runTime % 60).toString().padStart(2, '0');
    const stats = [
      ['SCORE', game.score.toLocaleString('en-US')],
      ['BEST', game.best.toLocaleString('en-US')],
      ['WAVE REACHED', `${game.waves.wave} / ${game.waves.totalWaves}`],
      ['SHADOWS FELLED', String(game.kills)],
      ['LEVEL', String(game.player.level)],
      ['TIME', `${mins}:${secs}`],
    ];
    stats.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = px + 36 + col * 260;
      const y = py + 40 + row * 52;
      this.text(label, x, y, `700 13px ${FONT_BODY}`, PALETTE.textDim, 'left');
      this.text(value, x, y + 26, `800 24px ${FONT_DISPLAY}`, PALETTE.text, 'left');
    });
    if (game.newBest) {
      this.text('★ NEW BEST SCORE ★', VIEW_W / 2, 472, `800 18px ${FONT_BODY}`, '#ffe9a8', 'center', '#ffb703');
    }
    const layout = endLayout();
    this.button(layout.again, victory ? 'PLAY AGAIN' : 'TRY AGAIN', input.hover(layout.again));
    this.button(layout.menu, 'BACK TO TITLE', input.hover(layout.menu), { fontSize: 18, fill: '#1c1638' });
  }

  drawWaveClearToast(game) {
    if (!game.toast || game.toastTimer <= 0) return;
    const t = Math.min(1, game.toastTimer / 0.5);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2);
    this.text(game.toast, VIEW_W / 2, 130, `800 24px ${FONT_DISPLAY}`, '#7dffa8', 'center', '#3fae8a');
    ctx.restore();
  }
}

