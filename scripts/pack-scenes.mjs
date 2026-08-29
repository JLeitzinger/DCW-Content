import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';
import { writeEmbeddedCollections, SCENE_EMBEDDED_SCHEMA } from './lib/level-gen/pack-embedded.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(__dirname, '../src/packs/scenes');
const packDir = path.join(__dirname, '../packs/scenes');

async function packScenes() {
  console.log('Packing scenes compendium...\n');

  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    const files = fs.existsSync(sourceDir) ? fs.readdirSync(sourceDir).filter(f => f.endsWith('.json')) : [];

    if (files.length === 0) {
      console.log('No scenes found. Compendium will be empty.');
      await db.put('!temp!', { _id: 'temp', name: 'Temp' });
      await db.del('!temp!');
      console.log('✓ Scenes compendium initialized (empty)');
      return;
    }

    console.log(`Found ${files.length} source files`);

    let count = 0;
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));

      if (!data._id) {
        console.error(`⚠ Skipping ${file}: missing _id field`);
        continue;
      }

      await writeEmbeddedCollections((key, value) => db.put(key, value), data, data._id, 'scenes', SCENE_EMBEDDED_SCHEMA);
      await db.put(`!scenes!${data._id}`, data);
      console.log(`✓ Packed: ${data.name} (${data._id})`);
      count++;
    }

    console.log(`\n✓ Successfully packed ${count} scenes`);
  } catch (error) {
    console.error('Error packing scenes:', error);
    throw error;
  } finally {
    await db.close();
  }
}

packScenes().catch(error => {
  console.error(error);
  process.exit(1);
});
