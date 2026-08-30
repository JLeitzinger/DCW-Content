/**
 * Snapshots assets/tiles/dungeon/{floor,altars,statues,traps,water,trees}/** plus the loose
 * chest/fountain/boulder/sarcophagus prop files at assets/tiles/dungeon/ top level into
 * data/tile-pack-index.json, so TileLibrary.mjs can merge this free DCSS 32x32 tile set into
 * generated floors' floor/prop pools alongside the hand-curated assets/tiles/dungeon/
 * <themeCategory>/{floors,props}/ scaffold - see data/tile-pack-mapping.json for the keyword
 * rules TileLibrary.mjs uses to sort these into theme buckets at generation time.
 *
 * Only floor/props-shaped folders are indexed - doors/gateways/shops/vaults/wall are out of
 * scope for Phase 1 (walls are vector Wall documents, not images; the rest are deferred, see
 * the tile-pack-integration-plan memory). This is a static asset dump that doesn't change often,
 * so re-run by hand (`node scripts/generate-tile-pack-index.mjs`) only if files are added/removed
 * under assets/tiles/dungeon/ - unlike the mapping table, this doesn't need to regenerate when
 * mapping rules change.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tilesDir = path.join(__dirname, '../assets/tiles/dungeon');
const outFile = path.join(__dirname, '../data/tile-pack-index.json');

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg']);

// folder (relative to assets/tiles/dungeon/) -> pool kind
const FLOOR_FOLDERS = ['floor'];
const PROP_FOLDERS = ['altars', 'statues', 'traps', 'water', 'trees'];
// loose top-level files (not in a subfolder) that are still physical props
const PROP_FILE_PATTERN = /^(chest|.*_fountain|boulder|sarcophagus)/i;

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort();
}

const results = [];

for (const folder of FLOOR_FOLDERS) {
  for (const f of listImages(path.join(tilesDir, folder))) {
    results.push({ path: `${folder}/${f}`, kind: 'floors' });
  }
}

for (const folder of PROP_FOLDERS) {
  for (const f of listImages(path.join(tilesDir, folder))) {
    results.push({ path: `${folder}/${f}`, kind: 'props' });
  }
}

for (const f of fs.readdirSync(tilesDir, { withFileTypes: true })) {
  if (!f.isFile()) continue;
  if (!IMAGE_EXTENSIONS.has(path.extname(f.name).toLowerCase())) continue;
  if (PROP_FILE_PATTERN.test(f.name)) {
    results.push({ path: f.name, kind: 'props' });
  }
}

results.sort((a, b) => a.path.localeCompare(b.path));

fs.writeFileSync(outFile, JSON.stringify(results, null, 2) + '\n');
console.log(`Wrote ${results.length} tile-pack entries to ${path.relative(process.cwd(), outFile)}`);
