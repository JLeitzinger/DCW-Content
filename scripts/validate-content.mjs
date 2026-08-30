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
import { resolveComplexityTier, getTierConfig } from './lib/level-gen/StoryGenerator.mjs';

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

// Every core-Foundry icon path bundled with the pinned Foundry version (see
// scripts/generate-icon-index.mjs) - used to catch an `img` that sounds plausible but was
// never real, which otherwise renders as a broken image in the compendium and on sheets.
const validIcons = new Set(JSON.parse(fs.readFileSync(path.join(dataDir, 'foundry-icons-index.json'), 'utf8')));

const MODULE_ASSET_PREFIX = 'modules/dcw-content/';

function checkImg(type, file, img) {
  if (!img) {
    warn(type, file, `missing img - will render with Foundry's default mystery-man icon`);
    return;
  }
  if (img.startsWith('icons/')) {
    if (!validIcons.has(img)) {
      error(type, file, `img "${img}" does not exist in Foundry's bundled icon set (see data/foundry-icons-index.json) - it will render broken`);
    }
    return;
  }
  if (img.startsWith(MODULE_ASSET_PREFIX)) {
    const onDisk = path.join(__dirname, '..', img.slice(MODULE_ASSET_PREFIX.length));
    if (!fs.existsSync(onDisk)) {
      error(type, file, `img "${img}" does not exist on disk - it will render broken`);
    }
  }
}

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
    checkImg('races', file, data.img);
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
    checkImg('classes', file, data.img);
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
    checkImg('items', file, data.img);
    checkImg('items', file, data.img);
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
    checkImg('weapons', file, data.img);
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
    checkImg('armor', file, data.img);
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
    checkImg('features', file, data.img);
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
    checkImg('spells', file, data.img);
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

// Unlike Item content (where grantedSkills/grantedFeatures reference by name), Scene/
// JournalEntry/Folder docs are only ever referenced by _id - names legitimately repeat across
// floors (every floor gets its own "Secrets" folder, "The Story So Far" entry, etc), so only
// _id needs to be unique, not name (checkNoDuplicates enforces both - too strict here).
function checkNoDuplicateIds(type, entries) {
  const byId = new Map();
  for (const { file, data } of entries) {
    if (byId.has(data._id)) {
      error(type, file, `duplicate _id "${data._id}" also used by ${byId.get(data._id)}`);
    } else {
      byId.set(data._id, file);
    }
  }
}

function validateFloors() {
  const sceneEntries = loadEntries('scenes');
  const journalEntries = loadEntries('journals');
  const folderEntries = loadEntries('journal-folders');
  checkNoDuplicateIds('scenes', sceneEntries);
  checkNoDuplicateIds('journals', journalEntries);
  checkNoDuplicateIds('journal-folders', folderEntries);

  const journalIds = new Set(journalEntries.map(({ data }) => data._id));
  const folderIds = new Set(folderEntries.map(({ data }) => data._id));
  const sceneById = new Map(sceneEntries.map(({ data }) => [data._id, data]));

  for (const { file, data } of sceneEntries) {
    if (!data.grid || !(data.grid.size > 0)) {
      error('scenes', file, `grid.size must be a positive number, found ${JSON.stringify(data.grid?.size)}`);
    }
    for (const wall of data.walls || []) {
      if (!Array.isArray(wall.c) || wall.c.length !== 4 || wall.c.some(n => typeof n !== 'number')) {
        error('scenes', file, `wall has an invalid c coordinate array: ${JSON.stringify(wall.c)}`);
      }
    }
    for (const note of data.notes || []) {
      if (note.entryId && !journalIds.has(note.entryId)) {
        error('scenes', file, `note ${note._id} references unknown journal entry "${note.entryId}"`);
      }
    }
    for (const tile of data.tiles || []) {
      const src = tile.texture?.src;
      if (!src) {
        error('scenes', file, `tile ${tile._id} has no texture.src`);
        continue;
      }
      const prefix = 'modules/dcw-content/';
      if (!src.startsWith(prefix)) {
        error('scenes', file, `tile ${tile._id} texture.src "${src}" isn't a modules/dcw-content/ path`);
        continue;
      }
      const onDisk = path.join(__dirname, '..', src.slice(prefix.length));
      if (!fs.existsSync(onDisk)) {
        error('scenes', file, `tile ${tile._id} texture.src "${src}" does not exist on disk - it will render broken`);
      }
    }
    for (const region of data.regions || []) {
      for (const behavior of region.behaviors || []) {
        if (behavior.type !== 'teleportToken') continue;
        for (const uuid of behavior.system?.destinations || []) {
          const match = uuid.match(/^Scene\.([^.]+)\.Region\.([^.]+)$/);
          if (!match) {
            error('scenes', file, `region behavior ${behavior._id} has a malformed destination UUID "${uuid}"`);
            continue;
          }
          const [, destSceneId, destRegionId] = match;
          const destScene = sceneById.get(destSceneId);
          if (!destScene) {
            error('scenes', file, `region behavior ${behavior._id} destination scene "${destSceneId}" does not exist`);
          } else if (!(destScene.regions || []).some(r => r._id === destRegionId)) {
            error('scenes', file, `region behavior ${behavior._id} destination region "${destRegionId}" does not exist in scene "${destSceneId}"`);
          }
        }
      }
    }
  }

  for (const { file, data } of journalEntries) {
    if (data.folder && !folderIds.has(data.folder)) {
      error('journals', file, `folder "${data.folder}" does not exist`);
    }
    if (!Array.isArray(data.pages) || data.pages.length === 0) {
      error('journals', file, `must have at least one page`);
    }
  }

  // Design-budget cross-check against data/floors-manifest.json's declared complexity tier.
  // Every id is a real random Foundry id now (see ids.mjs), not a constructed slug, so floors
  // are matched by name instead: Scene.name and the floor's root Folder.name both equal the
  // manifest entry's `name` (buildTheme only auto-generates a name when one isn't given).
  const manifestPath = path.join(dataDir, 'floors-manifest.json');
  if (!fs.existsSync(manifestPath)) return;
  const floorsManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const floorEntry of floorsManifest.floors || []) {
    const label = floorEntry.name || floorEntry.seed;
    if (!floorEntry.name) continue; // no fixed name to match against - nothing to cross-check
    const primaryEntry = sceneEntries.find(({ data }) => data.name === floorEntry.name);
    if (!primaryEntry) {
      warn('scenes', `(${label})`, `no primary scene found for manifest entry "${label}" - run npm run generate:floors`);
      continue;
    }
    const primary = primaryEntry.data;
    const tier = resolveComplexityTier(floorEntry);
    const tierConfig = getTierConfig(tier);
    const roomCount = (primary.notes || []).length;
    if (roomCount < tierConfig.roomCountMin || roomCount > tierConfig.roomCountMax) {
      warn('scenes', primaryEntry.file, `${roomCount} rooms is outside tier ${tier}'s documented ${tierConfig.roomCountMin}-${tierConfig.roomCountMax} range`);
    }

    const rootFolder = folderEntries.find(({ data }) => data.name === floorEntry.name && data.folder === null);
    const mainPlotFolder = rootFolder && folderEntries.find(({ data }) => data.name === 'Main Plot' && data.folder === rootFolder.data._id);
    const storyEntry = mainPlotFolder && journalEntries.find(({ data }) => data.name === 'The Story So Far' && data.folder === mainPlotFolder.data._id);
    const subStoryPages = storyEntry ? storyEntry.data.pages.filter(p => p.name.startsWith('Sub-story')).length : 0;
    if (subStoryPages < 2 || subStoryPages > 4) {
      warn('journals', storyEntry ? storyEntry.file : `(${label})`, `${subStoryPages} sub-storylines, documented range is 2-4`);
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
  spells: validateSpells,
  floors: validateFloors
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
