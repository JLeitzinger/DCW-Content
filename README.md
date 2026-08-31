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

**Populated encounters:** Generated floor scenes come pre-populated with tokens from **two**
compendiums - mobs (easily-defeated-but-dangerous-in-number encounters) from Monsters, and
elites/bosses/friendly NPCs (real race+class+gear+spell characters, not flat stat blocks) from
Characters. **Import both Monsters and Characters into your world *before* importing or opening
any generated floor scene** - do it in this order every time you set up a new world: open the
Compendium Packs sidebar tab, right-click **Monsters**, choose **Import All Content**, and check
**Keep Document IDs** before confirming (a single actor's own right-click "Import" keeps its id
automatically - it's specifically the bulk "Import All Content" dialog that needs the box
checked); repeat for **Characters**. *Then* import/view the floor scene. If you import or open a
scene first and see tokens report "this token references an actor which no longer exists in this
world," import the Monsters and Characters compendiums and re-import (or refresh) the scene - a
scene's tokens resolve their actor at load time, so one that already loaded before the actors
existed needs to be reloaded once they do. Skipping either import means those tokens show as an
unresolved/unknown actor instead of the intended monster/character. If a freshly imported actor's
Skills tab or XP looks empty right after importing, refresh the browser page once - a one-time
Foundry data-preparation timing quirk, not lost data; it won't recur for that actor afterward.

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

## Publishing an Update

`module.json`'s `download` points at GitHub's branch-archive zip
(`archive/refs/heads/main.zip`), not a tagged release - same as the
`Dungeon-Crawler-World` system repo. Foundry always installs whatever is on `main`, so
publishing an update is just:

1. **Update version** in `module.json` (use semantic versioning)
2. **Pack all content**: `npm run pack` (validates first, aborts on error)
3. **Commit and push** `data/`, `src/packs/`, `packs/`, `module.json` (and `assets/` if art
   changed) to `main`

No GitHub Release needed - the next time a world checks for updates, Foundry re-downloads the
`main` archive and diffs it against the installed version number. `npm run build:release` still
exists if you ever want a standalone pinned zip (e.g. to hand someone a specific version
outside Foundry's own updater), but it's optional now, not part of the normal publish flow.

## License

MIT License - see LICENSE file for details
