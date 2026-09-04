# CHANGELOG

## 1.16.0

- New `goblin_warren` theme category (`data/narrative-lexicon.json`) and a matching six-monster
  roster (`data/monsters-manifest.json`): Warren Goblin/Hobgoblin Enforcer/Yaktaur Drover minions,
  Goblin War-Chief/Yaktaur Captain elites, and a boss - The Wool-Crowned King, a goblin who fell
  off a llama, landed on a hay-hook, and declared it a scepter. Goblins and anthropomorphic llamas
  (DCSS's yaktaur art) share every band, so their rivalry-turned-alliance runs through the whole
  roster, not just the boss.
- New `layout: "grid"` option for `data/floors-manifest.json` entries (`scripts/lib/level-gen/
  GeometryGenerator.mjs`'s `generateGridGeometry`) - a lattice of wide main-hall corridors at
  irregular column/row spacing, with one room filling each pocket between them, instead of the
  existing BSP algorithm's fully-tiled irregular rooms. Same `{rooms, walls, boundsPx}` output
  shape, so every downstream generator (scenes, journals, lighting, monster placement) needed no
  changes. New `roomCount: {min, max}` manifest field decouples a floor's room count from its
  `complexityTier` (which still drives monster CR/level on its own), so a floor can be large with
  easy monsters or small with hard ones.
- Every floor's boss-arena room now marks the actual goal: a stairs-down Tile
  (`assets/tiles/dungeon/gateways/stone_stairs_down.png`) placed in the room (primary scene or its
  sub-scene, whichever the boss-arena ends up in), an "Objective" line in that room's Room Key
  journal entry, and an explicit callout in the floor's climax milestone text - "find the stairs
  down, guarded by whatever holds this room" is now a stated goal, not just an implied one.
- New floor: **The Wool-Crowned Warrens** (`goblin_warren` theme, `grid` layout, tier 1, 30 rooms)
  - a large, easy-difficulty level-1 floor themed around the new goblin/llama roster.

## 1.15.0

- Generated floors now populate elites, bosses, and a new friendly-NPC category with real
  `dccworldCharacter` actors - a race + class + equipped gear + spells + feats, the same content
  pool players draw from - instead of a flat CR-formula stat block. Mobs (minion band) are
  unchanged. The floor's one boss gets a personal name and title woven into that floor's own
  generated story. New `Characters` compendium - **GMs must now import both Monsters and
  Characters into their world before opening a generated floor scene** (same "Import All Content"
  + "Keep Document IDs" steps as before, for both packs, in that order). See `CLAUDE.md`'s new
  "Character (Elite/Boss/Friendly NPC) Actors" section for the full design.
- Regenerating this release's floors reshuffles every previously-generated floor's specific
  rooms/monsters/flavor text one time (inserting the new boss-naming step earlier in each floor's
  seeded RNG sequence shifts everything drawn after it) - still fully deterministic per floor
  seed on any future regeneration.

## 1.14.6

- Fixed NPC weapon-granted combat skills (e.g. monster attacks) showing under the "General"
  category with no way to roll damage. The bug itself was in the `Dungeon-Crawler-World` system
  (v0.36.2 fixes it) - it tried to load skill category metadata from a file path that never
  existed, silently failing and miscategorizing every skill an actor has only via a
  `grantedSkills` reference rather than owning outright, which is how every monster in this
  module's Monsters compendium gets its attack skill. No content in this module needed to
  change; **update the Dungeon-Crawler-World system to v0.36.2 or later** for existing monster
  content to display and roll correctly.
