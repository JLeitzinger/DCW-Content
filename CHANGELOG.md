# CHANGELOG

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
