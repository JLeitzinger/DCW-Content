/**
 * Wrap a piece of content into the standard Foundry Actor document envelope, mirroring
 * foundry-item.mjs's wrapItem (same _stats reasoning - see that file's comment). Actors get an
 * eagerly-instantiated compendium index entry the same way Scene/JournalEntry/Folder do (see
 * ids.mjs), so callers must pass a real 16-char id, not a slug.
 *
 * prototypeToken.bar1/bar2 point at `health`/`power` explicitly - system.json's
 * primaryTokenAttribute/secondaryTokenAttribute default to "hp"/"stamina", which only exist on
 * dccworldCharacter, not dccworldNPC (see Dungeon-Crawler-World/module/data/base-actor.mjs vs
 * actor-npc.mjs) - without this override every NPC token's health bars would render blank.
 */
import { DOCUMENT_STATS } from './foundry-item.mjs';

export function wrapActor({ id, name, type, img, system }) {
  return {
    _id: id,
    name,
    type,
    img,
    system,
    prototypeToken: {
      name,
      texture: { src: img },
      width: 1,
      height: 1,
      actorLink: false,
      disposition: -1, // HOSTILE
      sight: { enabled: false },
      bar1: { attribute: 'health' },
      bar2: { attribute: 'power' }
    },
    items: [],
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: DOCUMENT_STATS
  };
}
