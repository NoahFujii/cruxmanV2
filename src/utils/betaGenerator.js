// Generates two beta variations (A: square, B: twist/flag) as ordered frozen frames.
// No THREE.js dependency — pure math.

const WALL_W     = 4;
const WALL_H     = 6;
const SPINE_LEN  = 0.45;
const SHOULDER_W = 0.21;
const ARM_REACH  = 0.54;  // ARM_UPPER + ARM_LOWER

// ── Coordinate helpers ────────────────────────────────────────────────────────

function holdWorld(hold, angleDeg) {
  const r  = (angleDeg - 90) * Math.PI / 180;
  const yw = hold.y * WALL_H;
  const zw = Math.max(hold.z ?? 0.02, 0.02);
  return {
    x: (hold.x - 0.5) * WALL_W,
    y: yw * Math.cos(r) - zw * Math.sin(r),
    z: yw * Math.sin(r) + zw * Math.cos(r),
  };
}

function dist3(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function calcArmSpan(stats) {
  const h = stats.heightCm ?? 175;
  const a = stats.apeIndexCm ?? 0;
  return (h * (1 + a / h)) * 0.0044;
}

// ── Body position ─────────────────────────────────────────────────────────────

function calcHip(wL, wR, fL, fR, angleDeg) {
  const r     = (angleDeg - 90) * Math.PI / 180;
  const avgHX = (wL.x + wR.x) / 2;
  const avgHZ = (wL.z + wR.z) / 2;
  let hipY;
  if (fL || fR) {
    // Foot-based: stand leg-length above the footholds
    const cnt = (fL ? 1 : 0) + (fR ? 1 : 0);
    const avgFY = ((fL?.y ?? 0) + (fR?.y ?? 0)) / cnt;
    hipY = avgFY + 0.75;
  } else {
    // No feet on wall (hanging / dynamic): hips below hands
    hipY = ((wL.y + wR.y) / 2) - 0.85;
  }
  return {
    x: avgHX,
    y: Math.max(0.20, hipY),
    z: avgHZ + 0.26 * Math.cos(r),
  };
}

function chooseFeet(holds, angleDeg, hipY, hipX) {
  const wh   = h => holdWorld(h, angleDeg);
  // Prefer dedicated footholds; fall back to any hold below hip
  const proper   = holds.filter(h => h.type === 'foothold').filter(h => wh(h).y < hipY - 0.05).sort((a, b) => wh(b).y - wh(a).y);
  const fallback = proper.length ? [] : holds.filter(h => wh(h).y < hipY - 0.05).sort((a, b) => wh(b).y - wh(a).y);
  const pool = proper.length ? proper : fallback;
  return {
    footL: pool.filter(h => wh(h).x <= hipX + 0.30)[0] ?? pool[0] ?? null,
    footR: pool.filter(h => wh(h).x >= hipX - 0.30)[0] ?? pool[0] ?? null,
  };
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

// ── Move sequence (greedy) ────────────────────────────────────────────────────

function buildMoves(holds, climberStats, angleDeg) {
  const span      = calcArmSpan(climberStats);
  const wh        = h => holdWorld(h, angleDeg);
  const startH    = holds.filter(h => h.isStart);
  const topHold   = holds.find(h => h.isTop);
  const handHolds = holds.filter(h => h.type !== 'foothold');

  if (!startH.length || !topHold) return [];

  const sorted = [...startH].sort((a, b) => a.x - b.x);
  let handL = sorted[0];
  let handR = sorted.length > 1 ? sorted[sorted.length - 1] : sorted[0];

  // Bootstrap feet using hands-at-waist assumption (hands may be below hip)
  const avgStartY = (wh(handL).y + wh(handR).y) / 2;
  const avgStartX = (wh(handL).x + wh(handR).x) / 2;
  const initFt    = chooseFeet(holds, angleDeg, avgStartY + 0.30, avgStartX);
  let footL = initFt.footL;
  let footR = initFt.footR;

  const visited = new Set([handL.id, handR.id]);
  const moves   = [];

  for (let iter = 0; iter < 24 && !visited.has(topHold.id); iter++) {
    const hL  = wh(handL), hR = wh(handR);
    const fL  = footL ? wh(footL) : null;
    const fR  = footR ? wh(footR) : null;

    // Best-foot shoulder: look 1.5× above highest hand for available footholds
    const maxHandY = Math.max(hL.y, hR.y);
    const hipMid   = (hL.x + hR.x) / 2;
    const bFt      = chooseFeet(holds, angleDeg, maxHandY * 1.5, hipMid);
    const checkHip = calcHip(hL, hR, bFt.footL ? wh(bFt.footL) : fL,
                                       bFt.footR ? wh(bFt.footR) : fR, angleDeg);
    const cShY = checkHip.y + SPINE_LEN;
    const cShL = { x: checkHip.x - SHOULDER_W, y: cShY, z: checkHip.z };
    const cShR = { x: checkHip.x + SHOULDER_W, y: cShY, z: checkHip.z };

    // Height cap: at most 2.5 arm-lengths above current highest hand per move
    const heightCap = maxHandY + ARM_REACH * 2.5;

    // Reachable = shoulder can reach with moderate body movement (1.80×)
    const reachable = hw =>
      dist3(cShL, hw) <= ARM_REACH * 1.80 || dist3(cShR, hw) <= ARM_REACH * 1.80;

    let targets = handHolds
      .filter(h => !visited.has(h.id))
      .filter(h => wh(h).y > Math.min(hL.y, hR.y) - 0.05 && wh(h).y <= heightCap)
      .filter(h => reachable(wh(h)))
      .sort((a, b) => wh(b).y - wh(a).y);

    // Catch-all: top hold too high → take the LOWEST unvisited hold above current
    if (!targets.length) {
      targets = handHolds
        .filter(h => !visited.has(h.id) && wh(h).y > Math.min(hL.y, hR.y))
        .sort((a, b) => wh(a).y - wh(b).y)  // ascending: nearest upward hold first
        .slice(0, 1);
    }
    if (!targets.length) break;

    const target     = targets[0];
    const tW         = wh(target);
    const movingLeft = dist3(hL, tW) >= dist3(hR, tW);

    // Dynamic: best shoulder can't reach within 1.60× arm length without explosive movement
    const bestShDist = Math.min(dist3(cShL, tW), dist3(cShR, tW));
    const isDynamic  = bestShDist > ARM_REACH * 1.60;

    const prevHandL = handL, prevHandR = handR;
    const prevFootL = footL, prevFootR = footR;

    if (movingLeft) handL = target; else handR = target;
    visited.add(target.id);

    const newHip = calcHip(wh(handL), wh(handR), fL, fR, angleDeg);
    const nFt    = chooseFeet(holds, angleDeg, newHip.y, newHip.x);
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
  return moves;
}

// ── Pose builder ──────────────────────────────────────────────────────────────

function buildPose(label, move, angleDeg, variant) {
  const wh = h => h ? holdWorld(h, angleDeg) : null;
  const { movingLeft, toHold, handL, handR, footL, footR,
          prevHandL, prevHandR, prevFootL, prevFootR } = move;

  const curMovW  = wh(movingLeft ? prevHandL : prevHandR);
  const curStatW = wh(movingLeft ? prevHandR : prevHandL);
  const tgtW     = wh(toHold);

  let mW, sW = curStatW, fLW, fRW, dY = 0, dZ = 0;

  switch (label) {
    case 'Setup':
      mW = curMovW; fLW = wh(prevFootL); fRW = wh(prevFootR); break;
    case 'Load':
      mW = curMovW; fLW = wh(prevFootL); fRW = wh(prevFootR); dY = -0.18; break;
    case 'Release':
      mW = curMovW; fLW = null; fRW = null; dY = 0.08; dZ = 0.06; break;
    case 'Peak':
      mW = tgtW; fLW = null; fRW = null; dY = 0.20; break;
    case 'Catch':
      mW = tgtW; fLW = null; fRW = null; dY = -0.08; break;
    case 'Reach':
      mW = { x: curMovW.x + (tgtW.x - curMovW.x) * 0.80,
             y: curMovW.y + (tgtW.y - curMovW.y) * 0.80,
             z: curMovW.z + (tgtW.z - curMovW.z) * 0.80 };
      fLW = wh(prevFootL); fRW = wh(prevFootR); dY = 0.06; break;
    case 'Latched':
    case 'Stabilize':
      mW = tgtW; sW = wh(movingLeft ? handR : handL);
      fLW = wh(footL); fRW = wh(footR); break;
    default:
      mW = curMovW; fLW = wh(prevFootL); fRW = wh(prevFootR);
  }

  const wL = movingLeft ? (mW ?? sW) : (sW ?? mW);
  const wR = movingLeft ? (sW ?? mW) : (mW ?? sW);
  const safeWL = wL ?? { x: -0.24, y: 0.90, z: 0.04 };
  const safeWR = wR ?? { x:  0.24, y: 0.90, z: 0.04 };

  const hip = calcHip(safeWL, safeWR, fLW, fRW, angleDeg);
  hip.y = Math.max(0.20, hip.y + dY);
  hip.z = Math.max(0,    hip.z + dZ);

  const rotXW    = (angleDeg - 90) * Math.PI / 180;
  const twist    = variant === 'B' ? (movingLeft ? -1 : 1) : 0;

  // Ankle fallbacks when feet are off the wall
  const hangL = { x: hip.x - 0.10, y: hip.y - 0.72, z: hip.z + 0.04 };
  const hangR = { x: hip.x + 0.10, y: hip.y - 0.72, z: hip.z + 0.04 };
  let ankleL  = fLW ?? hangL;
  let ankleR  = fRW ?? hangR;

  // Beta B flag on overhang: extend free leg behind
  if (variant === 'B' && angleDeg > 110) {
    const flag = { x: hip.x + (movingLeft ? 0.16 : -0.16), y: hip.y - 0.55, z: hip.z - 0.28 };
    if ((label === 'Reach' || label === 'Peak' || label === 'Latched')) {
      if (movingLeft  && !fRW) ankleR = flag;
      if (!movingLeft && !fLW) ankleL = flag;
    }
  }

  return {
    hips:   { x: hip.x,    y: hip.y,    z: hip.z    },
    spine:  { rotX: -rotXW * 0.18, rotZ: twist * 0.22 },
    ...defaultRot(twist * 0.18),
    wristL: { x: safeWL.x, y: safeWL.y, z: safeWL.z },
    wristR: { x: safeWR.x, y: safeWR.y, z: safeWR.z },
    ankleL: { x: ankleL.x, y: ankleL.y, z: ankleL.z },
    ankleR: { x: ankleR.x, y: ankleR.y, z: ankleR.z },
  };
}

// ── Contacts per frame ────────────────────────────────────────────────────────

function buildContacts(label, move) {
  const { movingLeft, toHold, handL, handR, footL, footR,
          prevHandL, prevHandR, prevFootL, prevFootR } = move;
  const add = (arr, limb, hold) => { if (hold) arr.push({ limb, holdId: hold.id }); };
  const c = [];
  switch (label) {
    case 'Setup': case 'Load': case 'Reach':
      add(c, 'handL', prevHandL); add(c, 'handR', prevHandR);
      add(c, 'footL', prevFootL); add(c, 'footR', prevFootR);
      break;
    case 'Release':
      add(c, 'handL', prevHandL); add(c, 'handR', prevHandR);
      break;
    case 'Peak':
      add(c, movingLeft ? 'handL' : 'handR', toHold);
      break;
    case 'Catch':
      add(c, movingLeft ? 'handL' : 'handR', toHold);
      add(c, movingLeft ? 'handR' : 'handL', movingLeft ? prevHandR : prevHandL);
      break;
    case 'Latched': case 'Stabilize':
      add(c, 'handL', handL); add(c, 'handR', handR);
      add(c, 'footL', footL); add(c, 'footR', footR);
      break;
  }
  return c;
}

// ── Frame expansion ───────────────────────────────────────────────────────────

function expandMove(move, isLast, variant, angleDeg) {
  const mk = (label, desc) => ({
    id:             crypto.randomUUID(),
    moveIndex:      move.moveIndex,
    label,
    description:    desc,
    pose:           buildPose(label, move, angleDeg, variant),
    contacts:       buildContacts(label, move),
    analysisResult: null,
  });

  const hRef = `${move.toHold.type} (${move.toHold.x.toFixed(2)}, ${move.toHold.y.toFixed(2)})`;
  const mIdx = move.moveIndex + 1;
  const side = move.movingLeft ? 'left hand' : 'right hand';

  if (move.isDynamic) {
    const frames = [
      mk('Setup',   `Move ${mIdx}: set up on start holds before the throw.`),
      mk('Load',    `Move ${mIdx}: load — hips compress, arms pull in.`),
      mk('Release', `Move ${mIdx}: release — feet leave the wall, body extends upward.`),
      mk('Peak',    `Move ${mIdx}: peak — ${side} reaches ${hRef} at full extension.`),
      mk('Catch',   `Move ${mIdx}: catch — ${hRef} latched, body absorbs the swing.`),
    ];
    if (!isLast) frames.push(mk('Stabilize', `Move ${mIdx}: stabilize — feet re-established.`));
    return frames;
  }

  return [
    mk('Reach',   `Move ${mIdx}: reach — ${side} extends toward ${hRef}.`),
    mk('Latched', `Move ${mIdx}: latched — ${hRef} secured, body settled.`),
  ];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateBeta(holds, climberStats, wallAngleDeg) {
  const moves = buildMoves(holds, climberStats, wallAngleDeg);

  const moveDescriptions = moves.map((m, i) => {
    const side = m.movingLeft ? 'left hand' : 'right hand';
    const type = m.isDynamic  ? 'dynamic throw' : 'static reach';
    return `Move ${i + 1}: ${type} with ${side} to ${m.toHold.type} (${m.toHold.x.toFixed(2)}, ${m.toHold.y.toFixed(2)})`;
  });

  const buildVariant = (variant) => {
    const frames = [];

    // Initial stable frame on start holds
    if (moves.length > 0) {
      const fm  = moves[0];
      const wh  = h => h ? holdWorld(h, wallAngleDeg) : null;
      const wL  = wh(fm.prevHandL) ?? { x: -0.24, y: 0.90, z: 0.04 };
      const wR  = wh(fm.prevHandR) ?? { x:  0.24, y: 0.90, z: 0.04 };
      const fL  = wh(fm.prevFootL);
      const fR  = wh(fm.prevFootR);
      const hip = calcHip(wL, wR, fL, fR, wallAngleDeg);
      const rXW = (wallAngleDeg - 90) * Math.PI / 180;
      const hL  = fL ?? { x: hip.x - 0.10, y: hip.y - 0.72, z: hip.z + 0.04 };
      const hR  = fR ?? { x: hip.x + 0.10, y: hip.y - 0.72, z: hip.z + 0.04 };

      frames.push({
        id:          crypto.randomUUID(),
        moveIndex:   0,
        label:       'Latched',
        description: 'Start position — on start holds, ready to climb.',
        pose: {
          hips:   { x: hip.x, y: hip.y, z: hip.z },
          spine:  { rotX: -rXW * 0.18, rotZ: 0 },
          ...defaultRot(0),
          wristL: { x: wL.x, y: wL.y, z: wL.z },
          wristR: { x: wR.x, y: wR.y, z: wR.z },
          ankleL: { x: hL.x, y: hL.y, z: hL.z },
          ankleR: { x: hR.x, y: hR.y, z: hR.z },
        },
        contacts: [
          ...(fm.prevHandL ? [{ limb: 'handL', holdId: fm.prevHandL.id }] : []),
          ...(fm.prevHandR ? [{ limb: 'handR', holdId: fm.prevHandR.id }] : []),
          ...(fm.prevFootL ? [{ limb: 'footL', holdId: fm.prevFootL.id }] : []),
          ...(fm.prevFootR ? [{ limb: 'footR', holdId: fm.prevFootR.id }] : []),
        ],
        analysisResult: null,
      });
    }

    for (let i = 0; i < moves.length; i++) {
      expandMove(moves[i], i === moves.length - 1, variant, wallAngleDeg).forEach(f => frames.push(f));
    }

    return frames;
  };

  return { A: buildVariant('A'), B: buildVariant('B'), moveDescriptions };
}
