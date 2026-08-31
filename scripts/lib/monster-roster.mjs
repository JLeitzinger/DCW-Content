/**
 * Shared loader for data/monsters-manifest.json - resolves each lean manifest entry (name, img,
 * themeCategory, band, tier, primary/secondaryAbility, biography) into the full stat block
 * dccworldNPC's schema needs (health, power, abilities) plus a stable compendium Actor id.
 * generate-monsters.mjs (builds the Monsters compendium) and MonsterGenerator.mjs (picks
 * candidates while placing floor tokens) both import this, so the CR/stat formula and id scheme
 * only exist in one place and can never drift between the two.
 *
 * Only `band: 'minion'` rows actually become Monster compendium actors (mobs - see
 * generate-monsters.mjs's filter) using the CR-formula stat block this file computes. `elite`/
 * `boss` rows are still resolved here the same way, but are consumed as *archetype* input
 * (img/themeCategory/primaryAbility/combatSkill/biography only - not the CR/stat-block fields
 * below) by CharacterGenerator.mjs, which builds them a real race+class+gear+spell dccworldCharacter
 * instead. See MonsterGenerator.mjs and DCW-Content/CLAUDE.md's Character section.
 *
 * CR/stat formula (documented here since nothing else derives it): cr = round(tier *
 * bandMultiplier) where minion=1, elite=1.8, boss=3 - e.g. a tier-3 elite is CR 5. health.max =
 * 8 + cr*6, power.max = 4 + cr*3. Ability scores start at 10 flat; primaryAbility becomes
 * 10+cr, secondaryAbility (if set) becomes 10+ceil(cr/2). This mirrors dccworldNPC.xp = cr*cr*100
 * already being cr-driven (see actor-npc.mjs) - CR is this roster's single difficulty knob.
 *
 * Combat capability (computeCombat) is derived the same way, not hand-authored: a monster is
 * otherwise just a stat block with nothing to actually roll in combat (dccworldActorBase only
 * aggregates skills from OWNED items - see base-actor.mjs's _aggregateSkills - and an Actor with
 * an empty `items` array has none). generate-monsters.mjs turns this into two embedded Items
 * per monster (an "attack" weapon and a "Natural Defenses" armor, both `equipped: true` so their
 * grantedSkills actually apply) - see that file for the embedding, this file only computes the
 * numbers: attack skill level = cr (so CR IS the monster's attack proficiency, since a monster
 * has only this one skill source, unlike a PC who stacks race+class+gear); damage dice scale by
 * tier (d6/d8/d10); defense skill level = ceil(cr/2); damageReduction = round(cr/4), clamped
 * 1-6. Defense skill is Block if con is this monster's primary or secondary ability, else Dodge.
 *
 * Room-role affinity is band-driven, not hand-authored per monster (36 entries is already a lot
 * of fields to keep in sync) - see BAND_ROOM_ROLES. 'entrance' and 'rest-area' are deliberately
 * absent from every band: those are the floor's designated safe rooms (see SceneBuilder.mjs/
 * MonsterGenerator.mjs), never populated.
 */
import fs from 'fs';
import path from 'path';
import { stableId } from './stable-id.mjs';
import { toSlug } from './slug.mjs';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const BANDS = ['minion', 'elite', 'boss'];

export const BAND_ROOM_ROLES = {
  minion: ['chamber', 'corridor-junction', 'treasure-vault'],
  elite: ['hazard-chamber', 'secret-vault', 'corridor-junction', 'treasure-vault'],
  boss: ['boss-arena']
};

const BAND_MULTIPLIER = { minion: 1, elite: 1.8, boss: 3 };

export function monsterActorId(name) {
  return stableId(`npc:${toSlug(name)}`);
}

export function computeStats(band, tier) {
  const cr = Math.max(1, Math.round(tier * BAND_MULTIPLIER[band]));
  return {
    cr,
    health: { value: 8 + cr * 6, max: 8 + cr * 6 },
    power: { value: 4 + cr * 3, max: 4 + cr * 3 }
  };
}

export function computeAbilities(primaryAbility, secondaryAbility, cr) {
  const abilities = Object.fromEntries(ABILITIES.map(a => [a, 10]));
  abilities[primaryAbility] = 10 + cr;
  if (secondaryAbility) abilities[secondaryAbility] = 10 + Math.ceil(cr / 2);
  return abilities;
}

export function computeCombat(tier, cr, primaryAbility, secondaryAbility) {
  const diceSize = tier <= 2 ? 'd6' : tier <= 4 ? 'd8' : 'd10';
  const isConTanky = primaryAbility === 'con' || secondaryAbility === 'con';
  return {
    diceNum: 1,
    diceSize,
    attackLevel: cr,
    attackEffort: cr >= 10 ? 2 : 1,
    defenseSkill: isConTanky ? 'Block' : 'Dodge',
    defenseLevel: Math.max(1, Math.ceil(cr / 2)),
    damageReduction: Math.min(6, Math.max(1, Math.round(cr / 4)))
  };
}

/** @returns {Array} resolved monster entries - see file header for shape. */
export function loadMonsterRoster(dataDir) {
  const manifestPath = path.join(dataDir, 'monsters-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  return manifest.monsters.map(m => {
    const { cr, health, power } = computeStats(m.band, m.tier);
    return {
      id: monsterActorId(m.name),
      name: m.name,
      img: m.img,
      themeCategory: m.themeCategory,
      band: m.band,
      tier: m.tier,
      roles: BAND_ROOM_ROLES[m.band],
      cr,
      health,
      power,
      abilities: computeAbilities(m.primaryAbility, m.secondaryAbility, cr),
      primaryAbility: m.primaryAbility,
      secondaryAbility: m.secondaryAbility || null,
      biography: m.biography || '',
      combatSkill: m.combatSkill,
      attackName: m.attackName,
      combat: computeCombat(m.tier, cr, m.primaryAbility, m.secondaryAbility)
    };
  });
}
