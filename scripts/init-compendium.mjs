import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packName = process.argv[2] || 'spells';
const packDir = path.join(__dirname, `../packs/${packName}`);

async function initCompendium() {
  console.log(`Initializing ${packName} compendium...\n`);

  // Ensure pack directory exists
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }

  // Open LevelDB database (creates if doesn't exist)
  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });

  try {
    // Just open and close to initialize the database
    console.log(`✓ ${packName} compendium initialized (empty)`);
    console.log(`  Location: ${packDir}`);
  } catch (error) {
    console.error('Error initializing compendium:', error);
    throw error;
  } finally {
    await db.close();
  }
}

initCompendium().catch(console.error);
