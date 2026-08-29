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
