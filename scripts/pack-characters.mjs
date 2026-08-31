import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../src/packs/characters');
const packDir = path.join(__dirname, '../packs/characters');

/**
 * Packs the Characters compendium (elites/bosses/friendly NPCs - see CharacterGenerator.mjs)
 * exactly the way pack-monsters.mjs packs Monsters: Foundry's LevelDB backend does NOT store an
 * Actor's embedded `items` inline in its own record (confirmed against Foundry's own server
 * source, app/dist/database/fields-extensions.mjs's EmbeddedCollectionField#_dbWrite/
 * expandEmbedded - see pack-monsters.mjs's header comment for the full history of how that was
 * discovered, including the silent data-loss bug a naive inline write caused). The actor record
 * must store `items` as an array of item id strings only, with each item's real data written
 * separately into an `actors.items` sublevel keyed `<actorId>.<itemId>`.
 *
 * Deliberately copy-pasted from pack-monsters.mjs rather than factored through the more general
 * writeEmbeddedCollections() helper in lib/level-gen/pack-embedded.mjs (which packs Scene/
 * JournalEntry's *nested* embedded collections) - unifying the two is a reasonable future
 * cleanup, but not worth risking a regression in this exact, hand-verified-safe write path in
 * the same change that introduces Characters as a new compendium.
 */
async function packCharacters() {
  console.log('Packing characters compendium...\n');

  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });
  const itemsSublevel = db.sublevel('actors.items', { valueEncoding: 'json' });

  try {
    const files = fs.existsSync(sourceDir) ? fs.readdirSync(sourceDir).filter(f => f.endsWith('.json')) : [];

    console.log(`Found ${files.length} source files`);

    let count = 0;
    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (!data._id) {
        console.error(`⚠ Skipping ${file}: missing _id field`);
        continue;
      }

      const embeddedItems = data.items || [];
      for (const item of embeddedItems) {
        await itemsSublevel.put(`${data._id}.${item._id}`, item);
      }

      // Actors, not items - key prefix must be !actors! (Foundry's LevelDB collection name).
      // items is replaced with just the id list - see file header comment.
      const actorRecord = { ...data, items: embeddedItems.map(i => i._id) };
      await db.put(`!actors!${data._id}`, actorRecord);

      console.log(`✓ Packed: ${data.name} (${data._id}) - Level ${data.system.attributes?.level?.value ?? '?'}, ${embeddedItems.length} item(s)`);
      count++;
    }

    console.log(`\n✓ Successfully packed ${count} characters`);
  } catch (error) {
    console.error('Error packing characters:', error);
    throw error;
  } finally {
    await db.close();
  }
}

packCharacters().catch(console.error);
