/**
 * Every real Foundry document carries a `_stats` block (see DocumentStatsField in Foundry's
 * common/data/fields.mjs). A document that lacks one entirely gets flagged by Foundry's
 * server-side compendium migration engine as unconditionally needing migration on every
 * single world launch - which we confirmed (by direct LevelDB inspection before/after a
 * launch) corrupts one record's `_id` to null during that rewrite, leaving a phantom
 * `!items!null` duplicate behind in the pack. Stamping a real `_stats` up front - with
 * `coreVersion` pinned to Item.metadata.schemaVersion, the version Foundry's own migration
 * registry treats as "already current" - makes every migration-eligibility check resolve to
 * "nothing to do," so the migration/rewrite path (and the bug in it) never runs at all.
 *
 * coreVersion is intentionally NOT "whatever Foundry version generated this" - that would
 * throw ("Documents from a core version newer than the running version cannot be migrated")
 * for anyone running an older Foundry than the one these were generated on, which would
 * break installs down to system.json's stated `compatibility.minimum: 13`. Pinning to the
 * schema version instead is safe for any Foundry release that can run this system at all.
 */
const DOCUMENT_STATS = {
  coreVersion: '13.341',
  systemId: 'dungeon-crawler-world',
  systemVersion: null,
  // NumberField, required and NOT nullable (unlike the rest of this block) - 0 rather than a
  // real generation timestamp, so regenerating identical content produces an identical diff.
  createdTime: 0,
  modifiedTime: 0,
  lastModifiedBy: null,
  compendiumSource: null,
  duplicateSource: null,
  exportSource: null
};

/**
 * Wrap a piece of content into the standard Foundry Item document envelope every generator
 * needs, so individual generate-<type>.mjs scripts only have to build `system`.
 */
export function wrapItem({ id, name, type, img, system }) {
  return {
    _id: id,
    name,
    type,
    img,
    system,
    effects: [],
    folder: null,
    sort: 0,
    ownership: {
      default: 0
    },
    flags: {},
    _stats: DOCUMENT_STATS
  };
}
