import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../src/packs/weapons');
const packDir = path.join(__dirname, '../packs/weapons');

async function packWeapons() {
  console.log('Packing weapons compendium...\n');

  // Ensure pack directory exists
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }

  // Open LevelDB database
  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    // Read all JSON files from source directory
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

      // Use !items! prefix as Foundry expects (weapons are items)
      const key = `!items!${data._id}`;
      await db.put(key, data);

      console.log(`✓ Packed: ${data.name} (${data._id}) - ${data.system.rarity}`);
      count++;
    }

    console.log(`\n✓ Successfully packed ${count} weapons`);
  } catch (error) {
    console.error('Error packing weapons:', error);
    throw error;
  } finally {
    await db.close();
  }
}

packWeapons().catch(console.error);
