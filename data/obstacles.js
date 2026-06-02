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
    visualWidth:  120,  // reduced from 160 — less imposing, better matches hitbox zone
    visualHeight: 100,  // unchanged — vertical geometry must stay for duck mechanic
    floatHeight:    0,  // (obs.y = GROUND_Y − 100 = 150)
    //
    // Hitbox geometry:
    //   hitbox top    = 150 + 8  = 158
    //   hitbox bottom = 158 + 55 = 213
    //
    // Standing performer (y 190 → 250): collides (190 < 213 AND 250 > 158) ✓
    // Ducking  performer (y 220 → 250): safe      (220 > 213, margin 7 px) ✓
    // Jumping at apex   (bot ≈ 160):   collides   (160 > 158)              ✓  unjumpable
    //
    // offsetX:24 — trunk tip in the 120 px image is at ~19 px; 5 px forgiveness.
    // offsetY:8  — howdah crown in the 120 px image is at ~15 px;
    //              was 5 (10 px above visible body), now 8 (7 px above) — removes
    //              the dead zone that caused collision before the elephant was visible.
    hitbox: { width: 72, height: 55, offsetX: 24, offsetY: 8 },
    spriteKey:   'elephant',
    variants:    [1],
  },
  {
    id:          'crow',
    avoidWith:   'duck',
    visualWidth:   90,  // logical pixels (unchanged)
    visualHeight:  60,  // logical pixels (unchanged)
    floatHeight:   30,  // floats 30 px above ground  (obs.y = GROUND_Y − 60 − 30 = 160)
    //
    // Hitbox geometry:
    //   hitbox top    = 160 + 8  = 168
    //   hitbox bottom = 168 + 35 = 203
    //
    // Standing performer (y 190 → 250): collides (190 < 203 AND 250 > 168) ✓
    // Ducking  performer (y 220 → 250): safe      (220 > 203, margin 17 px)✓  comfortable
    // Jumping at apex   (bot ≈ 160):   safe       (160 < 168, margin  8 px)✓  barely clears
    // Jumping mid-arc   (bot ≈ 185):   collides   (185 > 168)              ✓  duck is primary
    //
    // offsetX:10→15: crow body starts at ~14 px; offsetX=10 was inside transparent zone.
    // offsetY:5→8:   crow body top at ~8 px;  tight but correct.
    // height:40→35:  duck margin 15 px → 17 px — more comfortable and fair.
    hitbox: { width: 60, height: 35, offsetX: 15, offsetY: 8 },
    spriteKey:   'crow',
    variants:    [1],
  },
];
