/**
 * Procedural floor generator: reads data/floors-manifest.json (seed/theme/complexity params
 * only - narrative and geometry are fully auto-generated, nothing here is hand-authored prose)
 * and writes Scene/JournalEntry/Folder compendium source JSON to src/packs/{scenes,journals,
 * journal-folders}/, same generate -> validate -> pack shape as every other content type.
 *
 * Each floor is generated into memory first and only written to disk if it succeeds end to
 * end - a failure partway through never leaves half a floor's documents on disk (no orphaned
 * scene with no matching journal, no journal folder with no entries, etc).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRng } from './lib/level-gen/rng.mjs';
import { createIdFactory } from './lib/level-gen/ids.mjs';
import { resolveEntryId } from './lib/resolve-refs.mjs';
import { buildTheme, buildStoryGraph, resolveComplexityTier, getTierConfig } from './lib/level-gen/StoryGenerator.mjs';
import { generateGeometry } from './lib/level-gen/GeometryGenerator.mjs';
import { generateLights } from './lib/level-gen/LightingGenerator.mjs';
import { buildJournals } from './lib/level-gen/JournalBuilder.mjs';
import { buildScenes } from './lib/level-gen/SceneBuilder.mjs';
import { loadTileLibrary } from './lib/level-gen/TileLibrary.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenesDir = path.join(__dirname, '../src/packs/scenes');
const journalsDir = path.join(__dirname, '../src/packs/journals');
const journalFoldersDir = path.join(__dirname, '../src/packs/journal-folders');
const manifestPath = path.join(__dirname, '../data/floors-manifest.json');
const tileAssetsDir = path.join(__dirname, '../assets/tiles');

const DEFAULT_SETTING = 'dungeon';
const tileLibrary = loadTileLibrary(tileAssetsDir);

// Rebuild output dirs from scratch each run - same reasoning as pack-items.mjs: without this,
// a room/id that no longer exists after a manifest/algorithm change leaves a stale orphaned
// file behind that nothing then overwrites.
for (const dir of [scenesDir, journalsDir, journalFoldersDir]) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function writeJson(dir, id, data) {
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function generateFloor(floorEntry) {
  const floorSlug = resolveEntryId(floorEntry);
  const rng = createRng(floorEntry.seed || floorSlug);
  const id = createIdFactory(rng);
  const tier = resolveComplexityTier(floorEntry);
  const tierConfig = getTierConfig(tier);

  const theme = buildTheme(rng, floorEntry);
  const storyGraph = buildStoryGraph(rng, theme, tierConfig);

  const roomCountTarget = rng.int(tierConfig.roomCountMin, tierConfig.roomCountMax);
  const geometry = generateGeometry(rng, id, { roomCountTarget, gridSize: 100, secretDoorChance: tierConfig.secretDoorChance });
  const lights = generateLights(rng, id, geometry.rooms, theme);

  const journals = buildJournals(rng, id, theme, storyGraph, geometry.rooms, tierConfig);
  const setting = floorEntry.setting || DEFAULT_SETTING;
  const { primaryScene, subScenes } = buildScenes(rng, id, theme, geometry, lights, journals, tierConfig, tileLibrary, setting);

  return { floorSlug, tier, roomCount: geometry.rooms.length, subSceneCount: subScenes.length,
    scenes: [primaryScene, ...subScenes], journalEntries: journals.entries, journalFolders: journals.folders };
}

console.log('Generating floors...\n');

let successCount = 0;
let failureCount = 0;

for (const floorEntry of manifest.floors || []) {
  try {
    const result = generateFloor(floorEntry);

    for (const scene of result.scenes) writeJson(scenesDir, scene._id, scene);
    for (const entry of result.journalEntries) writeJson(journalsDir, entry._id, entry);
    for (const folder of result.journalFolders) writeJson(journalFoldersDir, folder._id, folder);

    console.log(`✓ ${floorEntry.name || result.floorSlug}: tier ${result.tier}, ${result.roomCount} rooms, ${result.subSceneCount} sub-scene(s), ${result.journalEntries.length} journal entries`);
    successCount++;
  } catch (err) {
    console.error(`✗ Failed to generate floor "${floorEntry.name || floorEntry.seed}": ${err.message}`);
    failureCount++;
  }
}

console.log(`\n✓ Generated ${successCount} floor(s)${failureCount ? `, ${failureCount} failed` : ''}`);
if (failureCount > 0) process.exit(1);
