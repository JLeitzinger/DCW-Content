# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working on content for the Dungeon Crawler World system.

## Repository Overview

This is a **Foundry VTT module** that provides all compendium content for the Dungeon Crawler World game system. It contains:
- 20 character classes
- 10 character races
- 54 features and abilities
- Weapons (armor/gear is defined but not yet populated - see the **Item** Items section)
- 23 skills across 4 categories
- 57 spells

This repository includes both the **source JSON files** and **build tools** to generate LevelDB compendium packs.

## Development Workflow

### Quick Reference

```bash
# Generate content from manifests (every type is manifest-driven - see
# data/<type>-manifest.json - and edited there, not by hand-writing src/packs/ JSON)
npm run generate:races
npm run generate:classes
npm run generate:items
npm run generate:weapons
npm run generate:features
npm run generate:skills
npm run generate:spells
npm run generate          # all of the above, in one shot

# Check the generated content against the real schema, cross-references, and the
# design-budget rules below (npm run pack also runs this first and aborts on failure)
npm run validate
npm run validate -- --type=races   # scope to one type

# Pack individual compendium
npm run pack:skills
npm run pack:classes
npm run pack:races
npm run pack:items
npm run pack:features
npm run pack:spells

# Pack all compendia (runs validate first)
npm run pack

# Build release package
npm run build:release
```

### Testing Changes

To test content changes in Foundry:
1. Edit the relevant `data/<type>-manifest.json` (not `src/packs/` directly - that's generated output, see `## Creating New Content` below)
2. Run the matching `npm run generate:<type>` command
3. Run `npm run pack` (or the appropriate `pack:<type>`) - `npm run pack` validates first and aborts if anything's wrong
4. Restart Foundry or reload the world
5. Verify changes in the compendium

Alternatively, symlink this directory to your Foundry modules folder for live development.

---

## Item Type Design Guidelines

When creating new items, follow these requirements and best practices for each item type:

### **Race** Items
Races define hereditary characteristics and base abilities. Authored in `data/races-manifest.json`, one entry per race (`grantedSkills`/`grantedFeatures` reference by human-readable `skillName`/`featureName` there, not raw UUIDs - `npm run generate:races` resolves those and stamps out `src/packs/races/*.json`).

**Required Fields (mirrors `item-race.mjs` exactly - `npm run validate` enforces this):**
- `abilityBonuses` - Object with stat bonuses (e.g., `{str: 2, dex: 1}`)
- `bonuses.hp` / `bonuses.stamina` / `bonuses.mana` - Resource bonuses (numbers, can be 0)
- `size` - One of `"tiny"`, `"small"`, `"medium"`, `"large"`, `"huge"`, `"gargantuan"`
- `speed` - Number: base movement speed in feet
- `senses` - **Object** of four numbers: `{darkvision, blindsight, tremorsense, truesight}` (all in feet, 0 = no sense). Not an array - a handful of races had this wrong for a while (stored as an array of sense names) and the value was silently discarded by Foundry as a result; `npm run validate` now catches this.
- `languages` - String, e.g. `"Common, Elvish"` (comma-separated, free text)

**Ability Score Rules:**
- **Total ability bonuses must equal exactly 3**
- Can distribute as: +3 to one stat, +2/+1 to two stats, or +1/+1/+1 to three stats
- No stat can exceed +3 bonus

**Skill Requirements:**
- **Must have exactly 2 skills from general or utility categories**
- **Must have exactly 1 skill from magic or combat categories**
- Recommended skill levels: 1-2

**Not a real field:** `traits` (freeform flavor-text array) shows up in some older content but `item-race.mjs` never defined it - Foundry silently drops it on load. If a race needs a mechanical racial trait, make it a real **Feature** item and reference it via `grantedFeatures` instead (see High Elf for the pattern); if it's just flavor text, fold it into `description`.

**Example: Human** (`data/races-manifest.json` entry)
```json
{
  "name": "Human",
  "description": "Adaptable and ambitious, humans settle everywhere.",
  "abilityBonuses": {"str": 1, "dex": 1, "con": 1, "int": 0, "wis": 0, "cha": 0},
  "bonuses": {"hp": 0, "stamina": 0, "mana": 0},
  "size": "medium",
  "speed": 30,
  "senses": {"darkvision": 0, "blindsight": 0, "tremorsense": 0, "truesight": 0},
  "languages": "Common",
  "grantedSkills": [
    {"skillName": "Diplomacy", "level": 1},
    {"skillName": "Lore", "level": 1},
    {"skillName": "Slash", "level": 1}
  ]
}
```

---

### **Class** Items
Classes define profession-based abilities, resource scaling, stat boosts, skills, and features. Authored in `data/classes-manifest.json` (same `skillName`/`featureName`-reference pattern as races - see above).

**Required Fields:**
- `baseHP` - Base hit points at level 1 (typically 8-12)
- `hpPerLevel` - HP gained per level (formula: stat modifier + value, typically 2-4)
- `staminaPerLevel` - Stamina gained per level (typically 1-3)
- `manaPerLevel` - Mana gained per level (typically 1-3)
- `abilityBonuses` - Stat boosts per level (e.g., `{str: 0.5, con: 0.5}`)
- `levelAcquired` - Level when class was acquired (default: 1, used for multiclassing)

**Stat Boost Mechanics:**
Classes grant ongoing stat boosts that scale with level. The stat boost calculation is:
```
Stat Boost = (current_level - (level_acquired - 1)) × abilityBonuses[stat]
```

**Example:** If a Fighter with `{str: 0.5, con: 0.5}` is acquired at level 3, and the character is now level 7:
- STR boost = (7 - (3 - 1)) × 0.5 = (7 - 2) × 0.5 = 5 × 0.5 = 2.5 → 2 (rounded down)
- CON boost = (7 - 2) × 0.5 = 2.5 → 2

**Ability Bonus Guidelines:**
- Total ability bonuses should equal 0.5 to 1.5 per level
- Martial classes: 0.5-1.0 total (focused on STR/DEX/CON)
- Magic classes: 0.5-1.0 total (focused on INT/WIS/CHA)
- Hybrid classes: 1.0-1.5 total (split across multiple stats)
- Single stat focus: 1.0 per level max
- Two stat focus: 0.5 each (most common)
- Three stat focus: 0.33 each (rare, for versatile classes)

**Skill Requirements:**
- **Must have 3-5 skills from appropriate category for the class**
  - Martial classes: combat + utility skills
  - Magic classes: magic + general/utility skills
  - Rogue classes: utility + combat skills
- Recommended skill levels: 1-3

**Feature Requirements:**
- **Classes should grant 1-3 features at creation**
- Features define special abilities, class mechanics, or passive bonuses
- Use existing features from the compendium or create new ones in `data/features-manifest.json` first
- Referenced by `featureName` in the manifest (resolved to a UUID at generation time - see the **Feature** Items section)

**Other fields (all required, mirrors `item-class.mjs`):**
- `saves` - **Object** of six booleans, one per ability (`{str: true, con: true, dex: false, ...}`) - not the `saveProficiency` array some older docs/examples showed; the real schema is boolean flags.
- `hitDie` - One of `"d6"`, `"d8"`, `"d10"`, `"d12"`
- `primaryAbility` / `secondaryAbility` - Ability abbreviations; `secondaryAbility` can be `""`

**Example: Fighter** (`data/classes-manifest.json` entry)
```json
{
  "name": "Fighter",
  "description": "A master of martial combat.",
  "baseHP": 10,
  "hpPerLevel": 4,
  "staminaPerLevel": 2,
  "manaPerLevel": 1,
  "abilityBonuses": {"str": 0.5, "con": 0.5, "dex": 0, "int": 0, "wis": 0, "cha": 0},
  "levelAcquired": 1,
  "saves": {"str": true, "con": true, "dex": false, "int": false, "wis": false, "cha": false},
  "hitDie": "d10",
  "primaryAbility": "str",
  "secondaryAbility": "",
  "grantedSkills": [
    {"skillName": "Slash", "level": 2},
    {"skillName": "Block", "level": 2},
    {"skillName": "Dodge", "level": 2},
    {"skillName": "Athletics", "level": 1}
  ],
  "grantedFeatures": [
    {"featureName": "Second Wind", "level": 1},
    {"featureName": "Action Surge", "level": 1}
  ]
}
```

---

### **Weapon** Items
Authored in `data/weapons-manifest.json` (`npm run generate:weapons` → `src/packs/weapons/`). Weapon ids are always the clean slug scheme (`<rarity>-<name>`, e.g. `common-longsword`) - nothing else references a weapon's own id, so there's no need to pin one by hand.

**Required Fields (mirrors `item-weapon.mjs`):**
- `quantity` - Number of items (default: 1)
- `weight` - Weight in pounds (number)
- `rarity` - One of `"common"`, `"uncommon"`, `"rare"`, `"legendary"`, `"mythic"`, `"celestial"`. This drives lootbox odds (see **Lootbox** Items below) - an item left at the default `common` will show up in every lootbox tier's low end, so set it deliberately for anything meant to feel special.
- `roll.diceNum` - Number of dice (typically 1)
- `roll.diceSize` - Die size ("d4", "d6", "d8", "d10", "d12")
- `roll.diceBonus` - Bonus to damage (formula like "+@str.mod+ceil(@lvl/2)")
- `effort` - Stamina cost per combat-skill roll (0+)
- `range` - `"melee"` or a distance string (e.g. `"melee / 20 feet"` for a thrown weapon)
- **Should grant 1-2 relevant combat skills** at level 1-2
- **Higher quality/masterwork items can grant skill +2 or +3**, and higher rarities can add `grantedFeatures` (referenced by `featureName`, same as classes/races)

**Example: Longsword** (`data/weapons-manifest.json` entry)
```json
{
  "name": "Longsword",
  "description": "A versatile straight blade.",
  "quantity": 1,
  "weight": 3,
  "rarity": "common",
  "effort": 1,
  "range": "melee",
  "roll": {"diceNum": 1, "diceSize": "d8", "diceBonus": "+@str.mod+ceil(@lvl/2)"},
  "grantedSkills": [
    {"skillName": "Slash", "level": 1}
  ]
}
```

---

### **Armor** Items
Armor and shields - its own type (`"armor"`), separate from generic gear, because it needs the same equip-gating and stamina-cost machinery as weapons. Authored in `data/armor-manifest.json` (`npm run generate:armor` → `src/packs/armor/`). Ids follow the same clean slug scheme as weapons (`<rarity>-<name>`) - nothing references an armor item's own id.

**Required Fields (mirrors `item-armor.mjs`):**
- `quantity` - Number of items (default: 1)
- `weight` - Weight in pounds (number)
- `rarity` - Same choices/lootbox behavior as weapons (see above)
- `effort` - Stamina cost per Block/Dodge roll (0+). Same role as a weapon's `effort`: `Actor#rollSkill` sums `effort` across all equipped weapons/armor that grant the skill being rolled, then multiplies by the level rolled at.
- `damageReduction` - Flat damage subtracted from any hit while this armor is equipped (`Actor#applyDamage`). Applies passively - it doesn't matter whether the wearer actually rolled Block, rolled Dodge, or rolled nothing that turn.
- **Should grant exactly 1 combat skill** - `"Block"` (heavier armor and shields; con-based) or `"Dodge"` (lighter armor; dex-based). These replaced the old single `"Defend"` skill.
- Skills/luck (`grantedSkills`, `luckBonus`) only apply while `equipped` is true, exactly like weapons - a character must actively equip armor from their sheet for it to do anything.

**Design guidance for effort/damageReduction:** heavier, more protective pieces should cost more stamina to actively defend with but reduce more damage passively - a piece that's cheap to use should be correspondingly weak on both axes. Roughly: light armor ≈ 1 effort / 1 DR, medium ≈ 2 effort / 3 DR, heavy ≈ 3 effort / 5 DR, a dedicated tower shield can push higher on both (e.g. 5 effort / 6 DR) since it's a build-defining choice rather than default gear.

**Example: Chainmail**
```json
{
  "name": "Chainmail",
  "description": "Interlocking steel rings, heavy but dependable against a glancing blow.",
  "quantity": 1,
  "weight": 40,
  "rarity": "uncommon",
  "effort": 2,
  "damageReduction": 3,
  "grantedSkills": [
    {"skillName": "Block", "level": 2}
  ]
}
```

---

### **Item** (Gear/Consumables) Items
Everything of type `"item"` that isn't a weapon or armor: tools, torches, and consumables (potions, bandages). Authored in `data/items-manifest.json` (`npm run generate:items`).

**Required Fields (mirrors `item-item.mjs`):**
- `quantity` - Number of items (default: 1)
- `weight` - Weight in pounds (number)
- `rarity` - Same choices/lootbox behavior as weapons (see above)
- `grantedSkills` - Optional, same `{skillName, level}` shape as every other type

**Known gap:** `item-item.mjs` has no `equipped` field, and skill grants from a type-`"item"` document apply unconditionally (not gated by being equipped, the way a weapon's or armor's are). So this type is only appropriate for gear whose bonus should apply just by being owned (e.g. Torch granting a Survival bonus) - anything that should require actively equipping/wielding belongs in the **Armor** or **Weapon** type instead.

**Consumables (potions, bandages):** set `consumable: true` and the sheet gets a "use" button (see `Dungeon-Crawler-World/module/documents/actor.mjs`'s `Actor#useItem`) that restores a resource and consumes one from `quantity` (deleting the item at 0).

- `consumable` - boolean, required to get the "use" button at all.
- `restoreResource` - `"hp"`, `"stamina"`, or `"mana"`. Required (and non-blank) when `consumable` is true.
- `restoreAmount` - How much of `restoreResource` it restores on use (clamped to max). Required to be `> 0` when `consumable` is true.
- `regenBoostAmount` / `regenBoostUses` - Optional "+N to `restoreResource`'s regen roll for the next X Regen clicks" effect. **Must be set together or not at all** (`npm run validate` enforces this) - `regenBoostUses > 0` is what makes an item "a potion" rather than a mundane consumable like Bandages, which restore HP with no regen boost.
- **Potions specifically** (anything with `regenBoostUses > 0`) have an implicit cooldown: drinking one while still on cooldown from the last potion still restores/boosts as normal, but also applies the Poisoned status effect (see `Dungeon-Crawler-World/Rules/Status Effects/Poisoned.md`). The cooldown clears on the character's next Regen click - there's no round tracker in this system to hook a literal "1 round" to, so "since your last Regen" stands in for it. This is entirely handled system-side; nothing extra to set in content for it beyond `regenBoostUses > 0`.

**Example: Stamina Potion**
```json
{
  "name": "Stamina Potion",
  "description": "A fizzing brew that restores vigor and quickens recovery.",
  "quantity": 1,
  "weight": 0.5,
  "rarity": "common",
  "consumable": true,
  "restoreResource": "stamina",
  "restoreAmount": 10,
  "regenBoostAmount": 2,
  "regenBoostUses": 3
}
```

**Example: Bandages** (mundane consumable - restores HP, no regen boost, no cooldown)
```json
{
  "name": "Bandages",
  "description": "Clean cloth wrappings for a field dressing.",
  "quantity": 1,
  "weight": 0.5,
  "rarity": "common",
  "consumable": true,
  "restoreResource": "hp",
  "restoreAmount": 5
}
```

---

### **Lootbox** Items
Sealed containers that pull a random item from the **Item** and **Weapon** compendiums when opened - see `Dungeon-Crawler-World/Rules/Loot/Lootboxes.md` for the full mechanic and odds table. There's no separate loot-table content to author here; the item and weapon compendiums (with their `rarity` fields) are the loot table, so keeping rarity set correctly on those two types is what actually matters for lootboxes to feel right.

**Required Fields:**
- `tier` - One of `"bronze"`, `"silver"`, `"gold"`, `"platinum"`, `"legendary"`, `"celestial"` (default: `"bronze"`)
- `quantity` - Number of boxes (default: 1)

**Example: Gold Lootbox**
```json
{
  "type": "lootbox",
  "description": "A gilded chest, humming faintly.",
  "system": {
    "tier": "gold",
    "quantity": 1
  }
}
```

There's no lootbox content in this repo yet - this section documents the type so it's ready whenever lootbox items get added (a `lootboxes` pack would need to be registered in `module.json` at that point, following the same pattern as `items`/`weapons`).

---

### **God** Items
Deities a character can worship, dragged onto the character sheet's Worship tab - see `Dungeon-Crawler-World/Rules/Worship.md`. Only `description`, `grantedSkills`, and `luckBonus` do anything right now (same shape as any other item's - see **Skill Guidelines** patterns below). Full feature-granting (like race/class) is planned but not built yet, so don't add a `grantedFeatures` field to god content until the system supports it.

**Example: A minor god of the hunt**
```json
{
  "type": "god",
  "description": "A quiet god of the hunt, worshipped by rangers and trackers.",
  "system": {
    "grantedSkills": [
      {"skillUuid": "Compendium.dcw-content.skills.Item.Survival", "level": 1}
    ],
    "luckBonus": 1
  }
}
```

There's no god content in this repo yet - this section documents the type so it's ready whenever pantheon content gets added (a `gods` pack would need to be registered in `module.json` at that point, following the same pattern as `items`/`weapons`).

---

### **Achievement** Items
GM-authored recognitions handed out via the "Grant Achievement" macro that ships with the system - see `Dungeon-Crawler-World/Rules/Achievements.md`. **Not compendium content** - unlike every other type in this file, achievements are campaign-specific homebrew, so they're authored directly as world Items (Items directory) rather than in a DCW-Content pack. Nothing to build here; this section just documents the fields for reference.

**Fields:**
- `description` - What the achievement is for.
- `rewardUuid` - UUID of an Item to auto-grant to each recipient (usually a lootbox). Blank = purely informational.
- `rewardQuantity` - How many of the reward to grant (only meaningful for stackable rewards like lootboxes).

---

### **Feature** Items
Abilities, feats, and special powers. Authored in `data/features-manifest.json` (`npm run generate:features` → `src/packs/features/`). Referenced elsewhere (races/classes/weapons) by `featureName`.

**Skill Guidelines:**
- **Should grant 0-2 skills** relevant to the feature
- Combat features → combat skill
- Magic features → magic skill
- Skill feats → specific skill at level 1-2

**Example: Power Attack** (`data/features-manifest.json` entry)
```json
{
  "name": "Power Attack",
  "description": "Sacrifice accuracy for damage.",
  "grantedSkills": [
    {"skillName": "Slash", "level": 1}
  ]
}
```

---

### **Spell** Items
Magical spells and rituals.

**Required Fields:**
- `spellLevel` - 1-15 (no cantrips; all spells are leveled)
- `diceCount` - Number of dice for the spell (all spells start at 1, may increase for powerful spells)
- `castStat` - Related stat: "int" (arcane magic) or "wis" (divine magic)
- `prowess` - Mana cost (formula: `spellLevel + ceil(spellLevel / 3)`)
- `category` - Spell school/category (see categories below)
- `castingTime` - Time to cast: "instantaneous" or a number of rounds (e.g., "1 round", "2 rounds")
- `range` - Spell range: "self", "touch", or distance in feet (e.g., "30 feet", "60 feet", "120 feet")
- `duration` - How long spell lasts: "instantaneous", or time duration (e.g., "1 minute", "10 minutes", "1 hour", "concentration")
- `description` - HTML description of what the spell does and how it scales at higher dice counts (3, 6, 9, 12, 15)

**Offensive spells** have their own damage roll, separate from the cast roll:
- `offensive` - boolean, true for damage-dealing spells (Evocation spells are the obvious candidates). Defaults to `false`.
- `roll.diceNum` / `roll.diceSize` / `roll.diceBonus` - damage formula fields, same shape as a weapon's (see the **Weapon** Items section above). `diceBonus` should reference the spell's own `castStat`, e.g. `+@int.mod`. Only meaningful when `offensive` is `true`; defaults to `{diceNum: 1, diceSize: "d6", diceBonus: ""}` otherwise.
- Set both directly in the spell's `data/spells-manifest.json` entry - `npm run generate:spells` emits them as-is, no manual per-item editing needed.

**Spell Scaling Rules:**
- **Spell Level**: Ranges from 1-15
- **Dice Count**: All spells start at `diceCount: 1`. Higher-level or more powerful spells may increase dice count (e.g., level 5-6 → 2 dice, level 9+ → 3 dice)
- **Prowess (Mana Cost)**: Calculated as `spellLevel + ceil(spellLevel / 3)`
  - Level 1: 2 mana
  - Level 3: 4 mana
  - Level 5: 7 mana
  - Level 9: 12 mana
  - Level 15: 20 mana
- **Description**: Should explain the spell's effects and include scaling information for dice count increases at levels 3, 6, 9, 12, and 15 if applicable

**Spell Categories:**
Spells are organized into schools of magic (all have type "spell"). **Known gap:** `category` is not actually a field `item-spell.mjs` defines - Foundry silently strips it from every spell on load (confirmed by inspecting a loaded spell document's `system` keys in a running world: `category` isn't there). So this categorization is authoring-time-only today - useful for `spell-lookup.mjs` and for organizing the manifest, but not something the character sheet or any in-game filter can currently see or use. Keep setting it (it's harmless and may get wired up later), but don't rely on it functioning in Foundry itself yet.
- **Evocation**: Damage-dealing spells (Fireball, Lightning Bolt, Magic Missile)
- **Abjuration**: Protective magic (Shield, Dispel Magic, Stoneskin)
- **Conjuration**: Summoning and creation (Summon Monster, Teleport, Misty Step)
- **Enchantment**: Mind-affecting magic (Charm Person, Sleep, Dominate)
- **Illusion**: Deceptive magic (Invisibility, Silent Image, Mirror Image)
- **Necromancy**: Death and undeath magic (Animate Dead, Finger of Death, Blight)
- **Transmutation**: Transformation magic (Haste, Polymorph, Enlarge Person)
- **Divination**: Information and detection (Detect Magic, Scrying, Identify)

**Do NOT add skills to spells** - they use the Cast/Channel skills from the character.

**Example: Fireball (Level 3)**
```json
{
  "spellLevel": 3,
  "diceCount": 1,
  "castStat": "int",
  "prowess": 4,
  "category": "evocation",
  "castingTime": "instantaneous",
  "range": "150 feet",
  "duration": "instantaneous",
  "description": "<p>Hurls an explosive sphere of flame that detonates in a fiery blast, dealing fire damage to all creatures in a 20-foot radius.</p><p><strong>Scaling:</strong> At dice count 3, the radius increases to 30 feet. At dice count 6, the radius increases to 40 feet and can melt through ice and snow.</p>"
}
```

**Example: Haste (Level 3)**
```json
{
  "spellLevel": 3,
  "diceCount": 1,
  "castStat": "int",
  "prowess": 4,
  "category": "transmutation",
  "castingTime": "instantaneous",
  "range": "30 feet",
  "duration": "1 minute",
  "description": "<p>Doubles a creature's speed and grants an additional action each turn for the duration.</p><p><strong>Scaling:</strong> At dice count 3, can target up to 2 creatures. At dice count 6, can target up to 4 creatures.</p>"
}
```

**Example: Meteor Swarm (Level 9)**
```json
{
  "spellLevel": 9,
  "diceCount": 3,
  "castStat": "int",
  "prowess": 12,
  "category": "evocation",
  "castingTime": "instantaneous",
  "range": "1 mile",
  "duration": "instantaneous",
  "description": "<p>Summons blazing meteors from the sky to rain down on enemies, dealing massive fire damage in multiple 40-foot radius bursts.</p><p><strong>Scaling:</strong> At dice count 6, summons twice as many meteors. At dice count 9, creates devastating explosions that leave the area scorched and difficult terrain.</p>"
}
```

---

### **Skill** Items
Base skills from the compendium (skills-manifest.json).

**Required Fields:**
- `level` - Starting level (0 = untrained, can go up to 15)
- `category` - "combat", "magic", "utility", or "general"
- `relatedStat` - Primary stat: "str", "dex", "con", "int", "wis", "cha", or null
- `effort` - Stamina cost to use (0 for most skills, 1-3 for special techniques)

**Skill Creation Rules:**
- Add entry to `data/skills-manifest.json` first
- Run `npm run generate:skills` to create JSON
- Run `npm run pack:skills` to update compendium
- Skills in compendium should start at **level 0**

---

## Creating New Content

Every type follows the same pattern now: edit the manifest, generate, validate, pack. `grantedSkills`/`grantedFeatures` are always written as `{skillName, level}` / `{featureName, level}` in the manifest - never hand-type a `Compendium....Item.<Id>` UUID; `npm run generate:<type>` resolves the name and fails loudly if it doesn't exist, which is what actually prevents a typo'd or hallucinated reference from ever reaching the compendium.

### Adding a New Skill

1. Add skill definition to `data/skills-manifest.json`
2. Run `npm run generate:skills` to create JSON file in `src/packs/skills/`
3. Run `npm run pack:skills` (or `npm run pack`) to update compendium
4. Commit `data/skills-manifest.json`, `src/packs/skills/`, and `packs/skills/`

### Adding a New Class

1. Add an entry to `data/classes-manifest.json` (see the **Class** Items example above for the shape)
2. Run `npm run generate:classes`
3. Run `npm run validate -- --type=classes` (or just `npm run pack`, which validates first)
4. Commit `data/classes-manifest.json`, `src/packs/classes/`, and `packs/classes/`

### Adding a New Race

1. Add an entry to `data/races-manifest.json` (see the **Race** Items example above)
2. Run `npm run generate:races`
3. Run `npm run validate -- --type=races`
4. Commit `data/races-manifest.json`, `src/packs/races/`, and `packs/races/`

### Adding a New Weapon

1. Add an entry to `data/weapons-manifest.json`
2. Run `npm run generate:weapons`
3. Run `npm run validate -- --type=weapons`
4. Commit `data/weapons-manifest.json`, `src/packs/weapons/`, and `packs/weapons/`

### Adding a New Armor

1. Add an entry to `data/armor-manifest.json` (see the **Armor** Items example above)
2. Run `npm run generate:armor`
3. Run `npm run validate -- --type=armor`
4. Commit `data/armor-manifest.json`, `src/packs/armor/`, and `packs/armor/`

### Adding a New Item (gear/consumables)

1. Add an entry to `data/items-manifest.json`
2. Run `npm run generate:items`
3. Run `npm run validate -- --type=items`
4. Commit `data/items-manifest.json`, `src/packs/items/`, and `packs/items/`

### Adding a New Feature

1. Add an entry to `data/features-manifest.json`
2. Run `npm run generate:features`
3. Run `npm run validate -- --type=features`
4. Commit `data/features-manifest.json`, `src/packs/features/`, and `packs/features/`

### Adding a New Spell

1. Add spell definition to `data/spells-manifest.json` under the appropriate category
2. Ensure prowess is calculated correctly: `spellLevel + ceil(spellLevel / 3)` (`npm run validate` checks this exactly)
3. Run `npm run generate:spells` to create JSON files in `src/packs/spells/`
4. Run `npm run pack:spells` (or `npm run pack`) to update compendium
5. Commit `data/spells-manifest.json`, `src/packs/spells/`, and `packs/spells/`

## Utilities

### Skill Lookup Tool

```bash
# List all skills
npm run skill-lookup -- list

# Get granted skill format
npm run skill-lookup -- granted "Slash" 2
# Output: {"skillUuid": "Compendium.dcw-content.skills.Item.Slash", "level": 2}
```

Mostly superseded by manifest authoring now (write `{"skillName": "Slash", "level": 2}` directly and let `generate:<type>` resolve it), but still useful for a quick manual lookup or to sanity-check a UUID.

### Spell Lookup Tool

```bash
# Show all spell statistics
npm run spell-lookup -- stats

# List all spells
npm run spell-lookup -- list

# List spells by category
npm run spell-lookup -- list evocation

# Show spell information
npm run spell-lookup -- info "Fireball"

# Search spells
npm run spell-lookup -- search "damage"

# List spells by level
npm run spell-lookup -- level 3

# List all categories
npm run spell-lookup -- categories
```

### Content Validation

```bash
# Check everything: real-schema structural rules, cross-reference integrity
# (every skillUuid/featureUuid must resolve to something real), and the
# design-budget rules documented above (race/class ability-bonus totals,
# skill/feature counts, spell prowess formula, no duplicate names/ids)
npm run validate

# Scope to one type
npm run validate -- --type=classes
```

`npm run pack` runs this first and aborts if it reports any errors (warnings don't block).

### Database Inspection

```bash
npm run inspect:skills
npm run list:skills
```

## Important Notes

- Reference skills/features by name (`skillName`/`featureName`) in manifests, never by hand-typed UUID - the generator resolves and validates them
- Run `npm run validate` (or just `npm run pack`, which does it automatically) before committing
- Skills in the compendium start at level 0; granted skills can have any level
- The package id for every UUID in this repo is `dcw-content` (e.g. `Compendium.dcw-content.features.Item.<Id>`) - the system's own pack namespace, `dungeon-crawler-world`, is a different package and never appears in content UUIDs
- Item type field in JSON must match the directory name (e.g., `"type": "class"` for classes)
- `src/packs/<type>/*.json` and `packs/<type>/` are both generated/derived output now for every type except achievements (which are world-only, not compendium content - see the **Achievement** Items section) - the actual source of truth to hand-edit is `data/<type>-manifest.json`

## Version Management

**When making changes that affect the module:**
1. Update version in `module.json` (use semantic versioning)
2. Pack all updated compendia: `npm run pack`
3. Build release package: `npm run build:release`
4. Create GitHub release with the zip file
5. Update `download` URL in `module.json` to point to new release
6. Commit and push changes

## Release Process

See README.md "Creating a Release" section for detailed instructions.
