# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/arsheearanjbar-sudo/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/arsheearanjbar-sudo/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

## LUMENFALL — The Last Lantern

An original arcade survival game for the [make.fun best game bounty](https://make.fun/bounty/best-game-01). You are the Keeper of the last lantern in a night garden. The Gloom is coming in 10 waves — hold the light, gather shards, choose gifts of light as you level, and face Gloomheart, the Hollow Crown.

## How to play

- **Move** — WASD or arrow keys
- **Aim** — mouse
- **Fire** — hold left click or Space
- **Dash** — Shift or right-click (brief invulnerability)
- **Nova blast** — E or Q (clears globs, heavy area damage)
- **Pause** — P or Esc · **Sound** — M
- **Level up** — click a card or press 1 / 2 / 3

Survive all 10 waves to win. Your best score is kept in the browser.

## What is in the game

- 5 enemy kinds with distinct behaviors (wisps, husks, spitters, dashers, brutes) plus a 3-phase boss
- 12 stackable upgrades, drafted 3-at-a-time on every level-up
- Combo multiplier, flawless-wave bonuses, dash with i-frames, nova charges, shield halo, orbiting wisps
- Particles, screen shake, hit-stop, floating damage numbers, synthesized WebAudio sound and music — no assets, no network
- Title, pause, level-up, victory and defeat screens, all with restart

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The game is plain static files under `game/` — any static server works, and it plays fully offline.

## Layout

- `game/index.html` — page shell, canvas, module entry
- `game/style.css` — page layout and canvas scaling
- `game/src/` — one file per system: `game.js` (state machine), `player.js`, `enemies.js`, `world.js` (backdrop + waves), `render.js`, `particles.js`, `audio.js`, `input.js`, `upgrades.js`, `pickups.js`, `config.js`, `rng.js`, `shots.js` (screenshot staging), `main.js` (boot + fixed-timestep loop)
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` and writes `dossier.json` with the kit's vendored library
- `screenshots/` — 4 real renders of the game (title, battle, upgrade choice, victory)

## License

MIT — see [LICENSE](LICENSE). The code, art, sound and names are original to this entry. `vendor/makefun-game.ts` is make.fun's kit library, shipped unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=sh01ee1y&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
