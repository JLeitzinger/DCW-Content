/**
 * Scans assets/tiles/<setting>/<themeCategory-or-_generic>/<floors|props>/ for image files
 * TileGenerator.mjs can scatter across a floor as decorative Tile documents. Entirely optional:
 * an empty or missing folder just means TileGenerator emits nothing for that slot - dropping
 * art in later is enough, nothing else in the pipeline needs to change or re-run by hand beyond
 * the normal generate:floors.
 *
 * Foundry serves any file under a module's own root by its module-relative path
 * ("modules/dcw-content/assets/tiles/..."), so no packing/registration step is needed beyond
 * committing the image files - unlike compendium content, these never go through classic-level.
 */
import fs from 'fs';
import path from 'path';

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg']);
const MODULE_ID = 'dcw-content';
const GENERIC = '_generic';

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort();
}

/**
 * @param {string} assetsRoot - absolute path to <repo>/assets/tiles
 * @returns {{ pool: (setting: string, themeCategory: string, kind: 'floors'|'props') => string[] }}
 */
export function loadTileLibrary(assetsRoot) {
  const cache = new Map();

  function pool(setting, themeCategory, kind) {
    const key = `${setting}/${themeCategory}/${kind}`;
    if (cache.has(key)) return cache.get(key);

    const toModulePath = (bucket, f) => `modules/${MODULE_ID}/assets/tiles/${setting}/${bucket}/${kind}/${f}`;
    const combined = [
      ...listImages(path.join(assetsRoot, setting, themeCategory, kind)).map(f => toModulePath(themeCategory, f)),
      ...listImages(path.join(assetsRoot, setting, GENERIC, kind)).map(f => toModulePath(GENERIC, f))
    ];

    cache.set(key, combined);
    return combined;
  }

  return { pool };
}
