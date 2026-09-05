/**
 * Turns a LevelStoryGraph + generated rooms into Folder/JournalEntry/JournalEntryPage
 * documents: a "Room Keys" entry per room (always present - read-aloud text + GM secret
 * section), plus floor-level "Main Plot"/"Secrets"/"Random Encounters" entries. Real ids come
 * from idFactory (see ids.mjs - Foundry requires a 16-char alphanumeric _id, validated eagerly
 * enough that a wrong one crashes the whole game view); `logicalKey`s like "room-14" or
 * "folder-main-plot" are just how callers ask for the *same* id twice (e.g. a JournalEntry's
 * own id vs. a Note's entryId pointing at it).
 */
import { getCategory, pickRoomText, pickHazard, pickEncounterHook, pickRoomDetail, pickBreatherDetail } from './lexicon.mjs';
import { buildJournalEntryEnvelope, buildJournalPage, buildFolderEnvelope } from './envelope.mjs';

function roomLabel(room) {
  return room.role.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Friendlier GM-notes labels for story-graph node kinds than a mechanical title-case of the
// kind string would give (e.g. "cast-intro" -> "Cast intro"). Anything not listed here falls
// back to that title-case default, so a new node kind never crashes, it just reads a bit flat.
const KIND_LABELS = {
  'sidequest': 'Subquest',
  'cast-intro': 'Meet',
  'flavor-prompt': 'Say if asked',
  'substory-beat': 'Substory beat'
};

function nodeLabel(node) {
  return KIND_LABELS[node.kind] || node.kind.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

/** Match each story-graph node needing a room (requiredRoomRole) to an actual generated room. */
function assignNodesToRooms(rooms, nodes) {
  const byRole = new Map();
  for (const room of rooms) {
    if (!byRole.has(room.role)) byRole.set(room.role, []);
    byRole.get(room.role).push(room);
  }
  const roleCursor = new Map();
  const placements = new Map(); // nodeId -> room
  for (const node of nodes) {
    if (!node.requiredRoomRole) continue;
    let pool = byRole.get(node.requiredRoomRole);
    if (!pool || pool.length === 0) pool = rooms; // role doesn't exist on this floor - fall back to any room
    const cursor = roleCursor.get(node.requiredRoomRole) || 0;
    roleCursor.set(node.requiredRoomRole, cursor + 1);
    placements.set(node.id, pool[cursor % pool.length]);
  }
  return placements;
}

function buildRoomKeyEntry(rng, id, theme, category, room, placedNodes, tierConfig, folderId, secretNodes) {
  // {domain}/{adj} deliberately re-roll per room (see StoryGenerator.mjs's overrides comment on
  // why {threat}/{cast} are pinned floor-wide instead) - two rooms of the same role should be
  // able to name different districts/textures even on one floor.
  const roomOverrides = { threat: theme.threat, cast: theme.cast.name };
  let readAloud = pickRoomText(rng, category, theme.themeCategory, room.role, roomOverrides);
  // A second sentence, about half the time, so rooms sharing a role don't all read as the same
  // template with a different adjective swapped in.
  if (rng.bool(0.5)) {
    readAloud += ` ${pickRoomDetail(rng, category, roomOverrides)}`;
  }

  const secretParts = [];
  if (room.role === 'boss-arena') {
    secretParts.push('<p><strong>Objective:</strong> The stairwell down to the next floor is here - whatever holds this room is standing between the party and it.</p>');
  }
  secretParts.push(...placedNodes.map(node => `<p><strong>${nodeLabel(node)}:</strong> ${node.text}</p>`));
  // The secret's non-combat payoff belongs with the boss, not wherever the secret-vault happens
  // to land - it's useless as a note anywhere else, and easy for a GM to miss if it's buried in
  // an unrelated room's key instead.
  if (room.role === 'boss-arena' && secretNodes) {
    for (const secret of secretNodes) {
      if (secret.payoffText) {
        secretParts.push(`<p><strong>Non-combat option:</strong> ${secret.payoffText}</p>`);
      }
    }
  }
  if (rng.bool(0.25)) {
    secretParts.push(`<p><strong>Hazard:</strong> ${pickHazard(rng, tierConfig.dcBonus)}</p>`);
  }
  if ((room.role === 'hazard-chamber' || room.role === 'corridor-junction') && rng.bool(0.4)) {
    secretParts.push(`<p><strong>Encounter:</strong> ${pickEncounterHook(rng)}</p>`);
  }
  // A room with no story-graph content at all still gets a chance at pure color (no mechanical
  // weight, just texture) instead of defaulting straight to "nothing here" - but not always: a
  // real breather room here and there is good pacing, not a gap to fill.
  let secretHtml;
  if (secretParts.length) {
    secretHtml = `<section class="secret"><h3>GM Notes</h3>${secretParts.join('')}</section>`;
  } else if (rng.bool(0.65)) {
    secretHtml = `<section class="secret"><h3>GM Notes</h3><p><strong>Detail:</strong> ${pickBreatherDetail(rng, category, roomOverrides)}</p></section>`;
  } else {
    secretHtml = `<section class="secret"><h3>GM Notes</h3><p>Nothing special here - a breather room.</p></section>`;
  }

  const name = `${roomLabel(room)} (Room ${room.id})`;
  const entryId = id(`room-${room.id}`);
  const page = buildJournalPage({ id: id(`room-${room.id}-page`), name, content: `<p>${readAloud}</p>${secretHtml}` });
  return buildJournalEntryEnvelope({ id: entryId, name, pages: [page], folder: folderId });
}

function buildMainPlotEntry(id, theme, storyGraph, placements, folderId) {
  const pages = [
    buildJournalPage({
      id: id('plot-overview'),
      name: 'Floor Overview',
      content: `<p><strong>${theme.name}</strong></p><p>${storyGraph.mainArc.text}</p>`,
      sort: 0
    })
  ];
  storyGraph.milestones.forEach((m, i) => {
    const room = placements.get(m.id);
    pages.push(buildJournalPage({
      id: id(`plot-milestone-${i}`),
      name: `Milestone ${i + 1}`,
      content: `<p>${m.text}</p><p><em>Tied to: ${room ? `${roomLabel(room)} (Room ${room.id})` : 'unplaced'}</em></p>`,
      sort: i + 1
    }));
  });
  storyGraph.subStories.forEach((s, i) => {
    pages.push(buildJournalPage({
      id: id(`plot-substory-${i}`),
      name: `Sub-story ${i + 1}`,
      content: `<p>${s.text}</p>`,
      sort: storyGraph.milestones.length + i + 1
    }));
  });
  return buildJournalEntryEnvelope({ id: id('floor-story'), name: 'The Story So Far', pages, folder: folderId });
}

function buildSecretEntries(id, storyGraph, placements, folderId) {
  return storyGraph.nodes.filter(n => n.kind === 'secret').map((n, i) => {
    const room = placements.get(n.id);
    const content = `<p>${n.text}</p><p><em>Located in: ${room ? `${roomLabel(room)} (Room ${room.id})` : 'unplaced'}</em></p>`;
    const entryId = id(`secret-${i}`);
    const page = buildJournalPage({ id: id(`secret-${i}-page`), name: `Secret ${i + 1}`, content });
    return buildJournalEntryEnvelope({ id: entryId, name: `Secret ${i + 1}`, pages: [page], folder: folderId });
  });
}

function buildEncounterEntry(id, storyGraph, placements, folderId) {
  const rows = storyGraph.nodes
    .filter(n => n.kind === 'encounter')
    .map(n => {
      const room = placements.get(n.id);
      return `<li>${n.text}${room ? ` (near ${roomLabel(room)}, Room ${room.id})` : ''}</li>`;
    })
    .join('');
  const content = `<p>Roll on this table (or reuse an entry) whenever a random encounter check triggers on this floor:</p><ul>${rows}</ul>`;
  const entryId = id('floor-encounters');
  const page = buildJournalPage({ id: id('floor-encounters-page'), name: 'Random Encounters', content });
  return buildJournalEntryEnvelope({ id: entryId, name: 'Random Encounters', pages: [page], folder: folderId });
}

/**
 * @param {function(string):string} id - idFactory (ids.mjs) shared with SceneBuilder for this floor.
 * @returns {{ folders: Array, entries: Array, roomEntryIdByRoomId: Map<number,string>, nodesByRoom: Map<number,Array> }}
 */
export function buildJournals(rng, id, theme, storyGraph, rooms, tierConfig) {
  const category = getCategory(theme.themeCategory);
  const placements = assignNodesToRooms(rooms, storyGraph.nodes);

  // Nested under one per-floor root folder - with multiple floors in the compendium, 4 flat
  // top-level folders per floor would put several identically-named "Room Keys"/"Secrets"
  // folders side by side in the sidebar with nothing to tell them apart.
  const rootFolderId = id('folder-floor-root');
  const folderIds = {
    mainPlot: id('folder-main-plot'),
    secrets: id('folder-secrets'),
    encounters: id('folder-random-encounters'),
    roomKeys: id('folder-room-keys')
  };
  const folders = [
    buildFolderEnvelope({ id: rootFolderId, name: theme.name, type: 'JournalEntry', sort: 0 }),
    buildFolderEnvelope({ id: folderIds.mainPlot, name: 'Main Plot', type: 'JournalEntry', folder: rootFolderId, sort: 0 }),
    buildFolderEnvelope({ id: folderIds.secrets, name: 'Secrets', type: 'JournalEntry', folder: rootFolderId, sort: 1 }),
    buildFolderEnvelope({ id: folderIds.encounters, name: 'Random Encounters', type: 'JournalEntry', folder: rootFolderId, sort: 2 }),
    buildFolderEnvelope({ id: folderIds.roomKeys, name: 'Room Keys', type: 'JournalEntry', folder: rootFolderId, sort: 3 })
  ];

  const nodesByRoom = new Map();
  for (const [nodeId, room] of placements.entries()) {
    if (!nodesByRoom.has(room.id)) nodesByRoom.set(room.id, []);
    nodesByRoom.get(room.id).push(storyGraph.nodes.find(n => n.id === nodeId));
  }

  const secretNodes = storyGraph.nodes.filter(n => n.kind === 'secret');
  const roomEntries = rooms.map(room =>
    buildRoomKeyEntry(rng, id, theme, category, room, nodesByRoom.get(room.id) || [], tierConfig, folderIds.roomKeys, secretNodes)
  );
  const mainPlotEntry = buildMainPlotEntry(id, theme, storyGraph, placements, folderIds.mainPlot);
  const secretEntries = buildSecretEntries(id, storyGraph, placements, folderIds.secrets);
  const encounterEntry = buildEncounterEntry(id, storyGraph, placements, folderIds.encounters);

  return {
    folders,
    entries: [mainPlotEntry, ...secretEntries, encounterEntry, ...roomEntries],
    roomEntryIdByRoomId: new Map(rooms.map(r => [r.id, id(`room-${r.id}`)])),
    nodesByRoom
  };
}
