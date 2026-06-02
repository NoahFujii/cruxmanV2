/**
 * Climber3D — a static, poseable mannequin.
 *
 * CRITICAL: this component never plays animation clips and never moves on its
 * own. The figure is snapped to ONE frozen pose whenever the `pose` prop changes.
 * No AnimationMixer, no useFrame-driven motion.
 *
 * Loading strategy:
 *   ┌─ ModelErrorBoundary ─────────────────────────────────────────────────┐
 *   │  ┌─ Suspense ─────────────────────────────────────────────────────┐  │
 *   │  │  RiggedClimber  ← loads figure.glb, poses bones via useEffect │  │
 *   │  └────────────────────────────────────────────── fallback ─────┐  │  │
 *   │                                                    ProceduralClimber │  │
 *   └──────────────────────────────────────────────── fallback ──────┘  │
 *                                                        ProceduralClimber
 *
 * When figure.glb is absent the error boundary renders ProceduralClimber
 * immediately. When it is present, the rig is loaded, flat-material applied,
 * and bones are driven by the same pose object.
 */

import { Suspense, useEffect, useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

// useGraph was removed in drei v10 — build the node map ourselves.
function buildNodes(object3d) {
  const nodes = {};
  object3d.traverse(obj => { if (obj.name) nodes[obj.name] = obj; });
  return nodes;
}
import * as THREE from 'three';
import { applyFlatMaterial } from '../utils/applyFlatMaterial';
import { solveTwoBoneIK, segmentQ } from '../utils/ik';
import ModelErrorBoundary from './ModelErrorBoundary';

// ── Body proportions (metres) ──────────────────────────────────────────────

const SPINE_LEN  = 0.45; // hips → shoulder junction
const NECK_LEN   = 0.12; // shoulder junction → head centre
const HEAD_R     = 0.12;
const SHOULDER_W = 0.21; // half-width from spine to shoulder
const HIP_W      = 0.10; // half-width from centre to hip joint
const HIP_DROP   = 0.04; // hip joints sit slightly below hips centre

const ARM_UPPER  = 0.28; // shoulder → elbow
const ARM_LOWER  = 0.26; // elbow → wrist
const LEG_UPPER  = 0.42; // hip → knee
const LEG_LOWER  = 0.40; // knee → ankle

const FIGURE_COLOR = '#3A3A3A';

// ── Mixamo standard bone-name map ──────────────────────────────────────────
// Adjust the values here if the dropped-in rig uses different naming.

const BONE_MAP = {
  hips:      'mixamorigHips',
  spine:     'mixamorigSpine',
  head:      'mixamorigHead',
  shoulderL: 'mixamorigLeftArm',
  elbowL:    'mixamorigLeftForeArm',
  handL:     'mixamorigLeftHand',
  shoulderR: 'mixamorigRightArm',
  elbowR:    'mixamorigRightForeArm',
  handR:     'mixamorigRightHand',
  hipL:      'mixamorigLeftUpLeg',
  kneeL:     'mixamorigLeftLeg',
  footL:     'mixamorigLeftFoot',
  hipR:      'mixamorigRightUpLeg',
  kneeR:     'mixamorigRightLeg',
  footR:     'mixamorigRightFoot',
};

// ── Default pose: relaxed standing, arms down, feet shoulder-width ─────────

/**
 * Pose object shape:
 * {
 *   hips:   { x, y, z }               hip-centre world position
 *   spine:  { rotX, rotZ }             lean: rotX = forward/back, rotZ = left/right
 *   shoulderL/R: { rotX, rotY, rotZ }  shoulder Euler rotations (local, radians)
 *   elbowL/R:    { rotX }              elbow bend angle (used for Mixamo rig)
 *   wristL/R:    { x, y, z }           wrist WORLD TARGET position (drives IK)
 *   hipL/R:      { rotX, rotY, rotZ }  hip Euler rotations (local, radians)
 *   kneeL/R:     { rotX }              knee bend angle (used for Mixamo rig)
 *   ankleL/R:    { x, y, z }           ankle WORLD TARGET position (drives IK)
 * }
 */
export const DEFAULT_POSE = {
  hips:   { x: 0, y: 0.95, z: 0 },
  spine:  { rotX: 0, rotZ: 0 },

  shoulderL: { rotX: 0.05, rotY: 0,    rotZ:  0.10 },
  elbowL:    { rotX: 0.15 },
  wristL:    { x: -0.24, y: 0.90, z: 0.04 },  // 0.503m from shoulder → within 0.54m reach

  shoulderR: { rotX: 0.05, rotY: 0,    rotZ: -0.10 },
  elbowR:    { rotX: 0.15 },
  wristR:    { x:  0.24, y: 0.90, z: 0.04 },

  hipL:  { rotX: 0, rotY: 0, rotZ:  0.04 },
  kneeL: { rotX: 0.05 },
  ankleL: { x: -0.10, y: 0.10, z: 0 },  // 0.81m from hip joint → within 0.82m reach

  hipR:  { rotX: 0, rotY: 0, rotZ: -0.04 },
  kneeR: { rotX: 0.05 },
  ankleR: { x:  0.10, y: 0.10, z: 0 },
};

// ── Joint world-position solver ────────────────────────────────────────────

/**
 * Computes all joint world positions from a pose object.
 * Used by ProceduralClimber to place and orient each limb segment.
 * Also used by RiggedClimber to compute elbow/knee IK angles.
 */
function computeJoints(pose) {
  const hips = new THREE.Vector3(pose.hips.x, pose.hips.y, pose.hips.z);

  // Spine direction (small-angle approx: rotZ tilts left/right, rotX tilts fwd/back)
  const spineDir = new THREE.Vector3(
    Math.sin(pose.spine.rotZ),
    1,
    -Math.sin(pose.spine.rotX),
  ).normalize();
  const spineTop = hips.clone().addScaledVector(spineDir, SPINE_LEN);
  const head     = spineTop.clone().addScaledVector(spineDir, NECK_LEN + HEAD_R);

  // Shoulder joints (lateral offset from spine top)
  const shoulderL = spineTop.clone().add(new THREE.Vector3(-SHOULDER_W, 0, 0));
  const shoulderR = spineTop.clone().add(new THREE.Vector3(+SHOULDER_W, 0, 0));

  // Hip joints (lateral + slight drop)
  const hipL = hips.clone().add(new THREE.Vector3(-HIP_W, -HIP_DROP, 0));
  const hipR = hips.clone().add(new THREE.Vector3(+HIP_W, -HIP_DROP, 0));

  // World targets
  const wristL  = new THREE.Vector3(pose.wristL.x,  pose.wristL.y,  pose.wristL.z);
  const wristR  = new THREE.Vector3(pose.wristR.x,  pose.wristR.y,  pose.wristR.z);
  const ankleL  = new THREE.Vector3(pose.ankleL.x,  pose.ankleL.y,  pose.ankleL.z);
  const ankleR  = new THREE.Vector3(pose.ankleR.x,  pose.ankleR.y,  pose.ankleR.z);

  // IK — arms: elbows bend in front of the body (+Z = toward wall)
  const elbowLHint = shoulderL.clone().add(new THREE.Vector3( 0.05, -0.10,  0.28));
  const elbowRHint = shoulderR.clone().add(new THREE.Vector3(-0.05, -0.10,  0.28));
  const { mid: elbowL, rootAngle: elRA_L, midAngle: elMA_L } =
    solveTwoBoneIK(shoulderL, wristL, ARM_UPPER, ARM_LOWER, elbowLHint);
  const { mid: elbowR, rootAngle: elRA_R, midAngle: elMA_R } =
    solveTwoBoneIK(shoulderR, wristR, ARM_UPPER, ARM_LOWER, elbowRHint);

  // IK — legs: knees bend forward (+Z)
  const kneeLHint = hipL.clone().add(new THREE.Vector3( 0, -0.20,  0.25));
  const kneeRHint = hipR.clone().add(new THREE.Vector3( 0, -0.20,  0.25));
  const { mid: kneeL, rootAngle: knRA_L, midAngle: knMA_L } =
    solveTwoBoneIK(hipL, ankleL, LEG_UPPER, LEG_LOWER, kneeLHint);
  const { mid: kneeR, rootAngle: knRA_R, midAngle: knMA_R } =
    solveTwoBoneIK(hipR, ankleR, LEG_UPPER, LEG_LOWER, kneeRHint);

  return {
    hips, spineTop, head,
    shoulderL, elbowL, wristL, armAngles: { L: { root: elRA_L, mid: elMA_L }, R: { root: elRA_R, mid: elMA_R } },
    shoulderR, elbowR, wristR,
    hipL, kneeL, ankleL, legAngles: { L: { root: knRA_L, mid: knMA_L }, R: { root: knRA_R, mid: knMA_R } },
    hipR, kneeR, ankleR,
  };
}

// ── Procedural figure primitives ───────────────────────────────────────────

const MAT_PROPS = { color: FIGURE_COLOR, roughness: 0.90, flatShading: true };

/** Cylinder segment oriented from point `a` to point `b`. */
function Seg({ a, b, r = 0.026 }) {
  const ax = a.x, ay = a.y, az = a.z;
  const bx = b.x, by = b.y, bz = b.z;

  const len  = Math.sqrt((bx-ax)**2 + (by-ay)**2 + (bz-az)**2);
  const mid  = [(ax+bx)/2, (ay+by)/2, (az+bz)/2];
  const qArr = useMemo(() => {
    const dir = new THREE.Vector3(bx-ax, by-ay, bz-az);
    if (dir.lengthSq() < 1e-10) return [0, 0, 0, 1];
    return new THREE.Quaternion()
      .setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
      .toArray();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ax, ay, az, bx, by, bz]);

  if (len < 1e-4) return null;
  return (
    <mesh position={mid} quaternion={qArr}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial {...MAT_PROPS} />
    </mesh>
  );
}

/** Sphere joint marker. */
function Jnt({ pos, r = 0.030 }) {
  return (
    <mesh position={pos.toArray()}>
      <sphereGeometry args={[r, 8, 6]} />
      <meshStandardMaterial {...MAT_PROPS} />
    </mesh>
  );
}

// ── Procedural climber ─────────────────────────────────────────────────────

function ProceduralClimber({ pose }) {
  const j = useMemo(() => computeJoints(pose), [pose]);

  return (
    <group>
      {/* Head */}
      <mesh position={j.head.toArray()}>
        <sphereGeometry args={[HEAD_R, 12, 8]} />
        <meshStandardMaterial {...MAT_PROPS} />
      </mesh>

      {/* Spine */}
      <Seg a={j.hips} b={j.spineTop} r={0.055} />

      {/* Clavicle bar */}
      <Seg a={j.shoulderL} b={j.shoulderR} r={0.028} />

      {/* Pelvis bar */}
      <Seg a={j.hipL} b={j.hipR} r={0.038} />

      {/* Left arm */}
      <Seg a={j.shoulderL} b={j.elbowL} r={0.027} />
      <Seg a={j.elbowL}    b={j.wristL} r={0.024} />
      <Jnt pos={j.elbowL} r={0.028} />

      {/* Right arm */}
      <Seg a={j.shoulderR} b={j.elbowR} r={0.027} />
      <Seg a={j.elbowR}    b={j.wristR} r={0.024} />
      <Jnt pos={j.elbowR} r={0.028} />

      {/* Left leg */}
      <Seg a={j.hipL}  b={j.kneeL}  r={0.036} />
      <Seg a={j.kneeL} b={j.ankleL} r={0.030} />
      <Jnt pos={j.kneeL} r={0.034} />

      {/* Right leg */}
      <Seg a={j.hipR}  b={j.kneeR}  r={0.036} />
      <Seg a={j.kneeR} b={j.ankleR} r={0.030} />
      <Jnt pos={j.kneeR} r={0.034} />

      {/* Hand/foot dots */}
      <Jnt pos={j.wristL}  r={0.022} />
      <Jnt pos={j.wristR}  r={0.022} />
      <Jnt pos={j.ankleL}  r={0.024} />
      <Jnt pos={j.ankleR}  r={0.024} />
    </group>
  );
}

// ── Rigged climber (Mixamo GLB) ────────────────────────────────────────────

function RiggedClimber({ pose }) {
  // useGLTF suspends until the file loads; throws on 404 → caught by ErrorBoundary.
  const gltf = useGLTF('/models/climber/figure.glb');

  // Clone so we don't mutate the cached scene.
  // For skinned meshes, swap scene.clone(true) for SkeletonUtils.clone
  // (three/addons/utils/SkeletonUtils.js) if bone binding breaks.
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    applyFlatMaterial(s, FIGURE_COLOR);
    return s;
  }, [gltf.scene]);

  const nodes = useMemo(() => buildNodes(scene), [scene]);

  // Apply pose to bones whenever it changes — no per-frame loop.
  useLayoutEffect(() => {
    if (!nodes) return;

    const get = (key) => nodes[BONE_MAP[key]];

    // ── Hips position ───────────────────────────────────────────────────
    const hip = get('hips');
    if (hip) hip.position.set(pose.hips.x, pose.hips.y, pose.hips.z);

    // ── Spine tilt ──────────────────────────────────────────────────────
    const spine = get('spine');
    if (spine) spine.rotation.set(pose.spine.rotX, 0, pose.spine.rotZ);

    // ── Shoulders (direct Euler) ────────────────────────────────────────
    (['L', 'R']).forEach((s) => {
      const bone = get(`shoulder${s}`);
      if (!bone) return;
      const r = pose[`shoulder${s}`];
      bone.rotation.set(r.rotX, r.rotY, r.rotZ);
    });

    // ── Update world matrices so we can read bone world positions ───────
    scene.updateMatrixWorld(true);

    // ── Elbows via IK ───────────────────────────────────────────────────
    // Compute IK angle from shoulder world-pos + wrist target, then apply
    // the bend as a local X rotation on the forearm bone.
    // Note: Mixamo forearms bend along their local X axis; adjust sign/axis
    // here if the rig has a different rest orientation.
    (['L', 'R']).forEach((s) => {
      const shoulderBone = get(`shoulder${s}`);
      const elbowBone    = get(`elbow${s}`);
      if (!shoulderBone || !elbowBone) return;

      const shoulderWorld = new THREE.Vector3();
      shoulderBone.getWorldPosition(shoulderWorld);

      const wTarget = pose[`wrist${s}`];
      const wristWorld = new THREE.Vector3(wTarget.x, wTarget.y, wTarget.z);

      // Bend hint: in front of and below shoulder
      const sign = s === 'L' ? -1 : 1;
      const hint = shoulderWorld.clone().add(new THREE.Vector3(sign * 0.05, -0.10, 0.25));

      // Measure actual bone lengths from the rig if available
      const len1 = shoulderBone.children[0]?.position.length() || ARM_UPPER;
      const len2 = elbowBone.children[0]?.position.length()    || ARM_LOWER;

      const { midAngle } = solveTwoBoneIK(shoulderWorld, wristWorld, len1, len2, hint);
      // midAngle is the full included angle at the elbow; convert to bend rotation
      elbowBone.rotation.x = -(Math.PI - midAngle);
    });

    // ── Hips (direct Euler) ─────────────────────────────────────────────
    (['L', 'R']).forEach((s) => {
      const bone = get(`hip${s}`);
      if (!bone) return;
      const r = pose[`hip${s}`];
      bone.rotation.set(r.rotX, r.rotY, r.rotZ);
    });

    scene.updateMatrixWorld(true);

    // ── Knees via IK ────────────────────────────────────────────────────
    (['L', 'R']).forEach((s) => {
      const hipBone  = get(`hip${s}`);
      const kneeBone = get(`knee${s}`);
      if (!hipBone || !kneeBone) return;

      const hipWorld = new THREE.Vector3();
      hipBone.getWorldPosition(hipWorld);

      const aTarget = pose[`ankle${s}`];
      const ankleWorld = new THREE.Vector3(aTarget.x, aTarget.y, aTarget.z);

      const hint = hipWorld.clone().add(new THREE.Vector3(0, -0.20, 0.25));

      const len1 = hipBone.children[0]?.position.length()   || LEG_UPPER;
      const len2 = kneeBone.children[0]?.position.length()  || LEG_LOWER;

      const { midAngle } = solveTwoBoneIK(hipWorld, ankleWorld, len1, len2, hint);
      kneeBone.rotation.x = -(Math.PI - midAngle);
    });

    scene.updateMatrixWorld(true);
  }, [nodes, pose, scene]);

  return <primitive object={scene} />;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * @param {{ pose: object, visible: boolean }} props
 * pose defaults to DEFAULT_POSE (relaxed standing).
 * visible=false renders nothing.
 */
export default function Climber3D({ pose = DEFAULT_POSE, visible = true }) {
  if (!visible) return null;

  return (
    <ModelErrorBoundary fallback={<ProceduralClimber pose={pose} />}>
      <Suspense fallback={<ProceduralClimber pose={pose} />}>
        <RiggedClimber pose={pose} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
