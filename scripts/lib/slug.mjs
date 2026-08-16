/**
 * Canonical `_id` scheme for all new content going forward: lowercase, hyphen-separated.
 * Existing entries that predate this (skills, features, classes, races, spells - all
 * referenced elsewhere by their current _id) keep their id via an explicit `id` override
 * in their manifest entry instead of being re-slugged. See resolve-refs.mjs.
 */
export function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
