/**
 * Builds full dccworldCharacter Actor documents for a floor's non-mob enemies (elites, the one
 * boss) and friendly NPCs - a real race + class + equipped gear + spells + feats, the same
 * content pool a player draws from, instead of MonsterGenerator.mjs's flat CR-formula NPC (still
 * used for minion-band mobs - "easily defeated but dangerous in number", left untouched). See
 * DCW-Content/CLAUDE.md's "Character (Elite/Boss/Friendly NPC) Actors" section.
 *
 * Elite/boss archetypes still come from data/monsters-manifest.json's elite/boss rows (curated
 * art/theme/primaryAbility/combatSkill, resolved by monster-roster.mjs) - only the *mechanical*
 * build changes here, from a flat stat block to a real character. Friendly NPCs have no
 * archetype row at all (a wholly new placement category - see MonsterGenerator.mjs's
 * placeFriendlyNpcs); their race/class is picked freely.
 *
 * Reads already-generated src/packs/{races,classes,weapons,armor,spells,features}/*.json at
 * module load, not the data/*-manifest.json sources - `npm run generate` always runs those
 * generate:<type> scripts before generate:floors (see package.json's `generate` aggregate), so
 * this content is guaranteed to exist and already fully resolved (grantedSkills/grantedFeatures
 * already carry real UUIDs) by the time a floor is generated. This also guarantees the picked
 * race/class content here can never drift from what the shared Races/Classes compendiums
 * actually contain.
 *
 * HP/Stamina/Mana are intentionally NOT computed here the way monster-roster.mjs computes
 * CR-based stats: dccworldCharacter#prepareDerivedData() (Dungeon-Crawler-World/module/data/
 * actor-character.mjs) always recomputes `.max` from the owned class/race items on load, and
 * self-clamps `.value` down to it (`if (this.hp.value > this.hp.max) this.hp.value = this.hp.max`,
 * same for stamina/mana) - so writing an oversized placeholder into both and letting the engine
 * correct it on first load is simpler than duplicating that formula, and immune to it drifting
 * out of sync between the two repos.
 *
 * A race/class item's own `grantedFeatures` list is not mechanically live on its own - Foundry
 * only aggregates skills/luck from items actually embedded on the actor (see
 * Dungeon-Crawler-World/module/data/base-actor.mjs's _aggregateSkills/_aggregateLuck), and a
 * class's `grantedFeatures` field is just a list of UUIDs to resolve. A live player gets this
 * for free via actor-sheet.mjs's _grantFeaturesFromItem, which runs on drag-and-drop; since
 * nothing drags-and-drops here, resolveGrantedFeatures() below replicates that same resolution
 * at generation time so a generated character's class/race features are real embedded items,
 * not just dangling references.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapItem } from '../foundry-item.mjs';
import { wrapActor } from '../foundry-actor.mjs';
import { getCategory, pickName, pickBossTitle, pickFriendlyNpcHook } from './lexicon.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPacksDir = path.join(__dirname, '../../../src/packs');

function loadPackDir(type) {
  const dir = path.join(srcPacksDir, type);
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

const RACES = loadPackDir('races');
const CLASSES = loadPackDir('classes');
const WEAPONS = loadPackDir('weapons');
const ARMOR = loadPackDir('armor');
const SPELLS = loadPackDir('spells');
const FEATURES = loadPackDir('features');
const FEATURES_BY_ID = new Map(FEATURES.map(f => [f._id, f]));

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const CASTER_SKILLS = new Set(['Cast', 'Channel']);

// Written into hp/stamina/mana .value AND .max - see file header for why this is safe: the
// engine recomputes .max from class+level on every load and self-clamps .value down to it.
const RESOURCE_PLACEHOLDER = 999;

// Friendly NPCs have no curated monster-art archetype to draw a portrait from (player-portrait
// art is still Phase 4 of the tile-pack plan, not built yet) - fall back to a generic Foundry
// core icon, same "no custom art yet" convention already used by features/spells in this repo.
const FRIENDLY_NPC_IMG = 'icons/svg/mystery-man.svg';

function clampLevel(n) {
  return Math.max(1, Math.min(20, Math.round(n)));
}

function topAbility(abilityBonuses) {
  return Object.entries(abilityBonuses).reduce((best, [k, v]) => (v > best[1] ? [k, v] : best), ['str', -Infinity])[0];
}

function isCasterClass(classDoc) {
  return classDoc.system.manaPerLevel >= classDoc.system.staminaPerLevel;
}

function pickRace(rng, primaryAbility) {
  const matches = RACES.filter(r => topAbility(r.system.abilityBonuses) === primaryAbility);
  return rng.pick(matches.length ? matches : RACES);
}

/** @param {boolean|null} preferCaster - null means no caster bias (used for friendly NPCs). */
function pickClass(rng, primaryAbility, preferCaster = null) {
  const byAbility = CLASSES.filter(c => c.system.primaryAbility === primaryAbility);
  const pool = byAbility.length ? byAbility : CLASSES;
  if (preferCaster === null) return rng.pick(pool);
  const byCaster = pool.filter(c => isCasterClass(c) === preferCaster);
  return rng.pick(byCaster.length ? byCaster : pool);
}

function rarityPreference(level) {
  if (level <= 5) return ['common', 'uncommon'];
  if (level <= 10) return ['uncommon', 'rare'];
  if (level <= 15) return ['rare', 'legendary'];
  return ['legendary', 'mythic', 'celestial'];
}

/** Picks from `pool` preferring `preferredRarities` in order, falling back to any item in the pool. */
function pickByRarity(rng, pool, preferredRarities) {
  for (const rarity of preferredRarities) {
    const matches = pool.filter(i => i.system.rarity === rarity);
    if (matches.length) return rng.pick(matches);
  }
  return rng.pick(pool);
}

function pickGear(rng, level) {
  const rarities = rarityPreference(level);
  return { weapon: pickByRarity(rng, WEAPONS, rarities), armor: pickByRarity(rng, ARMOR, rarities) };
}

/**
 * Only meaningful for caster classes - see isCasterClass(). Spells' castStat is
 * int, wis, or cha. Each spell's (generator-only, not in item-spell.mjs's own
 * schema) `classes` array optionally names which class(es) it's flavored for -
 * when a class has any of its own tagged spells, its pool is those spells plus
 * the shared untagged/generic ones (same castStat); otherwise it falls back to
 * the full shared castStat-matched pool, exactly like before this field existed.
 */
function pickSpells(rng, classDoc, level) {
  const castStat = [classDoc.system.primaryAbility, classDoc.system.secondaryAbility].find(a => a === 'int' || a === 'wis' || a === 'cha');
  if (!castStat) return [];

  const maxSpellLevel = Math.min(9, Math.ceil(level / 2));
  const byCastStat = SPELLS.filter(s => s.system.castStat === castStat && s.system.spellLevel <= maxSpellLevel);
  const classSpells = byCastStat.filter(s => (s.system.classes || []).includes(classDoc.name));
  const genericSpells = byCastStat.filter(s => !(s.system.classes || []).length);
  const pool = classSpells.length ? [...classSpells, ...genericSpells] : byCastStat;
  if (!pool.length) return [];

  const count = Math.min(4, Math.max(1, Math.floor(level / 3) + 1));
  return rng.shuffle([...pool]).slice(0, Math.min(count, pool.length));
}

function pickExtraFeature(rng, excludeIds) {
  const pool = FEATURES.filter(f => !excludeIds.has(f._id));
  return pool.length ? rng.pick(pool) : null;
}

/** Isolated on purpose - narrative-only until a real subclass system exists (see CLAUDE.md's Character section). */
function pickSubclassFlavor(rng, category) {
  return `the ${rng.pick(category.adjectives)}`;
}

function cloneItem(id, source, overrides = {}) {
  return wrapItem({ id, name: source.name, type: source.type, img: source.img, system: { ...source.system, ...overrides } });
}

function featureIdFromUuid(uuid) {
  return uuid.split('.').pop();
}

/** Mirrors actor-sheet.mjs's _grantFeaturesFromItem (the live drag-and-drop path) - see file header. */
function resolveGrantedFeatures(id, idPrefix, sourceItem) {
  const grantedFeatures = sourceItem.system.grantedFeatures || [];
  const items = [];
  grantedFeatures.forEach((ref, i) => {
    const feature = FEATURES_BY_ID.get(featureIdFromUuid(ref.featureUuid));
    if (feature) items.push(cloneItem(id(`${idPrefix}-feature-${i}`), feature));
  });
  return items;
}

function computeAbilityValues(primaryAbility, secondaryAbility, level) {
  const abilities = Object.fromEntries(ABILITIES.map(a => [a, { value: 10 }]));
  abilities[primaryAbility] = { value: 10 + Math.ceil(level / 2) };
  if (secondaryAbility) abilities[secondaryAbility] = { value: 10 + Math.ceil(level / 4) };
  return abilities;
}

/**
 * Shared builder behind buildBoss/buildEliteCharacter/buildFriendlyNpc.
 * @param {boolean} wantsExtraFeature - boss-only: +1 random feature beyond its race/class's own.
 */
function buildCharacterActor(rng, id, idPrefix, { name, img, biography, primaryAbility, secondaryAbility, level, category, wantsCaster, wantsExtraFeature = false }) {
  const race = pickRace(rng, primaryAbility);
  const klass = pickClass(rng, primaryAbility, wantsCaster);
  const { weapon, armor } = pickGear(rng, level);
  const spells = isCasterClass(klass) ? pickSpells(rng, klass, level) : [];

  const items = [
    cloneItem(id(`${idPrefix}-race`), race),
    ...resolveGrantedFeatures(id, `${idPrefix}-race`, race),
    cloneItem(id(`${idPrefix}-class`), klass),
    ...resolveGrantedFeatures(id, `${idPrefix}-class`, klass),
    cloneItem(id(`${idPrefix}-weapon`), weapon, { equipped: true }),
    cloneItem(id(`${idPrefix}-armor`), armor, { equipped: true }),
    ...spells.map((s, i) => cloneItem(id(`${idPrefix}-spell-${i}`), s))
  ];

  if (wantsExtraFeature) {
    const grantedFeatureIds = new Set(
      [...(race.system.grantedFeatures || []), ...(klass.system.grantedFeatures || [])].map(ref => featureIdFromUuid(ref.featureUuid))
    );
    const extraFeature = pickExtraFeature(rng, grantedFeatureIds);
    if (extraFeature) items.push(cloneItem(id(`${idPrefix}-extra-feature`), extraFeature));
  }

  return wrapActor({
    id: id(idPrefix),
    name,
    type: 'character',
    img,
    items,
    bar1Attribute: 'hp',
    bar2Attribute: 'stamina',
    system: {
      abilities: computeAbilityValues(primaryAbility, secondaryAbility, level),
      biography,
      attributes: { level: { value: level } },
      details: { race: race.name, class: klass.name, subclass: pickSubclassFlavor(rng, category) },
      hp: { value: RESOURCE_PLACEHOLDER, max: RESOURCE_PLACEHOLDER },
      stamina: { value: RESOURCE_PLACEHOLDER, max: RESOURCE_PLACEHOLDER },
      mana: { value: RESOURCE_PLACEHOLDER, max: RESOURCE_PLACEHOLDER }
    }
  });
}

/**
 * The floor's one boss - built once per floor, before the story graph, so its name can be woven
 * into the climax milestone text (see StoryGenerator.mjs). `archetype` is the boss-band row
 * monster-roster.mjs resolved from data/monsters-manifest.json for this floor's themeCategory.
 * @returns {{ actor: object, name: string, title: string, img: string }}
 */
export function buildBoss(rng, id, theme, tier, archetype) {
  const category = getCategory(theme.themeCategory);
  const name = pickName(rng);
  const title = pickBossTitle(rng, category, { threat: theme.threat });
  const level = clampLevel(tier * 4);

  const actor = buildCharacterActor(rng, id, 'character-boss', {
    name: `${name}, ${title}`,
    img: archetype.img,
    biography: [archetype.biography, `Known to those who've survived this floor as ${name}, ${title}.`].filter(Boolean).join(' '),
    primaryAbility: archetype.primaryAbility,
    secondaryAbility: archetype.secondaryAbility,
    level,
    category,
    wantsCaster: CASTER_SKILLS.has(archetype.combatSkill),
    wantsExtraFeature: true
  });

  return { actor, name, title, img: archetype.img };
}

/**
 * One elite encounter - built fresh per placement (see MonsterGenerator.mjs), so two elites on
 * the same floor are never identical builds. Keeps the archetype's own name/img/biography as its
 * role label - only bosses get a personal name (see file header / CLAUDE.md).
 * @param {string} idPrefix - unique per placement, e.g. `character-elite-${room.id}-${index}`.
 */
export function buildEliteCharacter(rng, id, idPrefix, theme, tier, archetype) {
  const category = getCategory(theme.themeCategory);
  const level = clampLevel(tier * 2);

  return buildCharacterActor(rng, id, idPrefix, {
    name: archetype.name,
    img: archetype.img,
    biography: archetype.biography,
    primaryAbility: archetype.primaryAbility,
    secondaryAbility: archetype.secondaryAbility,
    level,
    category,
    wantsCaster: CASTER_SKILLS.has(archetype.combatSkill)
  });
}

/**
 * A flavor-only friendly NPC - no archetype row (not in monsters-manifest.json at all), race/
 * class picked freely, biography drawn from the floor's own threat via the lexicon. See
 * MonsterGenerator.mjs's placeFriendlyNpcs for placement (entrance/rest-area rooms only).
 * @param {string} idPrefix - unique per placement, e.g. `character-friendly-0`.
 */
export function buildFriendlyNpc(rng, id, idPrefix, theme, tier) {
  const category = getCategory(theme.themeCategory);
  const primaryAbility = rng.pick(ABILITIES);
  const level = clampLevel(tier);

  const actor = buildCharacterActor(rng, id, idPrefix, {
    name: pickName(rng),
    img: FRIENDLY_NPC_IMG,
    biography: pickFriendlyNpcHook(rng, category, { threat: theme.threat }),
    primaryAbility,
    secondaryAbility: null,
    level,
    category,
    wantsCaster: null
  });

  return { actor, name: actor.name, img: FRIENDLY_NPC_IMG };
}
