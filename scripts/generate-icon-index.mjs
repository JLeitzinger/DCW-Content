/**
 * Snapshots the set of icon paths Foundry VTT core ships under its public `icons/` directory,
 * so `validate-content.mjs` can catch an `img` field that points at a file which doesn't
 * actually exist - the cause of most of the broken/blank icons players saw in the compendium
 * and on character sheets (paths that sounded plausible but were never real, e.g.
 * "icons/svg/dragon.svg" - no such file ships with core Foundry).
 *
 * This has to run against a real Foundry install (there's no npm package for "core's bundled
 * icon set"), so it's a manual, occasional snapshot rather than something `npm run generate`
 * calls automatically. Re-run it if the DOCUMENT_STATS.coreVersion pin in
 * scripts/lib/foundry-item.mjs is ever bumped to a Foundry release whose icon set changed.
 *
 * Usage: node scripts/generate-icon-index.mjs /path/to/foundry/app/public/icons
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, '../data/foundry-icons-index.json');

const iconsDir = process.argv[2];
if (!iconsDir) {
  console.error('Usage: node scripts/generate-icon-index.mjs /path/to/foundry/app/public/icons');
  process.exit(1);
}
if (!fs.existsSync(iconsDir)) {
  console.error(`No such directory: ${iconsDir}`);
  process.exit(1);
}

const IMAGE_EXTENSIONS = new Set(['.svg', '.webp', '.png', '.jpg', '.jpeg']);
const results = [];

function walk(dir, relPrefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      walk(abs, rel);
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(`icons/${rel}`);
    }
  }
}

walk(iconsDir, '');
results.sort();

fs.writeFileSync(outFile, JSON.stringify(results, null, 0) + '\n');
console.log(`Wrote ${results.length} icon paths to ${path.relative(process.cwd(), outFile)}`);
