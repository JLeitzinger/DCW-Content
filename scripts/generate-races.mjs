import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapItem } from './lib/foundry-item.mjs';
import { resolveEntryId, resolveSkill, resolveFeature } from './lib/resolve-refs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const racesDir = path.join(__dirname, '../src/packs/races');
const manifestPath = path.join(__dirname, '../data/races-manifest.json');

fs.mkdirSync(racesDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('Generating race item files...\n');

let count = 0;
for (const race of manifest.races) {
  const id = resolveEntryId(race);

  const item = wrapItem({
    id,
    name: race.name,
    type: 'race',
    img: race.img || 'icons/svg/mystery-man.svg',
    system: {
      description: race.description,
      abilityBonuses: race.abilityBonuses,
      bonuses: race.bonuses,
      size: race.size,
      speed: race.speed,
      senses: race.senses,
      languages: race.languages ?? '',
      grantedFeatures: (race.grantedFeatures || []).map(resolveFeature),
      grantedSkills: (race.grantedSkills || []).map(resolveSkill)
    }
  });

  fs.writeFileSync(path.join(racesDir, `${id}.json`), JSON.stringify(item, null, 2) + '\n', 'utf8');
  console.log(`✓ Created: ${id}.json (${race.name})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} race item files`);
console.log(`Location: ${racesDir}`);
