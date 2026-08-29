/**
 * Places decorative Tile documents on a scene's rooms from whatever art TileLibrary.mjs finds
 * under assets/tiles/ for this floor's setting+theme: one floor-texture tile per room (sized to
 * the room rect, rendered under everything via a very negative `sort`) plus a handful of
 * scattered prop tiles per room (barrels, rubble, altars, etc. - whatever the user has dropped
 * into the props/ folders), scaled by tierConfig.propDensity. Both pools are optional - a room
 * simply gets no floor tile / no props if its pool is empty, so this works with zero art added.
 */
import { buildTileEnvelope } from './envelope.mjs';

const GRID_SIZE = 100;
const FLOOR_SORT = -200;
const PROP_SORT_BASE = -100;
const MAX_PROPS_PER_ROOM = 3;

function placeFloorTile(id, room, img) {
  const { x, y, w, h } = room.rectPx;
  return buildTileEnvelope({ id: id(`tile-floor-${room.id}`), img, x, y, width: w, height: h, sort: FLOOR_SORT });
}

function placeProp(rng, id, room, img, index) {
  const size = rng.int(1, 2) * GRID_SIZE;
  const pad = size / 2 + GRID_SIZE * 0.2;
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
    x: cx - size / 2,
    y: cy - size / 2,
    width: size,
    height: size,
    rotation: rng.int(0, 3) * 90,
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

  const tiles = [];
  for (const room of rooms) {
    if (floorPool.length) {
      tiles.push(placeFloorTile(idFactory, room, rng.pick(floorPool)));
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
