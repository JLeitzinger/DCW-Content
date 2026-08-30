# CHANGELOG

## 1.14.6

- Fixed NPC weapon-granted combat skills (e.g. monster attacks) showing under the "General"
  category with no way to roll damage. The bug itself was in the `Dungeon-Crawler-World` system
  (v0.36.2 fixes it) - it tried to load skill category metadata from a file path that never
  existed, silently failing and miscategorizing every skill an actor has only via a
  `grantedSkills` reference rather than owning outright, which is how every monster in this
  module's Monsters compendium gets its attack skill. No content in this module needed to
  change; **update the Dungeon-Crawler-World system to v0.36.2 or later** for existing monster
  content to display and roll correctly.
