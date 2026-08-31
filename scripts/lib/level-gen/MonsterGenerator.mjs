/**
 * Auto-populates a floor's rooms with Token documents - the "full auto-population" tier of the
 * tile-pack-integration plan's Phase 3. 'entrance' and 'rest-area' are always left empty of
 * hostiles (the floor's designated safe rooms), but may get a friendly NPC via
 * placeFriendlyNpcs() below. Every other room role rolls a fill chance and, if it hits, gets one
 * encounter whose band (minion/elite/boss) is picked from the room's role and whose theme is
 * this floor's own themeCategory.
 *
 * The three bands are NOT mechanically identical:
 * - minion: mobs - "easily defeated but dangerous in number" - stay flat dccworldNPC stat blocks
 *   referencing the shared Monsters compendium, exactly as before.
 * - elite: a real dccworldCharacter, freshly built per placement by CharacterGenerator.mjs's
 *   buildEliteCharacter() from the room's picked archetype row - so two elites on the same floor
 *   are never identical builds, even though they share an archetype's art/theme/flavor.
 * - boss: the floor's one pre-built dccworldCharacter (CharacterGenerator.mjs's buildBoss(),
 *   built once in generate-floors.mjs before the story graph so its name/title are already
 *   settled) - reused as-is here, never rebuilt.
 *
 * Boss-arenas above a size threshold also get a couple of same-theme minion escorts standing
 * with the boss, the same "big room gets a second light" spirit as LightingGenerator's
 * area-based second light.
 *
 * See envelope.mjs's buildTokenEnvelope comment for the one real caveat: these tokens reference
 * compendium Actor ids directly, which only resolve once a GM has imported the relevant
 * compendium (Monsters for mobs, Characters for elites/bosses/friendly NPCs) into their world.
 */
import { buildTokenEnvelope } from './envelope.mjs';
import { buildEliteCharacter, buildFriendlyNpc } from './CharacterGenerator.mjs';

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

/**
 * Role-agnostic variant for boss-room escorts and for picking the floor's boss/elite
 * archetype row (see generate-floors.mjs's buildBoss call and this file's own elite handling) -
 * these aren't standing there for a specific room-role reason, they're being cast for a role.
 */
export function pickMonsterByThemeBand(rng, roster, themeCategory, band, floorTier) {
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

/** Mob token - references the shared Monsters compendium roster entry directly (health/power bars, dccworldNPC). */
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

/** Character token (elite/boss/friendly NPC) - references a freshly-built Characters-pack actor (hp/stamina bars, dccworldCharacter). */
function makeCharacterToken(idFactory, room, actor, cell, index, disposition) {
  return buildTokenEnvelope({
    id: idFactory(`token-${room.id}-${index}`),
    actorId: actor._id,
    name: actor.name,
    img: actor.img,
    x: room.rectPx.x + cell.ix * GRID_SIZE,
    y: room.rectPx.y + cell.iy * GRID_SIZE,
    disposition,
    bar1Attribute: 'hp',
    bar2Attribute: 'stamina'
  });
}

/**
 * @param {Array} roster - lib/monster-roster.mjs's loadMonsterRoster() output.
 * @param {number} floorTier - resolveComplexityTier()'s 1-5, same value SceneBuilder's caller already resolved for tierConfig.
 * @param {{actor: object, name: string, title: string, img: string}} [boss] - CharacterGenerator.mjs's
 * buildBoss() result for this floor - required for any boss-arena room to actually get populated.
 * @returns {{ tokens: object[], characterActors: object[], placementsByRoom: Map<number, string[]> }}
 * placementsByRoom is monster/character names per room id, for optional journal flavor text.
 */
export function placeMonsters(rng, idFactory, rooms, theme, floorTier, roster, boss = null) {
  const tokens = [];
  const characterActors = [];
  const placementsByRoom = new Map();
  let tokenCounter = 0;

  for (const room of rooms) {
    if (SAFE_ROLES.has(room.role)) continue;
    if (!rng.bool(ROOM_FILL_CHANCE[room.role] ?? 0.4)) continue;

    const band = desiredBand(rng, room.role);
    const cells = interiorCells(rng, room);
    let cellCursor = 0;
    const roomTokens = [];
    const roomNames = [];
    const areaInCells = (room.rectPx.w / GRID_SIZE) * (room.rectPx.h / GRID_SIZE);

    if (band === 'boss') {
      if (boss && cellCursor < cells.length) {
        roomTokens.push(makeCharacterToken(idFactory, room, boss.actor, cells[cellCursor++], tokenCounter++, -1));
        roomNames.push(boss.actor.name);
      }
    } else if (band === 'elite') {
      const archetype = pickMonster(rng, roster, theme.themeCategory, band, room.role, floorTier);
      if (archetype) {
        const count = areaInCells >= 20 && rng.bool(0.3) ? 2 : 1;
        for (let i = 0; i < count && cellCursor < cells.length; i++, cellCursor++) {
          const actor = buildEliteCharacter(rng, idFactory, `character-elite-${room.id}-${tokenCounter}`, theme, floorTier, archetype);
          characterActors.push(actor);
          roomTokens.push(makeCharacterToken(idFactory, room, actor, cells[cellCursor], tokenCounter++, -1));
          roomNames.push(actor.name);
        }
      }
    } else { // minion
      const monster = pickMonster(rng, roster, theme.themeCategory, band, room.role, floorTier);
      if (monster) {
        const count = rng.int(1, 3);
        for (let i = 0; i < count && cellCursor < cells.length; i++, cellCursor++) {
          roomTokens.push(makeToken(idFactory, room, monster, cells[cellCursor], tokenCounter++));
          roomNames.push(monster.name);
        }
      }
    }

    if (band === 'boss' && roomTokens.length && areaInCells >= 24) {
      const escort = pickMonsterByThemeBand(rng, roster, theme.themeCategory, 'minion', floorTier);
      if (escort) {
        const escortCount = rng.int(1, 2);
        for (let i = 0; i < escortCount && cellCursor < cells.length; i++, cellCursor++) {
          roomTokens.push(makeToken(idFactory, room, escort, cells[cellCursor], tokenCounter++));
          roomNames.push(escort.name);
        }
      }
    }

    if (roomTokens.length) {
      tokens.push(...roomTokens);
      placementsByRoom.set(room.id, roomNames);
    }
  }

  return { tokens, characterActors, placementsByRoom };
}

/**
 * Places one flavor-only friendly NPC per floor (see CharacterGenerator.mjs's buildFriendlyNpc)
 * in a rest-area room if the floor has one, otherwise the entrance - the two SAFE_ROLES
 * placeMonsters() always leaves empty of hostiles. Token disposition is FRIENDLY (1), not the
 * hostile default.
 * @returns {{ tokens: object[], characterActors: object[] }}
 */
export function placeFriendlyNpcs(rng, idFactory, rooms, theme, floorTier) {
  const restAreas = rooms.filter(r => r.role === 'rest-area');
  const entrances = rooms.filter(r => r.role === 'entrance');
  const pool = restAreas.length ? restAreas : entrances;
  if (!pool.length) return { tokens: [], characterActors: [] };

  const room = rng.pick(pool);
  const cells = interiorCells(rng, room);
  if (!cells.length) return { tokens: [], characterActors: [] };

  const npc = buildFriendlyNpc(rng, idFactory, 'character-friendly-0', theme, floorTier);
  const token = makeCharacterToken(idFactory, room, npc.actor, cells[0], 0, 1);

  return { tokens: [token], characterActors: [npc.actor] };
}
