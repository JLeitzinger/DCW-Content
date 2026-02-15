# DCW-Content

Content generation tools and compendium packs for **Dungeon Crawler World** Foundry VTT system.

This repository contains:
- Source JSON files for all game content (classes, races, items, spells, features, skills)
- Generator scripts to create content from manifests
- Packing scripts to build Foundry VTT LevelDB compendium packs
- Utility scripts for inspecting and debugging compendium data

## Repository Structure

```
DCW-Content/
├── data/                    # Manifest files
│   ├── skills-manifest.json # All skill definitions
│   ├── features-manifest.json
│   └── skills/README.md     # Skill documentation
├── src/packs/               # Source JSON files
│   ├── classes/             # 20 character classes
│   ├── races/               # Character races
│   ├── features/            # Class features and abilities
│   ├── items/               # Equipment and weapons
│   ├── skills/              # Character skills
│   └── spells/              # Magic spells
├── packs/                   # Generated LevelDB packs (for Foundry)
│   ├── classes/
│   ├── races/
│   ├── features/
│   ├── items/
│   ├── skills/
│   └── spells/
└── scripts/                 # Build and utility scripts
    ├── generators/          # Content generators
    │   └── generate-weapons.mjs
    ├── generate-skills.mjs
    ├── pack-*.mjs           # LevelDB packing scripts
    ├── skill-lookup.mjs     # Skill UUID lookup tool
    ├── verify-classes.mjs   # Class validation
    └── inspect-*.mjs        # Database inspection tools
```

## Setup

Install dependencies:

```bash
npm install
```

## Usage

### Generating Content

Generate skills from manifest:
```bash
npm run generate:skills
```

Generate weapons:
```bash
npm run generate:weapons
```

### Packing Compendiums

Pack all compendiums:
```bash
npm run pack
```

Pack individual compendium:
```bash
npm run pack:skills
npm run pack:classes
npm run pack:races
npm run pack:items
npm run pack:features
npm run pack:spells
```

### Utilities

Look up skill UUIDs for granted skills:
```bash
npm run skill-lookup -- list                    # List all skills
npm run skill-lookup -- granted "Slash" 2       # Get granted skill format
```

Verify class JSON files:
```bash
npm run verify:classes
```

Inspect skills database:
```bash
npm run inspect:skills
npm run list:skills
```

## Workflow: Adding New Content

### Adding a New Skill

1. Add skill definition to `data/skills-manifest.json`
2. Run `npm run generate:skills` to create JSON file in `src/packs/skills/`
3. Run `npm run pack:skills` to update compendium
4. Commit changes to both `data/`, `src/packs/skills/`, and `packs/skills/`

### Adding a New Class

1. Create JSON file in `src/packs/classes/<classname>.json`
2. Use skill-lookup to get proper UUIDs for granted skills
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

## Integrating with Main System

The `packs/` directory contains the compiled LevelDB compendium packs that Foundry VTT reads.

To use these packs in the main Dungeon Crawler World system:

1. Copy or symlink the `packs/` directory to the main system repository
2. Ensure `system.json` in the main repo references these compendium packs

For development, you can use a symlink:
```bash
cd /path/to/Dungeon-Crawler-World
ln -s ../DCW-Content/packs packs
```

For releases, copy the `packs/` directory into the system package.

## Content Authoring Guidelines

See `data/skills/README.md` for skill creation guidelines.

For class, race, and item design rules, refer to the main system's `CLAUDE.md` file.

## License

MIT License - see LICENSE file for details
