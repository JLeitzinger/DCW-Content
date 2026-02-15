# Item Generators

This directory contains scripts to programmatically generate items for Dungeon Crawler World compendiums.

## Workflow

### 1. Generate Items

Create JSON source files for items:

```bash
npm run generate:weapons
```

This creates individual JSON files in `src/packs/items/` for each weapon.

### 2. Pack into Compendiums

Compile JSON sources into Foundry compendium packs:

```bash
npm run pack
```

This creates/updates the LevelDB compendium files in `packs/`.

### 3. Unpack from Compendiums (Optional)

Extract items from compiled packs back to JSON (useful for editing existing items):

```bash
npm run unpack
```

## Creating New Generators

To create a new item generator (e.g., armor, potions, etc.):

1. Create a new script in `scripts/generators/generate-{type}.mjs`
2. Follow the pattern in `generate-weapons.mjs`
3. Add a npm script in `package.json`: `"generate:{type}": "node scripts/generators/generate-{type}.mjs"`

### Item Structure

All items must follow the Foundry document structure:

```javascript
{
  name: "Item Name",
  type: "item", // or "spell", "feature", "class", "race"
  img: "path/to/icon.svg",
  system: {
    description: "Item description",
    // Type-specific fields based on data model
  },
  effects: [],
  folder: null,
  sort: 0,
  ownership: { default: 0 },
  flags: {}
}
```

### Weapon-Specific Fields

For items of type "item" (weapons/gear):

```javascript
system: {
  description: "Weapon description",
  quantity: 1,
  weight: 3,
  roll: {
    diceNum: 1,        // Number of dice
    diceSize: "d8",    // Die size (d4, d6, d8, d10, d12, d20)
    diceBonus: "+@str.mod+ceil(@lvl / 2)"  // Bonus formula
  }
}
```

## AI-Assisted Generation

The generator scripts are designed to be easily extended. You can:

1. **Add new items manually** to the arrays in generator scripts
2. **Use AI to generate item data** - paste the weapon array format and ask for new items
3. **Import from external sources** - CSV, JSON, APIs, etc.

Example AI prompt:
> "Generate 10 magical weapons following this format: [paste weapon object structure]"

## File Naming

Generated JSON files should use kebab-case: `long-sword.json`, `fireball-spell.json`, etc.

## Version Control

- **DO commit**: `src/packs/**/*.json` (source data)
- **DO commit**: Generator scripts
- **DO NOT commit**: `packs/` directory (compiled packs, auto-generated)

Add to `.gitignore`:
```
packs/*
!packs/.gitattributes
```
