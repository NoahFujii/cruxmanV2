// Generates three beta variations as a 3-level structure.
// No THREE.js — pure math.
//
// Level 1: betas       (A Direct, B Hip Turn, C Alternate)
// Level 2: positions   (settled, static body states — Start is a hanging no-foot start)
// Level 3: moveFrames  (transition frames between two positions)

import { holdToWorldSpace } from './wallCoordinates.js';

const ARM_REACH   = 0.53;   // shoulder to hand
const LEG_REACH   = 0.80;   // hip to foot
const TORSO_LEN   = 0.55;   // hip to shoulder
const SHOULDER_HW = 0.18;   // shoulder half-width
const WALL_W      = 4;      // metres (matches wallCoordinates.js)
const WALL_H      = 6;      // metres

// ── Helpers ───────────────────────────────────────────────────────────────────

function wh(hold, wall) { return holdToWorldSpace(hold, wall); }

function wallAngleDeg(wall) {
  return typeof wall === 'number' ? wall : wall?.angleDeg ?? 90;
}

function dist3(a, b) {
  if (!a || !b) return Infinity;
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function calcArmSpan(stats) {
  const h = stats.heightCm  ?? 175;
  const a = stats.apeIndexCm ?? 0;
  return h * (1 + a / h) * 0.0044;
}

// ── Foot helpers (smear-aware) ────────────────────────────────────────────────

// Returns world position for a foot that may be a real hold or a smear descriptor.
function footWorldPos(foot, angleDeg) {
  if (!foot) return null;
  if (foot.smear) return foot.worldPos;
  return holdToWorldSpace(foot, angleDeg);
}

// Builds foot contacts, handling smear objects.
function buildFeetContacts(footL, footR) {
  const c = [];
  if (footL) c.push(footL.smear ? { limb: 'footL', smear: true } : { limb: 'footL', holdId: footL.id });
  if (footR) c.push(footR.smear ? { limb: 'footR', smear: true } : { limb: 'footR', holdId: footR.id });
  return c;
}

// Creates a smear descriptor at the wall surface below the given hip position.
function makeSmear(side, hipXWorld, hipYEstimate, angleDeg) {
  const ang    = wallAngleDeg(angleDeg);
  const offset = side === 'L' ? -0.18 : 0.18;
  const sx     = hipXWorld + offset;
  const sy     = Math.max(0.15, hipYEstimate - 0.60);

  // Approximate inverse of holdToWorldSpace: recover normalised hold coords
  const r       = ((ang - 90) * Math.PI) / 180;
  const cosR    = Math.cos(r);
  const cosRSafe = Math.abs(cosR) < 0.1 ? (cosR < 0 ? -0.1 : 0.1) : cosR;
  const localY  = sy / cosRSafe;
  const nx      = Math.max(0.01, Math.min(0.99, sx / WALL_W + 0.5));
  const ny      = Math.max(0.01, Math.min(0.99, localY / WALL_H));

  const worldPos = holdToWorldSpace({ x: nx, y: ny, z: 0.02 }, ang);
  return { smear: true, worldPos };
}

// ── Hip solver ────────────────────────────────────────────────────────────────

function solveHipPosition(LH, RH, LF, RF) {
  const pts = [LH, RH, LF, RF].filter(Boolean);
  if (!pts.length) return { x: 0, y: 1.0, z: 0.3 };

  const n   = pts.length;
  const hip = {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n + 0.25,
  };

  for (let iter = 0; iter < 20; iter++) {
    const lSh  = { x: hip.x - SHOULDER_HW, y: hip.y + TORSO_LEN, z: hip.z };
    const rSh  = { x: hip.x + SHOULDER_HW, y: hip.y + TORSO_LEN, z: hip.z };
    const corrs = [];

    const push = (root, target, reach) => {
      if (!target) return;
      const d = dist3(root, target);
      if (d <= reach || d < 1e-6) return;
      const over = d - reach;
      corrs.push({
        x: ((target.x - root.x) / d) * over,
        y: ((target.y - root.y) / d) * over,
        z: ((target.z - root.z) / d) * over,
      });
    };

    push(lSh, LH, ARM_REACH);
    push(rSh, RH, ARM_REACH);
    push(hip,  LF, LEG_REACH);
    push(hip,  RF, LEG_REACH);

    if (!corrs.length) break;
    const cn = corrs.length;
    hip.x += corrs.reduce((s, c) => s + c.x, 0) / cn * 0.5;
    hip.y += corrs.reduce((s, c) => s + c.y, 0) / cn * 0.5;
    hip.z += corrs.reduce((s, c) => s + c.z, 0) / cn * 0.5;
  }

  hip.y = Math.max(0.4, hip.y);
  const minZ = Math.min(...pts.map(p => p.z));
  hip.z = Math.max(minZ + 0.15, hip.z);
  return hip;
}

// ── Foot selection ────────────────────────────────────────────────────────────

function chooseFeetWithSmear(pool, angleDeg, searchY, hipXWorld, hipYEstimate) {
  const ang        = wallAngleDeg(angleDeg);
  const isOverhang = ang > 105;
  const isSlab     = ang <= 95;

  const below = pool
    .map(h => ({ h, w: holdToWorldSpace(h, ang) }))
    .filter(({ w }) => w && w.y < searchY - 0.05)
    .sort((a, b) => b.w.y - a.w.y);

  const candidateL = below.filter(({ w }) => w.x <= hipXWorld + 0.75);
  const candidateR = below.filter(({ w }) => w.x >= hipXWorld - 0.75);

  const realL = candidateL[0]?.h ?? below[0]?.h ?? null;
  const realR = candidateR[0]?.h ?? below[0]?.h ?? null;

  const smearTarget = Math.max(0.15, hipYEstimate - 0.60);

  function resolveL() {
    if (!realL) return makeSmear('L', hipXWorld, hipYEstimate, ang);
    if (!isOverhang && isSlab) {
      const fw   = holdToWorldSpace(realL, ang);
      const dist = Math.hypot(fw.x - (hipXWorld - 0.18), fw.y - smearTarget);
      if (dist > 0.70) return makeSmear('L', hipXWorld, hipYEstimate, ang);
    }
    return realL;
  }

  function resolveR() {
    if (!realR) return makeSmear('R', hipXWorld, hipYEstimate, ang);
    if (!isOverhang && isSlab) {
      const fw   = holdToWorldSpace(realR, ang);
      const dist = Math.hypot(fw.x - (hipXWorld + 0.18), fw.y - smearTarget);
      if (dist > 0.70) return makeSmear('R', hipXWorld, hipYEstimate, ang);
    }
    return realR;
  }

  return { footL: resolveL(), footR: resolveR() };
}

// ── Pose builders ─────────────────────────────────────────────────────────────

function defaultRot(hipTwist = 0) {
  return {
    shoulderL: { rotX: 0, rotY: 0, rotZ:  0.08 },
    shoulderR: { rotX: 0, rotY: 0, rotZ: -0.08 },
    elbowL:    { rotX: 0.15 },
    elbowR:    { rotX: 0.15 },
    hipL:  { rotX: 0, rotY: hipTwist, rotZ:  0.04 },
    hipR:  { rotX: 0, rotY: hipTwist, rotZ: -0.04 },
    kneeL: { rotX: 0.10 },
    kneeR: { rotX: 0.10 },
  };
}

// Start position: both hands on start holds, feet dangling (hanging start).
function buildHangStartPose(wL, wR, angleDeg) {
  const midX  = (wL.x + wR.x) / 2;
  const midY  = (wL.y + wR.y) / 2;
  const hipY  = Math.max(0.30, midY - TORSO_LEN - 0.10);
  const hipZ  = Math.max((wL.z + wR.z) / 2 + 0.15, 0.20);
  const rotXW = ((wallAngleDeg(angleDeg) - 90) * Math.PI) / 180;
  return {
    hips:      { x: midX, y: hipY,  z: hipZ },
    spine:     { rotX: -rotXW * 0.10, rotZ: 0 },
    shoulderL: { rotX: 0, rotY: 0, rotZ:  0.10 },
    shoulderR: { rotX: 0, rotY: 0, rotZ: -0.10 },
    elbowL:    { rotX: 0.40 },
    elbowR:    { rotX: 0.40 },
    hipL:      { rotX: 0, rotY: 0, rotZ:  0.06 },
    hipR:      { rotX: 0, rotY: 0, rotZ: -0.06 },
    kneeL:     { rotX: 0.20 },
    kneeR:     { rotX: 0.20 },
    wristL:    { x: wL.x,  y: wL.y,  z: wL.z  },
    wristR:    { x: wR.x,  y: wR.y,  z: wR.z  },
    ankleL:    { x: midX - 0.12, y: Math.max(0.05, hipY - 0.68), z: hipZ + 0.05 },
    ankleR:    { x: midX + 0.12, y: Math.max(0.05, hipY - 0.68), z: hipZ + 0.05 },
  };
}

// Settled stance: feet may be real hold world positions or smear world positions.
function buildSettledPose(handLW, handRW, footLW, footRW, angleDeg, hipTwist) {
  const safeWL = handLW ?? { x: -0.24, y: 0.90, z: 0.04 };
  const safeWR = handRW ?? { x:  0.24, y: 0.90, z: 0.04 };
  const rotXW  = ((wallAngleDeg(angleDeg) - 90) * Math.PI) / 180;
  const spine  = { rotX: -rotXW * 0.18, rotZ: hipTwist * 0.52 };
  const hip    = solveHipPosition(safeWL, safeWR, footLW, footRW);

  const hangL  = { x: hip.x - 0.10, y: hip.y - 0.72, z: hip.z + 0.04 };
  const hangR  = { x: hip.x + 0.10, y: hip.y - 0.72, z: hip.z + 0.04 };
  const ankleL = footLW ?? hangL;
  const ankleR = footRW ?? hangR;

  return {
    hips:   { x: hip.x, y: hip.y, z: hip.z },
    spine,
    ...defaultRot(hipTwist * 0.18),
    wristL: { x: safeWL.x, y: safeWL.y, z: safeWL.z },
    wristR: { x: safeWR.x, y: safeWR.y, z: safeWR.z },
    ankleL: { x: ankleL.x, y: ankleL.y, z: ankleL.z },
    ankleR: { x: ankleR.x, y: ankleR.y, z: ankleR.z },
  };
}

// ── Contact builder ───────────────────────────────────────────────────────────

function buildContacts(handL, handR, footL, footR) {
  const c = [];
  if (handL) c.push({ limb: 'handL', holdId: handL.id });
  if (handR) c.push({ limb: 'handR', holdId: handR.id });
  c.push(...buildFeetContacts(footL, footR));
  return c;
}

// ── Move frame builders ───────────────────────────────────────────────────────
//
// Static:  Load → Reach → Grab → Stabilize
// Dynamic: Load → Release → Peak → Catch → Stabilize
// The final frame (Stabilize) is always the exact incoming settled pose + contacts.

function buildMoveFrames(move, prevPose, prevContacts, settledPose, settledContacts, angleDeg) {
  const { movingLeft, toHold, prevHandL, prevHandR, prevFootL, prevFootR, footL, footR } = move;
  const mIdx = move.moveIndex + 1;
  const side = movingLeft ? 'left hand' : 'right hand';
  const hRef = `${toHold.type ?? 'hold'} (${toHold.x.toFixed(2)}, ${toHold.y.toFixed(2)})`;
  const toW  = wh(toHold, angleDeg);
  const prevStatHand = movingLeft ? prevHandR : prevHandL;

  const mk = (label, desc, pose, contacts) => ({
    id: crypto.randomUUID(), label, description: desc,
    pose, contacts, analysisResult: null,
  });

  // Filter out the moving hand for the reach/release stage.
  const movingLimb = movingLeft ? 'handL' : 'handR';
  const reachContacts = prevContacts.filter(c => c.limb !== movingLimb);

  // Grab contacts: new hand + stationary hand + settled feet.
  const grabContacts = [
    { limb: movingLimb, holdId: toHold.id },
    ...(prevStatHand?.id ? [{ limb: movingLeft ? 'handR' : 'handL', holdId: prevStatHand.id }] : []),
    ...settledContacts.filter(c => c.limb === 'footL' || c.limb === 'footR'),
  ];

  if (!move.isDynamic) {
    // ── Static: Load → Reach → Grab → Stabilize ──────────────────────────────

    const loadPose = {
      ...prevPose,
      hips:   { x: prevPose.hips.x, y: Math.max(0.20, prevPose.hips.y - 0.12), z: prevPose.hips.z },
      kneeL:  { rotX: (prevPose.kneeL?.rotX  ?? 0.10) + 0.25 },
      kneeR:  { rotX: (prevPose.kneeR?.rotX  ?? 0.10) + 0.25 },
      elbowL: { rotX: (prevPose.elbowL?.rotX ?? 0.15) + 0.20 },
      elbowR: { rotX: (prevPose.elbowR?.rotX ?? 0.15) + 0.20 },
    };

    const prevMovW    = wh(movingLeft ? prevHandL : prevHandR, angleDeg);
    const reachTarget = (prevMovW && toW) ? {
      x: prevMovW.x + (toW.x - prevMovW.x) * 0.80,
      y: prevMovW.y + (toW.y - prevMovW.y) * 0.80,
      z: prevMovW.z + (toW.z - prevMovW.z) * 0.80,
    } : (toW ?? (movingLeft ? prevPose.wristL : prevPose.wristR));

    const reachPose = {
      ...prevPose,
      hips: { x: prevPose.hips.x, y: prevPose.hips.y + 0.06, z: prevPose.hips.z },
      [movingLeft ? 'wristL' : 'wristR']: reachTarget,
    };

    const grabPose = {
      ...settledPose,
      hips: { x: settledPose.hips.x + (movingLeft ? -0.03 : 0.03),
              y: Math.max(0.20, settledPose.hips.y - 0.05),
              z: settledPose.hips.z },
    };

    return [
      mk('Load',      `Drop into the feet, pull the hips in.`,              loadPose,    prevContacts),
      mk('Reach',     `Release the ${side}, extend toward the target.`,     reachPose,   reachContacts),
      mk('Grab',      `Latch ${hRef}, absorb the shift in weight.`,         grabPose,    grabContacts),
      mk('Stabilize', `Re-establish balance, weight through the feet.`,     settledPose, settledContacts),
    ];
  }

  // ── Dynamic: Load → Release → Peak → Catch → Stabilize ───────────────────

  const loadPose = {
    ...prevPose,
    hips:  { x: prevPose.hips.x, y: Math.max(0.20, prevPose.hips.y - 0.15), z: prevPose.hips.z },
    kneeL: { rotX: (prevPose.kneeL?.rotX ?? 0.10) + 0.35 },
    kneeR: { rotX: (prevPose.kneeR?.rotX ?? 0.10) + 0.35 },
  };

  const releasePose = {
    ...prevPose,
    hips:   { x: prevPose.hips.x, y: prevPose.hips.y + 0.08, z: prevPose.hips.z + 0.06 },
    ankleL: { x: prevPose.hips.x - 0.12, y: prevPose.hips.y - 0.45, z: prevPose.hips.z - 0.10 },
    ankleR: { x: prevPose.hips.x + 0.12, y: prevPose.hips.y - 0.45, z: prevPose.hips.z - 0.10 },
  };

  const peakPose = {
    ...prevPose,
    hips:   { x: prevPose.hips.x, y: prevPose.hips.y + 0.20, z: prevPose.hips.z },
    ankleL: { x: prevPose.hips.x - 0.10, y: prevPose.hips.y - 0.35, z: prevPose.hips.z },
    ankleR: { x: prevPose.hips.x + 0.10, y: prevPose.hips.y - 0.35, z: prevPose.hips.z },
    [movingLeft ? 'wristL' : 'wristR']: toW ?? prevPose[movingLeft ? 'wristL' : 'wristR'],
  };

  const catchPose = {
    ...settledPose,
    ankleL: { x: settledPose.hips.x - 0.12, y: settledPose.hips.y - 0.50, z: settledPose.hips.z },
    ankleR: { x: settledPose.hips.x + 0.12, y: settledPose.hips.y - 0.50, z: settledPose.hips.z },
  };

  // Feet cut on release — only hands remain.
  const releaseContacts = prevContacts.filter(c => c.limb === 'handL' || c.limb === 'handR');
  const peakContacts = [
    ...(prevStatHand?.id ? [{ limb: movingLeft ? 'handR' : 'handL', holdId: prevStatHand.id }] : []),
    { limb: movingLimb, holdId: toHold.id },
  ];
  const catchContacts = [...peakContacts];

  return [
    mk('Load',      `Compress into a crouch, arms pull in — coil for the dyno.`,  loadPose,    prevContacts),
    mk('Release',   `Feet cut, commit upward — explosive hip drive.`,              releasePose, releaseContacts),
    mk('Peak',      `Full extension — ${side} targets ${hRef}.`,                   peakPose,    peakContacts),
    mk('Catch',     `Latch ${hRef}, body absorbs the swing.`,                      catchPose,   catchContacts),
    mk('Stabilize', `Re-establish feet, weight settles through all contacts.`,     settledPose, settledContacts),
  ];
}

// ── Move sequence (greedy) ────────────────────────────────────────────────────
//
// Starts with both hands on isStart holds and NO feet (hanging start).
// Feet are assigned after each hand move using chooseFeetWithSmear.

function buildMoves(holds, climberStats, angleDeg, strategy) {
  const armSpan   = calcArmSpan(climberStats);
  const startH    = holds.filter(h => h.isStart);
  const topHold   = holds.find(h => h.isTop);
  const handHolds = holds.filter(h => h.type !== 'foothold');

  if (!startH.length || !topHold) return [];

  const sorted = [...startH].sort((a, b) => a.x - b.x);
  let handL    = sorted[0];
  let handR    = sorted.length > 1 ? sorted[sorted.length - 1] : sorted[0];

  // Start with NO foot contacts — the climb begins as a hanging start.
  let footL = null;
  let footR = null;

  const visited = new Set([handL.id, handR.id]);
  const vacated = new Set();
  const moves   = [];

  for (let iter = 0; iter < 24 && !visited.has(topHold.id); iter++) {
    const hL = wh(handL, angleDeg);
    const hR = wh(handR, angleDeg);
    const fL = footWorldPos(footL, angleDeg);
    const fR = footWorldPos(footR, angleDeg);

    const checkHip = solveHipPosition(hL, hR, fL, fR);
    const cShY     = checkHip.y + TORSO_LEN;
    const cShL     = { x: checkHip.x - SHOULDER_HW, y: cShY, z: checkHip.z };
    const cShR     = { x: checkHip.x + SHOULDER_HW, y: cShY, z: checkHip.z };

    const maxHandY  = Math.max(hL.y, hR.y);
    const heightCap = maxHandY + armSpan * 2.5;
    const reachable = hw =>
      dist3(cShL, hw) <= armSpan * 1.80 || dist3(cShR, hw) <= armSpan * 1.80;

    let targets = handHolds
      .filter(h => !visited.has(h.id))
      .filter(h => {
        const hw = wh(h, angleDeg);
        return hw.y > Math.min(hL.y, hR.y) - 0.05 && hw.y <= heightCap;
      })
      .filter(h => reachable(wh(h, angleDeg)))
      .sort((a, b) => wh(b, angleDeg).y - wh(a, angleDeg).y);

    if (!targets.length) {
      targets = handHolds
        .filter(h => !visited.has(h.id))
        .filter(h => wh(h, angleDeg).y > Math.min(hL.y, hR.y))
        .sort((a, b) => wh(a, angleDeg).y - wh(b, angleDeg).y)
        .slice(0, 1);
    }
    if (!targets.length) {
      if (!visited.has(topHold.id)) targets = [topHold];
      else break;
    }

    let target;
    if (strategy === 'second' && targets.length >= 2) {
      const byDist = [...targets].sort((a, b) => {
        const dA = Math.min(dist3(hL, wh(a, angleDeg)), dist3(hR, wh(a, angleDeg)));
        const dB = Math.min(dist3(hL, wh(b, angleDeg)), dist3(hR, wh(b, angleDeg)));
        return dA - dB;
      });
      target = byDist[1];
    } else {
      target = targets[0];
    }

    const tW         = wh(target, angleDeg);
    const handMidX   = (hL.x + hR.x) / 2;
    const movingLeft = tW.x < handMidX;
    const bestShDist = Math.min(dist3(cShL, tW), dist3(cShR, tW));
    const isDynamic  = bestShDist > armSpan * 1.60;

    const prevHandL = handL, prevHandR = handR;
    const prevFootL = footL, prevFootR = footR;

    if (movingLeft) { vacated.add(handL.id); handL = target; }
    else            { vacated.add(handR.id); handR = target; }
    visited.add(target.id);

    const newHLw      = wh(handL, angleDeg);
    const newHRw      = wh(handR, angleDeg);
    const newMaxHandY = Math.max(newHLw.y, newHRw.y);
    const newHipX     = (newHLw.x + newHRw.x) / 2;
    const hipYEst     = newMaxHandY - TORSO_LEN;
    const footPool    = holds.filter(h => h.type === 'foothold' || vacated.has(h.id));
    const nFt         = chooseFeetWithSmear(footPool, angleDeg, newMaxHandY, newHipX, hipYEst);
    footL = nFt.footL;
    footR = nFt.footR;

    moves.push({
      moveIndex: moves.length,
      movingLeft, isDynamic,
      toHold: target,
      handL, handR, footL, footR,
      prevHandL, prevHandR, prevFootL, prevFootR,
    });
  }

  // Safety net: force a move to the top hold if not yet reached.
  if (!visited.has(topHold.id)) {
    const hLw = wh(handL, angleDeg), hRw = wh(handR, angleDeg);
    const tW  = wh(topHold, angleDeg);
    const movingLeft = hLw && hRw ? tW.x < (hLw.x + hRw.x) / 2 : true;

    const prevHandL = handL, prevHandR = handR;
    const prevFootL = footL, prevFootR = footR;

    if (movingLeft) { vacated.add(handL.id); handL = topHold; }
    else            { vacated.add(handR.id); handR = topHold; }

    const newHLw      = wh(handL, angleDeg);
    const newHRw      = wh(handR, angleDeg);
    const newMaxHandY = Math.max(newHLw.y, newHRw.y);
    const newHipX     = (newHLw.x + newHRw.x) / 2;
    const hipYEst     = newMaxHandY - TORSO_LEN;
    const footPool    = holds.filter(h => h.type === 'foothold' || vacated.has(h.id));
    const nFt         = chooseFeetWithSmear(footPool, angleDeg, newMaxHandY, newHipX, hipYEst);
    footL = nFt.footL;
    footR = nFt.footR;

    moves.push({
      moveIndex: moves.length,
      movingLeft, isDynamic: true,
      toHold: topHold,
      handL, handR, footL, footR,
      prevHandL, prevHandR, prevFootL, prevFootR,
    });
  }

  return moves;
}

// ── Build a single beta ───────────────────────────────────────────────────────

function buildBeta(id, label, description, moves, variant, angleDeg, holds) {
  const topHold = holds?.find(h => h.isTop);
  if (!moves.length) return { id, label, description, positions: [] };

  const positions = [];

  // Position 0: hanging start — both hands on start holds, no feet.
  const fm  = moves[0];
  const wL0 = wh(fm.prevHandL, angleDeg) ?? { x: -0.24, y: 0.90, z: 0.04 };
  const wR0 = wh(fm.prevHandR, angleDeg) ?? { x:  0.24, y: 0.90, z: 0.04 };

  positions.push({
    index:          0,
    label:          'Start',
    contacts:       [
      ...(fm.prevHandL ? [{ limb: 'handL', holdId: fm.prevHandL.id }] : []),
      ...(fm.prevHandR ? [{ limb: 'handR', holdId: fm.prevHandR.id }] : []),
    ],
    pose:           buildHangStartPose(wL0, wR0, angleDeg),
    analysisResult: null,
    moveFrames:     [],
  });

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const prev = positions[positions.length - 1];

    const hipTwist = variant === 'hipTurn' ? (move.movingLeft ? -1 : 1) : 0;

    const wL = wh(move.handL, angleDeg) ?? prev.pose.wristL;
    const wR = wh(move.handR, angleDeg) ?? prev.pose.wristR;
    const fL = footWorldPos(move.footL, angleDeg);
    const fR = footWorldPos(move.footR, angleDeg);

    const settledPose     = buildSettledPose(wL, wR, fL, fR, angleDeg, hipTwist);
    const settledContacts = buildContacts(move.handL, move.handR, move.footL, move.footR);

    const bothOnTop = topHold &&
      move.handL?.id === topHold.id && move.handR?.id === topHold.id;
    const posLabel  = bothOnTop ? 'Top' : `Position ${i + 2}`;

    const frames = buildMoveFrames(
      move, prev.pose, prev.contacts, settledPose, settledContacts, angleDeg,
    );

    positions.push({
      index: i + 1, label: posLabel,
      contacts: settledContacts, pose: settledPose,
      analysisResult: null, moveFrames: frames,
    });
  }

  // Add a "match" Top position when the last move left only one hand on the top hold.
  if (topHold) {
    const lastPos  = positions[positions.length - 1];
    const lastMove = moves[moves.length - 1];
    const lOnTop   = lastPos.contacts.some(c => c.limb === 'handL' && c.holdId === topHold.id);
    const rOnTop   = lastPos.contacts.some(c => c.limb === 'handR' && c.holdId === topHold.id);

    if (!(lOnTop && rOnTop)) {
      // The hand that is NOT yet on topHold matches in.
      const movingLeft = rOnTop;
      const prevStat   = movingLeft ? lastMove.handR : lastMove.handL;

      const topW      = wh(topHold, angleDeg);
      const fL        = footWorldPos(lastMove.footL, angleDeg);
      const fR        = footWorldPos(lastMove.footR, angleDeg);
      const matchPose = buildSettledPose(topW, topW, fL, fR, angleDeg, 0);

      const matchContacts = [
        { limb: 'handL', holdId: topHold.id },
        { limb: 'handR', holdId: topHold.id },
        ...buildFeetContacts(lastMove.footL, lastMove.footR),
      ];

      const matchMove = {
        moveIndex:  moves.length,
        movingLeft,
        isDynamic:  false,
        toHold:     topHold,
        handL:      topHold,
        handR:      topHold,
        footL:      lastMove.footL,
        footR:      lastMove.footR,
        prevHandL:  lastMove.handL,
        prevHandR:  lastMove.handR,
        prevFootL:  lastMove.footL,
        prevFootR:  lastMove.footR,
      };

      const matchFrames = buildMoveFrames(
        matchMove, lastPos.pose, lastPos.contacts, matchPose, matchContacts, angleDeg,
      );

      positions.push({
        index:          positions.length,
        label:          'Top',
        contacts:       matchContacts,
        pose:           matchPose,
        analysisResult: null,
        moveFrames:     matchFrames,
      });
    }
  }

  return { id, label, description, positions };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateBeta(holds, climberStats, wallAngleDeg) {
  const movesA = buildMoves(holds, climberStats, wallAngleDeg, 'highest');
  const movesC = buildMoves(holds, climberStats, wallAngleDeg, 'second');

  return {
    betas: [
      buildBeta('A', 'Direct',    'Most efficient line, fewest moves.',                                movesA, 'direct',  wallAngleDeg, holds),
      buildBeta('B', 'Hip Turn',  'Hip rotation toward active hand; outside leg flagged on overhangs.', movesA, 'hipTurn', wallAngleDeg, holds),
      buildBeta('C', 'Alternate', 'Second-closest holds where available; different hold sequence.',     movesC, 'direct',  wallAngleDeg, holds),
    ],
  };
}
