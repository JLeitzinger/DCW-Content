import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toSlug } from './slug.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
}

/**
 * Resolve a manifest entry's own `_id`: an explicit `id` override (used to preserve an
 * existing id that's referenced elsewhere - see the migration script), or a fresh slug
 * from its name for anything new. NOT used for skills - skills keep their long-standing
 * "exact name as id" scheme unconditionally (see resolveSkill below).
 */
export function resolveEntryId(entry) {
  return entry.id || toSlug(entry.name);
}

let skillsByName = null;
function getSkillsByName() {
  if (!skillsByName) {
    const manifest = loadJson('skills-manifest.json');
    skillsByName = new Map();
    for (const category of Object.values(manifest.skills)) {
      for (const skill of category) skillsByName.set(skill.name, skill);
    }
  }
  return skillsByName;
}

let featuresByName = null;
function getFeaturesByName() {
  if (!featuresByName) {
    const manifest = loadJson('features-manifest.json');
    featuresByName = new Map();
    for (const feature of manifest.features) featuresByName.set(feature.name, feature);
  }
  return featuresByName;
}

/**
 * {skillName, level} -> {skillUuid, level}. Throws on an unknown skill name rather than
 * letting a hand-typed (or AI-hallucinated) UUID silently reach the compendium.
 */
export function resolveSkill({ skillName, level }) {
  const skills = getSkillsByName();
  if (!skills.has(skillName)) {
    throw new Error(`Unknown skill "${skillName}" - add it to data/skills-manifest.json first.`);
  }
  // Skills use the exact name as their id (see generate-skills.mjs) - not the slug scheme.
  return { skillUuid: `Compendium.dcw-content.skills.Item.${skillName}`, level };
}

/** {featureName, level} -> {featureUuid, level}. Throws on an unknown feature name. */
export function resolveFeature({ featureName, level }) {
  const features = getFeaturesByName();
  if (!features.has(featureName)) {
    throw new Error(`Unknown feature "${featureName}" - add it to data/features-manifest.json first.`);
  }
  const feature = features.get(featureName);
  return { featureUuid: `Compendium.dcw-content.features.Item.${resolveEntryId(feature)}`, level };
}
