import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const itemsDir = path.join(__dirname, '../src/packs/items');
const manifestPath = path.join(__dirname, '../data/skills-manifest.json');

// Load skills manifest to get UUIDs
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Create a lookup map for skill UUIDs
const skillUuids = {};
for (const category of Object.values(manifest.skills)) {
  for (const skill of category) {
    skillUuids[skill.name] = skill.uuid;
  }
}

// Weapon skill mappings
const weaponSkills = {
  'longsword.json': [{ skillUuid: skillUuids.Slash, level: 1 }],
  'greatsword.json': [{ skillUuid: skillUuids.Slash, level: 2 }],
  'shortsword.json': [{ skillUuid: skillUuids.Slash, level: 1 }],
  'handaxe.json': [{ skillUuid: skillUuids.Slash, level: 1 }],
  'battleaxe.json': [{ skillUuid: skillUuids.Slash, level: 1 }],
  'greataxe.json': [{ skillUuid: skillUuids.Slash, level: 2 }],

  'spear.json': [{ skillUuid: skillUuids.Pierce, level: 1 }],
  'dagger.json': [{ skillUuid: skillUuids.Pierce, level: 1 }],

  'mace.json': [{ skillUuid: skillUuids.Blunt, level: 1 }],
  'warhammer.json': [{ skillUuid: skillUuids.Blunt, level: 1 }],
  'quarterstaff.json': [{ skillUuid: skillUuids.Blunt, level: 1 }],
  'club.json': [{ skillUuid: skillUuids.Blunt, level: 1 }],

  'longbow.json': [{ skillUuid: skillUuids.Shoot, level: 1 }],
  'shortbow.json': [{ skillUuid: skillUuids.Shoot, level: 1 }],
  'crossbow.json': [{ skillUuid: skillUuids.Shoot, level: 1 }]
};

console.log('Adding skills to weapons...\n');

let count = 0;
for (const [filename, skills] of Object.entries(weaponSkills)) {
  const filepath = path.join(itemsDir, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⚠ Skipping: ${filename} (not found)`);
    continue;
  }

  const item = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  // Remove old 'skills' field if it exists
  delete item.system.skills;

  // Add grantedSkills field (note: schema uses 'grantedSkills' not 'skills')
  item.system.grantedSkills = skills;

  // Write back
  fs.writeFileSync(filepath, JSON.stringify(item, null, 2), 'utf8');
  console.log(`✓ Updated: ${filename} (${item.name})`);
  count++;
}

console.log(`\n✓ Successfully updated ${count} weapons`);
