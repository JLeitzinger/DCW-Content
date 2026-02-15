import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../src/packs/classes');

// Determine primary ability based on class stat boosts
function getPrimaryAbility(abilityBonuses) {
  let maxStat = 'str';
  let maxBonus = 0;

  for (const [stat, bonus] of Object.entries(abilityBonuses)) {
    if (bonus > maxBonus) {
      maxBonus = bonus;
      maxStat = stat;
    }
  }

  return maxStat;
}

// Determine hit die based on baseHP
function getHitDie(baseHP) {
  if (baseHP >= 12) return 'd12';
  if (baseHP >= 10) return 'd10';
  if (baseHP >= 8) return 'd8';
  return 'd6';
}

async function fixClasses() {
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json') && f !== 'test-fighter.json');

  console.log(`Fixing ${files.length} class files...\n`);

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const classData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Add missing fields
    if (!classData.system.hitDie) {
      classData.system.hitDie = getHitDie(classData.system.baseHP);
    }

    if (!classData.system.primaryAbility) {
      classData.system.primaryAbility = getPrimaryAbility(classData.system.abilityBonuses);
    }

    if (!classData.system.secondaryAbility) {
      classData.system.secondaryAbility = "";
    }

    if (!classData.system.features) {
      classData.system.features = "";
    }

    if (!classData.system.subclasses) {
      classData.system.subclasses = "";
    }

    // Ensure abilityBonuses has all stats
    const defaultBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    classData.system.abilityBonuses = { ...defaultBonuses, ...classData.system.abilityBonuses };

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(classData, null, 2) + '\n');
    console.log(`✓ Fixed: ${classData.name}`);
  }

  console.log(`\n✓ All classes fixed!`);
}

fixClasses().catch(console.error);
