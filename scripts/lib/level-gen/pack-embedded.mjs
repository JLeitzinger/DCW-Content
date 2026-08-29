/**
 * Foundry's LevelDB pack/world format never stores a real embedded Document collection (one
 * whose elements are full Document subclasses with their own `_id`, e.g. Scene.walls/lights/
 * notes/regions, Region.behaviors, JournalEntry.pages) inline in the parent's JSON. Each such
 * collection lives in its own "sublevel", keyed `!<parentSublevel>.<fieldName>!<idPrefix>.
 * <childId>`, and the parent's own field is rewritten to hold just an array of child ids.
 *
 * Confirmed against the actual mechanism Foundry itself uses - dist/database/fields-
 * extensions.mjs's EmbeddedCollectionField.prototype._dbWrite - after content generated here
 * initially stored these inline (which passes schema validation, since an EmbeddedCollectionField
 * accepts inline object arrays when constructing a Document directly) but then silently came
 * back empty every time the client actually fetched/rendered the full document, because that
 * path (EmbeddedCollectionField.expandEmbedded) looks up each id in `pages`/`walls`/etc against
 * this separate sublevel - inline objects there aren't valid ids, so nothing resolves.
 *
 * Source JSON in src/packs/ stays fully nested/readable on purpose - this transform only runs
 * at pack time, against the in-memory object, right before writing to LevelDB.
 */
export const SCENE_EMBEDDED_SCHEMA = {
  walls: {},
  lights: {},
  notes: {},
  tiles: {},
  tokens: {},
  sounds: {},
  drawings: {},
  regions: { behaviors: {} }
};

export const JOURNAL_ENTRY_EMBEDDED_SCHEMA = {
  pages: {}
};

/**
 * Recursively extract embedded collections from `doc` into separate LevelDB records via `put`,
 * mutating `doc`'s embedded array fields into arrays of ids in the process.
 * @param {(key: string, value: object) => Promise<void>} put
 * @param {object} doc - mutated in place: embedded array fields become arrays of ids.
 * @param {string} idPrefix - `doc._id` at the top level; `${parentIdPrefix}.${doc._id}` when recursing.
 * @param {string} sublevelPrefix - the parent Document's collection name (e.g. "scenes", "journal").
 * @param {object} schema - SCENE_EMBEDDED_SCHEMA / JOURNAL_ENTRY_EMBEDDED_SCHEMA shape.
 */
export async function writeEmbeddedCollections(put, doc, idPrefix, sublevelPrefix, schema) {
  for (const [fieldName, childSchema] of Object.entries(schema)) {
    const children = doc[fieldName];
    if (!Array.isArray(children)) continue;
    const sublevelName = `${sublevelPrefix}.${fieldName}`;
    const ids = [];
    for (const child of children) {
      if (!child._id) throw new Error(`Embedded "${fieldName}" record on ${idPrefix} is missing _id`);
      const childIdPrefix = `${idPrefix}.${child._id}`;
      await writeEmbeddedCollections(put, child, childIdPrefix, sublevelName, childSchema);
      await put(`!${sublevelName}!${childIdPrefix}`, child);
      ids.push(child._id);
    }
    doc[fieldName] = ids;
  }
}
