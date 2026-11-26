/**
 * config.ts — global tuning. Input sensitivity and invert switches live here (sync verify-game.mjs when changing the mapping).
 */

export const INPUT_CONFIG = {
  /** Mouse/touch camera sensitivity (radians/pixel). */
  MOUSE_SENS_X: 0.0026,
  MOUSE_SENS_Y: 0.0022,
  /** Camera invert switches: default false = mouse right turns camera right, mouse up looks up (intuitive directions). */
  INVERT_X: false,
  INVERT_Y: false,
};

export const QUALITY = {
  /** Auto-degrade when the frame rate stays below this for 2s. */
  DEGRADE_FPS: 45,
} as const;

export const COLORS = {
  background: 0x0b0e12,
} as const;

/** Game world tuning. */
export const WORLD = {
  /** Half-extents of the playable area fence. */
  BOUNDS: 52,
  FLOOR_Y: [0, 4, 8] as const, // ground, 2nd floor, rooftop
  WALL_H: 4,
} as const;

export const PLAYER = {
  WALK_SPEED: 3.4,
  RUN_SPEED: 6.6,
  RADIUS: 0.38,
  EYE_HEIGHT: 1.5,
  INTERACT_DIST: 2.4,
} as const;

export const CAMERA = {
  DIST: 4.2,
  DIST_PORTRAIT: 5.4,
  HEIGHT: 1.55,
  MIN_PITCH: -0.55,
  MAX_PITCH: 0.9,
  FOV: 58,
} as const;

/** Time: game minutes elapsed per real second (default). */
export const TIME_SPEED = 1.4;

export const NPC = {
  WALK_SPEED: 2.1,
  RUN_SPEED: 4.4,
  COUNT: 29, // students besides the hero
} as const;
