/**
 * Foundry validates every document/embedded-document `_id` as exactly 16 alphanumeric
 * characters (DocumentIdField) - confirmed against the real system: a slug _id on a
 * compendium Folder throws DataModelValidationError at world init and takes down the entire
 * game view. Item content in this repo gets away with slug ids only because compendium Items
 * are never eagerly instantiated as full Documents at pack-index time the way Folders (and,
 * to be safe, every document type this generator produces) are - so every Scene/JournalEntry/
 * JournalEntryPage/Folder/Wall/AmbientLight/Note/Region/RegionBehavior this generator creates
 * gets a real 16-char id instead of a slug.
 *
 * Deterministic per floor (seeded from that floor's own rng - see rng.mjs) and memoized by a
 * caller-chosen `logicalKey` (e.g. "room-14", "primary", "region-to-sub-24"): the same key
 * always resolves to the same generated id within one floor's generation pass, so callers
 * reference other documents' ids by logical key, never by string interpolation.
 */
const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function createIdFactory(rng) {
  const cache = new Map();
  return function id(logicalKey) {
    if (cache.has(logicalKey)) return cache.get(logicalKey);
    let out = '';
    for (let i = 0; i < 16; i++) out += ID_CHARS[rng.int(0, ID_CHARS.length - 1)];
    cache.set(logicalKey, out);
    return out;
  };
}
