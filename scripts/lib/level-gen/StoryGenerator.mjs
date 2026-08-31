/**
 * Builds a floor's LevelTheme and LevelStoryGraph purely from the narrative lexicon - no
 * manifest-authored prose (see the level generator plan: narrative is fully auto-generated).
 * GeometryGenerator has no idea any of this exists; SceneBuilder/JournalBuilder match each
 * graph node's `requiredRoomRole` against the rooms GeometryGenerator actually produced.
 */
import { pickThemeCategory, getCategory, fillTemplate, pickEncounterHook } from './lexicon.mjs';

// propDensity scales TileGenerator.mjs's prop-tile count per room (props per grid-cell of room
// area, capped at MAX_PROPS_PER_ROOM there) - deeper/denser floors read as more lived-in.
const TIER_CONFIG = {
  1: { roomCountMin: 8, roomCountMax: 10, subStoryCount: 2, subSceneCountMin: 0, subSceneCountMax: 1, secretDoorChance: 0.08, dcBonus: 0, propDensity: 0.05 },
  2: { roomCountMin: 11, roomCountMax: 13, subStoryCount: 2, subSceneCountMin: 0, subSceneCountMax: 1, secretDoorChance: 0.10, dcBonus: 1, propDensity: 0.07 },
  3: { roomCountMin: 14, roomCountMax: 18, subStoryCount: 3, subSceneCountMin: 1, subSceneCountMax: 2, secretDoorChance: 0.13, dcBonus: 2, propDensity: 0.09 },
  4: { roomCountMin: 19, roomCountMax: 23, subStoryCount: 3, subSceneCountMin: 1, subSceneCountMax: 3, secretDoorChance: 0.16, dcBonus: 3, propDensity: 0.11 },
  5: { roomCountMin: 20, roomCountMax: 28, subStoryCount: 4, subSceneCountMin: 2, subSceneCountMax: 4, secretDoorChance: 0.20, dcBonus: 4, propDensity: 0.13 }
};

/** complexityTier wins if set; otherwise derived from floorNumber (~2 floors per tier); default tier 1. */
export function resolveComplexityTier({ complexityTier, floorNumber }) {
  if (complexityTier) return Math.min(5, Math.max(1, complexityTier));
  if (floorNumber) return Math.min(5, Math.max(1, Math.ceil(floorNumber / 2)));
  return 1;
}

export function getTierConfig(tier) {
  return TIER_CONFIG[tier];
}

export function buildTheme(rng, { name, themeCategory: hint }) {
  const themeCategory = pickThemeCategory(rng, hint);
  const category = getCategory(themeCategory);
  const domain = rng.pick(category.domainNouns);
  const adj = rng.pick(category.adjectives);
  // Picked once and reused everywhere via `overrides` below - otherwise every template fill
  // would re-roll {threat} independently and the floor's story would name a different villain
  // in every room.
  const threat = rng.pick(category.threats);
  return {
    name: name || `The ${adj} ${domain}`,
    themeCategory,
    domain,
    adj,
    threat,
    lightColor: category.lightColor,
    torchColor: category.torchColor,
    darknessLevel: category.darknessLevel
  };
}

/**
 * @param {{name: string, title: string}} [boss] - CharacterGenerator.mjs's buildBoss() result,
 * built before this so the climax milestone can name the floor's boss instead of leaving it
 * anonymous. Optional only so callers that pass monsterRoster: [] (disabling auto-population
 * entirely) don't need a boss to build a story graph at all.
 */
export function buildStoryGraph(rng, theme, tierConfig, boss) {
  const category = getCategory(theme.themeCategory);
  const overrides = { domain: theme.domain, adj: theme.adj, threat: theme.threat };
  let counter = 0;
  const nextId = prefix => `${prefix}-${counter++}`;

  // Sample arc templates without replacement (cycling if the pool is smaller than needed) so
  // a floor's own milestones don't coincidentally repeat the exact same sentence.
  const arcTemplatePool = rng.shuffle([...category.arcTemplates]);
  const nextArcTemplate = (() => {
    let i = 0;
    return () => arcTemplatePool[i++ % arcTemplatePool.length];
  })();

  const mainArcText = fillTemplate(rng, category, nextArcTemplate(), overrides);
  const mainArc = { id: nextId('arc'), kind: 'main-arc', text: mainArcText };

  // Main-arc milestones walk entrance -> junction -> boss, each gated on the last.
  const milestoneRoles = ['entrance', 'corridor-junction', 'boss-arena'];
  const milestones = milestoneRoles.map((role, i) => ({
    id: nextId('milestone'),
    kind: 'milestone',
    requiredRoomRole: role,
    text: i === milestoneRoles.length - 1
      ? `This is where the floor's story comes to a head: ${mainArcText}${boss ? ` Its name is ${boss.name}, ${boss.title}.` : ''}`
      : `A sign of the floor's deeper story: ${fillTemplate(rng, category, nextArcTemplate(), overrides)}`,
    dependsOn: []
  }));
  for (let i = 1; i < milestones.length; i++) milestones[i].dependsOn = [milestones[i - 1].id];

  const subStoryCount = tierConfig.subStoryCount;
  const shuffledSubTemplates = rng.shuffle([...category.subStoryTemplates]);
  const subStories = [];
  for (let i = 0; i < subStoryCount; i++) {
    const text = fillTemplate(rng, category, shuffledSubTemplates[i % shuffledSubTemplates.length], overrides);
    subStories.push({ id: nextId('substory'), kind: 'substory', text });
  }
  const subStoryBeats = subStories.map(s => ({
    id: nextId('beat'),
    kind: 'substory-beat',
    requiredRoomRole: rng.pick(['treasure-vault', 'hazard-chamber', 'rest-area']),
    text: s.text,
    dependsOn: [s.id]
  }));

  const clueCount = Math.max(2, subStoryCount + 1);
  const clues = [];
  for (let i = 0; i < clueCount; i++) {
    const text = `A clue toward the floor's deeper story: ${fillTemplate(rng, category, rng.pick(category.arcTemplates), overrides)}`;
    clues.push({ id: nextId('clue'), kind: 'clue', requiredRoomRole: rng.pick(['chamber', 'rest-area', 'corridor-junction']), text, dependsOn: [] });
  }

  const secrets = [{
    id: nextId('secret'),
    kind: 'secret',
    requiredRoomRole: 'secret-vault',
    text: `Hidden here: leverage against ${theme.threat} that the floor's story doesn't want found.`,
    dependsOn: []
  }];

  const encounterCount = Math.max(1, Math.round(subStoryCount * 1.5));
  const encounters = [];
  for (let i = 0; i < encounterCount; i++) {
    encounters.push({
      id: nextId('encounter'),
      kind: 'encounter',
      requiredRoomRole: rng.pick(['hazard-chamber', 'chamber', 'corridor-junction']),
      text: pickEncounterHook(rng),
      dependsOn: []
    });
  }

  return {
    mainArc,
    milestones,
    subStories,
    nodes: [mainArc, ...milestones, ...clues, ...secrets, ...encounters, ...subStoryBeats]
  };
}
