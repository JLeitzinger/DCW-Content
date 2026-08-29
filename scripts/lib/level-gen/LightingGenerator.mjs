/**
 * Places AmbientLight documents per room: one theme-tinted torch per room (flicker animation),
 * plus a second for rooms large enough that one light wouldn't reach the far corners. Field
 * shape confirmed against the local Foundry install's common/documents/ambient-light.mjs /
 * LightData (stable across v13/v14).
 */
const GRID_SIZE_REFERENCE = 100;

function torchLight(id, theme, x, y) {
  return {
    _id: id,
    x,
    y,
    elevation: 0,
    rotation: 0,
    walls: true,
    vision: false,
    hidden: false,
    locked: false,
    config: {
      negative: false,
      priority: 0,
      alpha: 0.5,
      angle: 360,
      bright: 3,
      dim: 4,
      color: theme.torchColor,
      coloration: 1,
      attenuation: 0.5,
      luminosity: 0.5,
      saturation: 0,
      contrast: 0,
      shadows: 0,
      animation: { type: 'torch', speed: 5, intensity: 5, reverse: false },
      darkness: { min: 0, max: 1 }
    },
    flags: {}
  };
}

export function generateLights(rng, idFactory, rooms, theme) {
  const lights = [];
  for (const room of rooms) {
    const { x, y, w, h } = room.rectPx;
    lights.push(torchLight(idFactory(`light-${room.id}-a`), theme, x + w * 0.3, y + h * 0.3));
    // Large rooms (boss arenas, junctions) get a second light so the far side isn't unlit.
    const areaInCells = (w / GRID_SIZE_REFERENCE) * (h / GRID_SIZE_REFERENCE);
    if (areaInCells >= 24 || room.role === 'boss-arena') {
      lights.push(torchLight(idFactory(`light-${room.id}-b`), theme, x + w * 0.7, y + h * 0.7));
    }
  }
  return lights;
}
