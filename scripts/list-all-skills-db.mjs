import { ClassicLevel } from 'classic-level';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packDir = path.join(__dirname, '../packs/skills');

async function listAll() {
  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    console.log('All items in skills compendium:\n');

    for await (const [key, value] of db.iterator()) {
      if (key.startsWith('!items!')) {
        console.log(`${value.name.padEnd(20)} | category: ${(value.system?.category || 'N/A').padEnd(10)} | folder: ${value.folder || 'null'}`);
      }
    }

    console.log('\n\nAll folders:');
    for await (const [key, value] of db.iterator()) {
      if (key.startsWith('!folders!')) {
        console.log(JSON.stringify(value, null, 2));
      }
    }

  } finally {
    await db.close();
  }
}

listAll().catch(console.error);
