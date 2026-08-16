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
    flags: {}
  };
}
