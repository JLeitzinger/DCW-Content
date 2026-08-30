/**
 * Assembles the primary tactical Scene from GeometryGenerator's rooms/walls + LightingGenerator's
 * lights, places one Note per room (linked to that room's JournalBuilder-generated Room Key
 * entry), and generates conditional sub-scenes for "complex" rooms (boss arenas, secret vaults,
 * or any room carrying 2+ story-graph nodes) - wired to the primary scene bidirectionally via
 * Region + teleportToken RegionBehavior, the real Foundry v13/v14-native transition mechanism
 * (not a macro hack). Field shapes confirmed against the local Foundry install's
 * common/documents/{region,region-behavior,note}.mjs (stable across v13/v14). Every id comes
 * from idFactory (ids.mjs) - Foundry requires a real 16-char id, not a slug (see ids.mjs).
 */
import { buildSceneEnvelope } from './envelope.mjs';
import { generateLights } from './LightingGenerator.mjs';
import { generateTiles } from './TileGenerator.mjs';
import { placeMonsters } from './MonsterGenerator.mjs';

const GRID_SIZE = 100;
const SOLID = { light: 20, move: 20, sight: 20, sound: 20, door: 0, ds: 0, dir: 0, doorSound: '' };
const DOOR = { ...SOLID, door: 1 };

function buildNote(id, room, entryId, text) {
  return {
    _id: id,
    entryId,
    pageId: null,
    x: room.centerPx.x,
    y: room.centerPx.y,
    elevation: 0,
    sort: 0,
    locked: false,
    texture: { src: 'icons/svg/book.svg' },
    iconSize: 40,
    text,
    fontFamily: 'Signika',
    fontSize: 32,
    textAnchor: 1,
    textColor: '#FFFFFF',
    global: false,
    flags: {}
  };
}

function buildTeleportBehavior(id, name, destinationUuid) {
  return {
    _id: id,
    name,
    type: 'teleportToken',
    system: {
      destinations: [destinationUuid],
      placement: 'center',
      snap: true,
      choice: false,
      revealed: false,
      dialog: { revealed: false, unrevealed: false },
      transition: { type: 0, duration: 0 }
    },
    disabled: false,
    flags: {}
  };
}

function buildRegion(id, name, rectPx, behaviors) {
  return {
    _id: id,
    name,
    color: '#ff6400',
    shapes: [{ type: 'rectangle', x: rectPx.x, y: rectPx.y, width: rectPx.w, height: rectPx.h, rotation: 0, hole: false }],
    elevation: { bottom: null, top: null },
    behaviors,
    hidden: false,
    locked: false,
    flags: {}
  };
}

/** A single rectangular room, walled on all sides, with one door centered on the bottom edge. */
function buildInteriorWalls(id, w, h) {
  const gap = GRID_SIZE * 0.6;
  const midX = w / 2;
  return [
    { _id: id('a'), c: [0, 0, w, 0], ...SOLID },
    { _id: id('b'), c: [0, 0, 0, h], ...SOLID },
    { _id: id('c'), c: [w, 0, w, h], ...SOLID },
    { _id: id('d'), c: [0, h, midX - gap / 2, h], ...SOLID },
    { _id: id('e'), c: [midX - gap / 2, h, midX + gap / 2, h], ...DOOR },
    { _id: id('f'), c: [midX + gap / 2, h, w, h], ...SOLID }
  ];
}

/**
 * @param {function(string):string} id - idFactory (ids.mjs) shared with JournalBuilder for this floor.
 * @param {{ pool: Function }} library - TileLibrary.mjs handle; art is optional, see TileGenerator.mjs.
 * @param {string} setting - assets/tiles/<setting>/... bucket, e.g. "dungeon".
 * @param {number} floorTier - resolveComplexityTier()'s 1-5, same value tierConfig was derived from.
 * @param {Array} monsterRoster - lib/monster-roster.mjs's loadMonsterRoster() output; pass [] to disable auto-population.
 * @returns {{ primaryScene: object, subScenes: object[] }}
 */
export function buildScenes(rng, id, theme, geometry, lights, journals, tierConfig, library, setting, floorTier, monsterRoster = []) {
  const { rooms, walls, boundsPx } = geometry;

  const notes = rooms.map(room => buildNote(
    id(`note-room-${room.id}`),
    room,
    journals.roomEntryIdByRoomId.get(room.id),
    room.role.replace(/-/g, ' ')
  ));

  const candidates = rooms.filter(r =>
    r.role === 'boss-arena' || r.role === 'secret-vault' || (journals.nodesByRoom.get(r.id)?.length || 0) >= 2
  );
  const subSceneCount = Math.min(candidates.length, rng.int(tierConfig.subSceneCountMin, tierConfig.subSceneCountMax));
  const subSceneRooms = rng.shuffle([...candidates]).slice(0, subSceneCount);

  const primarySceneId = id('primary');
  const primaryRegions = [];
  const subScenes = [];

  for (const room of subSceneRooms) {
    const subSceneId = id(`sub-${room.id}`);
    const primaryRegionId = id(`region-to-sub-${room.id}`);
    const subRegionId = id(`region-to-primary-${room.id}`);

    const primaryBehavior = buildTeleportBehavior(
      id(`region-to-sub-${room.id}-behavior`),
      `Enter ${room.role.replace(/-/g, ' ')}`,
      `Scene.${subSceneId}.Region.${subRegionId}`
    );
    primaryRegions.push(buildRegion(primaryRegionId, `To ${room.role.replace(/-/g, ' ')} interior`, room.rectPx, [primaryBehavior]));

    const w = room.rectPx.w, h = room.rectPx.h;
    const subBehavior = buildTeleportBehavior(
      id(`region-to-primary-${room.id}-behavior`),
      'Return to floor',
      `Scene.${primarySceneId}.Region.${primaryRegionId}`
    );
    const subRegion = buildRegion(subRegionId, 'Exit', { x: 0, y: h - GRID_SIZE, w, h: GRID_SIZE }, [subBehavior]);

    const localRoom = { id: `sub-${room.id}`, role: room.role, rectPx: { x: 0, y: 0, w, h }, centerPx: { x: w / 2, y: h / 2 } };
    const subScene = buildSceneEnvelope({
      id: subSceneId,
      name: `${theme.name} - ${room.role.replace(/-/g, ' ')} (Room ${room.id})`,
      width: w,
      height: h,
      gridSize: GRID_SIZE,
      backgroundColor: '#1b1b1f',
      darknessLevel: theme.darknessLevel,
      walls: buildInteriorWalls(key => id(`sub-${room.id}-wall-${key}`), w, h),
      lights: generateLights(rng, id, [localRoom], theme),
      notes: [],
      regions: [subRegion],
      tiles: library ? generateTiles(rng, id, [localRoom], theme, setting, library, tierConfig) : [],
      tokens: monsterRoster.length ? placeMonsters(rng, id, [localRoom], theme, floorTier, monsterRoster).tokens : []
    });
    subScenes.push(subScene);
  }

  // Rooms that got their own sub-scene are only fought in *there* - the primary scene's version
  // of that room is a cosmetic passthrough (Region teleports you out before you'd ever meet
  // whatever's placed in it), so excluding them here is what stops the same monster group from
  // effectively existing twice.
  const subSceneRoomIds = new Set(subSceneRooms.map(r => r.id));
  const populableRooms = rooms.filter(r => !subSceneRoomIds.has(r.id));

  const primaryScene = buildSceneEnvelope({
    id: primarySceneId,
    name: theme.name,
    width: boundsPx.width,
    height: boundsPx.height,
    gridSize: GRID_SIZE,
    backgroundColor: '#1b1b1f',
    darknessLevel: theme.darknessLevel,
    walls,
    lights,
    notes,
    regions: primaryRegions,
    tiles: library ? generateTiles(rng, id, rooms, theme, setting, library, tierConfig) : [],
    tokens: monsterRoster.length ? placeMonsters(rng, id, populableRooms, theme, floorTier, monsterRoster).tokens : []
  });

  return { primaryScene, subScenes };
}
