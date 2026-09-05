/**
 * Packs both src/packs/spells/ (Item docs, key prefix `!items!`) and src/packs/spell-folders/
 * (Folder docs scoped to this compendium, key prefix `!folders!`) into the same `packs/spells`
 * LevelDB - same two-source-dirs pattern as pack-journals.mjs, since compendium-scoped folders
 * live in their own pack's db alongside the documents they organize.
 */
import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(__dirname, '../src/packs/spells');
const foldersDir = path.join(__dirname, '../src/packs/spell-folders');
const packDir = path.join(__dirname, '../packs/spells');

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({
    file: f,
    data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  }));
}

async function packSpells() {
  console.log('Packing spells compendium...\n');

  // Rebuild the pack directory from scratch each time, so a source file that was
  // deleted or renamed doesn't leave a stale orphaned entry behind in the LevelDB.
  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  // Open LevelDB database
  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    const folders = readJsonFiles(foldersDir);
    const entries = readJsonFiles(sourceDir);

    if (folders.length === 0 && entries.length === 0) {
      console.log('No spells found. Compendium will be empty.');
      // Write a temporary entry to force LevelDB to initialize, then delete it
      await db.put('!temp!', { _id: 'temp', name: 'Temp' });
      await db.del('!temp!');
      console.log('✓ Spells compendium initialized (empty)');
      return;
    }

    let count = 0;
    for (const { file, data } of folders) {
      if (!data._id) { console.error(`⚠ Skipping ${file}: missing _id field`); continue; }
      await db.put(`!folders!${data._id}`, data);
      console.log(`✓ Packed folder: ${data.name} (${data._id})`);
      count++;
    }
    for (const { file, data } of entries) {
      if (!data._id) { console.error(`⚠ Skipping ${file}: missing _id field`); continue; }
      // Use !items! prefix as Foundry expects
      await db.put(`!items!${data._id}`, data);
      console.log(`✓ Packed: ${data.name} (${data._id})`);
      count++;
    }

    console.log(`\n✓ Successfully packed ${count} document(s)`);
  } catch (error) {
    console.error('Error packing spells:', error);
    throw error;
  } finally {
    await db.close();
  }
}

packSpells().catch(error => {
  console.error(error);
  process.exit(1);
});
