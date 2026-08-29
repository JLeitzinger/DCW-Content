/**
 * Deterministic, seedable RNG so a floor's seed always regenerates the identical layout/
 * narrative/pack output (same rationale as _stats.createdTime being pinned to 0 elsewhere -
 * see foundry-item.mjs - reproducible diffs matter more here than true randomness).
 *
 * mulberry32 for the generator itself (small, fast, good-enough distribution for dungeon
 * layout - not cryptographic), seeded from an arbitrary string via a cheap 32-bit hash
 * (xfnv1a) so manifest authors can use readable seeds like "vaults-03" instead of raw ints.
 */
function xfnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a seeded RNG helper bundle from a string or numeric seed. */
export function createRng(seed) {
  const next = mulberry32(typeof seed === 'string' ? xfnv1a(seed) : seed >>> 0);

  return {
    /** Float in [0, 1). */
    float: next,
    /** Integer in [min, max] inclusive. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** True with probability p (default 0.5). */
    bool(p = 0.5) {
      return next() < p;
    },
    /** Pick a random element from a non-empty array. */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** Pick an element by relative weight: [[item, weight], ...]. */
    pickWeighted(weightedArr) {
      const total = weightedArr.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [item, w] of weightedArr) {
        roll -= w;
        if (roll <= 0) return item;
      }
      return weightedArr[weightedArr.length - 1][0];
    },
    /** Fisher-Yates shuffle, in place, returns the same array. */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  };
}
