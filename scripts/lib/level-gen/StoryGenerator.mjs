/**
 * Builds a floor's LevelTheme and LevelStoryGraph purely from the narrative lexicon - no
 * manifest-authored prose (see the level generator plan: narrative is fully auto-generated).
 * GeometryGenerator has no idea any of this exists; SceneBuilder/JournalBuilder match each
 * graph node's `requiredRoomRole` against the rooms GeometryGenerator actually produced.
 */
import { pickThemeCategory, getCategory, fillTemplate, pickEncounterHook, pickCastMember, pickSecretPayload, pickPromptedFlavor } from './lexicon.mjs';

// propDensity scales TileGenerator.mjs's prop-tile count per room (props per grid-cell of room
// area, capped at MAX_PROPS_PER_ROOM there) - deeper/denser floors read as more lived-in.
// sideQuestCount scales the number of trivial/silly optional side quests (see buildStoryGraph) -
// these are explicitly low-stakes color, not gated progression, so they scale with room count
// (more rooms to seed them into) rather than with difficulty.
const TIER_CONFIG = {
  1: { roomCountMin: 8, roomCountMax: 10, subStoryCount: 2, sideQuestCount: 3, subSceneCountMin: 0, subSceneCountMax: 1, secretDoorChance: 0.08, dcBonus: 0, propDensity: 0.05 },
  2: { roomCountMin: 11, roomCountMax: 13, subStoryCount: 2, sideQuestCount: 4, subSceneCountMin: 0, subSceneCountMax: 1, secretDoorChance: 0.10, dcBonus: 1, propDensity: 0.07 },
  3: { roomCountMin: 14, roomCountMax: 18, subStoryCount: 3, sideQuestCount: 5, subSceneCountMin: 1, subSceneCountMax: 2, secretDoorChance: 0.13, dcBonus: 2, propDensity: 0.09 },
  4: { roomCountMin: 19, roomCountMax: 23, subStoryCount: 3, sideQuestCount: 6, subSceneCountMin: 1, subSceneCountMax: 3, secretDoorChance: 0.16, dcBonus: 3, propDensity: 0.11 },
  5: { roomCountMin: 20, roomCountMax: 28, subStoryCount: 4, sideQuestCount: 8, subSceneCountMin: 2, subSceneCountMax: 4, secretDoorChance: 0.20, dcBonus: 4, propDensity: 0.13 }
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
  // Also picked once and reused everywhere, same reasoning as {threat} - a floor's small-scale
  // color (side quests, breather-room dressing, "say if asked" lines) should keep naming the
  // same recurring minor character/creature rather than a new one per room.
  const cast = pickCastMember(rng, category, { threat });
  return {
    name: name || `The ${adj} ${domain}`,
    themeCategory,
    domain,
    adj,
    threat,
    cast,
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
  const overrides = { domain: theme.domain, adj: theme.adj, threat: theme.threat, cast: theme.cast.name };
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
      ? `This is where the floor's story comes to a head: ${mainArcText}${boss ? ` Its name is ${boss.name}, ${boss.title}.` : ''} The stairs down to the next floor are here too - finding them means going through whatever's guarding this room first.`
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

  // The secret now carries a concrete non-combat payoff, not just flavor text - JournalBuilder
  // surfaces `payoffText` specifically in the Boss Arena room's GM notes (wherever the secret
  // node itself gets placed), so investigating it buys the party an actual tactical option.
  const secretPayload = pickSecretPayload(rng, category, overrides);
  const secrets = [{
    id: nextId('secret'),
    kind: 'secret',
    requiredRoomRole: 'secret-vault',
    text: `Hidden here: ${secretPayload.leverage}`,
    payoffText: secretPayload.payoff,
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

  // One physical introduction for the floor's recurring minor named character/creature (see
  // theme.cast) - gives the DM/AI a specific room to actually meet them in, before side quests
  // and flavor lines start name-dropping them elsewhere.
  const castIntro = {
    id: nextId('cast-intro'),
    kind: 'cast-intro',
    requiredRoomRole: rng.pick(['chamber', 'rest-area', 'corridor-junction', 'hazard-chamber']),
    text: theme.cast.blurb,
    dependsOn: []
  };

  // Trivial/silly, explicitly optional color - distinct from the main arc/substories, which are
  // the floor's real progression. Seeded preferentially into the room roles most likely to
  // otherwise end up as an empty "breather room" in JournalBuilder.
  const shuffledSideQuests = rng.shuffle([...category.sideQuestTemplates]);
  const sideQuests = [];
  for (let i = 0; i < tierConfig.sideQuestCount; i++) {
    const text = fillTemplate(rng, category, shuffledSideQuests[i % shuffledSideQuests.length], overrides);
    sideQuests.push({
      id: nextId('sidequest'),
      kind: 'sidequest',
      requiredRoomRole: rng.pick(['chamber', 'rest-area', 'corridor-junction', 'hazard-chamber', 'treasure-vault']),
      text,
      dependsOn: []
    });
  }

  // Ready "say if asked" lines for the DM/AI to voice verbatim when a player asks an obvious
  // question - distinct from the room's read-aloud text (always shown) and from the rest of the
  // GM-only notes (strategy, not dialogue).
  const flavorPrompts = [];
  for (let i = 0; i < 2; i++) {
    flavorPrompts.push({
      id: nextId('flavor'),
      kind: 'flavor-prompt',
      requiredRoomRole: rng.pick(['chamber', 'rest-area', 'corridor-junction', 'hazard-chamber']),
      text: pickPromptedFlavor(rng, category, overrides),
      dependsOn: []
    });
  }

  return {
    mainArc,
    milestones,
    subStories,
    nodes: [mainArc, ...milestones, ...clues, ...secrets, ...encounters, ...subStoryBeats, castIntro, ...sideQuests, ...flavorPrompts]
  };
}
