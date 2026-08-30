import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../src/packs/monsters');
const packDir = path.join(__dirname, '../packs/monsters');

/**
 * Actors are the first document type in this repo with real embedded Items (weapons/armor -
 * see generate-monsters.mjs), and Foundry's LevelDB backend does NOT store embedded collections
 * inline in the parent's own record the way a naive `db.put('!actors!<id>', fullActorObject)`
 * assumes. Confirmed by reading Foundry's own server source
 * (app/dist/database/fields-extensions.mjs's EmbeddedCollectionField#_dbWrite/expandEmbedded):
 * the actor record stores `items` as an ARRAY OF ITEM ID STRINGS ONLY, and each item's actual
 * data is written as its own entry in a separate "actors.items" sublevel, keyed by
 * `<actorId>.<itemId>`. Writing items inline (as this script originally did) silently passes
 * `npm run pack`, but Foundry's one-time compendium migration on world launch treats every
 * item as an unresolvable id (logging "N embedded items records ... were undefined and not
 * retrieved from the actors.items sublevel") and PERSISTS that as `items: []` back to disk -
 * permanently wiping every monster's embedded weapon/armor the first time any world loads this
 * pack. Verified empirically: classic-level's sublevel prefixing (`db.sublevel(name).prefixKey`)
 * produces the exact same `!actors.items!<key>` format Foundry's own LevelDatabase does, since
 * both this repo and the local Foundry install pin identical classic-level/abstract-level
 * versions (3.0.0 / 3.1.1) - so writing directly via classic-level's own sublevel API here is
 * safe and byte-compatible, no need to hand-construct prefixed key strings.
 */
async function packMonsters() {
  console.log('Packing monsters compendium...\n');

  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });

  const db = new ClassicLevel(packDir, { valueEncoding: 'json' });
  const itemsSublevel = db.sublevel('actors.items', { valueEncoding: 'json' });

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

      const embeddedItems = data.items || [];
      for (const item of embeddedItems) {
        await itemsSublevel.put(`${data._id}.${item._id}`, item);
      }

      // Actors, not items - key prefix must be !actors! (Foundry's LevelDB collection name).
      // items is replaced with just the id list - see file header comment.
      const actorRecord = { ...data, items: embeddedItems.map(i => i._id) };
      await db.put(`!actors!${data._id}`, actorRecord);

      console.log(`✓ Packed: ${data.name} (${data._id}) - CR ${data.system.cr}, ${embeddedItems.length} item(s)`);
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
