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
 * @param {THREE.Vector3} root       - world position of joint 0 (shoulder / hip)
 * @param {THREE.Vector3} endTarget  - desired world position of joint 2 (wrist / ankle)
 * @param {number}        len1       - bone length from joint 0 → 1 (upper arm / thigh)
 * @param {number}        len2       - bone length from joint 1 → 2 (forearm / shin)
 * @param {THREE.Vector3} bendHint   - world-space point the middle joint should bend toward
 *                                     (e.g. a point in front of the knee, behind the elbow)
 *
 * @returns {{
 *   mid:        THREE.Vector3  mid-joint world position (elbow / knee)
 *   rootAngle:  number         angle at root joint (radians) — how far from straight
 *   midAngle:   number         bend angle at mid joint (radians)
 * }}
 */
export function solveTwoBoneIK(root, endTarget, len1, len2, bendHint) {
  const toEnd = new THREE.Vector3().subVectors(endTarget, root);
  const rawDist = toEnd.length();

  // Direction from root to target (keep even when clamped)
  const dir = rawDist > 1e-6
    ? toEnd.clone().divideScalar(rawDist)
    : new THREE.Vector3(0, -1, 0);

  // Clamp effective distance into the reachable range
  const d = clamp(rawDist, Math.abs(len1 - len2) + 1e-5, len1 + len2 - 1e-5);

  // Law of cosines — angle at root (between chain and first bone)
  const cosA = clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1);
  const rootAngle = Math.acos(cosA);

  // Law of cosines — included angle at mid joint
  const cosB = clamp((len1 * len1 + len2 * len2 - d * d) / (2 * len1 * len2), -1, 1);
  const midAngle = Math.PI - Math.acos(cosB);

  // Bend direction: project hint vector onto plane ⊥ to dir
  const hint = new THREE.Vector3().subVectors(bendHint, root);
  hint.addScaledVector(dir, -hint.dot(dir)); // remove component along dir
  const bendDir = hint.lengthSq() > 1e-8
    ? hint.normalize()
    // fallback when hint is colinear with dir
    : new THREE.Vector3(0, 0, 1).cross(dir).normalize();

  // Mid-joint world position:
  //   along dir: cos(rootAngle) × len1
  //   along bendDir: sin(rootAngle) × len1
  const mid = new THREE.Vector3()
    .copy(root)
    .addScaledVector(dir, Math.cos(rootAngle) * len1)
    .addScaledVector(bendDir, Math.sin(rootAngle) * len1);

  return { mid, rootAngle, midAngle };
}

/**
 * Quaternion that rotates +Y to point from `start` toward `end`.
 * Use this to orient cylindrical figure segments (which rest along +Y by default).
 *
 * @param {THREE.Vector3} start
 * @param {THREE.Vector3} end
 * @returns {THREE.Quaternion}
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
