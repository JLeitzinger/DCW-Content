import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const spellsDir = path.join(__dirname, '../src/packs/spells');
const manifestPath = path.join(__dirname, '../data/spells-manifest.json');

// Ensure spells directory exists
if (!fs.existsSync(spellsDir)) {
  fs.mkdirSync(spellsDir, { recursive: true });
}

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
      prowess: calculateProwess(spell.spellLevel)
    });
  }
}

function createSpellItem(spell) {
  return {
    _id: spell._id,
    name: spell.name,
    type: "spell",
    img: "icons/svg/book.svg",
    system: {
      description: spell.description,
      spellLevel: spell.spellLevel,
      diceCount: spell.diceCount,
      castStat: spell.castStat,
      category: spell.category,
      prowess: spell.prowess,
      grantedSkills: []
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: {
      default: 0
    },
    flags: {}
  };
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
