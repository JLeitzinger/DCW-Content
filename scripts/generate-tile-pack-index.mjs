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
 *
 * dungeon/floor/ isn't actually all base ground material - DCSS ships plenty of things in that
 * same folder that are really overlays/set-dressing meant to sit ON a floor tile, not fill a
 * whole grid cell themselves (pedestal_*, slime_overlay_*, sigil_* and the like), which showed
 * up as the scene's gray background bleeding through when TileGenerator used them as a base
 * ground tile. Rather than hand-curate that distinction file by file, this decodes each
 * floor/-folder PNG's alpha channel and reclassifies anything with real transparency as a prop
 * instead - exactly the "layer it over an existing floor tile as set dressing" role it actually
 * plays. Files in the dedicated prop folders (altars/statues/traps/water/trees/etc.) are left
 * alone - a prop is expected to be a smaller icon on a transparent background.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tilesDir = path.join(__dirname, '../assets/tiles/dungeon');
const outFile = path.join(__dirname, '../data/tile-pack-index.json');

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg']);
// Fraction of a floor/-folder image's pixels that must be meaningfully transparent
// (alpha < 200, past ordinary anti-aliasing) before it's treated as an overlay/prop rather than
// a base ground tile.
const TRANSPARENCY_PIXEL_FRACTION = 0.02;

// folder (relative to assets/tiles/dungeon/) -> pool kind
const FLOOR_FOLDERS = ['floor'];
const PROP_FOLDERS = ['altars', 'statues', 'traps', 'water', 'trees'];
// loose top-level files (not in a subfolder) that are still physical props
const PROP_FILE_PATTERN = /^(chest|.*_fountain|boulder|sarcophagus)/i;

/** Recursive - a few source folders (dungeon/floor/grass/, dungeon/floor/sigils/) nest one level deep. */
function listImages(dir, relPrefix = '') {
  if (!fs.existsSync(dir)) return [];
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out = out.concat(listImages(path.join(dir, entry.name), rel));
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(rel);
    }
  }
  return out.sort();
}

const IEND = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

/**
 * Only meaningful for PNGs (everything currently under dungeon/floor/ is) - non-PNGs are assumed
 * opaque. A handful of files in this pack have a duplicated trailing IEND chunk, which pngjs'
 * strict sync reader rejects as "unrecognised content at end of stream" - IEND's CRC is always
 * this same fixed 8-byte sequence (empty chunk data), so truncating at the first occurrence
 * recovers a valid, complete PNG stream without needing to otherwise repair the file.
 */
function hasRealTransparency(absPath) {
  if (path.extname(absPath).toLowerCase() !== '.png') return false;
  let buf = fs.readFileSync(absPath);
  const iendEnd = buf.indexOf(IEND) + IEND.length;
  if (iendEnd < buf.length) buf = buf.subarray(0, iendEnd);
  const png = PNG.sync.read(buf);
  const totalPixels = png.width * png.height;
  let transparentPixels = 0;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] < 200) transparentPixels++;
  }
  return transparentPixels / totalPixels > TRANSPARENCY_PIXEL_FRACTION;
}

const results = [];
let reclassified = 0;

for (const folder of FLOOR_FOLDERS) {
  for (const f of listImages(path.join(tilesDir, folder))) {
    const kind = hasRealTransparency(path.join(tilesDir, folder, f)) ? 'props' : 'floors';
    if (kind === 'props') reclassified++;
    results.push({ path: `${folder}/${f}`, kind });
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
console.log(`Reclassified ${reclassified} dungeon/floor/ file(s) as props (real transparency detected)`);
