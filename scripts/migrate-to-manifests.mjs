/**
 * One-time migration: convert the existing hand-authored src/packs/<type>/*.json files for
 * races, classes, features, and weapons into data/<type>-manifest.json entries, so they go
 * through the same manifest -> generate -> pack pipeline skills/spells already use.
 *
 * Existing ids are preserved via an `id` override wherever they don't already match the new
 * canonical slug (see resolve-refs.mjs#resolveEntryId) - skills/features/classes/races are
 * referenced elsewhere by their current id, so nothing is renamed.
 *
 * The 15 stale src/packs/items/*.json files (confirmed duplicates of the real weapons, left
 * over from an abandoned early generator) are deleted rather than migrated - items-manifest.json
 * starts empty, ready for real armor/gear content going forward.
 *
 * Run once: `node scripts/migrate-to-manifests.mjs`, BEFORE ever running the new
 * generate-<type>.mjs scripts. Re-running afterward is NOT safe - the generators only emit
 * fields the real Foundry schema defines, so any src/packs/ field the schema doesn't
 * recognize (e.g. the dead `traits` array some races had) is gone from disk the first time
 * a generator overwrites that file, and a second migration pass has nothing left to recover
 * it from. Once manifests exist, they - not src/packs/ - are the source of truth.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toSlug } from './lib/slug.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPacksDir = path.join(__dirname, '../src/packs');
const dataDir = path.join(__dirname, '../data');

function readDir(type) {
  const dir = path.join(srcPacksDir, type);
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

/** Only include an `id` override when the canonical slug wouldn't reproduce the existing id. */
function idOverride(existingId, name) {
  return existingId === toSlug(name) ? undefined : existingId;
}

/** "Compendium.<pkg>.<pack>.Item.<Id>" -> the referenced document's current name, via idsToNames. */
function nameFromUuid(uuid, idsToNames) {
  const id = uuid.split('.').pop();
  const name = idsToNames.get(id);
  if (!name) throw new Error(`Could not resolve "${uuid}" to a known name during migration.`);
  return name;
}

function withoutUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// ---- Features ----

const featureFiles = readDir('features');
const featureIdsToNames = new Map(featureFiles.map(f => [f._id, f.name]));

const features = featureFiles.map(f => withoutUndefined({
  id: idOverride(f._id, f.name),
  name: f.name,
  img: f.img,
  description: f.system.description,
  grantedSkills: (f.system.grantedSkills || []).map(g => ({
    skillName: g.skillUuid.split('.').pop(),
    level: g.level
  }))
}));

fs.writeFileSync(path.join(dataDir, 'features-manifest.json'), JSON.stringify({
  manifestVersion: '1.0',
  description: 'Feature registry - see CLAUDE.md\'s Feature Items section for authoring guidelines.',
  features
}, null, 2) + '\n', 'utf8');
console.log(`✓ Migrated ${features.length} features -> data/features-manifest.json`);

// ---- Races ----

const races = readDir('races').map(r => withoutUndefined({
  id: idOverride(r._id, r.name),
  name: r.name,
  img: r.img,
  // `traits` isn't a field item-race.mjs actually defines (CLAUDE.md documents it, but Foundry
  // silently drops it on load) - fold its text into description instead of losing it outright.
  description: r.system.traits?.length
    ? `${r.system.description}\n\nTraits: ${r.system.traits.join(' ')}`
    : r.system.description,
  abilityBonuses: r.system.abilityBonuses,
  bonuses: r.system.bonuses,
  size: r.system.size,
  speed: r.system.speed,
  senses: r.system.senses,
  languages: r.system.languages,
  grantedFeatures: (r.system.grantedFeatures || []).map(g => ({
    featureName: nameFromUuid(g.featureUuid, featureIdsToNames),
    level: g.level
  })),
  grantedSkills: (r.system.grantedSkills || []).map(g => ({
    skillName: g.skillUuid.split('.').pop(),
    level: g.level
  }))
}));

fs.writeFileSync(path.join(dataDir, 'races-manifest.json'), JSON.stringify({
  manifestVersion: '1.0',
  description: 'Race registry - see CLAUDE.md\'s Race Items section for authoring guidelines.',
  races
}, null, 2) + '\n', 'utf8');
console.log(`✓ Migrated ${races.length} races -> data/races-manifest.json`);

// ---- Classes ----

const classes = readDir('classes').map(c => withoutUndefined({
  id: idOverride(c._id, c.name),
  name: c.name,
  img: c.img,
  description: c.system.description,
  baseHP: c.system.baseHP,
  hpPerLevel: c.system.hpPerLevel,
  staminaPerLevel: c.system.staminaPerLevel,
  manaPerLevel: c.system.manaPerLevel,
  abilityBonuses: c.system.abilityBonuses,
  levelAcquired: c.system.levelAcquired,
  saves: c.system.saves,
  hitDie: c.system.hitDie,
  primaryAbility: c.system.primaryAbility,
  secondaryAbility: c.system.secondaryAbility,
  features: c.system.features,
  subclasses: c.system.subclasses,
  grantedSkills: (c.system.grantedSkills || []).map(g => ({
    skillName: g.skillUuid.split('.').pop(),
    level: g.level
  })),
  grantedFeatures: (c.system.grantedFeatures || []).map(g => ({
    featureName: nameFromUuid(g.featureUuid, featureIdsToNames),
    level: g.level
  }))
}));

fs.writeFileSync(path.join(dataDir, 'classes-manifest.json'), JSON.stringify({
  manifestVersion: '1.0',
  description: 'Class registry - see CLAUDE.md\'s Class Items section for authoring guidelines.',
  classes
}, null, 2) + '\n', 'utf8');
console.log(`✓ Migrated ${classes.length} classes -> data/classes-manifest.json`);

// ---- Weapons (no id override - nothing references a weapon's own id) ----

const weapons = readDir('weapons').map(w => withoutUndefined({
  name: w.name,
  img: w.img,
  description: w.system.description,
  quantity: w.system.quantity,
  weight: w.system.weight,
  roll: w.system.roll,
  rarity: w.system.rarity,
  effort: w.system.effort,
  range: w.system.range,
  grantedSkills: (w.system.grantedSkills || []).map(g => ({
    skillName: g.skillUuid.split('.').pop(),
    level: g.level
  })),
  grantedFeatures: (w.system.grantedFeatures || []).map(g => ({
    featureName: nameFromUuid(g.featureUuid, featureIdsToNames),
    level: g.level
  }))
}));

fs.writeFileSync(path.join(dataDir, 'weapons-manifest.json'), JSON.stringify({
  manifestVersion: '1.0',
  description: 'Weapon registry - see CLAUDE.md\'s Item (Equipment) section for authoring guidelines.',
  weapons
}, null, 2) + '\n', 'utf8');
console.log(`✓ Migrated ${weapons.length} weapons -> data/weapons-manifest.json`);

// ---- Items: delete the stale duplicates, start the manifest empty ----

const itemsDir = path.join(srcPacksDir, 'items');
const staleItemFiles = fs.readdirSync(itemsDir).filter(f => f.endsWith('.json'));
for (const f of staleItemFiles) fs.unlinkSync(path.join(itemsDir, f));

fs.writeFileSync(path.join(dataDir, 'items-manifest.json'), JSON.stringify({
  manifestVersion: '1.0',
  description: 'Item (armor/gear/tools) registry - see CLAUDE.md\'s Item (Equipment) section for authoring guidelines.',
  items: []
}, null, 2) + '\n', 'utf8');
console.log(`✓ Deleted ${staleItemFiles.length} stale duplicate weapon files from src/packs/items/`);
console.log('✓ Created empty data/items-manifest.json');
