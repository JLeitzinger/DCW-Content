import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapActor } from './lib/foundry-actor.mjs';
import { loadMonsterRoster } from './lib/monster-roster.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monstersDir = path.join(__dirname, '../src/packs/monsters');
const dataDir = path.join(__dirname, '../data');

// Rebuild from scratch - same reasoning as every other generate-*.mjs (a monster renamed or
// removed from the manifest shouldn't leave a stale orphaned file behind).
fs.rmSync(monstersDir, { recursive: true, force: true });
fs.mkdirSync(monstersDir, { recursive: true });

const roster = loadMonsterRoster(dataDir);

console.log('Generating monster actor files...\n');

for (const m of roster) {
  const actor = wrapActor({
    id: m.id,
    name: m.name,
    type: 'npc',
    img: m.img,
    system: {
      cr: m.cr,
      health: m.health,
      power: m.power,
      abilities: Object.fromEntries(Object.entries(m.abilities).map(([k, v]) => [k, { value: v }])),
      biography: m.biography
    }
  });

  fs.writeFileSync(path.join(monstersDir, `${m.id}.json`), JSON.stringify(actor, null, 2) + '\n', 'utf8');
  console.log(`✓ Created: ${m.id}.json (${m.name}, CR ${m.cr}, ${m.themeCategory}/${m.band})`);
}

console.log(`\n✓ Successfully generated ${roster.length} monster actor files`);
console.log(`Location: ${monstersDir}`);
