// ── Vec3 helpers (no external dependencies) ──────────────────────────────────

const v3     = (x = 0, y = 0, z = 0) => ({ x, y, z });
const add3   = (a, b) => v3(a.x+b.x, a.y+b.y, a.z+b.z);
const sub3   = (a, b) => v3(a.x-b.x, a.y-b.y, a.z-b.z);
const scl3   = (v, s) => v3(v.x*s, v.y*s, v.z*s);
const dot3   = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;
const cross3 = (a, b) => v3(a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x);
const len3   = v => Math.sqrt(dot3(v, v));
const mid3   = (a, b) => scl3(add3(a, b), 0.5);

// ── Unit helpers ──────────────────────────────────────────────────────────────

const nToKg = n => n / 9.80665;
const nToLb = n => n / 4.4482216;
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Body segment constants — reference height 175 cm ─────────────────────────

const SPINE_LEN  = 0.45;
const NECK_LEN   = 0.12;
const HEAD_R     = 0.12;
const SHOULDER_W = 0.21;
const HIP_W      = 0.10;
const HIP_DROP   = 0.04;
const ARM_UPPER  = 0.28;
const ARM_LOWER  = 0.26;
const LEG_UPPER  = 0.42;
const LEG_LOWER  = 0.40;

// ── Dempster (1955) segment mass fractions ────────────────────────────────────

const DEMPSTER = {
  head:      0.081,  torso:     0.497,
  upperArmL: 0.033,  upperArmR: 0.033,
  forearmL:  0.019,  forearmR:  0.019,
  handL:     0.006,  handR:     0.006,
  thighL:    0.100,  thighR:    0.100,
  shinL:     0.0465, shinR:     0.0465,
  footL:     0.0145, footR:     0.0145,
};
const D_SUM = Object.values(DEMPSTER).reduce((s, v) => s + v, 0);

// ── 15-muscle roster ──────────────────────────────────────────────────────────

const MUSCLE_LIST = [
  { muscle: 'Fingers',    group: 'Grip' },
  { muscle: 'Forearms',   group: 'Grip' },
  { muscle: 'Biceps',     group: 'Arm' },
  { muscle: 'Triceps',    group: 'Arm' },
  { muscle: 'Shoulders',  group: 'Shoulder' },
  { muscle: 'Lats',       group: 'Shoulder' },
  { muscle: 'Traps',      group: 'Shoulder' },
  { muscle: 'Rhomboids',  group: 'Shoulder' },
  { muscle: 'Chest',      group: 'Shoulder' },
  { muscle: 'Abs',        group: 'Core' },
  { muscle: 'Obliques',   group: 'Core' },
  { muscle: 'Quads',      group: 'Leg' },
  { muscle: 'Hamstrings', group: 'Leg' },
  { muscle: 'Glutes',     group: 'Leg' },
  { muscle: 'Calves',     group: 'Leg' },
];

const MUSCLE_GROUP = Object.fromEntries(MUSCLE_LIST.map(({ muscle, group }) => [muscle, group]));

const GRIP_FACTOR = { jug: 0.20, pocket: 0.50, pinch: 0.60, crimp: 0.80, sloper: 0.95 };

// ── Two-bone IK — returns mid-joint world position ────────────────────────────

function ikMid(root, end, len1, len2, hint) {
  const toEnd = sub3(end, root);
  const rawD  = len3(toEnd);
  const dir   = rawD > 1e-6 ? scl3(toEnd, 1 / rawD) : v3(0, -1, 0);
  const d     = Math.max(Math.abs(len1 - len2) + 1e-5, Math.min(len1 + len2 - 1e-5, rawD));
  const cosA  = Math.max(-1, Math.min(1, (len1*len1 + d*d - len2*len2) / (2*len1*d)));
  const angle = Math.acos(cosA);

  const h       = sub3(hint, root);
  const bendRaw = sub3(h, scl3(dir, dot3(h, dir)));
  const bl      = len3(bendRaw);
  let bendDir;
  if (bl > 1e-8) {
    bendDir = scl3(bendRaw, 1 / bl);
  } else {
    const c  = cross3(v3(0, 1, 0), dir);
    const cl = len3(c);
    bendDir  = cl > 1e-8 ? scl3(c, 1 / cl) : v3(1, 0, 0);
  }
  return add3(add3(root, scl3(dir, Math.cos(angle) * len1)),
                         scl3(bendDir, Math.sin(angle) * len1));
}

// ── computeJoints — height-scaled ────────────────────────────────────────────
// hs = heightCm / 175 scales all segment lengths so taller climbers have longer levers.

function computeJoints(pose, hs = 1) {
  const sLEN = SPINE_LEN  * hs;
  const nLEN = NECK_LEN   * hs;
  const hR   = HEAD_R     * hs;
  const shW  = SHOULDER_W * hs;
  const hipW = HIP_W      * hs;
  const hipD = HIP_DROP   * hs;
  const armU = ARM_UPPER  * hs;
  const armL = ARM_LOWER  * hs;
  const legU = LEG_UPPER  * hs;
  const legL = LEG_LOWER  * hs;

  const hips     = v3(pose.hips.x, pose.hips.y, pose.hips.z);
  const sx       = Math.sin(pose.spine?.rotZ ?? 0);
  const sz       = -Math.sin(pose.spine?.rotX ?? 0);
  const sm       = Math.sqrt(sx*sx + 1 + sz*sz);
  const spineDir = v3(sx/sm, 1/sm, sz/sm);

  const spineTop  = add3(hips, scl3(spineDir, sLEN));
  const head      = add3(spineTop, scl3(spineDir, nLEN + hR));
  const shoulderL = add3(spineTop, v3(-shW, 0, 0));
  const shoulderR = add3(spineTop, v3(+shW, 0, 0));
  const hipL      = add3(hips, v3(-hipW, -hipD, 0));
  const hipR      = add3(hips, v3(+hipW, -hipD, 0));

  const wristL = v3(pose.wristL.x, pose.wristL.y, pose.wristL.z);
  const wristR = v3(pose.wristR.x, pose.wristR.y, pose.wristR.z);
  const ankleL = v3(pose.ankleL.x, pose.ankleL.y, pose.ankleL.z);
  const ankleR = v3(pose.ankleR.x, pose.ankleR.y, pose.ankleR.z);

  const elbowL = ikMid(shoulderL, wristL, armU, armL, add3(shoulderL, v3( 0.05, -0.10, 0.28)));
  const elbowR = ikMid(shoulderR, wristR, armU, armL, add3(shoulderR, v3(-0.05, -0.10, 0.28)));
  const kneeL  = ikMid(hipL, ankleL, legU, legL, add3(hipL, v3(0, -0.20, 0.25)));
  const kneeR  = ikMid(hipR, ankleR, legU, legL, add3(hipR, v3(0, -0.20, 0.25)));

  return { hips, spineTop, head, shoulderL, elbowL, wristL,
           shoulderR, elbowR, wristR, hipL, kneeL, ankleL, hipR, kneeR, ankleR };
}

// ── Matrix utilities ──────────────────────────────────────────────────────────

function matT(A) {
  const r = A.length, c = A[0].length;
  const T = Array.from({ length: c }, () => new Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
  return T;
}

function matMul(A, B) {
  const rA = A.length, cA = A[0].length, cB = B[0].length;
  const C  = Array.from({ length: rA }, () => new Array(cB).fill(0));
  for (let i = 0; i < rA; i++)
    for (let k = 0; k < cA; k++) {
      if (Math.abs(A[i][k]) < 1e-15) continue;
      for (let j = 0; j < cB; j++) C[i][j] += A[i][k] * B[k][j];
    }
  return C;
}

function linSolve(M_in, b_in) {
  const n = M_in.length;
  const M = M_in.map((row, i) => [...row, b_in[i]]);
  for (let col = 0; col < n; col++) {
    let maxR = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxR][col])) maxR = row;
    [M[col], M[maxR]] = [M[maxR], M[col]];
    const piv = M[col][col];
    if (Math.abs(piv) < 1e-12) continue;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col] / piv;
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k];
    }
    for (let k = col; k <= n; k++) M[col][k] /= piv;
  }
  const x = M.map(row => row[n]);
  return x.some(v => !isFinite(v)) ? new Array(n).fill(0) : x;
}

// ── 1. Center of mass ─────────────────────────────────────────────────────────

export function computeCenterOfMass(pose, climberStats) {
  const hs = (climberStats?.heightCm ?? 175) / 175;
  const j  = computeJoints(pose, hs);
  const segs = [
    [DEMPSTER.head,      j.head],
    [DEMPSTER.torso,     mid3(j.hips, j.spineTop)],
    [DEMPSTER.upperArmL, mid3(j.shoulderL, j.elbowL)],
    [DEMPSTER.upperArmR, mid3(j.shoulderR, j.elbowR)],
    [DEMPSTER.forearmL,  mid3(j.elbowL, j.wristL)],
    [DEMPSTER.forearmR,  mid3(j.elbowR, j.wristR)],
    [DEMPSTER.handL,     j.wristL],
    [DEMPSTER.handR,     j.wristR],
    [DEMPSTER.thighL,    mid3(j.hipL, j.kneeL)],
    [DEMPSTER.thighR,    mid3(j.hipR, j.kneeR)],
    [DEMPSTER.shinL,     mid3(j.kneeL, j.ankleL)],
    [DEMPSTER.shinR,     mid3(j.kneeR, j.ankleR)],
    [DEMPSTER.footL,     j.ankleL],
    [DEMPSTER.footR,     j.ankleR],
  ];
  const com = v3();
  for (const [frac, pos] of segs) {
    const w = frac / D_SUM;
    com.x += w * pos.x;
    com.y += w * pos.y;
    com.z += w * pos.z;
  }
  return com;
}

// ── 2. Contact forces ─────────────────────────────────────────────────────────
// contactPoints: Array<{ holdId, limb, pos, holdType, frictionCoeff, isSmear, isFoot }>
// angleDeg is needed for smear normal-feasibility check.

export function solveContactForces(contactPoints, com, totalWeightN, angleDeg = 90) {
  const n = contactPoints.length;
  if (n === 0) return [];

  // Build 6×3n equilibrium matrix [ΣF=0, ΣM=0]
  const A = Array.from({ length: 6 }, () => new Array(3 * n).fill(0));
  for (let i = 0; i < n; i++) {
    const r = sub3(contactPoints[i].pos, com);
    const c = 3 * i;
    A[0][c]   = 1; A[1][c+1] = 1; A[2][c+2] = 1;
    A[3][c+1] = -r.z; A[3][c+2] =  r.y;
    A[4][c]   =  r.z; A[4][c+2] = -r.x;
    A[5][c]   = -r.y; A[5][c+1] =  r.x;
  }

  const b   = [0, totalWeightN, 0, 0, 0, 0];
  const AT  = matT(A);
  const AAT = matMul(A, AT);
  const y   = linSolve(AAT, b);
  const x   = matMul(AT, y.map(v => [v])).map(r => r[0]);

  // Smear wall-angle feasibility factor
  const rad       = Math.max(0, (angleDeg - 90) * Math.PI / 180);
  const smearCos  = Math.max(0, Math.cos(rad));

  return contactPoints.map((cp, i) => {
    let fx = x[3*i]   ?? 0;
    let fy = x[3*i+1] ?? 0;
    let fz = x[3*i+2] ?? 0;

    // Feet push upward only — no heel-hook model
    if (cp.isFoot && fy < 0) fy = 0;

    const normalForce = Math.abs(fz);
    const tanMag      = Math.hypot(fx, fy);
    const mu          = cp.frictionCoeff ?? 0.80;

    let frictionUtilization;

    if (cp.isSmear) {
      // Usable normal collapses with overhang angle
      const usableNormal = normalForce * smearCos;
      const limit        = mu * Math.max(usableNormal, 1e-3);
      frictionUtilization = tanMag / limit;
      // Smears can slip: do NOT clamp frictionUtilization to 1
    } else {
      const limit = mu * normalForce;
      frictionUtilization = normalForce > 0.1 ? tanMag / limit : 0;

      // Friction cone for non-jug contacts
      if (cp.holdType !== 'jug' && tanMag > limit && tanMag > 1e-6) {
        const s = limit / tanMag;
        fx *= s;
        fy *= s;
        frictionUtilization = 1.0;
      }
      // Crimp: no upward pull
      if (cp.holdType === 'crimp' && fy > 0) fy = 0;
    }

    const forceVector = v3(fx, fy, fz);
    return {
      holdId:            cp.holdId,
      forceVector,
      magnitude:         len3(forceVector),
      normalForce,
      tangentialForce:   Math.hypot(fx, fy),
      frictionUtilization: Math.min(frictionUtilization, 3.0),
    };
  });
}

// ── 3. Joint torques — kept for backward compat ───────────────────────────────

export function computeJointTorques(pose, limbForces, climberStats) {
  const hs = (climberStats?.heightCm ?? 175) / 175;
  const j  = computeJoints(pose, hs);
  const W  = climberStats.weightKg;
  const gv = v3(0, -9.81, 0);
  const wt = key => scl3(gv, (DEMPSTER[key] / D_SUM) * W);
  const lf = limbForces ?? {};
  const get = limb => { const f = lf[limb]; return f ? v3(f.x, f.y, f.z) : v3(); };
  const tau = (joint, point, force) => cross3(sub3(point, joint), force);
  const torques = [];

  const elbow = (jt, el, wr, kfa, kh, limb) => {
    const T = add3(tau(el, mid3(el, wr), wt(kfa)), tau(el, wr, add3(wt(kh), get(limb))));
    torques.push({ joint: jt, torqueNm: len3(T), vector: T });
  };
  elbow('elbowL', j.elbowL, j.wristL, 'forearmL', 'handL', 'handL');
  elbow('elbowR', j.elbowR, j.wristR, 'forearmR', 'handR', 'handR');

  const shoulder = (jt, sh, el, wr, kua, kfa, kh, limb) => {
    const T = add3(add3(tau(sh, mid3(sh, el), wt(kua)), tau(sh, mid3(el, wr), wt(kfa))),
                   tau(sh, wr, add3(wt(kh), get(limb))));
    torques.push({ joint: jt, torqueNm: len3(T), vector: T });
  };
  shoulder('shoulderL', j.shoulderL, j.elbowL, j.wristL, 'upperArmL','forearmL','handL','handL');
  shoulder('shoulderR', j.shoulderR, j.elbowR, j.wristR, 'upperArmR','forearmR','handR','handR');

  const knee = (jt, kn, ank, ksh, kf, limb) => {
    const T = add3(tau(kn, mid3(kn, ank), wt(ksh)), tau(kn, ank, add3(wt(kf), get(limb))));
    torques.push({ joint: jt, torqueNm: len3(T), vector: T });
  };
  knee('kneeL', j.kneeL, j.ankleL, 'shinL', 'footL', 'footL');
  knee('kneeR', j.kneeR, j.ankleR, 'shinR', 'footR', 'footR');

  const hip = (jt, hp, kn, ank, kth, ksh, kf, limb) => {
    const T = add3(add3(tau(hp, mid3(hp, kn), wt(kth)), tau(hp, mid3(kn, ank), wt(ksh))),
                   tau(hp, ank, add3(wt(kf), get(limb))));
    torques.push({ joint: jt, torqueNm: len3(T), vector: T });
  };
  hip('hipL', j.hipL, j.kneeL, j.ankleL, 'thighL','shinL','footL','footL');
  hip('hipR', j.hipR, j.kneeR, j.ankleR, 'thighR','shinR','footR','footR');

  {
    let T = tau(j.hips, mid3(j.hips, j.spineTop), wt('torso'));
    T = add3(T, tau(j.hips, j.head, wt('head')));
    for (const [sh, el, wr, kua, kfa, kh, limb] of [
      [j.shoulderL, j.elbowL, j.wristL, 'upperArmL','forearmL','handL','handL'],
      [j.shoulderR, j.elbowR, j.wristR, 'upperArmR','forearmR','handR','handR'],
    ]) {
      T = add3(T, tau(j.hips, mid3(sh, el), wt(kua)));
      T = add3(T, tau(j.hips, mid3(el, wr), wt(kfa)));
      T = add3(T, tau(j.hips, wr, add3(wt(kh), get(limb))));
    }
    torques.push({ joint: 'lumbar', torqueNm: len3(T), vector: T });
  }

  return torques;
}

// ── 4. Per-contact muscle decomposition ──────────────────────────────────────
//
// Returns sorted array of { muscle, group, sharePct, forceKg, forceLb }
// for a single contact point.

function perContactMuscles(cp, solvedForce, joints, pose, angleDeg) {
  const forceN = solvedForce?.magnitude ?? 0;

  const overhang  = clamp((angleDeg - 90) / 60, 0, 1);
  const slab      = clamp((90 - angleDeg) / 80, 0, 1);
  const twist     = clamp(Math.abs(pose.spine?.rotZ ?? 0) * 2, 0, 1);
  const fv        = solvedForce?.forceVector ?? v3();
  const fMag      = Math.max(forceN, 1e-6);

  let weights;

  if (cp.isFoot) {
    const downPress = fv.y > 0 ? 1.0 : 0.5;
    const isSmear   = cp.isSmear;
    weights = {
      Quads:      0.30 + 0.60 * downPress * (slab + 0.4),
      Hamstrings: 0.10 + 0.60 * overhang,
      Glutes:     0.20 + 0.60 * overhang,
      Calves:     (isSmear ? 0.95 : 0.30) + 0.40 * slab,
      Abs:        0.10 + 0.30 * overhang,
      Obliques:   0.08 + 0.30 * twist,
    };
  } else {
    // Hand contact
    const gf       = GRIP_FACTOR[cp.holdType] ?? 0.40;
    const wrist    = cp.limb === 'handL' ? joints.wristL : joints.wristR;
    const shoulder = cp.limb === 'handL' ? joints.shoulderL : joints.shoulderR;
    const overhead = clamp((wrist.y - shoulder.y) / 0.40, 0, 1);
    const press    = clamp(Math.max(0, fv.y) / fMag, 0, 1);

    weights = {
      Fingers:   gf,
      Forearms:  0.75 * gf + 0.10,
      Biceps:    0.35 + 0.55 * overhang,
      Triceps:   0.12 + 0.55 * press,
      Shoulders: 0.30 + 0.40 * overhead,
      Lats:      0.25 + 0.70 * overhang,
      Traps:     0.14 + 0.20 * overhead,
      Rhomboids: 0.12 + 0.18 * overhang,
      Chest:     0.10 + 0.40 * press,
      Abs:       0.15 + 0.50 * overhang,
      Obliques:  0.10 + 0.50 * twist,
    };
  }

  const W = Object.values(weights).reduce((s, v) => s + v, 0);
  if (W < 1e-9) return [];

  return Object.entries(weights)
    .map(([muscle, w]) => {
      const share = w / W;
      return {
        muscle,
        group:    MUSCLE_GROUP[muscle] ?? 'Other',
        sharePct: share * 100,
        forceKg:  nToKg(forceN) * share,
        forceLb:  nToLb(forceN) * share,
      };
    })
    .sort((a, b) => b.sharePct - a.sharePct);
}

// ── 5. Full analysis ──────────────────────────────────────────────────────────

export function runFullAnalysis(frame, climberStats, allHolds = [], angleDeg = 90) {
  if (!frame?.pose) return null;

  const { pose, contacts = [] } = frame;
  const G            = 9.81;
  const weightKg     = climberStats.weightKg ?? 70;
  const totalWeightN = weightKg * G;
  const hs           = (climberStats.heightCm ?? 175) / 175;

  const LIMB_POS = {
    handL: pose.wristL, handR: pose.wristR,
    footL: pose.ankleL, footR: pose.ankleR,
  };

  const holdMap = Object.fromEntries((allHolds ?? []).map(h => [h.id, h]));

  // ── Prepare contact points ─────────────────────────────────────────────────

  const contactPoints = contacts
    .filter(c => c.limb in LIMB_POS)
    .map(c => {
      const isSmear = c.smear === true;
      const isFoot  = c.limb === 'footL' || c.limb === 'footR';
      const hold    = isSmear ? null : holdMap[c.holdId];
      const pos     = LIMB_POS[c.limb];

      const holdType     = isSmear ? 'smear' : (hold?.type ?? 'jug');
      const frictionCoeff = isSmear ? 0.65 : (hold?.frictionCoeff ?? 0.80);

      return {
        holdId: c.holdId ?? null,
        limb:   c.limb,
        pos:    v3(pos.x, pos.y, pos.z),
        holdType,
        frictionCoeff,
        isSmear,
        isFoot,
      };
    });

  // ── 1. COM (internal — needed by equilibrium solver) ──────────────────────

  const centerOfMass = computeCenterOfMass(pose, climberStats);

  // ── 2. Contact forces ──────────────────────────────────────────────────────

  const rawForces = solveContactForces(contactPoints, centerOfMass, totalWeightN, angleDeg);

  // ── 3. Joint positions (for per-contact overhead calculation) ─────────────

  const joints = computeJoints(pose, hs);

  // ── 4. Per-contact muscle decomposition + output objects ──────────────────

  const contactsOut = contactPoints.map((cp, i) => {
    const rf     = rawForces[i] ?? { magnitude: 0, forceVector: v3(), normalForce: 0, tangentialForce: 0, frictionUtilization: 0 };
    const forceN  = rf.magnitude;
    const forceKg = nToKg(forceN);
    const forceLb = nToLb(forceN);

    const muscles = perContactMuscles(cp, rf, joints, pose, angleDeg);

    return {
      limb:         cp.limb,
      kind:         cp.isSmear ? 'smear' : 'hold',
      holdType:     cp.holdType,
      holdId:       cp.holdId,
      forceN,
      forceKg,
      forceLb,
      frictionUtil: rf.frictionUtilization,
      bodyweightPct: weightKg > 0 ? forceKg / weightKg * 100 : 0,
      muscles,
    };
  });

  // ── 5. Aggregate: muscle totals across all contacts ───────────────────────

  const muscleTotalsKg = {};
  for (const c of contactsOut) {
    for (const m of c.muscles) {
      muscleTotalsKg[m.muscle] = (muscleTotalsKg[m.muscle] ?? 0) + m.forceKg;
    }
  }

  // ── 6. Hardest contact ────────────────────────────────────────────────────

  const hardestContact = contactsOut.length > 0
    ? contactsOut.reduce((best, c) => c.forceKg > best.forceKg ? c : best)
    : null;

  // ── 7. Backward-compat fields ─────────────────────────────────────────────
  // contactForces: matches old schema so AnalysisSidebar keeps working.
  const contactForces = contactsOut.map((c, i) => ({
    holdId:            c.holdId,
    forceVector:       rawForces[i]?.forceVector ?? v3(),
    magnitude:         c.forceN,
    normalForce:       rawForces[i]?.normalForce ?? 0,
    tangentialForce:   rawForces[i]?.tangentialForce ?? 0,
    frictionUtilization: c.frictionUtil,
  }));

  // muscleDemands: express each muscle's summed kg as % of (0.5 × bodyweight).
  // Gives ~100% when a muscle is loaded with half the climber's bodyweight.
  const refKg = Math.max(1, weightKg * 0.5);
  const muscleDemands = MUSCLE_LIST.map(({ muscle, group }) => {
    const totalKg      = muscleTotalsKg[muscle] ?? 0;
    const demandPercent = Math.min(150, (totalKg / refKg) * 100);
    return { muscle, group, demandPercent, isLimiting: demandPercent > 100 };
  }).sort((a, b) => b.demandPercent - a.demandPercent);

  const limitingFactors = muscleDemands
    .filter(m => m.isLimiting)
    .map(m => m.muscle);

  const maxDemand        = muscleDemands.reduce((mx, m) => Math.max(mx, m.demandPercent), 0);
  const overallDifficulty = Math.min(1, maxDemand / 100);

  // ── 8. Summary ────────────────────────────────────────────────────────────

  const LIMB_NAME = {
    handL: 'left hand', handR: 'right hand',
    footL: 'left foot', footR: 'right foot',
  };

  let summary;
  if (hardestContact) {
    const limb = LIMB_NAME[hardestContact.limb] ?? hardestContact.limb;
    const pct  = Math.round(hardestContact.bodyweightPct);
    summary = `Hardest contact: ${limb} on ${hardestContact.holdType} — ${hardestContact.forceKg.toFixed(1)} kg (${pct}% bodyweight)`;
  } else {
    summary = 'No active contacts';
  }

  return {
    // Primary new fields
    contacts:       contactsOut,
    hardestContact,
    muscleTotalsKg,
    // Backward compat (AnalysisSidebar + Analytics still use these)
    centerOfMass,
    contactForces,
    muscleDemands,
    limitingFactors,
    overallDifficulty,
    summary,
  };
}
