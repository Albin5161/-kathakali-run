// Pure AABB collision check. No side effects — the caller decides what to do.
//
// Performer hitbox:  { x, y, width, height }  (from Performer.hitbox getter)
// Obstacle hitbox:   reconstructed from obs.x / obs.y + the type's offset/size data
//
// Returns the first obstacle whose hitbox overlaps the performer's hitbox, or null.
export function checkCollision(performer, obstacles) {
  const p = performer.hitbox;

  for (const obs of obstacles) {
    const h  = obs.type.hitbox;
    const ox = obs.x + h.offsetX;
    const oy = obs.y + h.offsetY;

    if (
      p.x          < ox + h.width  &&
      p.x + p.width  > ox          &&
      p.y          < oy + h.height &&
      p.y + p.height > oy
    ) {
      return obs;
    }
  }

  return null;
}
