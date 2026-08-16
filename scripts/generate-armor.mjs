import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapItem } from './lib/foundry-item.mjs';
import { toSlug } from './lib/slug.mjs';
import { resolveSkill } from './lib/resolve-refs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const armorDir = path.join(__dirname, '../src/packs/armor');
const manifestPath = path.join(__dirname, '../data/armor-manifest.json');

fs.mkdirSync(armorDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('Generating armor item files...\n');

let count = 0;
for (const piece of manifest.armor) {
  const rarity = piece.rarity ?? 'common';
  // Nothing references an armor item's own id, so armor always takes the clean slug scheme -
  // no `id` override support here (matching weapons).
  const id = toSlug(`${rarity}-${piece.name}`);

  const item = wrapItem({
    id,
    name: piece.name,
    type: 'armor',
    img: piece.img || 'icons/svg/item-bag.svg',
    system: {
      description: piece.description,
      quantity: piece.quantity ?? 1,
      weight: piece.weight ?? 0,
      rarity,
      effort: piece.effort ?? 0,
      damageReduction: piece.damageReduction ?? 0,
      equipped: false,
      grantedSkills: (piece.grantedSkills || []).map(resolveSkill),
      luckBonus: piece.luckBonus ?? 0
    }
  });

  fs.writeFileSync(path.join(armorDir, `${id}.json`), JSON.stringify(item, null, 2) + '\n', 'utf8');
  console.log(`✓ Created: ${id}.json (${piece.name}, ${rarity})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} armor files`);
console.log(`Location: ${armorDir}`);
