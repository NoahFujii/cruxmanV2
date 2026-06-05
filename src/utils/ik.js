/**
 * Two-bone IK utilities.
 *
 * Used by Climber3D to drive arms (shoulder → elbow → wrist target)
 * and legs (hip → knee → ankle target) from a pose's world-space end-effector
 * positions. The mid-joint position returned here drives both the procedural
 * stick figure (segment placement) and the Mixamo rig (bone angle computation).
 */

import * as THREE from 'three';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Solve a two-bone IK chain via the law of cosines.
 *
 * Limbs NEVER exceed their real length. When the target is beyond maxReach the
 * chain extends to maxReach × 0.98 along the direction to the target — the
 * hand/foot stops there and does not reach the hold.
 *
 * @param {THREE.Vector3} root       - world position of joint 0 (shoulder / hip)
 * @param {THREE.Vector3} endTarget  - desired world position of joint 2 (wrist / ankle)
 * @param {number}        len1       - bone length from joint 0 → 1 (upper arm / thigh)
 * @param {number}        len2       - bone length from joint 1 → 2 (forearm / shin)
 * @param {THREE.Vector3} bendHint   - world-space point the middle joint should bend toward
 *
 * @returns {{
 *   mid:        THREE.Vector3  mid-joint world position (elbow / knee)
 *   end:        THREE.Vector3  actual end-effector position (clamped if target out of reach)
 *   rootAngle:  number         angle at root joint (radians)
 *   midAngle:   number         bend angle at mid joint (radians)
 * }}
 */
export function solveTwoBoneIK(root, endTarget, len1, len2, bendHint, enforceBendDir = null) {
  const toEnd    = new THREE.Vector3().subVectors(endTarget, root);
  const rawDist  = toEnd.length();
  const maxReach = len1 + len2;
  const minReach = 0.25 * maxReach;  // prevent fully-folded limbs

  // Direction from root toward target (preserved even when clamping)
  const dir = rawDist > 1e-6
    ? toEnd.clone().divideScalar(rawDist)
    : new THREE.Vector3(0, -1, 0);

  // Clamp distance: never beyond 98% of full extension, never below 25% (avoids
  // complete fold-back which looks broken and causes unstable angles).
  const d = clamp(rawDist, Math.max(Math.abs(len1 - len2) + 1e-5, minReach), maxReach * 0.98);

  // Actual end-effector world position — clamped if target was out of reach
  const end = rawDist >= maxReach
    ? new THREE.Vector3().copy(root).addScaledVector(dir, d)
    : endTarget.clone();

  // Law of cosines — always valid because d is in [minReach, maxReach * 0.98]
  const cosA = clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1);
  const rootAngle = Math.acos(cosA);

  const cosB = clamp((len1 * len1 + len2 * len2 - d * d) / (2 * len1 * len2), -1, 1);
  const midAngle = Math.PI - Math.acos(cosB);

  // Bend direction: project hint onto plane perpendicular to dir
  const hint = new THREE.Vector3().subVectors(bendHint, root);
  hint.addScaledVector(dir, -hint.dot(dir));
  const bendDir = hint.lengthSq() > 1e-8
    ? hint.normalize()
    : new THREE.Vector3(0, 0, 1).cross(dir).normalize();

  // If a preferred bend direction is supplied, flip bendDir when it opposes it.
  // This prevents elbows from bending up through the shoulder or knees from
  // inverting through the thigh.
  if (enforceBendDir && bendDir.dot(enforceBendDir) < 0) {
    bendDir.negate();
  }

  // Mid-joint world position
  const mid = new THREE.Vector3()
    .copy(root)
    .addScaledVector(dir, Math.cos(rootAngle) * len1)
    .addScaledVector(bendDir, Math.sin(rootAngle) * len1);

  return { mid, end, rootAngle, midAngle };
}

/**
 * Quaternion that rotates +Y to point from `start` toward `end`.
 * Use this to orient cylindrical figure segments (which rest along +Y by default).
 */
export function segmentQ(start, end) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  if (len < 1e-6) return new THREE.Quaternion();
  return new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.divideScalar(len),
  );
}
