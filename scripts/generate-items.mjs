import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapItem } from './lib/foundry-item.mjs';
import { resolveEntryId, resolveSkill } from './lib/resolve-refs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const itemsDir = path.join(__dirname, '../src/packs/items');
const manifestPath = path.join(__dirname, '../data/items-manifest.json');

fs.mkdirSync(itemsDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('Generating item (armor/gear) item files...\n');

let count = 0;
for (const entry of manifest.items) {
  const id = resolveEntryId(entry);

  const item = wrapItem({
    id,
    name: entry.name,
    type: 'item',
    img: entry.img || 'icons/svg/item-bag.svg',
    system: {
      description: entry.description,
      quantity: entry.quantity ?? 1,
      weight: entry.weight ?? 0,
      rarity: entry.rarity ?? 'common',
      grantedSkills: (entry.grantedSkills || []).map(resolveSkill),
      luckBonus: entry.luckBonus ?? 0
    }
  });

  fs.writeFileSync(path.join(itemsDir, `${id}.json`), JSON.stringify(item, null, 2) + '\n', 'utf8');
  console.log(`✓ Created: ${id}.json (${entry.name})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} item files`);
console.log(`Location: ${itemsDir}`);
