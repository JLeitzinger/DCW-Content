import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lexicon = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/narrative-lexicon.json'), 'utf8'));

const CATEGORY_KEYS = Object.keys(lexicon.themeCategories);

/** Pick a themeCategory key - an explicit hint if valid, otherwise a random one. */
export function pickThemeCategory(rng, hint) {
  if (hint && lexicon.themeCategories[hint]) return hint;
  return rng.pick(CATEGORY_KEYS);
}

export function getCategory(themeCategory) {
  const category = lexicon.themeCategories[themeCategory];
  if (!category) {
    throw new Error(`Unknown themeCategory "${themeCategory}" - add it to data/narrative-lexicon.json first.`);
  }
  return category;
}

/** Fill {slot} placeholders in a template string from a category's word banks + explicit overrides. */
export function fillTemplate(rng, category, template, overrides = {}) {
  return template.replace(/\{(\w+)\}/g, (_, slot) => {
    if (slot in overrides) return overrides[slot];
    if (slot === 'domain') return rng.pick(category.domainNouns);
    if (slot === 'adj') return rng.pick(category.adjectives);
    if (slot === 'threat') return rng.pick(category.threats);
    return `{${slot}}`;
  });
}

export function pickRoomText(rng, category, themeCategory, role, overrides = {}) {
  const templates = lexicon.roomRoleTemplates[role] || lexicon.roomRoleTemplates.chamber;
  return fillTemplate(rng, category, rng.pick(templates), overrides);
}

export function pickHazard(rng, tierDcBonus = 0) {
  const preset = rng.pick(lexicon.hazardTemplates);
  const dc = preset.dcBase + tierDcBonus;
  return preset.text.replace(/\{dc\}/g, String(dc));
}

export function pickEncounterHook(rng) {
  return rng.pick(lexicon.encounterTemplates);
}

/** A tone-neutral full name for a generated character - race/theme already carry flavor elsewhere. */
export function pickName(rng) {
  return rng.pick(lexicon.names);
}

/**
 * One recurring minor named character/creature for the floor - picked once (like {threat}) and
 * threaded through room dressing/side quests via the {cast} slot, so a floor's small-scale color
 * keeps naming the same person/creature instead of a new one in every room.
 */
export function pickCastMember(rng, category, overrides = {}) {
  const name = pickName(rng);
  const blurb = fillTemplate(rng, category, rng.pick(category.castTemplates), { ...overrides, name });
  return { name, blurb };
}

/** A trivial, low-stakes side quest hook - explicitly optional color, distinct from the main arc/substories. */
export function pickSideQuest(rng, category, overrides = {}) {
  return fillTemplate(rng, category, rng.pick(category.sideQuestTemplates), overrides);
}

/** A no-mechanical-weight detail/color beat for a room that otherwise has nothing going on. */
export function pickBreatherDetail(rng, category, overrides = {}) {
  return fillTemplate(rng, category, rng.pick(category.breatherTemplates), overrides);
}

/** An extra sensory/texture sentence to vary a room's read-aloud text beyond its role template. */
export function pickRoomDetail(rng, category, overrides = {}) {
  return fillTemplate(rng, category, rng.pick(category.detailTemplates), overrides);
}

/** {leverage, payoff} - what a floor's secret actually is, and the concrete non-combat option it buys against the boss. */
export function pickSecretPayload(rng, category, overrides = {}) {
  const preset = rng.pick(category.secretPayloads);
  return {
    leverage: fillTemplate(rng, category, preset.leverage, overrides),
    payoff: fillTemplate(rng, category, preset.payoff, overrides)
  };
}

/** A ready "say if asked" line for the DM/AI to voice when a player asks an obvious question. */
export function pickPromptedFlavor(rng, category, overrides = {}) {
  return fillTemplate(rng, category, rng.pick(category.promptedFlavorTemplates), overrides);
}

/** A {threat}-templated title for a floor's boss, e.g. "Warlord of the Alchemist's Guild". */
export function pickBossTitle(rng, category, overrides = {}) {
  return fillTemplate(rng, category, rng.pick(category.bossTitles), overrides);
}

/** A {threat}-templated biography hook for a friendly NPC, tying them to the floor's threat. */
export function pickFriendlyNpcHook(rng, category, overrides = {}) {
  return fillTemplate(rng, category, rng.pick(category.friendlyNpcHooks), overrides);
}
