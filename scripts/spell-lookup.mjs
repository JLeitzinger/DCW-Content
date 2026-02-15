import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, '../data/spells-manifest.json');

// Load manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Flatten all spells
const allSpells = [];
for (const [categoryName, categorySpells] of Object.entries(manifest.spells)) {
  for (const spell of categorySpells) {
    allSpells.push({
      ...spell,
      prowess: calculateProwess(spell.spellLevel)
    });
  }
}

function calculateProwess(spellLevel) {
  return spellLevel + Math.ceil(spellLevel / 3);
}

function printUsage() {
  console.log(`
Spell Lookup Tool
=================

Usage: npm run spell-lookup -- <command> [args]

Commands:
  list [category]           List all spells or spells in a category
  info <spellName>          Show detailed information about a spell
  search <text>             Search spell names and descriptions
  level <level>             List spells of a specific level
  categories                List all spell categories
  stats                     Show spell statistics

Examples:
  npm run spell-lookup -- list
  npm run spell-lookup -- list evocation
  npm run spell-lookup -- info "Fireball"
  npm run spell-lookup -- search "damage"
  npm run spell-lookup -- level 3
  npm run spell-lookup -- categories
  npm run spell-lookup -- stats
`);
}

function listSpells(category = null) {
  const spellsToShow = category
    ? allSpells.filter(s => s.category === category)
    : allSpells;

  if (spellsToShow.length === 0) {
    console.log(`No spells found${category ? ` in category '${category}'` : ''}`);
    return;
  }

  console.log(category ? `\n=== ${category.toUpperCase()} SPELLS ===\n` : '\n=== ALL SPELLS ===\n');

  // Group by level
  const byLevel = {};
  spellsToShow.forEach(spell => {
    if (!byLevel[spell.spellLevel]) {
      byLevel[spell.spellLevel] = [];
    }
    byLevel[spell.spellLevel].push(spell);
  });

  // Sort levels
  const sortedLevels = Object.keys(byLevel).sort((a, b) => a - b);

  sortedLevels.forEach(level => {
    console.log(`Level ${level}:`);
    byLevel[level].forEach(spell => {
      const castType = spell.castStat === 'int' ? 'arcane' : 'divine';
      console.log(`  ${spell.name.padEnd(25)} [${spell.category}] ${spell.prowess} mana, ${spell.diceCount}d, ${castType}`);
    });
    console.log('');
  });

  console.log(`Total: ${spellsToShow.length} spells\n`);
}

function spellInfo(spellName) {
  const spell = allSpells.find(s =>
    s.name.toLowerCase() === spellName.toLowerCase()
  );

  if (!spell) {
    console.log(`Spell '${spellName}' not found.`);
    console.log(`\nDid you mean one of these?`);
    const similar = allSpells.filter(s =>
      s.name.toLowerCase().includes(spellName.toLowerCase())
    );
    similar.slice(0, 5).forEach(s => console.log(`  - ${s.name}`));
    return;
  }

  console.log(`
=== ${spell.name.toUpperCase()} ===

UUID:        ${spell.uuid}
Level:       ${spell.spellLevel}
School:      ${spell.category}
Dice Count:  ${spell.diceCount}
Cast Stat:   ${spell.castStat} (${spell.castStat === 'int' ? 'arcane' : 'divine'})
Prowess:     ${spell.prowess} mana

Description:
${spell.description}
`);
}

function searchSpells(searchText) {
  const results = allSpells.filter(spell =>
    spell.name.toLowerCase().includes(searchText.toLowerCase()) ||
    spell.description.toLowerCase().includes(searchText.toLowerCase())
  );

  if (results.length === 0) {
    console.log(`No spells found matching '${searchText}'`);
    return;
  }

  console.log(`\n=== Search Results for '${searchText}' ===\n`);
  results.forEach(spell => {
    console.log(`${spell.name} (Level ${spell.spellLevel})`);
    console.log(`  ${spell.description}`);
    console.log('');
  });
  console.log(`Total: ${results.length} spells\n`);
}

function spellsByLevel(level) {
  const levelNum = parseInt(level);
  if (isNaN(levelNum) || levelNum < 1 || levelNum > 15) {
    console.log('Invalid level. Must be 1-15.');
    return;
  }

  const spells = allSpells.filter(s => s.spellLevel === levelNum);

  if (spells.length === 0) {
    console.log(`No spells found at level ${levelNum}`);
    return;
  }

  console.log(`\n=== LEVEL ${levelNum} SPELLS ===`);
  console.log(`Mana Cost: ${calculateProwess(levelNum)}\n`);

  // Group by category
  const byCategory = {};
  spells.forEach(spell => {
    if (!byCategory[spell.category]) {
      byCategory[spell.category] = [];
    }
    byCategory[spell.category].push(spell);
  });

  Object.entries(byCategory).forEach(([category, categorySpells]) => {
    console.log(`${category}:`);
    categorySpells.forEach(spell => {
      console.log(`  ${spell.name.padEnd(25)} ${spell.diceCount}d, ${spell.castStat === 'int' ? 'arcane' : 'divine'}`);
    });
    console.log('');
  });

  console.log(`Total: ${spells.length} spells\n`);
}

function listCategories() {
  console.log('\n=== SPELL CATEGORIES ===\n');

  Object.entries(manifest.categories).forEach(([name, info]) => {
    const spellCount = allSpells.filter(s => s.category === name).length;
    console.log(`${name.toUpperCase()}`);
    console.log(`  ${info.description}`);
    console.log(`  Examples: ${info.examples}`);
    console.log(`  Total spells: ${spellCount}`);
    console.log('');
  });
}

function showStats() {
  console.log('\n=== SPELL STATISTICS ===\n');

  // Total count
  console.log(`Total Spells: ${allSpells.length}`);

  // By category
  console.log('\nBy Category:');
  const byCategory = {};
  allSpells.forEach(spell => {
    byCategory[spell.category] = (byCategory[spell.category] || 0) + 1;
  });
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(15)}: ${count}`);
  });

  // By level
  console.log('\nBy Level:');
  const byLevel = {};
  allSpells.forEach(spell => {
    byLevel[spell.spellLevel] = (byLevel[spell.spellLevel] || 0) + 1;
  });
  Object.keys(byLevel).sort((a, b) => a - b).forEach(level => {
    const prowess = calculateProwess(parseInt(level));
    console.log(`  Level ${level.padEnd(2)}: ${byLevel[level].toString().padEnd(2)} spells (${prowess} mana)`);
  });

  // By cast stat
  console.log('\nBy Cast Stat:');
  const arcane = allSpells.filter(s => s.castStat === 'int').length;
  const divine = allSpells.filter(s => s.castStat === 'wis').length;
  console.log(`  Arcane (int): ${arcane}`);
  console.log(`  Divine (wis): ${divine}`);

  // Dice count distribution
  console.log('\nDice Count Distribution:');
  const byDice = {};
  allSpells.forEach(spell => {
    byDice[spell.diceCount] = (byDice[spell.diceCount] || 0) + 1;
  });
  Object.keys(byDice).sort((a, b) => a - b).forEach(dice => {
    console.log(`  ${dice}d: ${byDice[dice]} spells`);
  });

  // Level range coverage
  console.log('\nLevel Coverage:');
  const coveredLevels = new Set(allSpells.map(s => s.spellLevel));
  const missingLevels = [];
  for (let i = 1; i <= 15; i++) {
    if (!coveredLevels.has(i)) {
      missingLevels.push(i);
    }
  }
  if (missingLevels.length > 0) {
    console.log(`  Missing levels: ${missingLevels.join(', ')}`);
  } else {
    console.log('  All levels 1-15 covered ✓');
  }

  console.log('');
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  printUsage();
  process.exit(0);
}

const command = args[0];

switch (command) {
  case 'list':
    listSpells(args[1]);
    break;
  case 'info':
    if (!args[1]) {
      console.log('Error: spell name required');
      console.log('Usage: npm run spell-lookup -- info "Spell Name"');
    } else {
      spellInfo(args[1]);
    }
    break;
  case 'search':
    if (!args[1]) {
      console.log('Error: search text required');
      console.log('Usage: npm run spell-lookup -- search "text"');
    } else {
      searchSpells(args[1]);
    }
    break;
  case 'level':
    if (!args[1]) {
      console.log('Error: level number required');
      console.log('Usage: npm run spell-lookup -- level 3');
    } else {
      spellsByLevel(args[1]);
    }
    break;
  case 'categories':
    listCategories();
    break;
  case 'stats':
    showStats();
    break;
  default:
    console.log(`Unknown command: ${command}`);
    printUsage();
}
