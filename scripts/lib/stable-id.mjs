/**
 * Deterministic 16-char Foundry document id (see ids.mjs for why every non-Item document needs
 * one) derived purely from a string key - unlike ids.mjs's createIdFactory, which is seeded by
 * a floor's own rng and only stable *within* one generation run, this is stable *across* every
 * script and every run: generate-monsters.mjs (building the Monsters compendium's Actor docs)
 * and MonsterGenerator.mjs (placing Tokens that reference those Actors by id while generating
 * floors) call this independently, with no shared state and no execution-order dependency, and
 * always land on the same id for the same key. That's what lets a generated Token's `actorId`
 * correctly point at a monster compendium entry that may have been built by a completely
 * separate npm script run.
 *
 * Same xfnv1a hash as rng.mjs, but re-mixed once per output character instead of feeding a
 * mulberry32 generator - a full PRNG is overkill for "expand one 32-bit hash into 16
 * alphanumeric chars" and would just be rng.mjs's algorithm copy-pasted for no benefit.
 */
const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function xfnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function stableId(key) {
  let h = xfnv1a(key);
  let out = '';
  for (let i = 0; i < 16; i++) {
    h = (Math.imul(h ^ (h >>> 15), 0x2545f491) + i) >>> 0;
    out += ID_CHARS[h % ID_CHARS.length];
  }
  return out;
}
