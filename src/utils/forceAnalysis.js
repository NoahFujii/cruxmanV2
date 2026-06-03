// ── Vec3 helpers (no external dependencies) ──────────────────────────────────

const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
const add3  = (a, b) => v3(a.x+b.x, a.y+b.y, a.z+b.z);
const sub3  = (a, b) => v3(a.x-b.x, a.y-b.y, a.z-b.z);
const scl3  = (v, s) => v3(v.x*s, v.y*s, v.z*s);
const dot3  = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;
const cross3 = (a, b) => v3(a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x);
const len3  = v => Math.sqrt(dot3(v, v));
const mid3  = (a, b) => scl3(add3(a, b), 0.5);

// ── Body segment constants (mirrors Climber3D.jsx) ────────────────────────────

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

// Dempster (1955) segment mass fractions
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

// ── Two-bone IK — returns mid-joint world position (pure math) ────────────────

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

// ── All joint world positions from a pose object ──────────────────────────────

function computeJoints(pose) {
  const hips = v3(pose.hips.x, pose.hips.y, pose.hips.z);
  const sx   = Math.sin(pose.spine?.rotZ ?? 0);
  const sz   = -Math.sin(pose.spine?.rotX ?? 0);
  const sm   = Math.sqrt(sx*sx + 1 + sz*sz);
  const spineDir = v3(sx/sm, 1/sm, sz/sm);

  const spineTop  = add3(hips, scl3(spineDir, SPINE_LEN));
  const head      = add3(spineTop, scl3(spineDir, NECK_LEN + HEAD_R));
  const shoulderL = add3(spineTop, v3(-SHOULDER_W, 0, 0));
  const shoulderR = add3(spineTop, v3(+SHOULDER_W, 0, 0));
  const hipL      = add3(hips, v3(-HIP_W, -HIP_DROP, 0));
  const hipR      = add3(hips, v3(+HIP_W, -HIP_DROP, 0));

  const wristL = v3(pose.wristL.x, pose.wristL.y, pose.wristL.z);
  const wristR = v3(pose.wristR.x, pose.wristR.y, pose.wristR.z);
  const ankleL = v3(pose.ankleL.x, pose.ankleL.y, pose.ankleL.z);
  const ankleR = v3(pose.ankleR.x, pose.ankleR.y, pose.ankleR.z);

  const elbowL = ikMid(shoulderL, wristL, ARM_UPPER, ARM_LOWER,
    add3(shoulderL, v3( 0.05, -0.10, 0.28)));
  const elbowR = ikMid(shoulderR, wristR, ARM_UPPER, ARM_LOWER,
    add3(shoulderR, v3(-0.05, -0.10, 0.28)));
  const kneeL  = ikMid(hipL, ankleL, LEG_UPPER, LEG_LOWER,
    add3(hipL, v3(0, -0.20, 0.25)));
  const kneeR  = ikMid(hipR, ankleR, LEG_UPPER, LEG_LOWER,
    add3(hipR, v3(0, -0.20, 0.25)));

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
  const C = Array.from({ length: rA }, () => new Array(cB).fill(0));
  for (let i = 0; i < rA; i++)
    for (let k = 0; k < cA; k++) {
      if (Math.abs(A[i][k]) < 1e-15) continue;
      for (let j = 0; j < cB; j++) C[i][j] += A[i][k] * B[k][j];
    }
  return C;
}

// Gauss-Jordan with partial pivoting; returns x or a zero vector on failure
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

export function computeCenterOfMass(pose, _climberStats) {
  const j = computeJoints(pose);
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
//
// contactPoints: Array<{ holdId, limb, pos: {x,y,z}, holdType, frictionCoeff }>
// Returns Array<{ holdId, forceVector, magnitude, normalForce,
//                 tangentialForce, frictionUtilization }>

export function solveContactForces(contactPoints, com, totalWeightN) {
  const n = contactPoints.length;
  if (n === 0) return [];

  // Build 6×3n equilibrium matrix: [ΣF=0, ΣM=0] about COM
  const A = Array.from({ length: 6 }, () => new Array(3 * n).fill(0));
  for (let i = 0; i < n; i++) {
    const r = sub3(contactPoints[i].pos, com);
    const c = 3 * i;
    // Force balance
    A[0][c]   = 1; A[1][c+1] = 1; A[2][c+2] = 1;
    // Moment balance: r × F
    A[3][c+1] = -r.z; A[3][c+2] =  r.y;   // Mx = ry·fz − rz·fy
    A[4][c]   =  r.z; A[4][c+2] = -r.x;   // My = rz·fx − rx·fz
    A[5][c]   = -r.y; A[5][c+1] =  r.x;   // Mz = rx·fy − ry·fx
  }

  // RHS: gravity must be balanced by contacts
  const b = [0, totalWeightN, 0, 0, 0, 0];

  // Least-norm solution: x = Aᵀ(AAᵀ)⁻¹b
  const AT  = matT(A);
  const AAT = matMul(A, AT);
  const y   = linSolve(AAT, b);
  const x   = matMul(AT, y.map(v => [v])).map(r => r[0]);

  return contactPoints.map((cp, i) => {
    let fx = x[3*i]   ?? 0;
    let fy = x[3*i+1] ?? 0;
    let fz = x[3*i+2] ?? 0;

    // Normal force = magnitude of wall-perpendicular component (z-axis)
    const normalForce = Math.abs(fz);
    const tanMag      = Math.hypot(fx, fy);
    const mu          = cp.frictionCoeff ?? 0.80;

    // Friction cone: |tangential| ≤ μ·|normal|; jugs are unconstrained
    const limit = mu * normalForce;
    let frictionUtilization = normalForce > 0.1 ? tanMag / limit : 0;

    if (cp.holdType !== 'jug' && tanMag > limit && tanMag > 1e-6) {
      const s = limit / tanMag;
      fx *= s;
      fy *= s;
      frictionUtilization = 1.0;
    }

    // Crimp: no upward component (fingers pull down/in, not push up)
    if (cp.holdType === 'crimp' && fy > 0) fy = 0;

    const forceVector = v3(fx, fy, fz);
    return {
      holdId:            cp.holdId,
      forceVector,
      magnitude:         len3(forceVector),
      normalForce,
      tangentialForce:   Math.hypot(fx, fy),
      frictionUtilization: Math.min(frictionUtilization, 2.0),
    };
  });
}

// ── 3. Joint torques (distal → proximal static inverse dynamics) ──────────────
//
// limbForces: { handL?, handR?, footL?, footR? } — each a {x,y,z} contact force

export function computeJointTorques(pose, limbForces, climberStats) {
  const j  = computeJoints(pose);
  const W  = climberStats.weightKg;
  const gv = v3(0, -9.81, 0);
  const wt = key => scl3(gv, (DEMPSTER[key] / D_SUM) * W);
  const lf = limbForces ?? {};
  const get = limb => { const f = lf[limb]; return f ? v3(f.x, f.y, f.z) : v3(); };
  const tau = (joint, point, force) => cross3(sub3(point, joint), force);
  const torques = [];

  // Elbow: forearm weight + (hand weight + contact)
  const elbow = (jt, el, wr, kfa, kh, limb) => {
    const T = add3(
      tau(el, mid3(el, wr), wt(kfa)),
      tau(el, wr, add3(wt(kh), get(limb))),
    );
    torques.push({ joint: jt, torqueNm: len3(T), vector: T });
  };
  elbow('elbowL', j.elbowL, j.wristL, 'forearmL', 'handL', 'handL');
  elbow('elbowR', j.elbowR, j.wristR, 'forearmR', 'handR', 'handR');

  // Shoulder: upper arm + forearm + (hand + contact)
  const shoulder = (jt, sh, el, wr, kua, kfa, kh, limb) => {
    const T = add3(add3(
      tau(sh, mid3(sh, el), wt(kua)),
      tau(sh, mid3(el, wr), wt(kfa))),
      tau(sh, wr, add3(wt(kh), get(limb))),
    );
    torques.push({ joint: jt, torqueNm: len3(T), vector: T });
  };
  shoulder('shoulderL', j.shoulderL, j.elbowL, j.wristL, 'upperArmL','forearmL','handL','handL');
  shoulder('shoulderR', j.shoulderR, j.elbowR, j.wristR, 'upperArmR','forearmR','handR','handR');

  // Knee: shin weight + (foot weight + contact)
  const knee = (jt, kn, ank, ksh, kf, limb) => {
    const T = add3(
      tau(kn, mid3(kn, ank), wt(ksh)),
      tau(kn, ank, add3(wt(kf), get(limb))),
    );
    torques.push({ joint: jt, torqueNm: len3(T), vector: T });
  };
  knee('kneeL', j.kneeL, j.ankleL, 'shinL', 'footL', 'footL');
  knee('kneeR', j.kneeR, j.ankleR, 'shinR', 'footR', 'footR');

  // Hip: thigh + shin + (foot + contact)
  const hip = (jt, hp, kn, ank, kth, ksh, kf, limb) => {
    const T = add3(add3(
      tau(hp, mid3(hp, kn), wt(kth)),
      tau(hp, mid3(kn, ank), wt(ksh))),
      tau(hp, ank, add3(wt(kf), get(limb))),
    );
    torques.push({ joint: jt, torqueNm: len3(T), vector: T });
  };
  hip('hipL', j.hipL, j.kneeL, j.ankleL, 'thighL','shinL','footL','footL');
  hip('hipR', j.hipR, j.kneeR, j.ankleR, 'thighR','shinR','footR','footR');

  // Lumbar: entire upper body (torso + head + both arms + hand contacts)
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

// ── 4. Muscle demand percentages ─────────────────────────────────────────────

export function computeMuscleDemandsPercent(jointTorques, climberStats) {
  const { weightKg, maxGripForceN = 300, maxPullForceN = 500 } = climberStats;
  const g = 9.81;

  // Estimated max joint torques from stats
  const maxT = {
    finger:   maxGripForceN * 0.05,        // DIP moment arm ≈ 5 cm
    elbow:    maxPullForceN * 0.30,        // bicep lever ≈ 30 cm
    shoulder: maxPullForceN * 0.45,        // lat lever ≈ 45 cm
    knee:     weightKg * g * 0.30,        // quad lever ≈ 30 cm
    hip:      weightKg * g * 0.45,        // glute lever ≈ 45 cm
    lumbar:   weightKg * g * 0.50,        // core lever ≈ 50 cm
  };

  const jt = Object.fromEntries(jointTorques.map(t => [t.joint, t.torqueNm]));
  const sum = (...keys) => keys.reduce((s, k) => s + (jt[k] ?? 0), 0);

  const muscles = [
    {
      muscle: 'Finger Flexors',
      // Finger demand ≈ grip fraction of elbow load (fingers are the anchor)
      required: sum('elbowL', 'elbowR') * 0.6,
      max: maxT.finger * 2,
    },
    {
      muscle: 'Biceps/Brachialis',
      required: sum('elbowL', 'elbowR'),
      max: maxT.elbow * 2,
    },
    {
      muscle: 'Lats',
      required: sum('shoulderL', 'shoulderR'),
      max: maxT.shoulder * 2,
    },
    {
      muscle: 'Deltoid',
      required: sum('shoulderL', 'shoulderR') * 0.5,
      max: maxT.shoulder * 2 * 0.6,
    },
    {
      muscle: 'Glutes/Hamstrings',
      required: sum('hipL', 'hipR'),
      max: maxT.hip * 2,
    },
    {
      muscle: 'Quads',
      required: sum('kneeL', 'kneeR'),
      max: maxT.knee * 2,
    },
    {
      muscle: 'Core',
      required: jt['lumbar'] ?? 0,
      max: maxT.lumbar,
    },
  ];

  return muscles.map(({ muscle, required, max }) => {
    const demandPercent = Math.min(150, (required / max) * 100);
    return { muscle, demandPercent, isLimiting: demandPercent > 100 };
  });
}

// ── 5. Full analysis ──────────────────────────────────────────────────────────
//
// frame:        { pose, contacts: Array<{ limb, holdId }>, ... }
// climberStats: { weightKg, maxGripForceN, maxPullForceN, ... }
// allHolds:     hold array from the selected problem (for type/friction lookup)

export function runFullAnalysis(frame, climberStats, allHolds = []) {
  if (!frame?.pose) return null;

  const { pose, contacts = [] } = frame;
  const G           = 9.81;
  const totalWeightN = climberStats.weightKg * G;

  // Contact positions come directly from the pose's limb endpoints
  const LIMB_POS = {
    handL: pose.wristL,
    handR: pose.wristR,
    footL: pose.ankleL,
    footR: pose.ankleR,
  };

  const holdMap = Object.fromEntries((allHolds ?? []).map(h => [h.id, h]));

  const contactPoints = contacts
    .filter(c => c.limb in LIMB_POS)
    .map(c => {
      const hold = holdMap[c.holdId];
      const pos  = LIMB_POS[c.limb];
      return {
        holdId:       c.holdId,
        limb:         c.limb,
        pos:          v3(pos.x, pos.y, pos.z),
        holdType:     hold?.type ?? 'jug',
        frictionCoeff: hold?.frictionCoeff ?? 0.80,
      };
    });

  // 1. COM
  const centerOfMass = computeCenterOfMass(pose, climberStats);

  // 2. Contact forces
  const contactForces = solveContactForces(contactPoints, centerOfMass, totalWeightN);

  // 3. Build limb → force vector map for inverse dynamics
  const limbForces = {};
  contactPoints.forEach((cp, i) => {
    const cf = contactForces[i];
    if (cf) limbForces[cp.limb] = cf.forceVector;
  });

  // 4. Joint torques
  const jointTorques = computeJointTorques(pose, limbForces, climberStats);

  // 5. Muscle demands
  const muscleDemands = computeMuscleDemandsPercent(jointTorques, climberStats);

  // 6. Summary
  const limitingFactors = muscleDemands.filter(m => m.isLimiting).map(m => m.muscle);
  const maxDemand       = muscleDemands.reduce((mx, m) => Math.max(mx, m.demandPercent), 0);
  const overallDifficulty = Math.min(1, maxDemand / 100);
  const topMuscle       = muscleDemands.reduce((best, m) =>
    m.demandPercent > best.demandPercent ? m : best, muscleDemands[0]);

  const summary = limitingFactors.length > 0
    ? `${limitingFactors.join(', ')} at limit (${Math.round(maxDemand)}% demand)`
    : topMuscle
    ? `Peak demand: ${topMuscle.muscle} at ${Math.round(topMuscle.demandPercent)}%`
    : 'No active contacts';

  return {
    centerOfMass,
    contactForces,
    jointTorques,
    muscleDemands,
    limitingFactors,
    overallDifficulty,
    summary,
  };
}
