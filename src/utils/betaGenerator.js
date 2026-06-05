// Generates three beta variations as a 3-level structure.
// No THREE.js — pure math.
//
// Level 1: betas   (A Direct, B Hip Turn, C Alternate)
// Level 2: positions  (settled, static body states)
// Level 3: moveFrames (transition frames between two positions)

import { holdToWorldSpace } from './wallCoordinates.js';

const HIP_W       = 0.10;
const HIP_DROP    = 0.04;
const ARM_REACH   = 0.53;   // shoulder to hand
const LEG_REACH   = 0.80;   // hip to foot
const TORSO_LEN   = 0.55;   // hip to shoulder (solver)
const SHOULDER_HW = 0.18;   // shoulder half-width (solver)

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

// ── Iterative hip solver ──────────────────────────────────────────────────────
//
// Finds a hip position where all four limbs are within reach of their holds.
// Uses a damped FABRIK-style relaxation: 20 iterations, 50% damping.
// LH/RH = left/right hand world positions, LF/RF = left/right foot world positions.
// Any of the four can be null (limb not on a hold).

function solveHipPosition(LH, RH, LF, RF) {
  const pts = [LH, RH, LF, RF].filter(Boolean);
  if (!pts.length) return { x: 0, y: 1.0, z: 0.3 };

  const n = pts.length;
  const hip = {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n + 0.25,
  };

  for (let iter = 0; iter < 20; iter++) {
    const lSh = { x: hip.x - SHOULDER_HW, y: hip.y + TORSO_LEN, z: hip.z };
    const rSh = { x: hip.x + SHOULDER_HW, y: hip.y + TORSO_LEN, z: hip.z };

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
    push(hip, LF, LEG_REACH);
    push(hip, RF, LEG_REACH);

    if (!corrs.length) break;

    const cn = corrs.length;
    hip.x += corrs.reduce((s, c) => s + c.x, 0) / cn * 0.5;
    hip.y += corrs.reduce((s, c) => s + c.y, 0) / cn * 0.5;
    hip.z += corrs.reduce((s, c) => s + c.z, 0) / cn * 0.5;
  }

  // Floor and wall clearance
  hip.y = Math.max(0.4, hip.y);
  const minHoldZ = Math.min(...pts.map(p => p.z));
  hip.z = Math.max(minHoldZ + 0.15, hip.z);

  return hip;
}

// ── Body geometry ─────────────────────────────────────────────────────────────

/**
 * Find the best foothold pair from a candidate pool.
 * searchY = upper bound (look for holds strictly below this level).
 * The pool should include both dedicated footholds AND vacated hand holds.
 */
function chooseFeet(pool, angleDeg, searchY, hipX) {
  const below = pool
    .map(h => ({ h, w: holdToWorldSpace(h, angleDeg) }))
    .filter(({ w }) => w && w.y < searchY - 0.05)
    .sort((a, b) => b.w.y - a.w.y);   // highest first = step up as high as possible

  const footL = below.find(({ w }) => w.x <= hipX + 0.75)?.h ?? below[0]?.h ?? null;
  const footR = below.find(({ w }) => w.x >= hipX - 0.75)?.h ?? below[0]?.h ?? null;
  return { footL, footR };
}

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

// ── Settled pose ──────────────────────────────────────────────────────────────

function buildSettledPose(handLW, handRW, footLW, footRW, angleDeg, hipTwist) {
  const safeWL = handLW ?? { x: -0.24, y: 0.90, z: 0.04 };
  const safeWR = handRW ?? { x:  0.24, y: 0.90, z: 0.04 };
  const rotXW  = ((wallAngleDeg(angleDeg) - 90) * Math.PI) / 180;
  const spine  = { rotX: -rotXW * 0.18, rotZ: hipTwist * 0.52 };
  const hip    = solveHipPosition(safeWL, safeWR, footLW, footRW);

  const hangL  = { x: hip.x - HIP_W, y: hip.y - 0.72, z: hip.z + 0.04 };
  const hangR  = { x: hip.x + HIP_W, y: hip.y - 0.72, z: hip.z + 0.04 };
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

function buildContacts(handL, handR, footL, footR) {
  const c = [];
  if (handL) c.push({ limb: 'handL', holdId: handL.id });
  if (handR) c.push({ limb: 'handR', holdId: handR.id });
  if (footL) c.push({ limb: 'footL', holdId: footL.id });
  if (footR) c.push({ limb: 'footR', holdId: footR.id });
  return c;
}

// ── Move sequence (greedy) ────────────────────────────────────────────────────
//
// Key insight: feet step UP as the climb progresses.
// Search threshold = maxHandY so higher mid-climb footholds are found.
// Vacated hand holds enter the foot-candidate pool immediately.

function buildMoves(holds, climberStats, angleDeg, strategy) {
  const armSpan   = calcArmSpan(climberStats);
  const startH    = holds.filter(h => h.isStart);
  const topHold   = holds.find(h => h.isTop);
  const handHolds = holds.filter(h => h.type !== 'foothold');

  if (!startH.length || !topHold) return [];

  const sorted = [...startH].sort((a, b) => a.x - b.x);
  let handL    = sorted[0];
  let handR    = sorted.length > 1 ? sorted[sorted.length - 1] : sorted[0];

  // Initial feet: look below the start holds
  const initMaxHandY = Math.max(wh(handL, angleDeg).y, wh(handR, angleDeg).y);
  const initHipX     = (wh(handL, angleDeg).x + wh(handR, angleDeg).x) / 2;
  const initPool     = holds.filter(h => h.type === 'foothold');
  const initFt       = chooseFeet(initPool, angleDeg, initMaxHandY + 0.10, initHipX);
  let footL          = initFt.footL;
  let footR          = initFt.footR;

  const visited = new Set([handL.id, handR.id]);
  const vacated = new Set();   // hand holds now free to be used as footholds
  const moves   = [];

  for (let iter = 0; iter < 24 && !visited.has(topHold.id); iter++) {
    const hL = wh(handL, angleDeg);
    const hR = wh(handR, angleDeg);
    const fL = footL ? wh(footL, angleDeg) : null;
    const fR = footR ? wh(footR, angleDeg) : null;

    // Shoulder estimates for reachability (use solved hip)
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

    // Move the hand — vacate the old hold so it can become a foothold
    if (movingLeft) {
      vacated.add(handL.id);
      handL = target;
    } else {
      vacated.add(handR.id);
      handR = target;
    }
    visited.add(target.id);

    // Update feet: pool = dedicated footholds + all vacated hand holds
    // Use the MAX hand height as the search ceiling so higher footholds are found
    const footPool   = holds.filter(h => h.type === 'foothold' || vacated.has(h.id));
    const newMaxHandY = Math.max(wh(handL, angleDeg).y, wh(handR, angleDeg).y);
    const newHipX    = (wh(handL, angleDeg).x + wh(handR, angleDeg).x) / 2;
    const nFt        = chooseFeet(footPool, angleDeg, newMaxHandY, newHipX);
    if (nFt.footL) footL = nFt.footL;
    if (nFt.footR) footR = nFt.footR;

    moves.push({
      moveIndex: moves.length,
      movingLeft, isDynamic,
      toHold: target,
      handL, handR, footL, footR,
      prevHandL, prevHandR, prevFootL, prevFootR,
    });
  }

  // Safety net: if loop ended before reaching top hold, force a final move
  if (!visited.has(topHold.id)) {
    const hL = wh(handL, angleDeg), hR = wh(handR, angleDeg);
    const tW = wh(topHold, angleDeg);
    const movingLeft = hL && hR ? tW.x < (hL.x + hR.x) / 2 : true;
    const prevHandL = handL, prevHandR = handR;
    const prevFootL = footL, prevFootR = footR;

    if (movingLeft) { vacated.add(handL.id); handL = topHold; }
    else            { vacated.add(handR.id); handR = topHold; }

    const footPool    = holds.filter(h => h.type === 'foothold' || vacated.has(h.id));
    const newMaxHandY = Math.max(wh(handL, angleDeg).y, wh(handR, angleDeg).y);
    const nFt         = chooseFeet(footPool, angleDeg, newMaxHandY,
                          (wh(handL, angleDeg).x + wh(handR, angleDeg).x) / 2);
    if (nFt.footL) footL = nFt.footL;
    if (nFt.footR) footR = nFt.footR;

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

// ── Move frame builders ───────────────────────────────────────────────────────

function buildMoveFrames(move, prevPose, prevContacts, settledPose, settledContacts, angleDeg) {
  const { movingLeft, toHold, prevHandL, prevHandR, prevFootL, prevFootR, footL, footR } = move;
  const side  = movingLeft ? 'left hand' : 'right hand';
  const hRef  = `${toHold.type} (${toHold.x.toFixed(2)}, ${toHold.y.toFixed(2)})`;
  const mIdx  = move.moveIndex + 1;
  const toW   = wh(toHold, angleDeg);
  const prevStatHand = movingLeft ? prevHandR : prevHandL;

  const mk = (label, desc, pose, contacts) => ({
    id: crypto.randomUUID(), label, description: desc,
    pose, contacts, analysisResult: null,
  });

  if (!move.isDynamic) {
    // Static: Load → Reach → Grab → Settle
    const loadPose = {
      ...prevPose,
      hips: { x: prevPose.hips.x, y: Math.max(0.20, prevPose.hips.y - 0.12), z: prevPose.hips.z },
      kneeL: { rotX: (prevPose.kneeL?.rotX ?? 0.10) + 0.25 },
      kneeR: { rotX: (prevPose.kneeR?.rotX ?? 0.10) + 0.25 },
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

    const reachContacts = [
      ...(prevStatHand ? [{ limb: movingLeft ? 'handR' : 'handL', holdId: prevStatHand.id }] : []),
      ...(prevFootL ? [{ limb: 'footL', holdId: prevFootL.id }] : []),
      ...(prevFootR ? [{ limb: 'footR', holdId: prevFootR.id }] : []),
    ];
    const grabContacts = [
      { limb: movingLeft ? 'handL' : 'handR', holdId: toHold.id },
      ...(prevStatHand ? [{ limb: movingLeft ? 'handR' : 'handL', holdId: prevStatHand.id }] : []),
      ...(footL ? [{ limb: 'footL', holdId: footL.id }] : []),
      ...(footR ? [{ limb: 'footR', holdId: footR.id }] : []),
    ];

    return [
      mk('Load',   `Move ${mIdx}: load — weight onto feet, ${side} prepares.`,          loadPose,     prevContacts),
      mk('Reach',  `Move ${mIdx}: reach — ${side} releases old hold, extends to ${hRef}.`, reachPose, reachContacts),
      mk('Grab',   `Move ${mIdx}: grab — ${side} latches ${hRef}, body off-balance.`,   grabPose,     grabContacts),
      mk('Settle', `Move ${mIdx}: settle — all contacts set, weight balanced.`,         settledPose,  settledContacts),
    ];
  }

  // Dynamic: Setup → Load → Release → Peak → Catch → Stabilize
  const loadPose = {
    ...prevPose,
    hips: { x: prevPose.hips.x, y: Math.max(0.20, prevPose.hips.y - 0.15), z: prevPose.hips.z },
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

  const releaseContacts = [
    ...(prevHandL ? [{ limb: 'handL', holdId: prevHandL.id }] : []),
    ...(prevHandR ? [{ limb: 'handR', holdId: prevHandR.id }] : []),
  ];
  const peakContacts = [
    ...(prevStatHand ? [{ limb: movingLeft ? 'handR' : 'handL', holdId: prevStatHand.id }] : []),
    { limb: movingLeft ? 'handL' : 'handR', holdId: toHold.id },
  ];
  const catchContacts = [
    { limb: movingLeft ? 'handL' : 'handR', holdId: toHold.id },
    ...(prevStatHand ? [{ limb: movingLeft ? 'handR' : 'handL', holdId: prevStatHand.id }] : []),
  ];

  return [
    mk('Setup',     `Move ${mIdx}: set up on start holds.`,                             { ...prevPose }, prevContacts),
    mk('Load',      `Move ${mIdx}: load — hips compress, arms pull in.`,                loadPose,        prevContacts),
    mk('Release',   `Move ${mIdx}: release — feet leave the wall.`,                     releasePose,     releaseContacts),
    mk('Peak',      `Move ${mIdx}: peak — ${side} reaches ${hRef} at full extension.`,  peakPose,        peakContacts),
    mk('Catch',     `Move ${mIdx}: catch — ${hRef} latched, body absorbs swing.`,       catchPose,       catchContacts),
    mk('Stabilize', `Move ${mIdx}: stabilize — feet re-established, settled.`,          settledPose,     settledContacts),
  ];
}

// ── Build a single beta ───────────────────────────────────────────────────────

function buildBeta(id, label, description, moves, variant, angleDeg, holds) {
  const topHold = holds?.find(h => h.isTop);
  if (!moves.length) return { id, label, description, positions: [] };

  const positions = [];

  // Position 0: start — both hands on start holds, feet at initial footholds
  const fm  = moves[0];
  const wL0 = wh(fm.prevHandL, angleDeg) ?? { x: -0.24, y: 0.90, z: 0.04 };
  const wR0 = wh(fm.prevHandR, angleDeg) ?? { x:  0.24, y: 0.90, z: 0.04 };
  const fL0 = wh(fm.prevFootL, angleDeg);
  const fR0 = wh(fm.prevFootR, angleDeg);

  positions.push({
    index:          0,
    label:          'Position 1',
    contacts:       buildContacts(fm.prevHandL, fm.prevHandR, fm.prevFootL, fm.prevFootR),
    pose:           buildSettledPose(wL0, wR0, fL0, fR0, angleDeg, 0),
    analysisResult: null,
    moveFrames:     [],
  });

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const prev = positions[positions.length - 1];

    // "Top" when a hand is actually on the top hold
    const onTop    = topHold && (move.handL?.id === topHold.id || move.handR?.id === topHold.id);
    const posLabel = onTop ? 'Top' : `Position ${i + 2}`;

    // Hip twist for variant B: 30° toward the active hand
    const hipTwist = variant === 'hipTurn' ? (move.movingLeft ? -1 : 1) : 0;

    const wL = wh(move.handL, angleDeg) ?? prev.pose.wristL;
    const wR = wh(move.handR, angleDeg) ?? prev.pose.wristR;
    const fL = wh(move.footL, angleDeg);
    const fR = wh(move.footR, angleDeg);

    const settledPose     = buildSettledPose(wL, wR, fL, fR, angleDeg, hipTwist);
    const settledContacts = buildContacts(move.handL, move.handR, move.footL, move.footR);
    const frames          = buildMoveFrames(
      move, prev.pose, prev.contacts, settledPose, settledContacts, angleDeg,
    );

    positions.push({
      index: i + 1, label: posLabel,
      contacts: settledContacts, pose: settledPose,
      analysisResult: null, moveFrames: frames,
    });
  }

  return { id, label, description, positions };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateBeta(holds, climberStats, wallAngleDeg) {
  const movesA = buildMoves(holds, climberStats, wallAngleDeg, 'highest');
  const movesC = buildMoves(holds, climberStats, wallAngleDeg, 'second');

  return {
    betas: [
      buildBeta('A', 'Direct',    'Most efficient line, fewest moves.',                               movesA, 'direct',  wallAngleDeg, holds),
      buildBeta('B', 'Hip Turn',  'Hip rotation toward active hand; outside leg flagged on overhangs.', movesA, 'hipTurn', wallAngleDeg, holds),
      buildBeta('C', 'Alternate', 'Second-closest holds where available; different hold sequence.',    movesC, 'direct',  wallAngleDeg, holds),
    ],
  };
}
