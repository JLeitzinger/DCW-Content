/**
 * Packs both src/packs/journals/ (JournalEntry docs, key prefix `!journal!` - that's Foundry's
 * actual collection name for this document type, not "journalentries") and src/packs/
 * journal-folders/ (Folder docs scoped to this compendium, key prefix `!folders!`) into the
 * same `packs/journals` LevelDB, since compendium-scoped folders live in their own pack's db
 * alongside the documents they organize.
 */
import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';
import { writeEmbeddedCollections, JOURNAL_ENTRY_EMBEDDED_SCHEMA } from './lib/level-gen/pack-embedded.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entriesDir = path.join(__dirname, '../src/packs/journals');
const foldersDir = path.join(__dirname, '../src/packs/journal-folders');
const packDir = path.join(__dirname, '../packs/journals');

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({
    file: f,
    data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  }));
}

async function packJournals() {
  console.log('Packing journals compendium...\n');

  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    const folders = readJsonFiles(foldersDir);
    const entries = readJsonFiles(entriesDir);

    if (folders.length === 0 && entries.length === 0) {
      console.log('No journals found. Compendium will be empty.');
      await db.put('!temp!', { _id: 'temp', name: 'Temp' });
      await db.del('!temp!');
      console.log('✓ Journals compendium initialized (empty)');
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
      await writeEmbeddedCollections((key, value) => db.put(key, value), data, data._id, 'journal', JOURNAL_ENTRY_EMBEDDED_SCHEMA);
      await db.put(`!journal!${data._id}`, data);
      console.log(`✓ Packed: ${data.name} (${data._id})`);
      count++;
    }

    console.log(`\n✓ Successfully packed ${count} journal document(s)`);
  } catch (error) {
    console.error('Error packing journals:', error);
    throw error;
  } finally {
    await db.close();
  }
}

packJournals().catch(error => {
  console.error(error);
  process.exit(1);
});
