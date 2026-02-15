# DCW-Content

**Foundry VTT Module** - Official content compendiums for the Dungeon Crawler World game system.

This module provides all game content for Dungeon Crawler World, including:
- 20 character classes (Fighter, Wizard, Rogue, etc. plus unique classes like Chronomancer, Netrunner)
- 5 character races (Hill Dwarf, Wood Elf, High Elf, Mountain Folk, Shadowkin)
- 50+ features and abilities
- 15+ weapons and equipment
- 23 skills across 4 categories (Combat, Magic, Utility, General)
- Spells and magic items

This repository also contains:
- Source JSON files for all game content
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

## Installation

### For Players

Install this module from Foundry VTT:
1. In Foundry, go to "Add-on Modules"
2. Click "Install Module"
3. Search for "Dungeon Crawler World - Content"
4. Click "Install"

**Requirements:** The Dungeon Crawler World system must be installed first.

### For Developers

Clone this repository to develop or modify content:
```bash
git clone https://github.com/JLeitzinger/DCW-Content.git
cd DCW-Content
npm install
```

To test locally, symlink to your Foundry modules directory:
```bash
ln -s /path/to/DCW-Content /path/to/FoundryVTT/Data/modules/dcw-content
```

## Content Authoring Guidelines

See `data/skills/README.md` for skill creation guidelines.

For class, race, and item design rules, refer to the main system's `CLAUDE.md` file.

## License

MIT License - see LICENSE file for details
