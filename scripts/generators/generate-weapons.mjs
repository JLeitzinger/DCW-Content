import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output directory for generated items
const outputDir = path.join(__dirname, '../../src/packs/items');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Generate a weapon item following the dccworld item schema
 * @param {Object} weaponData - Weapon configuration
 * @returns {Object} Foundry item document
 */
function generateWeapon(weaponData) {
  const {
    name,
    description,
    weight = 1,
    quantity = 1,
    diceNum = 1,
    diceSize = "d6",
    diceBonus = "+@str.mod+ceil(@lvl / 2)",
    img = "icons/svg/item-bag.svg"
  } = weaponData;

  return {
    _id: crypto.randomBytes(8).toString('hex'),
    name,
    type: "item",
    img,
    system: {
      description,
      quantity,
      weight,
      roll: {
        diceNum,
        diceSize,
        diceBonus
      }
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

/**
 * Weapon database - starter weapons
 */
const starterWeapons = [
  {
    name: "Dagger",
    description: "A small blade, easily concealed. Can be thrown.",
    weight: 1,
    diceNum: 1,
    diceSize: "d4",
    diceBonus: "+@dex.mod+ceil(@lvl / 2)"
  },
  {
    name: "Shortsword",
    description: "A versatile short blade, balanced for quick strikes.",
    weight: 2,
    diceNum: 1,
    diceSize: "d6",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Longsword",
    description: "A classic adventurer's blade, reliable and deadly.",
    weight: 3,
    diceNum: 1,
    diceSize: "d8",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Greatsword",
    description: "A massive two-handed blade requiring great strength to wield effectively.",
    weight: 6,
    diceNum: 2,
    diceSize: "d6",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Club",
    description: "A simple wooden cudgel. Crude but effective.",
    weight: 2,
    diceNum: 1,
    diceSize: "d4",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Mace",
    description: "A heavy spiked club designed to crush armor and bone.",
    weight: 4,
    diceNum: 1,
    diceSize: "d6",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Warhammer",
    description: "A brutal hammer designed for war, equally effective against armor and flesh.",
    weight: 5,
    diceNum: 1,
    diceSize: "d8",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Battleaxe",
    description: "A heavy axe with a broad blade, cleaving through foes.",
    weight: 4,
    diceNum: 1,
    diceSize: "d8",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Greataxe",
    description: "A massive two-handed axe capable of devastating strikes.",
    weight: 7,
    diceNum: 1,
    diceSize: "d12",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Spear",
    description: "A versatile polearm effective at reach. Can be thrown.",
    weight: 3,
    diceNum: 1,
    diceSize: "d6",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Quarterstaff",
    description: "A long wooden staff, simple yet effective in skilled hands.",
    weight: 4,
    diceNum: 1,
    diceSize: "d6",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  },
  {
    name: "Shortbow",
    description: "A compact bow, easy to use and carry.",
    weight: 2,
    diceNum: 1,
    diceSize: "d6",
    diceBonus: "+@dex.mod+ceil(@lvl / 2)"
  },
  {
    name: "Longbow",
    description: "A powerful bow requiring strength and skill to master.",
    weight: 2,
    diceNum: 1,
    diceSize: "d8",
    diceBonus: "+@dex.mod+ceil(@lvl / 2)"
  },
  {
    name: "Crossbow",
    description: "A mechanical bow that trades reload speed for power and accuracy.",
    weight: 5,
    diceNum: 1,
    diceSize: "d8",
    diceBonus: "+@dex.mod+ceil(@lvl / 2)"
  },
  {
    name: "Handaxe",
    description: "A light axe, versatile for melee and throwing.",
    weight: 2,
    diceNum: 1,
    diceSize: "d6",
    diceBonus: "+@str.mod+ceil(@lvl / 2)"
  }
];

/**
 * Generate all weapons and save to JSON files
 */
function generateAllWeapons() {
  console.log('Generating starter weapons...\n');

  let count = 0;

  for (const weaponData of starterWeapons) {
    const weapon = generateWeapon(weaponData);
    const filename = `${weapon.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(weapon, null, 2));
    console.log(`✓ Generated: ${weapon.name} (${weapon.system.roll.diceNum}${weapon.system.roll.diceSize})`);
    count++;
  }

  console.log(`\n✓ Generated ${count} weapons in ${outputDir}`);
  console.log('\nNext steps:');
  console.log('1. Review the generated JSON files in src/packs/items/');
  console.log('2. Run "npm run pack" to compile into compendium packs');
  console.log('3. Launch Foundry to see your weapons in the Items compendium');
}

// Run the generator
generateAllWeapons();
