import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../src/packs/monsters');
const packDir = path.join(__dirname, '../packs/monsters');

async function packMonsters() {
  console.log('Packing monsters compendium...\n');

  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json'));

    console.log(`Found ${files.length} source files`);

    let count = 0;
    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (!data._id) {
        console.error(`⚠ Skipping ${file}: missing _id field`);
        continue;
      }

      // Actors, not items - key prefix must be !actors! (Foundry's LevelDB collection name).
      const key = `!actors!${data._id}`;
      await db.put(key, data);

      console.log(`✓ Packed: ${data.name} (${data._id}) - CR ${data.system.cr}`);
      count++;
    }

    console.log(`\n✓ Successfully packed ${count} monsters`);
  } catch (error) {
    console.error('Error packing monsters:', error);
    throw error;
  } finally {
    await db.close();
  }
}

packMonsters().catch(console.error);
