/**
 * Auto-populates a floor's rooms with Token documents referencing the Monsters compendium (see
 * lib/monster-roster.mjs / generate-monsters.mjs) - the "full auto-population" tier of the
 * tile-pack-integration plan's Phase 3. 'entrance' and 'rest-area' are always left empty (the
 * floor's designated safe rooms); every other room role rolls a fill chance and, if it hits,
 * gets one monster group whose band (minion/elite/boss) is picked from the room's role and
 * whose theme is this floor's own themeCategory. Boss-arenas above a size threshold also get a
 * couple of same-theme minion escorts standing with the boss, the same "big room gets a second
 * light" spirit as LightingGenerator's area-based second light.
 *
 * See envelope.mjs's buildTokenEnvelope comment for the one real caveat: these tokens reference
 * compendium Actor ids directly, which only resolve once a GM has imported the Monsters
 * compendium into their world.
 */
import { buildTokenEnvelope } from './envelope.mjs';

const GRID_SIZE = 100;
const SAFE_ROLES = new Set(['entrance', 'rest-area']);

// Chance a given eligible room actually gets populated - not every room should have a fight,
// or a generated floor reads as a gauntlet rather than a place. boss-arena always fills.
const ROOM_FILL_CHANCE = {
  'boss-arena': 1,
  'treasure-vault': 0.7,
  'secret-vault': 0.6,
  'hazard-chamber': 0.65,
  'corridor-junction': 0.5,
  chamber: 0.45
};

function desiredBand(rng, role) {
  switch (role) {
    case 'boss-arena': return 'boss';
    case 'secret-vault':
    case 'hazard-chamber': return 'elite';
    case 'treasure-vault': return rng.bool(0.6) ? 'elite' : 'minion';
    case 'corridor-junction': return rng.bool(0.25) ? 'elite' : 'minion';
    default: return 'minion'; // 'chamber'
  }
}

/** Nearest-tier match within theme+band+role - always returns a hit against the curated roster (every theme has all 3 bands, and every band's roles cover every non-safe room role - see BAND_ROOM_ROLES). */
function pickMonster(rng, roster, themeCategory, band, role, floorTier) {
  const candidates = roster.filter(m => m.themeCategory === themeCategory && m.band === band && m.roles.includes(role));
  return nearestTierPick(rng, candidates, floorTier);
}

/** Role-agnostic variant for boss-room escorts, which aren't standing there for their usual room-role reason. */
function pickMonsterByThemeBand(rng, roster, themeCategory, band, floorTier) {
  const candidates = roster.filter(m => m.themeCategory === themeCategory && m.band === band);
  return nearestTierPick(rng, candidates, floorTier);
}

function nearestTierPick(rng, candidates, floorTier) {
  if (!candidates.length) return null;
  const minDist = Math.min(...candidates.map(m => Math.abs(m.tier - floorTier)));
  return rng.pick(candidates.filter(m => Math.abs(m.tier - floorTier) === minDist));
}

/** Grid cells at least one cell in from the room's walls, shuffled - keeps tokens off the door thresholds. Rooms are always >= 4x4 cells (GeometryGenerator's MIN_LEAF), so a 1-cell margin never empties the pool. */
function interiorCells(rng, room) {
  const cols = room.rectPx.w / GRID_SIZE;
  const rows = room.rectPx.h / GRID_SIZE;
  const cells = [];
  for (let iy = 1; iy < rows - 1; iy++) {
    for (let ix = 1; ix < cols - 1; ix++) {
      cells.push({ ix, iy });
    }
  }
  return rng.shuffle(cells);
}

function makeToken(idFactory, room, monster, cell, index) {
  return buildTokenEnvelope({
    id: idFactory(`token-${room.id}-${index}`),
    actorId: monster.id,
    name: monster.name,
    img: monster.img,
    x: room.rectPx.x + cell.ix * GRID_SIZE,
    y: room.rectPx.y + cell.iy * GRID_SIZE
  });
}

/**
 * @param {Array} roster - lib/monster-roster.mjs's loadMonsterRoster() output.
 * @param {number} floorTier - resolveComplexityTier()'s 1-5, same value SceneBuilder's caller already resolved for tierConfig.
 * @returns {{ tokens: object[], placementsByRoom: Map<number, string[]> }} placementsByRoom is monster names per room id, for optional journal flavor text.
 */
export function placeMonsters(rng, idFactory, rooms, theme, floorTier, roster) {
  const tokens = [];
  const placementsByRoom = new Map();
  let tokenCounter = 0;

  for (const room of rooms) {
    if (SAFE_ROLES.has(room.role)) continue;
    if (!rng.bool(ROOM_FILL_CHANCE[room.role] ?? 0.4)) continue;

    const band = desiredBand(rng, room.role);
    const monster = pickMonster(rng, roster, theme.themeCategory, band, room.role, floorTier);
    if (!monster) continue;

    const cells = interiorCells(rng, room);
    let cellCursor = 0;
    const roomTokens = [];

    const areaInCells = (room.rectPx.w / GRID_SIZE) * (room.rectPx.h / GRID_SIZE);
    let count = 1;
    if (band === 'minion') count = rng.int(1, 3);
    else if (band === 'elite' && areaInCells >= 20 && rng.bool(0.3)) count = 2;

    for (let i = 0; i < count && cellCursor < cells.length; i++, cellCursor++) {
      roomTokens.push(makeToken(idFactory, room, monster, cells[cellCursor], tokenCounter++));
    }

    if (band === 'boss' && areaInCells >= 24) {
      const escort = pickMonsterByThemeBand(rng, roster, theme.themeCategory, 'minion', floorTier);
      if (escort) {
        const escortCount = rng.int(1, 2);
        for (let i = 0; i < escortCount && cellCursor < cells.length; i++, cellCursor++) {
          roomTokens.push(makeToken(idFactory, room, escort, cells[cellCursor], tokenCounter++));
        }
      }
    }

    if (roomTokens.length) {
      tokens.push(...roomTokens);
      placementsByRoom.set(room.id, roomTokens.map(t => t.name));
    }
  }

  return { tokens, placementsByRoom };
}
