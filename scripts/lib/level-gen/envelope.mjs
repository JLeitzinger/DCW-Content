/**
 * Envelope builders for the document types wrapItem (lib/foundry-item.mjs) doesn't cover -
 * Scene, JournalEntry/JournalEntryPage, and Folder. Same _stats/id conventions as the rest of
 * the pipeline (see foundry-item.mjs's comment for why _stats is stamped up front), but each
 * shape is its own function since these document types don't share an envelope the way every
 * Item subtype does.
 *
 * Field set is intentionally not exhaustive - only what this generator actually sets
 * meaningfully; everything else gets Foundry's own DataModel defaults on load, same as how
 * existing Item content here never fills every possible field either.
 *
 * Scene's background/lighting fields are the one part of this file that's Foundry-version-
 * sensitive (v13 vs the local v14 test install's new `levels` collection - see the level
 * generator plan). Kept isolated in buildSceneEnvelope() on purpose so that's the only
 * function that would need to change if v14 output is needed later.
 */
import { DOCUMENT_STATS } from '../foundry-item.mjs';

/** Foundry v13 Scene document. Embedded collections (walls/lights/notes/regions/tiles/tokens) passed in raw. */
export function buildSceneEnvelope({ id, name, width, height, gridSize, backgroundColor, darknessLevel, walls, lights, notes, regions, tiles = [], tokens = [] }) {
  return {
    _id: id,
    name,
    active: false,
    width,
    height,
    padding: 0.25,
    initial: { x: null, y: null, scale: null },
    background: { src: null, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, tint: '#ffffff' },
    backgroundColor,
    grid: { type: 1, size: gridSize, style: 'solidLines', thickness: 1, color: '#000000', alpha: 0.2, distance: 5, units: 'ft' },
    tokenVision: true,
    environment: {
      darknessLevel,
      darknessLock: false,
      globalLight: {
        enabled: false,
        alpha: 0.5,
        bright: 0,
        color: null,
        coloration: 1,
        contrast: 0,
        darkness: { min: 0, max: 1 },
        luminosity: 0,
        saturation: 0,
        shadows: 0
      }
    },
    drawings: [],
    tokens,
    lights,
    notes,
    regions,
    sounds: [],
    tiles,
    walls,
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: DOCUMENT_STATS
  };
}

/** Foundry JournalEntry document. `pages` is an array of buildJournalPage() results. */
export function buildJournalEntryEnvelope({ id, name, pages, folder }) {
  return {
    _id: id,
    name,
    pages,
    folder: folder ?? null,
    categories: [],
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: DOCUMENT_STATS
  };
}

/** Embedded JournalEntryPage (text type, HTML content) - lives inside a JournalEntry's `pages` array. */
export function buildJournalPage({ id, name, content, sort = 0 }) {
  return {
    _id: id,
    name,
    type: 'text',
    system: {},
    title: { show: true, level: 1 },
    text: { content, markdown: '', format: 1 },
    sort,
    ownership: { default: 0 },
    flags: {}
  };
}

/** Compendium-scoped Folder document (organizes JournalEntry docs within the journals pack). */
export function buildFolderEnvelope({ id, name, type, folder = null, color = '#6a5acd', sort = 0 }) {
  return {
    _id: id,
    name,
    type,
    description: '',
    folder,
    sorting: 'a',
    sort,
    color,
    flags: {},
    _stats: DOCUMENT_STATS
  };
}

/**
 * Embedded Tile Document - a decorative image (floor texture or scattered prop) placed on a
 * Scene by TileGenerator.mjs, sourced from assets/tiles/ via TileLibrary.mjs. Field shape
 * confirmed against the local Foundry install's common/documents/tile.mjs: written here using
 * v13's `occlusion.mode` (single number) rather than v14's `occlusion.modes` (a Set) - same
 * v13-first convention as buildSceneEnvelope's background/environment fields - since
 * BaseTile.migrateData backfills `modes` from `mode` automatically on load, v14 included.
 */
export function buildTileEnvelope({ id, img, x, y, width, height, rotation = 0, sort = 0, alpha = 1, tint = null }) {
  return {
    _id: id,
    texture: { src: img, anchorX: 0.5, anchorY: 0.5, fit: 'fill', scaleX: 1, scaleY: 1, tint: tint ?? '#ffffff', alphaThreshold: 0.75 },
    width,
    height,
    x,
    y,
    elevation: 0,
    sort,
    rotation,
    alpha,
    hidden: false,
    locked: false,
    restrictions: { light: false, weather: false },
    occlusion: { mode: 1, alpha: 0 }, // FADE - tokens standing on/behind the tile fade it rather than vanishing under it
    video: { loop: true, autoplay: true, volume: 0 },
    flags: {}
  };
}

/**
 * Embedded Token Document placed by MonsterGenerator.mjs. `actorId` is a Monsters-compendium
 * Actor's own stable id (see lib/monster-roster.mjs) - NOT this Scene's idFactory - so it stays
 * correct regardless of when/whether that compendium was regenerated. `actorLink: false` means
 * each placed instance tracks its own current health/power independently (an unlinked token
 * gets its own on-the-fly ActorDelta the moment a GM edits its HP in Foundry - no delta needs
 * to be pre-populated here for that to work) rather than three "Warren Wolf" tokens in one room
 * sharing a single HP pool.
 *
 * Important limitation, not fixable from this generator alone: Foundry resolves `actorId`
 * against the world's Actor collection, not compendium content directly. A GM must import the
 * Monsters compendium into their world once (compendium sidebar -> right-click -> Import All)
 * before these tokens resolve to a real actor instead of showing as broken/unknown - see the
 * README's "Populated encounters" section. This is the same constraint every non-Adventure-
 * document Foundry content module with pre-placed tokens has; there is no supported way around
 * it for procedurally generated compendium Scenes.
 */
export function buildTokenEnvelope({ id, actorId, name, img, x, y, disposition = -1 }) {
  return {
    _id: id,
    name,
    actorId,
    actorLink: false,
    delta: null,
    width: 1,
    height: 1,
    texture: { src: img, anchorX: 0.5, anchorY: 0.5, scaleX: 1, scaleY: 1, tint: '#ffffff' },
    x,
    y,
    elevation: 0,
    sort: 0,
    rotation: 0,
    alpha: 1,
    hidden: false,
    locked: false,
    disposition,
    displayName: 20, // HOVER, owner only
    displayBars: 20,
    bar1: { attribute: 'health' },
    bar2: { attribute: 'power' },
    light: { dim: 0, bright: 0 },
    sight: { enabled: false },
    detectionModes: [],
    flags: {}
  };
}
