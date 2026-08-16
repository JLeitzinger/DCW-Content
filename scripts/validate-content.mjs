/**
 * Validate the packed content in src/packs/<type>/*.json against the real Foundry
 * DataModel constraints (module/data/item-*.mjs in the sibling Dungeon-Crawler-World repo -
 * not CLAUDE.md's prose, which has drifted from the schema in places) plus the design-budget
 * rules CLAUDE.md documents but nothing previously enforced, and cross-reference integrity
 * (every skillUuid/featureUuid must resolve to something real).
 *
 * Runs against src/packs/ directly - the real packed output - regardless of whether an entry
 * came from a generator or is still hand-edited.
 *
 * Usage: node scripts/validate-content.mjs [--type=<type>]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPacksDir = path.join(__dirname, '../src/packs');
const dataDir = path.join(__dirname, '../data');

const typeArg = process.argv.find(a => a.startsWith('--type='));
const onlyType = typeArg ? typeArg.split('=')[1] : null;

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const RARITIES = ['common', 'uncommon', 'rare', 'legendary', 'mythic', 'celestial'];

let errorCount = 0;
let warnCount = 0;

function error(type, file, message) {
  errorCount++;
  console.log(`  ✗ [${type}/${file}] ${message}`);
}

function warn(type, file, message) {
  warnCount++;
  console.log(`  ! [${type}/${file}] ${message}`);
}

function loadEntries(type) {
  const dir = path.join(srcPacksDir, type);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}

// ---- Cross-reference maps ----

const skillsManifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'skills-manifest.json'), 'utf8'));
const skillsByName = new Map();
for (const category of Object.values(skillsManifest.skills)) {
  for (const skill of category) skillsByName.set(skill.name, skill);
}

const featureEntries = loadEntries('features');
const featureIdsToNames = new Map(featureEntries.map(({ data }) => [data._id, data.name]));

function checkGrantedSkills(type, file, grantedSkills) {
  for (const g of grantedSkills || []) {
    if (!g.skillUuid || typeof g.level !== 'number') {
      error(type, file, `grantedSkills entry malformed: ${JSON.stringify(g)}`);
      continue;
    }
    if (!g.skillUuid.startsWith('Compendium.dcw-content.skills.Item.')) {
      error(type, file, `grantedSkills UUID uses the wrong package id: "${g.skillUuid}" (should start with Compendium.dcw-content.skills.Item.)`);
      continue;
    }
    const name = g.skillUuid.split('.').pop();
    if (!skillsByName.has(name)) {
      error(type, file, `grantedSkills references unknown skill "${name}" (${g.skillUuid})`);
    }
  }
}

function checkGrantedFeatures(type, file, grantedFeatures) {
  for (const g of grantedFeatures || []) {
    if (!g.featureUuid || typeof g.level !== 'number') {
      error(type, file, `grantedFeatures entry malformed: ${JSON.stringify(g)}`);
      continue;
    }
    if (!g.featureUuid.startsWith('Compendium.dcw-content.features.Item.')) {
      error(type, file, `grantedFeatures UUID uses the wrong package id: "${g.featureUuid}" (should start with Compendium.dcw-content.features.Item.)`);
      continue;
    }
    const id = g.featureUuid.split('.').pop();
    if (!featureIdsToNames.has(id)) {
      error(type, file, `grantedFeatures references unknown feature id "${id}" (${g.featureUuid})`);
    }
  }
}

function checkNoDuplicates(type, entries) {
  const byName = new Map();
  const byId = new Map();
  for (const { file, data } of entries) {
    if (byName.has(data.name)) {
      error(type, file, `duplicate name "${data.name}" also used by ${byName.get(data.name)}`);
    } else {
      byName.set(data.name, file);
    }
    if (byId.has(data._id)) {
      error(type, file, `duplicate _id "${data._id}" also used by ${byId.get(data._id)}`);
    } else {
      byId.set(data._id, file);
    }
  }
}

function sumAbilityBonuses(abilityBonuses) {
  return ABILITIES.reduce((sum, key) => sum + (abilityBonuses?.[key] || 0), 0);
}

// ---- Per-type checks ----

function validateRaces() {
  const entries = loadEntries('races');
  checkNoDuplicates('races', entries);
  for (const { file, data } of entries) {
    const s = data.system;
    checkGrantedSkills('races', file, s.grantedSkills);
    checkGrantedFeatures('races', file, s.grantedFeatures);

    if (!['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'].includes(s.size)) {
      error('races', file, `invalid size "${s.size}"`);
    }
    if (typeof s.senses !== 'object' || Array.isArray(s.senses)) {
      error('races', file, `senses must be an object of 4 numeric fields (darkvision/blindsight/tremorsense/truesight), found ${Array.isArray(s.senses) ? 'an array' : typeof s.senses}: ${JSON.stringify(s.senses)}`);
    } else {
      for (const key of ['darkvision', 'blindsight', 'tremorsense', 'truesight']) {
        if (typeof s.senses[key] !== 'number') {
          error('races', file, `senses.${key} must be a number, found ${JSON.stringify(s.senses[key])}`);
        }
      }
    }

    const total = sumAbilityBonuses(s.abilityBonuses);
    if (total !== 3) {
      error('races', file, `abilityBonuses must total exactly 3, found ${total}`);
    }

    const categorized = (s.grantedSkills || []).map(g => {
      const name = g.skillUuid?.split('.').pop();
      return skillsByName.get(name)?.category;
    }).filter(Boolean);
    const generalUtility = categorized.filter(c => c === 'general' || c === 'utility').length;
    const magicCombat = categorized.filter(c => c === 'magic' || c === 'combat').length;
    if (generalUtility !== 2) {
      error('races', file, `must grant exactly 2 general/utility skills, found ${generalUtility}`);
    }
    if (magicCombat !== 1) {
      error('races', file, `must grant exactly 1 magic/combat skill, found ${magicCombat}`);
    }
  }
}

function validateClasses() {
  const entries = loadEntries('classes');
  checkNoDuplicates('classes', entries);
  for (const { file, data } of entries) {
    const s = data.system;
    checkGrantedSkills('classes', file, s.grantedSkills);
    checkGrantedFeatures('classes', file, s.grantedFeatures);

    if (!['d6', 'd8', 'd10', 'd12'].includes(s.hitDie)) {
      error('classes', file, `invalid hitDie "${s.hitDie}"`);
    }
    if (!ABILITIES.includes(s.primaryAbility)) {
      error('classes', file, `invalid primaryAbility "${s.primaryAbility}"`);
    }
    if (s.secondaryAbility && !ABILITIES.includes(s.secondaryAbility)) {
      error('classes', file, `invalid secondaryAbility "${s.secondaryAbility}"`);
    }
    for (const key of ABILITIES) {
      if (typeof s.saves?.[key] !== 'boolean') {
        error('classes', file, `saves.${key} must be a boolean`);
      }
    }

    const total = sumAbilityBonuses(s.abilityBonuses);
    if (total < 0.5 || total > 1.5) {
      warn('classes', file, `abilityBonuses total ${total} is outside the documented 0.5-1.5 range`);
    }
    const skillCount = (s.grantedSkills || []).length;
    if (skillCount < 3 || skillCount > 5) {
      warn('classes', file, `grants ${skillCount} skills, documented range is 3-5`);
    }
    const featureCount = (s.grantedFeatures || []).length;
    if (featureCount < 1 || featureCount > 3) {
      warn('classes', file, `grants ${featureCount} features, documented range is 1-3`);
    }
  }
}

function validateItems() {
  const entries = loadEntries('items');
  checkNoDuplicates('items', entries);
  for (const { file, data } of entries) {
    const s = data.system;
    checkGrantedSkills('items', file, s.grantedSkills);
    if (!RARITIES.includes(s.rarity)) {
      error('items', file, `invalid rarity "${s.rarity}"`);
    }
    if (!(s.quantity >= 1)) {
      error('items', file, `quantity must be >= 1, found ${s.quantity}`);
    }
    if (!(s.weight >= 0)) {
      error('items', file, `weight must be >= 0, found ${s.weight}`);
    }
    if (s.consumable) {
      if (!['hp', 'stamina', 'mana'].includes(s.restoreResource)) {
        error('items', file, `consumable items must set restoreResource to "hp", "stamina", or "mana", found ${JSON.stringify(s.restoreResource)}`);
      }
      if (!(s.restoreAmount > 0)) {
        error('items', file, `consumable items must set restoreAmount > 0, found ${s.restoreAmount}`);
      }
    }
    // regenBoostAmount and regenBoostUses must be both-or-neither - a potion effect needs
    // both a bonus and a duration, and regenBoostUses > 0 is what Actor#useItem treats as
    // "this is a potion" (subject to the cooldown/Poisoned rule).
    if ((s.regenBoostAmount > 0) !== (s.regenBoostUses > 0)) {
      error('items', file, `regenBoostAmount (${s.regenBoostAmount}) and regenBoostUses (${s.regenBoostUses}) must be set together or not at all`);
    }
  }
}

function validateWeapons() {
  const entries = loadEntries('weapons');
  checkNoDuplicates('weapons', entries);
  for (const { file, data } of entries) {
    const s = data.system;
    checkGrantedSkills('weapons', file, s.grantedSkills);
    checkGrantedFeatures('weapons', file, s.grantedFeatures);
    if (!RARITIES.includes(s.rarity)) {
      error('weapons', file, `invalid rarity "${s.rarity}"`);
    }
    if (!s.roll || !(s.roll.diceNum >= 1) || !s.roll.diceSize || typeof s.roll.diceBonus !== 'string') {
      error('weapons', file, `roll must be {diceNum >= 1, diceSize, diceBonus}, found ${JSON.stringify(s.roll)}`);
    } else if (!['d4', 'd6', 'd8', 'd10', 'd12'].includes(s.roll.diceSize)) {
      warn('weapons', file, `diceSize "${s.roll.diceSize}" is outside the documented d4-d12 range`);
    }
    if (!(s.effort >= 0)) {
      error('weapons', file, `effort must be >= 0, found ${s.effort}`);
    }
    if (!s.range) {
      error('weapons', file, `range must not be blank`);
    }
    const skillCount = (s.grantedSkills || []).length;
    if (skillCount < 1 || skillCount > 2) {
      warn('weapons', file, `grants ${skillCount} skills, documented range is 1-2`);
    }
  }
}

function validateArmor() {
  const entries = loadEntries('armor');
  checkNoDuplicates('armor', entries);
  for (const { file, data } of entries) {
    const s = data.system;
    checkGrantedSkills('armor', file, s.grantedSkills);
    if (!RARITIES.includes(s.rarity)) {
      error('armor', file, `invalid rarity "${s.rarity}"`);
    }
    if (!(s.effort >= 0)) {
      error('armor', file, `effort must be >= 0, found ${s.effort}`);
    }
    if (!(s.damageReduction >= 0)) {
      error('armor', file, `damageReduction must be >= 0, found ${s.damageReduction}`);
    }
    const skillCount = (s.grantedSkills || []).length;
    if (skillCount < 1 || skillCount > 2) {
      warn('armor', file, `grants ${skillCount} skills, expected range is 1-2`);
    }
  }
}

function validateFeatures() {
  checkNoDuplicates('features', featureEntries);
  for (const { file, data } of featureEntries) {
    checkGrantedSkills('features', file, data.system.grantedSkills);
    const skillCount = (data.system.grantedSkills || []).length;
    if (skillCount > 2) {
      warn('features', file, `grants ${skillCount} skills, documented range is 0-2`);
    }
  }
}

function validateSpells() {
  const entries = loadEntries('spells');
  checkNoDuplicates('spells', entries);
  for (const { file, data } of entries) {
    const s = data.system;
    if ((s.grantedSkills || []).length > 0) {
      error('spells', file, `spells should not grant skills (they use the Cast/Channel skills instead)`);
    }
    if (!(s.spellLevel >= 1 && s.spellLevel <= 15)) {
      error('spells', file, `spellLevel must be 1-15, found ${s.spellLevel}`);
    }
    if (s.castStat !== null && !['int', 'wis'].includes(s.castStat)) {
      error('spells', file, `castStat must be "int", "wis", or null, found ${JSON.stringify(s.castStat)}`);
    }
    const expectedProwess = s.spellLevel + Math.ceil(s.spellLevel / 3);
    if (s.prowess !== expectedProwess) {
      error('spells', file, `prowess should be ${expectedProwess} (spellLevel + ceil(spellLevel/3)), found ${s.prowess}`);
    }
  }
}

// ---- Run ----

const validators = {
  races: validateRaces,
  classes: validateClasses,
  items: validateItems,
  armor: validateArmor,
  weapons: validateWeapons,
  features: validateFeatures,
  spells: validateSpells
};

console.log('Validating content...\n');

for (const [type, fn] of Object.entries(validators)) {
  if (onlyType && onlyType !== type) continue;
  console.log(`-- ${type} --`);
  fn();
}

console.log(`\n${errorCount} error(s), ${warnCount} warning(s)`);
if (errorCount > 0) {
  console.log('\n✗ Validation failed.');
  process.exit(1);
}
console.log('\n✓ Validation passed.');
