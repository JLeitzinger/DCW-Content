/**
 * BSP room+wall generator. Splits a bounding rect (in grid cells) into leaf cells until there
 * are >= roomCountTarget of them; every leaf *is* a room (no separate corridor tunnels - two
 * adjacent leaves share a wall line, and a "connection" between them is just a door punched
 * into that shared segment). This keeps wall generation exact: because BSP splitting fully
 * tiles the bounding rect with no gaps, any edge segment NOT covered by a neighboring leaf is
 * guaranteed to be the true outer perimeter - no separate bookkeeping needed for "is this an
 * exterior wall".
 *
 * Wall enum values below are Foundry's real CONST values (confirmed against the local Foundry
 * install's common/constants.mjs, stable across v13/v14 - only Scene's background/lighting
 * fields differ by version, isolated in envelope.mjs):
 *   EDGE_SENSE_TYPES: NONE=0, NORMAL=20 (blocks sight/light/sound)
 *   WALL_MOVEMENT_TYPES: NONE=0, NORMAL=20 (blocks movement) - no LIMITED for movement
 *   WALL_DOOR_TYPES: NONE=0, DOOR=1, SECRET=2
 *   WALL_DOOR_STATES: CLOSED=0
 */
const MIN_LEAF = 4; // grid cells

const WALL_SOLID = { light: 20, move: 20, sight: 20, sound: 20, door: 0, ds: 0, dir: 0, doorSound: '' };
const WALL_WINDOW = { light: 0, move: 20, sight: 0, sound: 0, door: 0, ds: 0, dir: 0, doorSound: '' }; // blocks movement, not vision/light - per spec
const WALL_DOOR = { light: 20, move: 20, sight: 20, sound: 20, door: 1, ds: 0, dir: 0, doorSound: '' };
const WALL_SECRET_DOOR = { light: 20, move: 20, sight: 20, sound: 20, door: 2, ds: 0, dir: 0, doorSound: '' };

function splitIntoLeaves(rng, cols, rows, targetCount) {
  let leaves = [{ x: 0, y: 0, w: cols, h: rows, id: 0 }];
  let nextId = 1;
  while (leaves.length < targetCount) {
    leaves.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const biggest = leaves[0];
    const canH = biggest.w >= MIN_LEAF * 2;
    const canV = biggest.h >= MIN_LEAF * 2;
    if (!canH && !canV) break; // nothing left worth splitting further
    leaves.shift();
    const splitVertical = canH && (!canV || rng.bool(0.5));
    if (splitVertical) {
      const cut = rng.int(MIN_LEAF, biggest.w - MIN_LEAF);
      leaves.push({ x: biggest.x, y: biggest.y, w: cut, h: biggest.h, id: nextId++ });
      leaves.push({ x: biggest.x + cut, y: biggest.y, w: biggest.w - cut, h: biggest.h, id: nextId++ });
    } else {
      const cut = rng.int(MIN_LEAF, biggest.h - MIN_LEAF);
      leaves.push({ x: biggest.x, y: biggest.y, w: biggest.w, h: cut, id: nextId++ });
      leaves.push({ x: biggest.x, y: biggest.y + cut, w: biggest.w, h: biggest.h - cut, id: nextId++ });
    }
  }
  return leaves;
}

function findAdjacency(leaves) {
  const adjacency = [];
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      const shareVertical = (a.x + a.w === b.x || b.x + b.w === a.x) &&
        Math.max(a.y, b.y) < Math.min(a.y + a.h, b.y + b.h);
      const shareHorizontal = (a.y + a.h === b.y || b.y + b.h === a.y) &&
        Math.max(a.x, b.x) < Math.min(a.x + a.w, b.x + b.w);
      if (shareVertical || shareHorizontal) {
        adjacency.push({ a: a.id, b: b.id, axis: shareVertical ? 'vertical' : 'horizontal' });
      }
    }
  }
  return adjacency;
}

/** Randomized spanning tree (Kruskal-style, shuffled edges) - guarantees full connectivity. */
function spanningTree(leaves, adjacency, rng) {
  const parent = new Map(leaves.map(l => [l.id, l.id]));
  const find = x => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const shuffled = rng.shuffle([...adjacency]);
  const tree = [];
  for (const edge of shuffled) {
    const ra = find(edge.a), rb = find(edge.b);
    if (ra !== rb) {
      parent.set(ra, rb);
      tree.push(edge);
    }
  }
  return tree;
}

function assignRoles(leaves, connections, rng) {
  const degree = new Map(leaves.map(l => [l.id, 0]));
  const graph = new Map(leaves.map(l => [l.id, []]));
  for (const c of connections) {
    degree.set(c.a, degree.get(c.a) + 1);
    degree.set(c.b, degree.get(c.b) + 1);
    graph.get(c.a).push({ id: c.b, secret: c.secret });
    graph.get(c.b).push({ id: c.a, secret: c.secret });
  }

  // Entrance: leaf closest to the origin corner (deterministic, seed-driven only via ties).
  const sorted = [...leaves].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const entrance = sorted[0];

  // BFS distances from the entrance over the connection graph.
  const dist = new Map([[entrance.id, 0]]);
  const queue = [entrance.id];
  while (queue.length) {
    const cur = queue.shift();
    for (const { id } of graph.get(cur) || []) {
      if (!dist.has(id)) {
        dist.set(id, dist.get(cur) + 1);
        queue.push(id);
      }
    }
  }

  let bossId = entrance.id, bossScore = -1;
  for (const l of leaves) {
    const d = dist.get(l.id) ?? 0;
    const score = d * (l.w * l.h);
    if (score > bossScore) { bossScore = score; bossId = l.id; }
  }

  const roles = new Map();
  roles.set(entrance.id, 'entrance');
  roles.set(bossId, 'boss-arena');

  const rotation = ['chamber', 'rest-area', 'hazard-chamber'];
  let rotationIndex = 0;
  for (const l of leaves) {
    if (roles.has(l.id)) continue;
    const d = degree.get(l.id);
    const isDeadEnd = d <= 1;
    const viaSecret = (graph.get(l.id) || []).some(e => e.secret);
    if (isDeadEnd && viaSecret) {
      roles.set(l.id, 'secret-vault');
    } else if (isDeadEnd) {
      roles.set(l.id, 'treasure-vault');
    } else if (d >= 3) {
      roles.set(l.id, 'corridor-junction');
    } else {
      roles.set(l.id, rotation[rotationIndex % rotation.length]);
      rotationIndex++;
    }
  }

  return { roles };
}

/**
 * Generate a floor's room graph + wall geometry. `layout: 'grid'` picks generateGridGeometry
 * below instead of the BSP algorithm above - same return shape either way, so every downstream
 * consumer (SceneBuilder/JournalBuilder/LightingGenerator/MonsterGenerator) is layout-agnostic.
 * @param {object} idFactory - see ids.mjs; used to mint each Wall's required 16-char _id.
 * @returns {{ rooms: Array, walls: Array, boundsPx: {width:number, height:number} }}
 */
export function generateGeometry(rng, idFactory, { roomCountTarget, gridSize = 100, secretDoorChance = 0.1, layout = 'bsp' }) {
  if (layout === 'grid') return generateGridGeometry(rng, idFactory, { roomCountTarget, gridSize, secretDoorChance });
  return generateBspGeometry(rng, idFactory, { roomCountTarget, gridSize, secretDoorChance });
}

function generateBspGeometry(rng, idFactory, { roomCountTarget, gridSize, secretDoorChance }) {
  // Each leaf needs >= MIN_LEAF*MIN_LEAF cells to exist post-split, so the bounding rect needs
  // comfortably more than roomCountTarget * MIN_LEAF^2 total area or splitting stalls out
  // before reaching the target (greedy split-the-biggest-leaf runs out of splittable leaves).
  // ~37 cells/room average gives ~2x headroom over the MIN_LEAF=4 minimum (16 cells/room).
  const cols = Math.max(MIN_LEAF * 2, Math.round(Math.sqrt(roomCountTarget) * 7));
  const rows = Math.max(MIN_LEAF * 2, Math.round(Math.sqrt(roomCountTarget) * 5.25));

  const leaves = splitIntoLeaves(rng, cols, rows, roomCountTarget);
  const adjacency = findAdjacency(leaves);
  const tree = spanningTree(leaves, adjacency, rng);
  const treeKeys = new Set(tree.map(e => `${e.a}:${e.b}`));
  const extraCount = Math.floor(adjacency.length * 0.15);
  const remaining = rng.shuffle(adjacency.filter(e => !treeKeys.has(`${e.a}:${e.b}`)));
  const connections = [...tree, ...remaining.slice(0, extraCount)].map(e => ({
    ...e,
    secret: rng.bool(secretDoorChance)
  }));

  const { roles } = assignRoles(leaves, connections, rng);

  const px = n => n * gridSize;
  const walls = [];
  let wallCounter = 0;

  function emitSegment(x0, y0, x1, y1, preset) {
    if (x0 === x1 && y0 === y1) return;
    walls.push({ _id: idFactory(`wall-${wallCounter++}`), c: [px(x0), px(y0), px(x1), px(y1)], ...preset });
  }

  function emitWithDoor(x0, y0, x1, y1, isSecret) {
    const doorPreset = isSecret ? WALL_SECRET_DOOR : WALL_DOOR;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const gap = Math.min(1, len * 0.4);
    const midX = (x0 + x1) / 2, midY = (y0 + y1) / 2;
    const ux = dx / len, uy = dy / len;
    const beforeX = midX - ux * (gap / 2), beforeY = midY - uy * (gap / 2);
    const afterX = midX + ux * (gap / 2), afterY = midY + uy * (gap / 2);
    emitSegment(x0, y0, beforeX, beforeY, WALL_SOLID);
    emitSegment(beforeX, beforeY, afterX, afterY, doorPreset);
    emitSegment(afterX, afterY, x1, y1, WALL_SOLID);
  }

  const connectionByKey = new Map(connections.map(c => [c.a < c.b ? `${c.a}:${c.b}` : `${c.b}:${c.a}`, c]));

  // Interior shared borders (exactly two leaves each, since BSP tiles the rect with no gaps).
  for (const edge of adjacency) {
    const a = leaves.find(l => l.id === edge.a);
    const b = leaves.find(l => l.id === edge.b);
    const key = edge.a < edge.b ? `${edge.a}:${edge.b}` : `${edge.b}:${edge.a}`;
    const connection = connectionByKey.get(key);

    if (edge.axis === 'vertical') {
      const x = a.x + a.w === b.x ? a.x + a.w : b.x + b.w;
      const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
      if (connection) emitWithDoor(x, y0, x, y1, connection.secret);
      else emitSegment(x, y0, x, y1, WALL_SOLID);
    } else {
      const y = a.y + a.h === b.y ? a.y + a.h : b.y + b.h;
      const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
      if (connection) emitWithDoor(x0, y, x1, y, connection.secret);
      else emitSegment(x0, y, x1, y, WALL_SOLID);
    }
  }

  // Exterior perimeter: for each leaf side, the sub-segments NOT covered by any adjacent leaf.
  for (const leaf of leaves) {
    for (const side of ['top', 'bottom', 'left', 'right']) {
      const isVerticalSide = side === 'left' || side === 'right';
      const fullStart = isVerticalSide ? leaf.y : leaf.x;
      const fullEnd = isVerticalSide ? leaf.y + leaf.h : leaf.x + leaf.w;
      const fixedCoord = side === 'left' ? leaf.x : side === 'right' ? leaf.x + leaf.w
        : side === 'top' ? leaf.y : leaf.y + leaf.h;
      const axis = isVerticalSide ? 'vertical' : 'horizontal';

      const covered = adjacency
        .filter(e => {
          if (e.axis !== axis) return false;
          if (e.a !== leaf.id && e.b !== leaf.id) return false;
          const other = leaves.find(l => l.id === (e.a === leaf.id ? e.b : e.a));
          if (isVerticalSide) {
            const otherX = side === 'right' ? other.x : other.x + other.w;
            return otherX === fixedCoord;
          }
          const otherY = side === 'bottom' ? other.y : other.y + other.h;
          return otherY === fixedCoord;
        })
        .map(e => {
          const other = leaves.find(l => l.id === (e.a === leaf.id ? e.b : e.a));
          return isVerticalSide
            ? [Math.max(leaf.y, other.y), Math.min(leaf.y + leaf.h, other.y + other.h)]
            : [Math.max(leaf.x, other.x), Math.min(leaf.x + leaf.w, other.x + other.w)];
        })
        .sort((a, b) => a[0] - b[0]);

      let cursor = fullStart;
      for (const [s, e] of covered) {
        if (s > cursor) emitExterior(cursor, s);
        cursor = Math.max(cursor, e);
      }
      if (cursor < fullEnd) emitExterior(cursor, fullEnd);

      function emitExterior(s, e) {
        const isWindow = rng.bool(0.06);
        const preset = isWindow ? WALL_WINDOW : WALL_SOLID;
        if (isVerticalSide) emitSegment(fixedCoord, s, fixedCoord, e, preset);
        else emitSegment(s, fixedCoord, e, fixedCoord, preset);
      }
    }
  }

  const degree = new Map(leaves.map(l => [l.id, 0]));
  for (const c of connections) {
    degree.set(c.a, degree.get(c.a) + 1);
    degree.set(c.b, degree.get(c.b) + 1);
  }

  const rooms = leaves.map(l => ({
    id: l.id,
    role: roles.get(l.id),
    degree: degree.get(l.id) || 0,
    rectPx: { x: px(l.x), y: px(l.y), w: px(l.w), h: px(l.h) },
    centerPx: { x: px(l.x + l.w / 2), y: px(l.y + l.h / 2) }
  }));

  return {
    rooms,
    walls,
    boundsPx: { width: px(cols), height: px(rows) }
  };
}

/**
 * Grid-hall generator: a lattice of wide "main hall" corridors running the full width/height of
 * the map at irregular column/row spacing, with one room filling each pocket between them - the
 * classic hand-drawn dungeon-crawl layout, as opposed to the BSP algorithm's fully-tiled rooms.
 * Every pocket opens onto every hall segment it borders (a door per bordering side, not just a
 * spanning tree), so the halls read as real explorable thoroughfares with multiple routes
 * between rooms, not a single critical path. Room sizes vary because column widths and row
 * heights are each rolled independently per band.
 */
const HALL_WIDTH = 2; // grid cells - wide enough to read as a "main hall", not a corridor sliver
const MIN_COL_CELLS = 6, MAX_COL_CELLS = 11;
const MIN_ROW_CELLS = 5, MAX_ROW_CELLS = 10;

function generateGridGeometry(rng, idFactory, { roomCountTarget, gridSize, secretDoorChance }) {
  const nCols = Math.max(2, Math.round(Math.sqrt(roomCountTarget)));
  const nRows = Math.max(2, Math.ceil(roomCountTarget / nCols));

  const colWidths = Array.from({ length: nCols }, () => rng.int(MIN_COL_CELLS, MAX_COL_CELLS));
  const rowHeights = Array.from({ length: nRows }, () => rng.int(MIN_ROW_CELLS, MAX_ROW_CELLS));

  const colStart = [], colEnd = [];
  let cursor = 0;
  for (let c = 0; c < nCols; c++) {
    colStart[c] = cursor;
    colEnd[c] = cursor + colWidths[c];
    cursor = colEnd[c] + (c < nCols - 1 ? HALL_WIDTH : 0);
  }
  const totalCols = cursor;

  const rowStart = [], rowEnd = [];
  cursor = 0;
  for (let r = 0; r < nRows; r++) {
    rowStart[r] = cursor;
    rowEnd[r] = cursor + rowHeights[r];
    cursor = rowEnd[r] + (r < nRows - 1 ? HALL_WIDTH : 0);
  }
  const totalRows = cursor;

  const pockets = [];
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const doors = {};
      if (c > 0) doors.left = { secret: rng.bool(secretDoorChance) };
      if (c < nCols - 1) doors.right = { secret: rng.bool(secretDoorChance) };
      if (r > 0) doors.top = { secret: rng.bool(secretDoorChance) };
      if (r < nRows - 1) doors.bottom = { secret: rng.bool(secretDoorChance) };
      pockets.push({
        id: pockets.length, col: c, row: r,
        x0: colStart[c], x1: colEnd[c], y0: rowStart[r], y1: rowEnd[r],
        w: colWidths[c], h: rowHeights[r], doors
      });
    }
  }
  const pocketAt = (c, r) => pockets[r * nCols + c];
  const degree = p => Object.keys(p.doors).length;

  // Role assignment mirrors the BSP algorithm's spirit (entrance nearest the origin corner,
  // boss-arena the farthest+biggest room, low-degree rooms read as vaults) but computed against
  // grid-Manhattan distance and per-side door count instead of a BFS over a room adjacency graph,
  // since a grid layout has no such graph - every pocket's "neighbors" are hall segments, not
  // other pockets.
  const entrance = pocketAt(0, 0);
  let boss = entrance, bossScore = -1;
  for (const p of pockets) {
    const dist = Math.abs(p.col - entrance.col) + Math.abs(p.row - entrance.row);
    const score = dist * (p.w * p.h);
    if (score > bossScore) { bossScore = score; boss = p; }
  }

  const roles = new Map();
  roles.set(entrance.id, 'entrance');
  roles.set(boss.id, 'boss-arena');

  const rotation = ['chamber', 'rest-area', 'hazard-chamber'];
  let rotationIndex = 0;
  for (const p of pockets) {
    if (roles.has(p.id)) continue;
    const d = degree(p);
    if (d === 2) {
      const hasSecretDoor = Object.values(p.doors).some(door => door.secret);
      roles.set(p.id, hasSecretDoor ? 'secret-vault' : 'treasure-vault');
    } else if (d === 4 && rng.bool(0.6)) {
      roles.set(p.id, 'corridor-junction');
    } else {
      roles.set(p.id, rotation[rotationIndex % rotation.length]);
      rotationIndex++;
    }
  }

  const px = n => n * gridSize;
  const walls = [];
  let wallCounter = 0;

  function emitSegment(x0, y0, x1, y1, preset) {
    if (x0 === x1 && y0 === y1) return;
    walls.push({ _id: idFactory(`wall-${wallCounter++}`), c: [px(x0), px(y0), px(x1), px(y1)], ...preset });
  }

  function emitWithDoor(x0, y0, x1, y1, isSecret) {
    const doorPreset = isSecret ? WALL_SECRET_DOOR : WALL_DOOR;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const gap = Math.min(1, len * 0.4);
    const midX = (x0 + x1) / 2, midY = (y0 + y1) / 2;
    const ux = dx / len, uy = dy / len;
    const beforeX = midX - ux * (gap / 2), beforeY = midY - uy * (gap / 2);
    const afterX = midX + ux * (gap / 2), afterY = midY + uy * (gap / 2);
    emitSegment(x0, y0, beforeX, beforeY, WALL_SOLID);
    emitSegment(beforeX, beforeY, afterX, afterY, doorPreset);
    emitSegment(afterX, afterY, x1, y1, WALL_SOLID);
  }

  // Each pocket only emits walls on sides bordering a hall (interior) - map-boundary sides are
  // handled once below as a clean, gap-free perimeter rectangle instead, since a hall's mouth at
  // the map edge would otherwise leave a gap in a naive per-pocket boundary wall.
  for (const p of pockets) {
    if (p.doors.left) emitWithDoor(p.x0, p.y0, p.x0, p.y1, p.doors.left.secret);
    if (p.doors.right) emitWithDoor(p.x1, p.y0, p.x1, p.y1, p.doors.right.secret);
    if (p.doors.top) emitWithDoor(p.x0, p.y0, p.x1, p.y0, p.doors.top.secret);
    if (p.doors.bottom) emitWithDoor(p.x0, p.y1, p.x1, p.y1, p.doors.bottom.secret);
  }

  function emitPerimeterRow(y) {
    for (let c = 0; c < nCols; c++) {
      emitSegment(colStart[c], y, colEnd[c], y, rng.bool(0.06) ? WALL_WINDOW : WALL_SOLID);
      if (c < nCols - 1) emitSegment(colEnd[c], y, colStart[c + 1], y, WALL_SOLID); // hall mouth
    }
  }
  function emitPerimeterCol(x) {
    for (let r = 0; r < nRows; r++) {
      emitSegment(x, rowStart[r], x, rowEnd[r], rng.bool(0.06) ? WALL_WINDOW : WALL_SOLID);
      if (r < nRows - 1) emitSegment(x, rowEnd[r], x, rowStart[r + 1], WALL_SOLID); // hall mouth
    }
  }
  emitPerimeterRow(0);
  emitPerimeterRow(totalRows);
  emitPerimeterCol(0);
  emitPerimeterCol(totalCols);

  const rooms = pockets.map(p => ({
    id: p.id,
    role: roles.get(p.id),
    degree: degree(p),
    rectPx: { x: px(p.x0), y: px(p.y0), w: px(p.w), h: px(p.h) },
    centerPx: { x: px((p.x0 + p.x1) / 2), y: px((p.y0 + p.y1) / 2) }
  }));

  return {
    rooms,
    walls,
    boundsPx: { width: px(totalCols), height: px(totalRows) }
  };
}
