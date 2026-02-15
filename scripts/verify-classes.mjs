import { ClassicLevel } from 'classic-level';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packDir = path.join(__dirname, '../packs/classes');

async function verifyClasses() {
  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    console.log('Classes in compendium:\n');
    let count = 0;

    for await (const [key, value] of db.iterator()) {
      console.log(`${count + 1}. ${value.name} (${value._id})`);
      count++;
    }

    console.log(`\nTotal: ${count} classes`);
  } catch (error) {
    console.error('Error reading compendium:', error);
  } finally {
    await db.close();
  }
}

verifyClasses().catch(console.error);
