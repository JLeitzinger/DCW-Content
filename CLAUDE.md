# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working on content for the Dungeon Crawler World system.

## Repository Overview

This is a **Foundry VTT module** that provides all compendium content for the Dungeon Crawler World game system. It contains:
- 20 character classes
- 5 character races
- 50+ features and abilities
- Equipment and weapons
- 23 skills across 4 categories
- Spells

This repository includes both the **source JSON files** and **build tools** to generate LevelDB compendium packs.

## Development Workflow

### Quick Reference

```bash
# Generate content from manifests
npm run generate:skills
npm run generate:spells
npm run generate:weapons

# Pack individual compendium
npm run pack:skills
npm run pack:classes
npm run pack:races
npm run pack:items
npm run pack:features
npm run pack:spells

# Pack all compendia
npm run pack

# Build release package
npm run build:release
```

### Testing Changes

To test content changes in Foundry:
1. Make changes to source files in `src/packs/`
2. Run appropriate pack command (e.g., `npm run pack:classes`)
3. Restart Foundry or reload the world
4. Verify changes in the compendium

Alternatively, symlink this directory to your Foundry modules folder for live development.

---

## Item Type Design Guidelines

When creating new items, follow these requirements and best practices for each item type:

### **Race** Items
Races define hereditary characteristics and base abilities.

**Required Fields:**
- `abilityBonuses` - Object with stat bonuses (e.g., `{str: 2, dex: 1}`)
- `bonuses.hp` - Hit point bonus (number, can be 0)
- `bonuses.stamina` - Stamina bonus (number, can be 0)
- `bonuses.mana` - Mana bonus (number, can be 0)
- `size` - String: "tiny", "small", "medium", "large", "huge"
- `speed` - Number: base movement speed in feet

**Ability Score Rules:**
- **Total ability bonuses must equal exactly 3**
- Can distribute as: +3 to one stat, +2/+1 to two stats, or +1/+1/+1 to three stats
- No stat can exceed +3 bonus

**Skill Requirements:**
- **Must have exactly 2 skills from general or utility categories**
- **Must have exactly 1 skill from magic or combat categories**
- Recommended skill levels: 1-2

**Optional Fields:**
- `senses` - Array of special senses (e.g., ["darkvision", "low-light"])
- `traits` - Array of racial feature descriptions (text descriptions, not feature items)

**Example: Human**
```json
{
  "abilityBonuses": {"str": 1, "dex": 1, "con": 1, "int": 0, "wis": 0, "cha": 0},
  "bonuses": {"hp": 0, "stamina": 0, "mana": 0},
  "size": "medium",
  "speed": 30,
  "senses": [],
  "traits": ["Versatile: Humans can learn any skill more quickly."],
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Diplomacy", "level": 1},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Lore", "level": 1},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 1}
  ]
}
```

---

### **Class** Items
Classes define profession-based abilities, resource scaling, stat boosts, skills, and features.

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
- Use existing features from compendium or create new ones
- Features are referenced via UUID (e.g., `Compendium.dungeon-crawler-world.features.Item.SecondWind`)

**Optional Fields:**
- `saveProficiency` - Array of abilities the class is proficient in (e.g., ["str", "con"])
- `grantedFeatures` - Array of feature UUIDs the class provides

**Example: Fighter**
```json
{
  "baseHP": 10,
  "hpPerLevel": 4,
  "staminaPerLevel": 2,
  "manaPerLevel": 1,
  "abilityBonuses": {"str": 0.5, "con": 0.5},
  "levelAcquired": 1,
  "saveProficiency": ["str", "con"],
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 2},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Defend", "level": 2},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Athletics", "level": 1}
  ],
  "grantedFeatures": [
    "Compendium.dungeon-crawler-world.features.Item.SecondWind",
    "Compendium.dungeon-crawler-world.features.Item.ActionSurge"
  ]
}
```

---

### **Item** (Equipment) Items
Weapons, armor, gear, and consumables.

**Required Fields:**
- `quantity` - Number of items (default: 1)
- `weight` - Weight in pounds (number)

**For Weapons:**
- `roll.diceNum` - Number of dice (typically 1)
- `roll.diceSize` - Die size ("d4", "d6", "d8", "d10", "d12")
- `roll.diceBonus` - Bonus to damage (formula like "+@str.mod+ceil(@lvl/2)")
- **Should grant 1-2 relevant combat skills** at level 1-2
- **Higher quality/masterwork items can grant skill +2 or +3**

**For Armor:**
- `acBonus` - Armor class bonus (number)
- Could grant defensive skills like Defend

**For Tools/Gear:**
- **Should grant 1 relevant utility or general skill** (e.g., thieves' tools → Thievery +1)

**Example: Longsword**
```json
{
  "quantity": 1,
  "weight": 3,
  "roll": {"diceNum": 1, "diceSize": "d8", "diceBonus": "+@str.mod+ceil(@lvl/2)"},
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 1}
  ]
}
```

---

### **Feature** Items
Abilities, feats, and special powers.

**Skill Guidelines:**
- **Should grant 0-2 skills** relevant to the feature
- Combat features → combat skill
- Magic features → magic skill
- Skill feats → specific skill at level 1-2

**Example: Power Attack**
```json
{
  "description": "Sacrifice accuracy for damage.",
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 1}
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
Spells are organized into schools of magic (all have type "spell"):
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

### Adding a New Skill

1. Add skill definition to `data/skills-manifest.json`
2. Run `npm run generate:skills` to create JSON file in `src/packs/skills/`
3. Run `npm run pack:skills` to update compendium
4. Commit changes to both `data/`, `src/packs/skills/`, and `packs/skills/`

### Adding a New Class

1. Create JSON file in `src/packs/classes/<classname>.json`
2. Use skill-lookup to get proper UUIDs for granted skills: `npm run skill-lookup -- granted "SkillName" 2`
3. Run `npm run pack:classes` to update compendium
4. Run `npm run verify:classes` to validate
5. Commit changes

### Adding a New Race

1. Create JSON file in `src/packs/races/<racename>.json`
2. Ensure all granted skills exist (use skill-lookup)
3. Run `npm run pack:races` to update compendium
4. Commit changes

### Adding a New Item/Weapon

1. Create JSON file in `src/packs/items/<itemname>.json` or use weapon generator
2. Run `npm run pack:items` to update compendium
3. Commit changes

### Adding a New Feature

1. Create JSON file in `src/packs/features/<featurename>.json`
2. Run `npm run pack:features` to update compendium
3. Commit changes

### Adding a New Spell

**Option 1: Using the Spell Manifest (Recommended)**
1. Add spell definition to `data/spells-manifest.json` under the appropriate category
2. Ensure prowess is calculated correctly: `spellLevel + ceil(spellLevel / 3)`
3. Run `npm run generate:spells` to create JSON files in `src/packs/spells/`
4. Run `npm run pack:spells` to update compendium
5. Commit changes to both `data/`, `src/packs/spells/`, and `packs/spells/`

**Option 2: Manual Creation**
1. Create JSON file in `src/packs/spells/<spellname>.json`
2. Follow spell scaling rules (see Spell Items section)
3. Run `npm run pack:spells` to update compendium
4. Commit changes

## Utilities

### Skill Lookup Tool

```bash
# List all skills
npm run skill-lookup -- list

# Get granted skill format
npm run skill-lookup -- granted "Slash" 2
# Output: {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 2}
```

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

### Class Verification

```bash
npm run verify:classes
```

### Database Inspection

```bash
npm run inspect:skills
npm run list:skills
```

## Important Notes

- Always use the skill-lookup tool to get correct UUIDs for granted skills
- Verify class JSON files with `npm run verify:classes` before committing
- Skills in the compendium start at level 0; granted skills can have any level
- Feature UUIDs follow format: `Compendium.dungeon-crawler-world.features.Item.<FeatureName>`
- Item type field in JSON must match the directory name (e.g., `"type": "class"` for classes)

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
