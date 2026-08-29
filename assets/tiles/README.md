# Tile Art

Drop image files (`.webp`, `.png`, `.jpg`, `.jpeg`) into these folders and the next
`npm run generate:floors` will start scattering them across generated maps automatically -
no code changes, no manifest entries, no registration step. An empty folder just means that
slot stays undecorated; nothing errors or needs "at least one" image anywhere in the tree.

## Layout

```
assets/tiles/<setting>/<themeCategory | _generic>/<floors | props>/*.webp
```

- **`<setting>`** - the kind of place, e.g. `dungeon` (the only one the generator currently
  builds - see `DCW-Content/CLAUDE.md`). Adding a new setting is just adding a new folder here;
  pass `"setting": "<name>"` in a `data/floors-manifest.json` entry to use it (defaults to
  `dungeon`).
- **`<themeCategory>`** - matches a key in `data/narrative-lexicon.json`'s `themeCategories`
  (`alchemical`, `undead`, `elemental`, `cult`, `feral`, `abyssal`). A floor pulls art from its
  own theme's folder first.
- **`_generic`** - art that isn't theme-specific (plain flagstones, generic rubble). Always
  mixed in alongside whatever's in the theme-specific folder, so it's worth populating even if
  every theme folder stays empty - it's the fallback every floor can draw from.
- **`floors/`** - one large tile per room, sized to fill the room and rendered beneath tokens
  and props - a ground/floor texture.
- **`props/`** - small scattered decoration (barrels, rubble, altars, bones, etc.) - 0-3 per
  room depending on room size and the floor's complexity tier (`propDensity` in
  `scripts/lib/level-gen/StoryGenerator.mjs`'s `TIER_CONFIG`).

## How the generator uses these

`scripts/lib/level-gen/TileLibrary.mjs` scans these folders at generate time (theme-specific +
`_generic`, combined into one pool); `scripts/lib/level-gen/TileGenerator.mjs` picks randomly
from that pool per room, seeded the same way as the rest of a floor's generation - the same
seed always produces the same tile placements. Images are referenced by their module-relative
path (`modules/dcw-content/assets/tiles/...`) directly from the packed Scene JSON; they're
static files served by Foundry as-is, not packed into a LevelDB compendium like item/scene/
journal content is.

Recommended size: 100x100px (or a multiple) per grid square to line up cleanly with the
generator's default `gridSize: 100`, though `floors/` tiles are stretched to fill each room's
exact pixel dimensions regardless of source aspect ratio (`texture.fit: "fill"`).
