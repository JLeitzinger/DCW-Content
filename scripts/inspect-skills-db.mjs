import { ClassicLevel } from 'classic-level';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packDir = path.join(__dirname, '../packs/skills');

async function inspectDB() {
  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    console.log('Inspecting skills compendium database...\n');

    const folders = [];
    const items = [];

    for await (const [key, value] of db.iterator()) {
      if (key.startsWith('!folders!')) {
        folders.push({ key, data: value });
      } else if (key.startsWith('!items!')) {
        items.push({ key, data: value });
      }
    }

    console.log(`Found ${folders.length} folders:`);
    folders.forEach(f => {
      console.log(`  ${f.key}: ${f.data.name} (ID: ${f.data._id})`);
    });

    console.log(`\nFound ${items.length} items`);
    console.log('\nSample item folder assignments:');
    items.slice(0, 5).forEach(item => {
      console.log(`  ${item.data.name} (${item.data.system?.category || 'no category'}): folder="${item.data.folder}"`);
    });

  } finally {
    await db.close();
  }
}

inspectDB().catch(console.error);
