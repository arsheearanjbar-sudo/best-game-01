// LUMENFALL's hand-in program (Node 22, standard library only). It takes the
// repository's game/ folder and screenshots/ folder, copies both into the
// output directory, and writes the dossier the judge reads, using the kit's
// own dossier library so the bytes match the scorer's copy exactly.
//
// Run outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name: string): void {
  const from = join(repoRoot, name);
  if (!existsSync(from)) throw new Error(`missing ${name}/ beside main.ts`);
  cpSync(from, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('game');
copyTree('screenshots');

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// A tiny receipt on stdout so a local run shows what it wrote.
const parsed = JSON.parse(readFileSync(join(outputDir, 'dossier.json'), 'utf8'));
if (!Array.isArray(parsed.images) || parsed.images.length < 3) {
  throw new Error(`expected at least 3 screenshots in the dossier, found ${parsed.images?.length ?? 0}`);
}
console.log(`wrote ${outputDir}: game/ + ${parsed.images.length} screenshot(s) + dossier.json (${dossier.length} bytes)`);
