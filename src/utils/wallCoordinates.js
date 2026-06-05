/**
 * Converts a hold's normalized wall coordinates to world-space (metres).
 *
 * The wall is 4 m wide × 6 m tall. Its bottom edge sits at the world origin.
 * angleDeg is measured from the floor (90 = vertical, >90 = overhang, <90 = slab).
 * The rotation axis is the bottom edge of the wall (world X axis at y=0, z=0).
 *
 * This function is the single source of truth for hold ↔ world conversion used
 * by both the beta generator and (where needed) Scene3D.
 */

const WALL_W = 4;   // metres
const WALL_H = 6;   // metres

export function holdToWorldSpace(hold, wallOrAngleDeg) {
  if (!hold) return null;
  const angleDeg = typeof wallOrAngleDeg === 'number'
    ? wallOrAngleDeg
    : wallOrAngleDeg?.angleDeg ?? 90;

  const r      = ((angleDeg - 90) * Math.PI) / 180;
  const localX = (hold.x - 0.5) * WALL_W;
  const localY = hold.y * WALL_H;
  const localZ = Math.max(hold.z ?? 0.02, 0.02);

  return {
    x: localX,
    y: localY * Math.cos(r) - localZ * Math.sin(r),
    z: localY * Math.sin(r) + localZ * Math.cos(r),
  };
}
