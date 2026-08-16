import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapItem } from './lib/foundry-item.mjs';
import { resolveEntryId, resolveSkill, resolveFeature } from './lib/resolve-refs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const classesDir = path.join(__dirname, '../src/packs/classes');
const manifestPath = path.join(__dirname, '../data/classes-manifest.json');

fs.mkdirSync(classesDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('Generating class item files...\n');

let count = 0;
for (const cls of manifest.classes) {
  const id = resolveEntryId(cls);

  const item = wrapItem({
    id,
    name: cls.name,
    type: 'class',
    img: cls.img || 'icons/svg/sword.svg',
    system: {
      description: cls.description,
      baseHP: cls.baseHP,
      hpPerLevel: cls.hpPerLevel,
      staminaPerLevel: cls.staminaPerLevel,
      manaPerLevel: cls.manaPerLevel,
      abilityBonuses: cls.abilityBonuses,
      levelAcquired: cls.levelAcquired ?? 1,
      saves: cls.saves,
      grantedSkills: (cls.grantedSkills || []).map(resolveSkill),
      grantedFeatures: (cls.grantedFeatures || []).map(resolveFeature),
      hitDie: cls.hitDie ?? 'd8',
      primaryAbility: cls.primaryAbility ?? 'str',
      secondaryAbility: cls.secondaryAbility ?? '',
      features: cls.features ?? '',
      subclasses: cls.subclasses ?? ''
    }
  });

  fs.writeFileSync(path.join(classesDir, `${id}.json`), JSON.stringify(item, null, 2) + '\n', 'utf8');
  console.log(`✓ Created: ${id}.json (${cls.name})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} class item files`);
console.log(`Location: ${classesDir}`);
