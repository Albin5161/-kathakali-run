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
    id:          'festival-elephant',
    avoidWith:   'jump',
    visualWidth:  120,
    visualHeight: 100,
    floatHeight:    0,  // (obs.y = GROUND_Y − 100 = 150)
    //
    // Sprite is rendered with OBSTACLE_RENDER_OFFSETS y=+5 (Renderer.js).
    // Sprite draws at canvas y=155; physics position (obs.y=150) and hitbox unchanged.
    //
    // JUMP OBSTACLE: player must jump over; ducking and standing both collide.
    //
    // Alpha-channel measurement of elephant.png (1536×1024, threshold α>10):
    //   visible content: source x=507–1146, y=304–720
    //   at 120×100 display: x≈40–90, y≈30–70
    //
    // With render offset y=+30 (Renderer.js line 29), sprite draws at canvas y=180.
    // Visible top at sprite y=30 → canvas 210 → physics offset 60.
    // Visible feet at sprite y=70 → canvas 250 → physics offset 100 (= GROUND_Y).
    //
    // Hitbox geometry (2 px inside visible left/right; bottom pinned to GROUND_Y):
    //   hitbox top   (abs) = 150 + 62 = 212   ← 2 px inside content top (physics 60)
    //   hitbox bottom(abs) = 150 + 100 = 250  ← GROUND_Y; feet of sprite
    //   hitbox left        = obs.x + 42       ← 2 px inside content left  (sprite x≈40)
    //   hitbox right       = obs.x + 88       ← 2 px inside content right (sprite x≈90)
    //
    // Standing performer (y 190 → 250): 190 < 250 AND 250 > 212 → collides ✓
    // Ducking  performer (y 220 → 250): 220 < 250 AND 250 > 212 → collides ✓
    // Jumping at apex   (bot     ≈ 160): 160 < 212 → clears (52 px) ✓
    hitbox: { width: 46, height: 38, offsetX: 42, offsetY: 62 },
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
