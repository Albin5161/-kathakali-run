// Obstacle type catalogue. Each entry is a static definition; live instances
// are created by ObstacleManager at spawn time and carry their own `x` position.
//
// hitbox offsets are measured from the obstacle instance's (x, y) position,
// where (x, y) is the top-left corner of the visual bounding box.
// Hitboxes are intentionally smaller than the visual ("forgiveness boxes").

export const obstacles = [
  {
    id:          'coconut-tree',
    avoidWith:   'jump',
    visualWidth:  32,   // logical pixels
    visualHeight: 60,   // logical pixels
    // Hitbox: centred horizontally, 8 px forgiveness at top (fronds)
    hitbox: { width: 16, height: 52, offsetX: 8, offsetY: 8 },
    spriteKey:   null,  // populated in TASK-19 (Phase 4)
    variants:    [1],
  },
  {
    id:          'festival-elephant',
    avoidWith:   'duck',
    visualWidth:  60,   // logical pixels
    visualHeight: 100,  // logical pixels  (obstacle.y = GROUND_Y − 100 = 150)
    //
    // Hitbox geometry (all values absolute when added to obstacle.y = 150):
    //   hitbox top    = 150 + 5  = 155
    //   hitbox bottom = 155 + 63 = 218
    //
    // Standing performer (y 190 → 250): collides (190 < 218 AND 250 > 155)  ✓
    // Ducking  performer (y 220 → 250): safe      (220 < 218 is FALSE)       ✓
    // Jumping at apex   (y 100 → 160): collides   (160 > 155)                ✓
    //   → elephant is physically unjumpable; duck is the only escape.
    //
    // offsetX:8 gives 8 px horizontal forgiveness on the left edge (trunk side).
    hitbox: { width: 44, height: 63, offsetX: 8, offsetY: 5 },
    spriteKey:   null,
    variants:    [1],
  },
];
