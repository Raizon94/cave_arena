// game config constants

export const GAME_CONFIG = {
  // render stuff
  FOV: 75,
  NEAR_PLANE: 0.01,
  FAR_PLANE: 1000,
  BACKGROUND_COLOR: 0x101010,

  // player settings
  PLAYER_HEIGHT: 1.7,
  PLAYER_RADIUS: 0.5,
  MOVE_SPEED: 30,
  JUMP_FORCE: 12.0,
  FLY_SPEED: 80,
  DEBUG_FLY_MODE: false,

  // physics
  GRAVITY: -40.0,
  FRICTION: 8.0,

  // lighting config
  HEMISPHERE_LIGHT_COLOR: 0xffffff,
  HEMISPHERE_LIGHT_GROUND_COLOR: 0x444444,
  HEMISPHERE_LIGHT_INTENSITY: 1,
  DIRECTIONAL_LIGHT_COLOR: 0xffffff,
  DIRECTIONAL_LIGHT_INTENSITY: 2.5,

  // sky colors
  SKY_TOP_COLOR: 0x5599ff,
  SKY_BOTTOM_COLOR: 0xffcc88,

  // model path
  MODEL_PATH: 'src/models/cave_scene.glb',

  // debug options
  SHOW_AXES_HELPER: false,
  AXES_HELPER_SIZE: 50,
  SHOW_SUN_HELPER: false,
  SHOW_SHADOW_CAMERA_HELPER: false,
  SHOW_CAMPFIRE_DEBUG: false,
  SUN_HELPER_SIZE: 3.3,

  // shadow quality
  SHADOW_MAP_SIZE: 10000,
  SHADOW_BIAS: -0.00005,
  SHADOW_NORMAL_BIAS: 1,
  SHADOW_RADIUS: 1.5
};

export const CONTROLS = {
  MOVE_FORWARD: 'KeyW',
  MOVE_BACKWARD: 'KeyS',
  MOVE_LEFT: 'KeyA',
  MOVE_RIGHT: 'KeyD',
  JUMP: 'Space',
  FLY_UP: 'KeyE',
  FLY_DOWN: 'KeyQ'
};
