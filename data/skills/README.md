# Skills Manifest System

This directory and its related utilities provide a way to track and reference skill UUIDs locally in the repository, making it easier to create items that grant skill bonuses.

## Files

- **`data/skills-manifest.json`** - Central registry of all skills with stable UUIDs
- **`module/helpers/skills-manifest.mjs`** - Helper module for runtime lookup
- **`scripts/skill-lookup.mjs`** - CLI utility for looking up skills when authoring items

## Usage

### When Creating Items in Code

When authoring items (weapons, armor, classes, races, etc.) that grant skill bonuses, use the lookup utility:

```bash
# Get the UUID for a skill
node scripts/skill-lookup.mjs get "Swing"

# Generate a grantedSkills entry
node scripts/skill-lookup.mjs granted "Swing" 2
```

Output:
```json
{
  "skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Swing",
  "level": 2
}
```

### Listing All Skills

```bash
node scripts/skill-lookup.mjs list
```

### Listing by Category

```bash
node scripts/skill-lookup.mjs category combat
node scripts/skill-lookup.mjs category magic
node scripts/skill-lookup.mjs category utility
node scripts/skill-lookup.mjs category general
```

## Available Skills

### Combat Skills
- **Slash** (str) - Slashing weapons (swords, axes)
- **Pierce** (dex) - Piercing weapons (spears, daggers)
- **Blunt** (str) - Blunt weapons (maces, hammers)
- **Shoot** (dex) - Ranged weapons (bows, crossbows)
- **Defend** (con) - Blocking and damage mitigation
- **Throw** (dex) - Throwing weapons

### Magic Skills
- **Cast** (int) - Arcane spellcasting
- **Channel** (wis) - Divine magic and channeled energy

### Utility Skills
- **Athletics** (str) - Climbing, jumping, swimming
- **Acrobatics** (dex) - Balance, tumbling, flexibility
- **Stealth** (dex) - Hiding, sneaking, evasion
- **Perception** (wis) - Noticing details, awareness
- **Survival** (wis) - Tracking, foraging, wilderness

### General Skills
- **Diplomacy** (cha) - Persuasion, negotiation
- **Intimidation** (cha) - Coercion, threats
- **Deception** (cha) - Lying, disguise, trickery
- **Lore** (int) - Academic knowledge, research
- **Medicine** (int) - Healing, diagnosis
- **Mend** (int) - Repairing gear, fixing objects
- **Craft** (int) - Creating items, artisan work
- **Thievery** (dex) - Lockpicking, pickpocketing
- **Focus** (wis) - Concentration, meditation
- **Ride** (dex) - Mounting, riding animals
```

## Adding New Skills

To add a new skill to the manifest:

1. Edit `data/skills-manifest.json`
2. Add an entry to the appropriate category array:
```json
{
  "name": "YourSkillName",
  "uuid": "Compendium.dungeon-crawler-world.skills.Item.YourSkillName",
  "category": "combat",
  "relatedStat": "str",
  "description": "Your skill description here."
}
```

3. Keep the UUID format consistent: `Compendium.dungeon-crawler-world.skills.Item.<SkillName>`

4. Regenerate and repack the skill items:
```bash
npm run generate:skills  # Creates JSON files from manifest
npm run pack:skills      # Packs them into the compendium
```

## UUID Format

The manifest uses compendium-style UUIDs: `Compendium.dungeon-crawler-world.skills.Item.<SkillName>`

When skills are stored in the "Skills" compendium pack, they will have matching UUIDs. This allows:
- Items in the repo to reference skills
- World-local skill items to also work (their UUIDs will be different but aggregation handles both)

## Runtime Helper Usage

In JavaScript modules, you can import the manifest helper:

```javascript
import { getSkillUuid, createGrantedSkill } from '../helpers/skills-manifest.mjs';

// Get a UUID
const swingUuid = getSkillUuid('Swing');

// Create a grantedSkills entry
const entry = createGrantedSkill('Swing', 2);
// Returns: { skillUuid: 'Compendium.dungeon-crawler-world.skills.Item.Swing', level: 2 }
```

## Note on World vs Compendium Skills

- **Compendium Skills**: Use the UUIDs from the manifest
- **World Skills**: Will have different UUIDs (format: `Actor.<documentId>`)
- The system's skill aggregation handles both formats
- For consistency, repo-managed content should reference compendium UUIDs
