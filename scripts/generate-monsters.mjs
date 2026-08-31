import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapActor } from './lib/foundry-actor.mjs';
import { wrapItem } from './lib/foundry-item.mjs';
import { loadMonsterRoster } from './lib/monster-roster.mjs';
import { resolveSkill } from './lib/resolve-refs.mjs';
import { stableId } from './lib/stable-id.mjs';
import { toSlug } from './lib/slug.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monstersDir = path.join(__dirname, '../src/packs/monsters');
const dataDir = path.join(__dirname, '../data');

// Rebuild from scratch - same reasoning as every other generate-*.mjs (a monster renamed or
// removed from the manifest shouldn't leave a stale orphaned file behind).
fs.rmSync(monstersDir, { recursive: true, force: true });
fs.mkdirSync(monstersDir, { recursive: true });

// Only minion-band rows become standalone Monsters-compendium actors ("mobs" - easily defeated
// but dangerous in number, flat stat blocks). Elite/boss rows are archetype *inputs* to
// CharacterGenerator.mjs now (see lib/level-gen/CharacterGenerator.mjs, MonsterGenerator.mjs) -
// they no longer produce their own standalone Monster entry, since a full character build
// exists for them per-floor instead.
const roster = loadMonsterRoster(dataDir).filter(m => m.band === 'minion');

const RANGED_SKILLS = new Set(['Shoot', 'Cast', 'Channel']);

/**
 * Every monster gets exactly two embedded Items so it's actually usable in combat, not just a
 * stat block: an "attack" weapon (grants its one combat skill at level = cr, since a monster has
 * no race/class/skill-item stack to draw from the way a PC does) and "Natural Defenses" armor
 * (grants a Block/Dodge at half that level, plus flat damageReduction). Both `equipped: true` -
 * grantedSkills only apply while equipped (see base-actor.mjs's _aggregateSkills), same rule as
 * player gear. Embedded item ids are stableId()'d independently per monster+role, not
 * idFactory-generated - nothing outside this script ever needs to reference them by id.
 */
function buildCombatItems(m) {
  const weaponId = stableId(`npc-item:${toSlug(m.name)}:weapon`);
  const armorId = stableId(`npc-item:${toSlug(m.name)}:armor`);
  const range = RANGED_SKILLS.has(m.combatSkill) ? '60 feet' : 'melee';

  const weapon = wrapItem({
    id: weaponId,
    name: m.attackName,
    type: 'weapon',
    img: m.img,
    system: {
      description: '',
      quantity: 1,
      weight: 0,
      roll: { diceNum: m.combat.diceNum, diceSize: m.combat.diceSize, diceBonus: `+@${m.primaryAbility}.mod+ceil(@lvl/2)` },
      rarity: 'common',
      effort: m.combat.attackEffort,
      range,
      equipped: true,
      grantedSkills: [resolveSkill({ skillName: m.combatSkill, level: m.combat.attackLevel })],
      grantedFeatures: []
    }
  });

  const armor = wrapItem({
    id: armorId,
    name: 'Natural Defenses',
    type: 'armor',
    img: m.img,
    system: {
      description: '',
      quantity: 1,
      weight: 0,
      rarity: 'common',
      effort: 1,
      damageReduction: m.combat.damageReduction,
      equipped: true,
      grantedSkills: [resolveSkill({ skillName: m.combat.defenseSkill, level: m.combat.defenseLevel })]
    }
  });

  return [weapon, armor];
}

console.log('Generating monster actor files...\n');

for (const m of roster) {
  const actor = wrapActor({
    id: m.id,
    name: m.name,
    type: 'npc',
    img: m.img,
    items: buildCombatItems(m),
    system: {
      cr: m.cr,
      health: m.health,
      power: m.power,
      abilities: Object.fromEntries(Object.entries(m.abilities).map(([k, v]) => [k, { value: v }])),
      biography: m.biography
    }
  });

  fs.writeFileSync(path.join(monstersDir, `${m.id}.json`), JSON.stringify(actor, null, 2) + '\n', 'utf8');
  console.log(`✓ Created: ${m.id}.json (${m.name}, CR ${m.cr}, ${m.combatSkill} ${m.combat.attackLevel}, ${m.themeCategory}/${m.band})`);
}

console.log(`\n✓ Successfully generated ${roster.length} monster actor files`);
console.log(`Location: ${monstersDir}`);
