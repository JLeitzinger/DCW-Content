/**
 * Places decorative Tile documents on a scene's rooms from whatever art TileLibrary.mjs finds
 * under assets/tiles/ for this floor's setting+theme: one floor-texture tile per grid cell
 * (native 1:1 with the scene's grid, rendered under everything via a very negative `sort`) plus
 * a handful of scattered prop tiles per room (barrels, rubble, altars, etc. - whatever the user
 * has dropped into the props/ folders), scaled by tierConfig.propDensity. Both pools are
 * optional - a room simply gets no floor tiles / no props if its pool is empty, so this works
 * with zero art added.
 *
 * Floor cells vary within a room the way real terrain does: most of a room reads as one
 * consistent material (its primary family - see familyKey below), but a room can also get one
 * or two secondary-material patches biased toward an edge (a doorway threshold, the base of a
 * wall - the natural place a floor material actually changes), e.g. a patch of bare dirt against
 * one wall of an otherwise mossy stone room. Every cell picks its own file from within whichever
 * family it landed in, so numbered variants of the same material (acidic_floor_0/1/2/3, etc.)
 * scatter naturally instead of repeating one exact image edge-to-edge.
 */
import { buildTileEnvelope } from './envelope.mjs';

const GRID_SIZE = 100;
const FLOOR_SORT = -200;
const PROP_SORT_BASE = -100;
const MAX_PROPS_PER_ROOM = 3;
// Props are single-grid-cell map icons (DCSS's own dungeon-feature art is drawn at exactly this
// scale) - only something the manifest/art explicitly calls out as oversized should ever exceed
// this, and nothing in the current props pool (altars/statues/traps/water/trees/chests/
// fountains/boulders/sarcophagi) does.
const PROP_SIZE = GRID_SIZE;

/** Groups a floor pool's filenames into "same material, different variant" families. */
function familyKey(imgPath) {
  const base = imgPath.split('/').pop().replace(/\.(webp|png|jpe?g)$/i, '');
  let key = base;
  for (let i = 0; i < 2; i++) {
    const stripped = key.replace(/_(?:new|old)$/i, '').replace(/_\d+[a-z]?$/i, '');
    if (stripped === key) break;
    key = stripped;
  }
  return key;
}

function buildFamilies(pool) {
  const families = new Map();
  for (const img of pool) {
    const key = familyKey(img);
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(img);
  }
  return families;
}

/** A small rectangle of cell-coordinates biased toward one edge of the room. */
function randomPatchRect(rng, cols, rows) {
  const maxDim = Math.max(1, Math.floor(Math.min(cols, rows) / 2));
  const pw = rng.int(1, Math.min(maxDim, cols));
  const ph = rng.int(1, Math.min(maxDim, rows));
  const edge = rng.pick(['top', 'bottom', 'left', 'right']);
  if (edge === 'top') return { x0: rng.int(0, cols - pw), y0: 0, w: pw, h: ph };
  if (edge === 'bottom') return { x0: rng.int(0, cols - pw), y0: rows - ph, w: pw, h: ph };
  if (edge === 'left') return { x0: 0, y0: rng.int(0, rows - ph), w: pw, h: ph };
  return { x0: cols - pw, y0: rng.int(0, rows - ph), w: pw, h: ph };
}

/** Picks a primary family plus 0-2 secondary-family edge patches for one room. */
function planRoomFloor(rng, families, cols, rows) {
  const keys = [...families.keys()];
  const primary = rng.pick(keys);
  const totalCells = cols * rows;
  const maxPatches = totalCells >= 12 ? 2 : totalCells >= 6 ? 1 : 0;
  const patches = [];
  if (keys.length > 1 && maxPatches > 0) {
    const patchCount = rng.int(0, maxPatches);
    const used = new Set([primary]);
    for (let i = 0; i < patchCount; i++) {
      const candidates = keys.filter(k => !used.has(k));
      if (!candidates.length) break;
      const family = rng.pick(candidates);
      used.add(family);
      patches.push({ family, rect: randomPatchRect(rng, cols, rows) });
    }
  }
  return { primary, patches };
}

function familyForCell(plan, ix, iy) {
  for (const { family, rect } of plan.patches) {
    if (ix >= rect.x0 && ix < rect.x0 + rect.w && iy >= rect.y0 && iy < rect.y0 + rect.h) return family;
  }
  return plan.primary;
}

function placeFloorTile(id, room, cellIndex, cellX, cellY, img) {
  return buildTileEnvelope({
    id: id(`tile-floor-${room.id}-${cellIndex}`),
    img,
    x: cellX,
    y: cellY,
    width: GRID_SIZE,
    height: GRID_SIZE,
    sort: FLOOR_SORT
  });
}

function placeProp(rng, id, room, img, index) {
  const pad = PROP_SIZE / 2 + GRID_SIZE * 0.2;
  const { x, y, w, h } = room.rectPx;
  // Rooms can be smaller than 2x padding on a tight BSP split - clamp so int(min,max) never
  // gets a min > max, which would throw.
  const minCx = x + Math.min(pad, w / 2), maxCx = x + w - Math.min(pad, w / 2);
  const minCy = y + Math.min(pad, h / 2), maxCy = y + h - Math.min(pad, h / 2);
  const cx = rng.int(Math.round(minCx), Math.round(maxCx));
  const cy = rng.int(Math.round(minCy), Math.round(maxCy));
  return buildTileEnvelope({
    id: id(`tile-prop-${room.id}-${index}`),
    img,
    x: cx - PROP_SIZE / 2,
    y: cy - PROP_SIZE / 2,
    width: PROP_SIZE,
    height: PROP_SIZE,
    sort: PROP_SORT_BASE + index
  });
}

/**
 * @param {{ pool: (setting: string, themeCategory: string, kind: 'floors'|'props') => string[] }} library
 * @returns {object[]} Tile envelopes for every room in `rooms`.
 */
export function generateTiles(rng, idFactory, rooms, theme, setting, library, tierConfig) {
  const floorPool = library.pool(setting, theme.themeCategory, 'floors');
  const propPool = library.pool(setting, theme.themeCategory, 'props');
  if (floorPool.length === 0 && propPool.length === 0) return [];

  const floorFamilies = floorPool.length ? buildFamilies(floorPool) : null;

  const tiles = [];
  for (const room of rooms) {
    if (floorFamilies) {
      const { x, y, w, h } = room.rectPx;
      const cols = w / GRID_SIZE, rows = h / GRID_SIZE;
      const plan = planRoomFloor(rng, floorFamilies, cols, rows);
      let cellIndex = 0;
      for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
          const family = familyForCell(plan, ix, iy);
          const img = rng.pick(floorFamilies.get(family));
          tiles.push(placeFloorTile(idFactory, room, cellIndex++, x + ix * GRID_SIZE, y + iy * GRID_SIZE, img));
        }
      }
    }
    if (propPool.length) {
      const areaInCells = (room.rectPx.w / GRID_SIZE) * (room.rectPx.h / GRID_SIZE);
      const maxProps = Math.min(MAX_PROPS_PER_ROOM, Math.floor(areaInCells * tierConfig.propDensity));
      const propCount = maxProps > 0 ? rng.int(0, maxProps) : 0;
      for (let i = 0; i < propCount; i++) {
        tiles.push(placeProp(rng, idFactory, room, rng.pick(propPool), i));
      }
    }
  }
  return tiles;
}
