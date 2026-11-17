// main.ts — hands the game in: copies game/ and screenshots/ to the output
// directory (/output in the grader, MAKEFUN_OUTPUT_DIR outside it) and writes
// /output/dossier.json with buildDossier from the kit's library.
// Node standard library only — nothing is installed before it runs.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const repoDir = dirname(fileURLToPath(import.meta.url));

// A fresh output every run, so the grader's two runs write the same bytes.
// Never remove the output dir itself: in the grader sandbox /output is a
// mounted volume, and rm on it fails EBUSY. Only clear its contents.
mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}
mkdirSync(join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });
cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
