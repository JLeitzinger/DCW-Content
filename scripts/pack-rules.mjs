/**
 * Packs src/packs/rules/ (a single JournalEntry doc, key prefix `!journal!`) into the
 * `packs/rules` LevelDB. Mirrors pack-journals.mjs but for the standalone Rules Reference
 * compendium rather than the per-floor generated journals.
 */
import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';
import { writeEmbeddedCollections, JOURNAL_ENTRY_EMBEDDED_SCHEMA } from './lib/level-gen/pack-embedded.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entriesDir = path.join(__dirname, '../src/packs/rules');
const packDir = path.join(__dirname, '../packs/rules');

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({
    file: f,
    data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  }));
}

async function packRules() {
  console.log('Packing rules compendium...\n');

  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    const entries = readJsonFiles(entriesDir);

    if (entries.length === 0) {
      console.log('No rules journal found. Compendium will be empty.');
      await db.put('!temp!', { _id: 'temp', name: 'Temp' });
      await db.del('!temp!');
      console.log('✓ Rules compendium initialized (empty)');
      return;
    }

    let count = 0;
    for (const { file, data } of entries) {
      if (!data._id) { console.error(`⚠ Skipping ${file}: missing _id field`); continue; }
      await writeEmbeddedCollections((key, value) => db.put(key, value), data, data._id, 'journal', JOURNAL_ENTRY_EMBEDDED_SCHEMA);
      await db.put(`!journal!${data._id}`, data);
      console.log(`✓ Packed: ${data.name} (${data._id})`);
      count++;
    }

    console.log(`\n✓ Successfully packed ${count} journal document(s)`);
  } catch (error) {
    console.error('Error packing rules:', error);
    throw error;
  } finally {
    await db.close();
  }
}

packRules().catch(error => {
  console.error(error);
  process.exit(1);
});
