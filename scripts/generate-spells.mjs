import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapItem } from './lib/foundry-item.mjs';
import { buildFolderEnvelope } from './lib/level-gen/envelope.mjs';
import { stableId } from './lib/stable-id.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const spellsDir = path.join(__dirname, '../src/packs/spells');
const folderDir = path.join(__dirname, '../src/packs/spell-folders');
const manifestPath = path.join(__dirname, '../data/spells-manifest.json');

// Ensure spells directory exists
if (!fs.existsSync(spellsDir)) {
  fs.mkdirSync(spellsDir, { recursive: true });
}

// Rebuilt from scratch every run (unlike spellsDir, which is additive/stale-tolerant) - stable
// ids are derived from class names, so a renamed/removed class must not leave an orphaned
// folder file sitting around for pack-spells.mjs to pick back up.
fs.rmSync(folderDir, { recursive: true, force: true });
fs.mkdirSync(folderDir, { recursive: true });

// Load spells manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Calculate prowess (mana cost) based on spell level
// Formula: prowess = spellLevel + ceil(spellLevel / 3)
function calculateProwess(spellLevel) {
  return spellLevel + Math.ceil(spellLevel / 3);
}

// Flatten spells from all categories into a single array
const spells = [];
for (const [categoryName, categorySpells] of Object.entries(manifest.spells)) {
  for (const spell of categorySpells) {
    spells.push({
      _id: spell.name.replace(/\s+/g, ''),
      name: spell.name,
      spellLevel: spell.spellLevel,
      diceCount: spell.diceCount,
      castStat: spell.castStat,
      category: spell.category,
      description: spell.description,
      castingTime: spell.castingTime,
      range: spell.range,
      duration: spell.duration,
      prowess: calculateProwess(spell.spellLevel),
      offensive: spell.offensive ?? false,
      roll: spell.roll ?? { diceNum: 1, diceSize: 'd6', diceBonus: '' },
      classes: spell.classes ?? []
    });
  }
}

// Compendium folders group spells by the class they're flavored for (see the `classes` field
// comment below) so they're easy to find in Foundry's sidebar - a spell with no `classes` tag
// (the pre-existing shared spells, e.g. Fireball) is usable by any caster and lives in one
// shared "General" folder instead of a class-specific one. A spell tagged with more than one
// class has no single class home either, so it falls back to General too (none of today's
// content does this - see validate-content.mjs's warning - but the rule keeps folder
// assignment well-defined if it ever does).
// Foundry document ids must be a 16-char alphanumeric string, so a readable slug can't be used
// directly as _id - stableId() derives one deterministically from a string key instead.
const GENERAL_FOLDER_ID = stableId('folder-spell-general');
const classFolderId = className => stableId(`folder-spell-${className}`);

function folderIdForSpell(spell) {
  return spell.classes.length === 1 ? classFolderId(spell.classes[0]) : GENERAL_FOLDER_ID;
}

const classNamesWithSpells = [...new Set(spells.filter(s => s.classes.length === 1).map(s => s.classes[0]))].sort();

const folders = [
  buildFolderEnvelope({ id: GENERAL_FOLDER_ID, name: 'General', type: 'Item', sort: 0 }),
  ...classNamesWithSpells.map((className, i) => buildFolderEnvelope({ id: classFolderId(className), name: className, type: 'Item', sort: i + 1 }))
];

for (const folder of folders) {
  fs.writeFileSync(path.join(folderDir, `${folder._id}.json`), JSON.stringify(folder, null, 2), 'utf8');
}

function createSpellItem(spell) {
  return wrapItem({
    id: spell._id,
    name: spell.name,
    type: "spell",
    img: "icons/svg/book.svg",
    folder: folderIdForSpell(spell),
    system: {
      description: spell.description,
      spellLevel: spell.spellLevel,
      diceCount: spell.diceCount,
      castStat: spell.castStat,
      category: spell.category,
      prowess: spell.prowess,
      castingTime: spell.castingTime,
      range: spell.range,
      duration: spell.duration,
      grantedSkills: [],
      offensive: spell.offensive,
      roll: spell.roll,
      // Not part of item-spell.mjs's schema (same as `category` above) - Foundry
      // silently drops it on load. Read directly off this generated JSON by
      // CharacterGenerator.mjs's pickSpells() to build each class's own flavor
      // pool, layered on top of the shared castStat-matched generic spells.
      classes: spell.classes
    }
  });
}

// Generate all spell files
console.log('Generating spell item files...\n');
console.log(`Scaling formula: prowess = spellLevel + ceil(spellLevel / 3)\n`);

let count = 0;
const spellsByLevel = {};

for (const spell of spells) {
  const item = createSpellItem(spell);
  const filename = `${spell._id.toLowerCase()}.json`;
  const filepath = path.join(spellsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(item, null, 2), 'utf8');

  // Track by level for summary
  if (!spellsByLevel[spell.spellLevel]) {
    spellsByLevel[spell.spellLevel] = [];
  }
  spellsByLevel[spell.spellLevel].push({
    name: spell.name,
    category: spell.category,
    prowess: spell.prowess,
    diceCount: spell.diceCount
  });

  console.log(`✓ Created: ${filename} (Lvl ${spell.spellLevel}, ${spell.category}, prowess: ${spell.prowess}, dice: ${spell.diceCount})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} spell item files`);
console.log(`Location: ${spellsDir}`);
console.log(`✓ Generated ${folders.length} compendium folders (General + ${classNamesWithSpells.length} class-specific)`);

// Print summary by level
console.log('\n=== Spell Summary by Level ===\n');
for (const level of Object.keys(spellsByLevel).sort((a, b) => a - b)) {
  const levelSpells = spellsByLevel[level];
  console.log(`Level ${level} (${levelSpells.length} spells):`);
  levelSpells.forEach(s => {
    console.log(`  - ${s.name} [${s.category}] - ${s.prowess} mana, ${s.diceCount}d`);
  });
  console.log('');
}
