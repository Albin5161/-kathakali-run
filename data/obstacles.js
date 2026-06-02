// Obstacle type catalogue. Each entry is a static definition; live instances
// are created by ObstacleManager at spawn time and carry their own `x` position.
//
// hitbox offsets are measured from the obstacle instance's (x, y) position,
// where (x, y) is the top-left corner of the visual bounding box.
// Hitboxes are intentionally smaller than the visual ("forgiveness boxes").
//
// floatHeight: extra pixels above GROUND_Y the obstacle hovers (default 0).
// ObstacleManager uses: y = GROUND_Y − visualHeight − floatHeight

export const obstacles = [
  {
    id:          'fallen-tree',
    avoidWith:   'jump',
    visualWidth:  110,  // logical pixels — wide, flat fallen palm
    visualHeight:  35,  // logical pixels  (obs.y = GROUND_Y − 35 = 215)
    floatHeight:    0,
    //
    // Hitbox geometry:
    //   hitbox top    = 215 + 7  = 222
    //   hitbox bottom = 222 + 28 = 250  (= GROUND_Y)
    //
    // Standing performer (y 190 → 250): collides (190 < 250 AND 250 > 222) ✓
    // Ducking  performer (y 220 → 250): collides (220 < 250 AND 250 > 222) ✓  must jump, not duck
    // Jumping at apex   (bot ≈ 160):   safe      (160 < 222)               ✓
    hitbox: { width: 90, height: 28, offsetX: 10, offsetY: 7 },
    spriteKey:   'fallenTree',
    variants:    [1],
  },
  {
    id:          'festival-elephant',
    avoidWith:   'duck',
    visualWidth:  160,  // widened to match natural 3:2 sprite aspect (was 60)
    visualHeight: 100,  // unchanged — vertical geometry preserved for duck mechanic
    floatHeight:    0,  // (obs.y = GROUND_Y − 100 = 150)
    //
    // Hitbox geometry (vertical geometry identical to original):
    //   hitbox top    = 150 + 5  = 155
    //   hitbox bottom = 155 + 63 = 218
    //
    // Standing performer (y 190 → 250): collides (190 < 218 AND 250 > 155) ✓
    // Ducking  performer (y 220 → 250): safe      (220 > 218)              ✓
    // Jumping at apex   (bot ≈ 160):   collides   (160 > 155)              ✓  unjumpable
    //
    // offsetX:20 centres the hitbox inside the wider 160 px visual box.
    hitbox: { width: 120, height: 63, offsetX: 20, offsetY: 5 },
    spriteKey:   'elephant',
    variants:    [1],
  },
  {
    id:          'crow',
    avoidWith:   'duck',
    visualWidth:   90,  // logical pixels
    visualHeight:  60,  // logical pixels
    floatHeight:   30,  // floats 30 px above ground  (obs.y = GROUND_Y − 60 − 30 = 160)
    //
    // Hitbox geometry:
    //   hitbox top    = 160 + 5  = 165
    //   hitbox bottom = 165 + 40 = 205
    //
    // Standing performer (y 190 → 250): collides (190 < 205 AND 250 > 165) ✓
    // Ducking  performer (y 220 → 250): safe      (220 > 205)              ✓
    // Jumping at apex   (bot ≈ 160):   safe       (160 < 165)              ✓  barely clears
    // Jumping mid-arc   (bot ≈ 200):   collides   (200 > 165)              ✓  only apex is safe
    hitbox: { width: 70, height: 40, offsetX: 10, offsetY: 5 },
    spriteKey:   'crow',
    variants:    [1],
  },
];
