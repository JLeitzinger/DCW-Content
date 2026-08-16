import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapItem } from './lib/foundry-item.mjs';
import { toSlug } from './lib/slug.mjs';
import { resolveSkill, resolveFeature } from './lib/resolve-refs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const weaponsDir = path.join(__dirname, '../src/packs/weapons');
const manifestPath = path.join(__dirname, '../data/weapons-manifest.json');

fs.mkdirSync(weaponsDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('Generating weapon item files...\n');

let count = 0;
for (const weapon of manifest.weapons) {
  const rarity = weapon.rarity ?? 'common';
  // Nothing references a weapon's own id, so weapons always take the clean slug scheme -
  // no `id` override support here (unlike races/classes/features/items).
  const id = toSlug(`${rarity}-${weapon.name}`);

  const item = wrapItem({
    id,
    name: weapon.name,
    type: 'weapon',
    img: weapon.img || 'icons/svg/item-bag.svg',
    system: {
      description: weapon.description,
      quantity: weapon.quantity ?? 1,
      weight: weapon.weight ?? 0,
      roll: weapon.roll,
      rarity,
      effort: weapon.effort ?? 0,
      range: weapon.range ?? 'melee',
      equipped: false,
      grantedSkills: (weapon.grantedSkills || []).map(resolveSkill),
      grantedFeatures: (weapon.grantedFeatures || []).map(resolveFeature)
    }
  });

  fs.writeFileSync(path.join(weaponsDir, `${id}.json`), JSON.stringify(item, null, 2) + '\n', 'utf8');
  console.log(`✓ Created: ${id}.json (${weapon.name}, ${rarity})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} weapon item files`);
console.log(`Location: ${weaponsDir}`);
