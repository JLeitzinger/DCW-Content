# Spell Design Guide

## Overview

The Dungeon Crawler World spell system provides a balanced framework for creating magical effects that scale from level 1 to 15. All spells follow consistent rules for power scaling, mana costs, and categorization.

## Core Spell Attributes

Every spell has these required attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | The spell's display name |
| `spellLevel` | number (1-15) | The minimum character level required to cast |
| `diceCount` | number | Number of dice rolled for the spell's effect |
| `castStat` | "int" or "wis" | The ability score used for casting |
| `category` | string | The spell's school of magic |
| `prowess` | number | Mana cost to cast the spell |
| `description` | string | What the spell does |

## Spell Scaling Rules

### Level Progression (1-15)

Spells are designed to scale across 15 character levels, providing a smooth power curve:

- **Levels 1-3**: Basic spells, foundational effects
- **Levels 4-6**: Intermediate spells, stronger effects
- **Levels 7-9**: Advanced spells, powerful effects
- **Levels 10-12**: Expert spells, very powerful effects
- **Levels 13-15**: Master spells, legendary effects

### Dice Count Scaling

**All spells start with `diceCount: 1`**

The dice count represents the spell's raw power. As spells increase in level, their dice count may increase:

| Spell Level Range | Typical Dice Count | Example |
|-------------------|-------------------|---------|
| 1-4 | 1d | Magic Missile (Lvl 1), Fireball (Lvl 3) |
| 5-8 | 2d | Cone of Cold (Lvl 5), Chain Lightning (Lvl 6) |
| 9-12 | 3d | Meteor Swarm (Lvl 9) |
| 13-15 | 4d+ | Master-tier spells |

**Design Principle**: Dice count increases are reserved for truly powerful spells. Most level increases come from improved effects, durations, or targets rather than raw damage scaling.

### Prowess (Mana Cost) Formula

**Formula**: `prowess = spellLevel + ceil(spellLevel / 3)`

This formula ensures mana costs scale progressively but not linearly:

| Spell Level | Prowess | Calculation |
|-------------|---------|-------------|
| 1 | 2 | 1 + ceil(1/3) = 1 + 1 = 2 |
| 2 | 3 | 2 + ceil(2/3) = 2 + 1 = 3 |
| 3 | 4 | 3 + ceil(3/3) = 3 + 1 = 4 |
| 4 | 6 | 4 + ceil(4/3) = 4 + 2 = 6 |
| 5 | 7 | 5 + ceil(5/3) = 5 + 2 = 7 |
| 6 | 8 | 6 + ceil(6/3) = 6 + 2 = 8 |
| 7 | 10 | 7 + ceil(7/3) = 7 + 3 = 10 |
| 8 | 11 | 8 + ceil(8/3) = 8 + 3 = 11 |
| 9 | 12 | 9 + ceil(9/3) = 9 + 3 = 12 |
| 10 | 14 | 10 + ceil(10/3) = 10 + 4 = 14 |
| 11 | 15 | 11 + ceil(11/3) = 11 + 4 = 15 |
| 12 | 16 | 12 + ceil(12/3) = 12 + 4 = 16 |
| 13 | 18 | 13 + ceil(13/3) = 13 + 5 = 18 |
| 14 | 19 | 14 + ceil(14/3) = 14 + 5 = 19 |
| 15 | 20 | 15 + ceil(15/3) = 15 + 5 = 20 |

**Design Rationale**:
- Low-level spells (1-3) are affordable for frequent casting
- Mid-level spells (4-8) become more expensive, requiring resource management
- High-level spells (9-15) are powerful but costly, reserved for critical moments

### Cast Stat

Spells use one of two casting statistics:

- **Intelligence (`int`)**: Arcane magic
  - Scholarly, learned magical knowledge
  - Wizards, sorcerers, arcane casters
  - Examples: Fireball, Teleport, Polymorph

- **Wisdom (`wis`)**: Divine magic
  - Spiritual, intuitive magical power
  - Clerics, druids, divine casters
  - Examples: Cure Wounds, Protection from Evil, Animate Dead

**Design Principle**: A spell's casting stat should match its thematic source of power.

## Spell Categories (Schools of Magic)

### Evocation
**Theme**: Direct energy manipulation and elemental forces

**Typical Effects**:
- Direct damage (fire, lightning, cold, force)
- Area-of-effect attacks
- Energy projection

**Examples**:
- Magic Missile (Lvl 1): Force projectiles
- Fireball (Lvl 3): Fire explosion
- Meteor Swarm (Lvl 9): Massive destructive power

**Design Guidance**: Evocation spells should have clear, immediate combat effects.

---

### Abjuration
**Theme**: Protection, warding, and dispelling

**Typical Effects**:
- Damage reduction/absorption
- Spell negation
- Protective barriers
- Condition immunity

**Examples**:
- Shield (Lvl 1): AC bonus
- Dispel Magic (Lvl 3): Remove magical effects
- Wall of Force (Lvl 5): Impassable barrier

**Design Guidance**: Abjuration spells should prevent harm or remove threats.

---

### Conjuration
**Theme**: Summoning, creation, and teleportation

**Typical Effects**:
- Summon creatures
- Create objects or substances
- Teleportation
- Dimensional travel

**Examples**:
- Create Water (Lvl 1): Conjure liquid
- Summon Monster (Lvl 4): Call forth a creature
- Teleport (Lvl 7): Instant travel

**Design Guidance**: Conjuration spells bring things into existence or move them between places.

---

### Enchantment
**Theme**: Mind control and emotional manipulation

**Typical Effects**:
- Charm/dominate creatures
- Induce sleep or paralysis
- Plant suggestions
- Alter emotions

**Examples**:
- Charm Person (Lvl 1): Make friendly
- Hold Person (Lvl 2): Paralyze humanoid
- Dominate Person (Lvl 5): Control actions

**Design Guidance**: Enchantment spells should affect thoughts, emotions, or will.

---

### Illusion
**Theme**: Deception and false sensory information

**Typical Effects**:
- Create false images
- Invisibility
- Disguise appearance
- Mislead senses

**Examples**:
- Silent Image (Lvl 1): Visual illusion
- Invisibility (Lvl 2): Become unseen
- Mirror Image (Lvl 2): Create duplicates

**Design Guidance**: Illusion spells should deceive perception rather than create real effects.

---

### Necromancy
**Theme**: Death, undeath, and life force manipulation

**Typical Effects**:
- Drain life energy
- Animate undead
- Death effects
- Speak with the dead

**Examples**:
- Cause Wounds (Lvl 1): Necrotic damage
- Animate Dead (Lvl 3): Raise undead
- Finger of Death (Lvl 7): Death touch

**Design Guidance**: Necromancy spells should involve death, undeath, or life force.

---

### Transmutation
**Theme**: Transformation and alteration of physical properties

**Typical Effects**:
- Change size or shape
- Enhance physical abilities
- Transform materials
- Alter matter

**Examples**:
- Enlarge Person (Lvl 2): Grow in size
- Haste (Lvl 3): Speed enhancement
- Polymorph (Lvl 4): Shapechange

**Design Guidance**: Transmutation spells should physically change something.

---

### Divination
**Theme**: Knowledge, detection, and foresight

**Typical Effects**:
- Detect magic/creatures
- Reveal information
- Scrying/clairvoyance
- Identify properties

**Examples**:
- Detect Magic (Lvl 1): Sense magical auras
- Identify (Lvl 1): Learn item properties
- Scrying (Lvl 5): Remote viewing

**Design Guidance**: Divination spells should reveal hidden information or detect things.

## Creating New Spells

### Using the Spell Manifest

1. **Choose the appropriate category** based on the spell's theme
2. **Determine spell level** (1-15) based on power and availability
3. **Set dice count**:
   - Start at 1 for most spells
   - Increase to 2 for levels 5-8
   - Increase to 3 for levels 9+
4. **Calculate prowess**: Use the formula `spellLevel + ceil(spellLevel / 3)`
5. **Select cast stat**: `int` for arcane, `wis` for divine
6. **Write a clear description** of what the spell does

### Example: Creating "Acid Arrow"

**Concept**: A mid-level evocation spell that deals acid damage

```json
{
  "name": "Acid Arrow",
  "uuid": "Compendium.dungeon-crawler-world.spells.Item.AcidArrow",
  "spellLevel": 2,
  "diceCount": 1,
  "castStat": "int",
  "category": "evocation",
  "description": "Conjures a magical arrow of acid that corrodes the target on impact."
}
```

**Calculated prowess**: 2 + ceil(2/3) = 2 + 1 = 3 mana

### Adding to the Manifest

1. Open `data/spells-manifest.json`
2. Find the appropriate category (e.g., `"evocation"`)
3. Add the spell object to the category's array
4. Run `npm run generate:spells` to create the JSON file
5. Run `npm run pack:spells` to update the compendium

## Balance Considerations

### Damage vs. Utility

- **Damage spells** should use dice count for scaling
- **Utility spells** should provide non-damage benefits worth the mana cost
- **Control spells** (enchantment/illusion) should have clear counterplay

### Mana Costs

The prowess formula creates these breakpoints:

- **2-3 mana**: Frequently usable (levels 1-2)
- **4-7 mana**: Moderate use (levels 3-5)
- **8-12 mana**: Expensive (levels 6-9)
- **13-20 mana**: Very expensive (levels 10-15)

### Power Budget

When designing spells, consider:

- **Damage**: Higher dice count = higher damage output
- **Duration**: Longer-lasting effects justify higher mana costs
- **Range**: Longer range = more tactical flexibility
- **Targets**: Multiple targets = much more powerful
- **Save/Resist**: Effects with no save should be weaker

## Common Spell Patterns

### Damage Spell Pattern
```json
{
  "spellLevel": X,
  "diceCount": 1-3,
  "castStat": "int" or "wis",
  "category": "evocation" or "necromancy",
  "prowess": [calculated]
}
```

### Buff/Debuff Pattern
```json
{
  "spellLevel": X,
  "diceCount": 1,
  "castStat": "int" or "wis",
  "category": "transmutation" or "enchantment",
  "prowess": [calculated]
}
```

### Summoning Pattern
```json
{
  "spellLevel": X,
  "diceCount": 1,
  "castStat": "int" or "wis",
  "category": "conjuration",
  "prowess": [calculated]
}
```

### Detection Pattern
```json
{
  "spellLevel": 1-3,
  "diceCount": 1,
  "castStat": "int" or "wis",
  "category": "divination",
  "prowess": [calculated]
}
```

## FAQ

**Q: Can I create cantrips (level 0 spells)?**
A: No. The DCW system uses levels 1-15 only. The lowest-level spells are level 1 with 2 mana cost.

**Q: Should all level 5 spells have 2 dice?**
A: Not necessarily. Dice count increases are for powerful offensive spells. Utility spells can remain at 1 die regardless of level.

**Q: Can I modify the prowess formula for a specific spell?**
A: The formula should be consistent for balance. If a spell seems too expensive or cheap, consider adjusting its level instead.

**Q: What if my spell doesn't fit any category?**
A: Every spell should fit one of the eight schools. If in doubt, choose the school that best matches the spell's primary effect.

**Q: Do spells grant skills?**
A: No. Spells should have `"grantedSkills": []` empty. Characters use their Cast (int) or Channel (wis) skills to cast spells.

---

## Quick Reference

### Prowess by Level
1→2, 2→3, 3→4, 4→6, 5→7, 6→8, 7→10, 8→11, 9→12, 10→14, 11→15, 12→16, 13→18, 14→19, 15→20

### Dice Count Guidelines
- Levels 1-4: Usually 1d
- Levels 5-8: 1-2d
- Levels 9-12: 2-3d
- Levels 13-15: 3-4d

### Category Summary
- **Evocation**: Damage and energy
- **Abjuration**: Protection and dispelling
- **Conjuration**: Summoning and teleportation
- **Enchantment**: Mind control
- **Illusion**: Deception
- **Necromancy**: Death and undeath
- **Transmutation**: Physical transformation
- **Divination**: Detection and knowledge
