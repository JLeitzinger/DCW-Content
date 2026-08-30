/**
 * Places AmbientLight documents per room, tuned by theme.darknessLevel (see
 * data/narrative-lexicon.json's themeCategories - 0.5 for the brightest theme up to 0.9 for the
 * darkest) and by room role, rather than the same fixed torch in every room regardless of floor
 * or room type:
 *   - Brighter themes (low darknessLevel) get wider, steadier, more saturated light; darker
 *     themes get small flickering pools with real gaps of unlit darkness between them.
 *   - entrance/corridor-junction/boss-arena/rest-area are always lit (safe waypoints and the
 *     boss fight need visibility to read/navigate); hazard-chamber/secret-vault are the rooms
 *     most likely to go dark (tension, hidden things), on top of the theme's base darkness.
 *   - boss-arena gets a brightness bump on top of the theme baseline - dramatic, not moody.
 * Field shape confirmed against the local Foundry install's common/documents/ambient-light.mjs /
 * LightData (stable across v13/v14).
 */
const GRID_SIZE_REFERENCE = 100;

// Roles that always get at least one light regardless of how dark the theme is - losing all
// light here would break navigation (entrance/junction) or the boss fight's readability.
const ALWAYS_LIT_ROLES = new Set(['entrance', 'corridor-junction', 'boss-arena', 'rest-area']);
// Roles where going unlit reads as intentional (tension, something hidden) rather than a bug -
// on top of the theme's own base unlit chance.
const DARK_PRONE_ROLES = new Set(['hazard-chamber', 'secret-vault']);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Probability a given non-always-lit room gets no fixed light at all, before role adjustment. */
function unlitChance(darknessLevel, role) {
  const base = clamp((darknessLevel - 0.5) * 0.6, 0, 0.35);
  return DARK_PRONE_ROLES.has(role) ? clamp(base + 0.2, 0, 0.6) : base;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function torchLight(id, theme, x, y, { boost = false } = {}) {
  const d = theme.darknessLevel;
  // bright/dim are in the scene's grid *distance* units (feet here, grid.distance=5 - see
  // envelope.mjs), not grid squares - a value of "3" is barely over half a square, which is why
  // the original fixed bright:3/dim:4 (and this function's own first draft, which only varied
  // within that same ~1-3 range) always read as one uniform pinpoint spot no matter the theme.
  // t=0 is the brightest theme (darknessLevel 0.5), t=1 the darkest (0.9) - see the lexicon's
  // documented range. Real spread: a lit room in the brightest theme reaches ~5-9 squares out
  // (steady, wide halo); the darkest theme's torches are a tight ~1-3 square pool with a much
  // narrower bright-to-dim falloff, reading as genuinely gloomy rather than just dimmer.
  const t = clamp((d - 0.5) / 0.4, 0, 1);
  const bright = lerp(24, 5, t) + (boost ? 6 : 0);
  const dim = bright + lerp(20, 8, t);
  const luminosity = clamp(1 - d, 0.15, 0.6) + (boost ? 0.1 : 0);
  const alpha = clamp(0.75 - d * 0.35, 0.3, 0.6);
  const flicker = d >= 0.65;
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
      alpha,
      angle: 360,
      bright,
      dim,
      color: theme.torchColor,
      coloration: 1,
      attenuation: 0.5,
      luminosity,
      saturation: 0,
      contrast: 0,
      shadows: 0,
      animation: flicker
        ? { type: 'torch', speed: 5, intensity: 5, reverse: false }
        : { type: 'pulse', speed: 1, intensity: 1, reverse: false },
      darkness: { min: 0, max: 1 }
    },
    flags: {}
  };
}

export function generateLights(rng, idFactory, rooms, theme) {
  const lights = [];
  for (const room of rooms) {
    const { x, y, w, h } = room.rectPx;
    const forceLit = ALWAYS_LIT_ROLES.has(room.role);
    if (!forceLit && rng.bool(unlitChance(theme.darknessLevel, room.role))) continue;

    const boost = room.role === 'boss-arena';
    lights.push(torchLight(idFactory(`light-${room.id}-a`), theme, x + w * 0.3, y + h * 0.3, { boost }));
    // Large rooms (boss arenas, junctions) get a second light so the far side isn't unlit.
    const areaInCells = (w / GRID_SIZE_REFERENCE) * (h / GRID_SIZE_REFERENCE);
    if (areaInCells >= 24 || room.role === 'boss-arena') {
      lights.push(torchLight(idFactory(`light-${room.id}-b`), theme, x + w * 0.7, y + h * 0.7, { boost }));
    }
  }
  return lights;
}
