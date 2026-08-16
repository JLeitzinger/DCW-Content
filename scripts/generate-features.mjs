import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapItem } from './lib/foundry-item.mjs';
import { resolveEntryId, resolveSkill } from './lib/resolve-refs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featuresDir = path.join(__dirname, '../src/packs/features');
const manifestPath = path.join(__dirname, '../data/features-manifest.json');

fs.mkdirSync(featuresDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('Generating feature item files...\n');

let count = 0;
for (const feature of manifest.features) {
  const id = resolveEntryId(feature);

  const item = wrapItem({
    id,
    name: feature.name,
    type: 'feature',
    img: feature.img || 'icons/svg/aura.svg',
    system: {
      description: feature.description,
      grantedSkills: (feature.grantedSkills || []).map(resolveSkill)
    }
  });

  fs.writeFileSync(path.join(featuresDir, `${id}.json`), JSON.stringify(item, null, 2) + '\n', 'utf8');
  console.log(`✓ Created: ${id}.json (${feature.name})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} feature item files`);
console.log(`Location: ${featuresDir}`);
