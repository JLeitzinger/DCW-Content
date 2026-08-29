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

/** Foundry v13 Scene document. Embedded collections (walls/lights/notes/regions) passed in raw. */
export function buildSceneEnvelope({ id, name, width, height, gridSize, backgroundColor, darknessLevel, walls, lights, notes, regions }) {
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
    tokens: [],
    lights,
    notes,
    regions,
    sounds: [],
    tiles: [],
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
