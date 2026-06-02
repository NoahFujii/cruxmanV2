/**
 * Pre-built climbing problems for all six walls.
 *
 * Hold coordinate conventions:
 *   x — normalised 0–1, left → right across the wall face
 *   y — normalised 0–1, bottom → top (isStart holds cluster near 0, isTop near 1)
 *   z — small surface offset (metres); jugs protrude more than crimps
 *
 * frictionCoeff by hold type (used by the force engine):
 *   jug 0.90 | crimp 0.80 | pinch 0.70 | pocket 0.75 | sloper 0.50 | foothold 0.85
 *
 * For the Kilter Board (18×18 grid) holds are snapped to multiples of 1/17
 * so they land on real grid intersections (0, 0.059, 0.118 … 0.941, 1.000).
 */

// ─── Slab (10°) ────────────────────────────────────────────────────────────

const slabProblems = [
  {
    id: 'slab-v0',
    name: 'Sunny Side Up',
    grade: 'V0',
    wallId: 'slab',
    holds: [
      { id: 'slab-v0-h1',  x: 0.38, y: 0.12, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'slab-v0-h2',  x: 0.58, y: 0.13, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'slab-v0-h3',  x: 0.34, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v0-h4',  x: 0.62, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v0-h5',  x: 0.55, y: 0.30, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'slab-v0-h6',  x: 0.43, y: 0.25, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v0-h7',  x: 0.42, y: 0.50, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'slab-v0-h8',  x: 0.48, y: 0.82, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Push through the starting footholds to reach H5 with the right hand. ' +
      'Step up on H6, then reach left to H7. Stand tall and top out.',
    keyMuscles: ['legs', 'core', 'fingers'],
  },

  {
    id: 'slab-v2',
    name: 'Sloper Shuffle',
    grade: 'V2',
    wallId: 'slab',
    holds: [
      { id: 'slab-v2-h1',  x: 0.35, y: 0.12, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'slab-v2-h2',  x: 0.60, y: 0.14, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'slab-v2-h3',  x: 0.28, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v2-h4',  x: 0.66, y: 0.06, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v2-h5',  x: 0.54, y: 0.30, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'slab-v2-h6',  x: 0.38, y: 0.27, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v2-h7',  x: 0.64, y: 0.23, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v2-h8',  x: 0.37, y: 0.52, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'slab-v2-h9',  x: 0.48, y: 0.78, z: 0.04, type: 'sloper',   isStart: false, isTop: true,  frictionCoeff: 0.50 },
    ],
    suggestedBeta:
      'Keep hips pressed into the wall. Step feet high before each sloper — ' +
      'the weight shift is everything. Pull down, not out, on each sloper.',
    keyMuscles: ['legs', 'core', 'hips', 'fingers'],
  },

  {
    id: 'slab-v4',
    name: 'Smear Contest',
    grade: 'V4',
    wallId: 'slab',
    holds: [
      { id: 'slab-v4-h1',  x: 0.40, y: 0.10, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'slab-v4-h2',  x: 0.62, y: 0.12, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'slab-v4-h3',  x: 0.32, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v4-h4',  x: 0.68, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v4-h5',  x: 0.56, y: 0.27, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'slab-v4-h6',  x: 0.45, y: 0.21, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v4-h7',  x: 0.34, y: 0.45, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'slab-v4-h8',  x: 0.60, y: 0.39, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slab-v4-h9',  x: 0.52, y: 0.63, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'slab-v4-h10', x: 0.44, y: 0.84, z: 0.04, type: 'sloper',   isStart: false, isTop: true,  frictionCoeff: 0.50 },
    ],
    suggestedBeta:
      'Trust your feet: smear high on the wall between the slopers. ' +
      'Flag outside on the crux sloper (H9) to stay in balance. Precise footwork beats arm strength here.',
    keyMuscles: ['legs', 'calves', 'core', 'hips', 'fingers'],
  },
];

// ─── Vertical (90°) ────────────────────────────────────────────────────────

const verticalProblems = [
  {
    id: 'vert-v1',
    name: 'Jug Ladder',
    grade: 'V1',
    wallId: 'vertical',
    holds: [
      { id: 'vert-v1-h1',  x: 0.35, y: 0.12, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'vert-v1-h2',  x: 0.58, y: 0.13, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'vert-v1-h3',  x: 0.32, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v1-h4',  x: 0.61, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v1-h5',  x: 0.60, y: 0.30, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'vert-v1-h6',  x: 0.44, y: 0.25, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v1-h7',  x: 0.34, y: 0.48, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'vert-v1-h8',  x: 0.56, y: 0.40, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v1-h9',  x: 0.56, y: 0.65, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'vert-v1-h10', x: 0.45, y: 0.85, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Classic alternating ladder. Right hand to H5, left foot to H6, ' +
      'left hand to H7, right foot to H8, right hand to H9, match and top.',
    keyMuscles: ['fingers', 'forearms', 'back', 'legs'],
  },

  {
    id: 'vert-v3',
    name: 'Crimpfest',
    grade: 'V3',
    wallId: 'vertical',
    holds: [
      { id: 'vert-v3-h1',  x: 0.30, y: 0.10, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'vert-v3-h2',  x: 0.55, y: 0.12, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'vert-v3-h3',  x: 0.27, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v3-h4',  x: 0.60, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v3-h5',  x: 0.62, y: 0.28, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'vert-v3-h6',  x: 0.44, y: 0.23, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v3-h7',  x: 0.30, y: 0.46, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'vert-v3-h8',  x: 0.58, y: 0.39, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v3-h9',  x: 0.60, y: 0.63, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'vert-v3-h10', x: 0.38, y: 0.57, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v3-h11', x: 0.44, y: 0.84, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Crimp hard but keep feet active — the left-right alternation is tight. ' +
      'Lock off on H7 to make the reach to H9. Rest on the jug top hold.',
    keyMuscles: ['fingers', 'forearms', 'back', 'core'],
  },

  {
    id: 'vert-v5',
    name: 'Pocket Rocker',
    grade: 'V5',
    wallId: 'vertical',
    holds: [
      { id: 'vert-v5-h1',  x: 0.38, y: 0.10, z: 0.03, type: 'pocket',   isStart: true,  isTop: false, frictionCoeff: 0.75 },
      { id: 'vert-v5-h2',  x: 0.62, y: 0.12, z: 0.03, type: 'pocket',   isStart: true,  isTop: false, frictionCoeff: 0.75 },
      { id: 'vert-v5-h3',  x: 0.35, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v5-h4',  x: 0.65, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v5-h5',  x: 0.55, y: 0.32, z: 0.03, type: 'pocket',   isStart: false, isTop: false, frictionCoeff: 0.75 },
      { id: 'vert-v5-h6',  x: 0.40, y: 0.26, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v5-h7',  x: 0.32, y: 0.55, z: 0.03, type: 'pocket',   isStart: false, isTop: false, frictionCoeff: 0.75 },
      { id: 'vert-v5-h8',  x: 0.58, y: 0.47, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'vert-v5-h9',  x: 0.60, y: 0.74, z: 0.03, type: 'pocket',   isStart: false, isTop: false, frictionCoeff: 0.75 },
      { id: 'vert-v5-h10', x: 0.48, y: 0.90, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Two-finger pocket sequence with big static moves. ' +
      'Deadpoint gently into each pocket — snatching causes slippage. ' +
      'Left hand lock-off on H7 for the reach to H9.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'core'],
  },
];

// ─── Slight Overhang (105°) ────────────────────────────────────────────────

const slightOverhangProblems = [
  {
    id: 'slight-v2',
    name: 'The Warmup',
    grade: 'V2',
    wallId: 'slight-overhang',
    holds: [
      { id: 'slight-v2-h1',  x: 0.38, y: 0.10, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'slight-v2-h2',  x: 0.60, y: 0.12, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'slight-v2-h3',  x: 0.35, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v2-h4',  x: 0.63, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v2-h5',  x: 0.62, y: 0.28, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'slight-v2-h6',  x: 0.45, y: 0.22, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v2-h7',  x: 0.36, y: 0.48, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'slight-v2-h8',  x: 0.58, y: 0.40, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v2-h9',  x: 0.50, y: 0.78, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'The slight angle forces you to keep your hips in. ' +
      'Crimp hard on H5, step the right foot high before reaching H7. Top out on the jug.',
    keyMuscles: ['fingers', 'forearms', 'core', 'legs'],
  },

  {
    id: 'slight-v4',
    name: 'Pinch and Pivot',
    grade: 'V4',
    wallId: 'slight-overhang',
    holds: [
      { id: 'slight-v4-h1',  x: 0.38, y: 0.10, z: 0.04, type: 'pinch',    isStart: true,  isTop: false, frictionCoeff: 0.70 },
      { id: 'slight-v4-h2',  x: 0.62, y: 0.12, z: 0.04, type: 'pinch',    isStart: true,  isTop: false, frictionCoeff: 0.70 },
      { id: 'slight-v4-h3',  x: 0.30, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v4-h4',  x: 0.68, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v4-h5',  x: 0.65, y: 0.30, z: 0.04, type: 'pinch',    isStart: false, isTop: false, frictionCoeff: 0.70 },
      { id: 'slight-v4-h6',  x: 0.42, y: 0.24, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v4-h7',  x: 0.32, y: 0.50, z: 0.04, type: 'pinch',    isStart: false, isTop: false, frictionCoeff: 0.70 },
      { id: 'slight-v4-h8',  x: 0.60, y: 0.42, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v4-h9',  x: 0.56, y: 0.68, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'slight-v4-h10', x: 0.44, y: 0.86, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Squeeze each pinch from both sides — palms in, thumbs down. ' +
      'Pivot your hips toward the wall before each move to reduce pump. ' +
      'Lock off H7 to reach the high crimp.',
    keyMuscles: ['fingers', 'forearms', 'shoulders', 'core'],
  },

  {
    id: 'slight-v6',
    name: 'Gastion Left',
    grade: 'V6',
    wallId: 'slight-overhang',
    holds: [
      { id: 'slight-v6-h1',  x: 0.35, y: 0.10, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'slight-v6-h2',  x: 0.60, y: 0.12, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'slight-v6-h3',  x: 0.28, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v6-h4',  x: 0.65, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v6-h5',  x: 0.60, y: 0.30, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'slight-v6-h6',  x: 0.40, y: 0.24, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'slight-v6-h7',  x: 0.28, y: 0.52, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'slight-v6-h8',  x: 0.58, y: 0.72, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'slight-v6-h9',  x: 0.42, y: 0.88, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Gastion the left sloper (H5): right hand pulls, left hand pushes outward. ' +
      'Hard lock-off on H7 to reach the high sloper. Flag your outside foot on both slopers.',
    keyMuscles: ['fingers', 'forearms', 'shoulders', 'lats', 'core'],
  },
];

// ─── Steep Overhang (120°) ─────────────────────────────────────────────────

const steepOverhangProblems = [
  {
    id: 'steep-v3',
    name: 'Power Jug',
    grade: 'V3',
    wallId: 'steep-overhang',
    holds: [
      { id: 'steep-v3-h1',  x: 0.36, y: 0.10, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'steep-v3-h2',  x: 0.62, y: 0.12, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'steep-v3-h3',  x: 0.32, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v3-h4',  x: 0.65, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v3-h5',  x: 0.64, y: 0.32, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'steep-v3-h6',  x: 0.42, y: 0.24, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v3-h7',  x: 0.34, y: 0.54, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'steep-v3-h8',  x: 0.58, y: 0.45, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v3-h9',  x: 0.52, y: 0.80, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Big power moves on the steep angle — pull hard through each jug. ' +
      'Keep feet on to conserve energy; drop-knee on H6 for the reach to H7.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'lats', 'core'],
  },

  {
    id: 'steep-v5',
    name: 'Iron Cross',
    grade: 'V5',
    wallId: 'steep-overhang',
    holds: [
      { id: 'steep-v5-h1',  x: 0.35, y: 0.10, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'steep-v5-h2',  x: 0.62, y: 0.12, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'steep-v5-h3',  x: 0.30, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v5-h4',  x: 0.67, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v5-h5',  x: 0.65, y: 0.30, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'steep-v5-h6',  x: 0.40, y: 0.23, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v5-h7',  x: 0.28, y: 0.52, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'steep-v5-h8',  x: 0.62, y: 0.43, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v5-h9',  x: 0.62, y: 0.70, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'steep-v5-h10', x: 0.40, y: 0.86, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Full lock-off on H7 (left hand crimp) to reach the high sloper. ' +
      'Squeeze H9 into your shoulder — open palm presses into the sloper. ' +
      'Right foot high on H8 before topping.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'shoulders', 'lats', 'core'],
  },

  {
    id: 'steep-v7',
    name: 'Dead Point',
    grade: 'V7',
    wallId: 'steep-overhang',
    holds: [
      { id: 'steep-v7-h1',  x: 0.40, y: 0.10, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'steep-v7-h2',  x: 0.62, y: 0.12, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'steep-v7-h3',  x: 0.35, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v7-h4',  x: 0.67, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'steep-v7-h5',  x: 0.58, y: 0.32, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'steep-v7-h6',  x: 0.42, y: 0.25, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      // Dynamic move: H5 to H7 is a full dead-point, ~0.30 in y
      { id: 'steep-v7-h7',  x: 0.32, y: 0.62, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'steep-v7-h8',  x: 0.52, y: 0.84, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Generate momentum from the hip swing to dead-point from H5 to H7. ' +
      'Catch the sloper at peak reach — do not slap. Lock off and match before topping.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'shoulders', 'core', 'hips'],
  },
];

// ─── Cave (145°) ────────────────────────────────────────────────────────────

const caveProblems = [
  {
    id: 'cave-v4',
    name: 'Cave Starter',
    grade: 'V4',
    wallId: 'cave',
    holds: [
      { id: 'cave-v4-h1',  x: 0.35, y: 0.10, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'cave-v4-h2',  x: 0.60, y: 0.12, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'cave-v4-h3',  x: 0.30, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v4-h4',  x: 0.65, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v4-h5',  x: 0.65, y: 0.32, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      // heel hook position on steep terrain
      { id: 'cave-v4-h6',  x: 0.42, y: 0.28, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v4-h7',  x: 0.32, y: 0.55, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'cave-v4-h8',  x: 0.60, y: 0.48, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v4-h9',  x: 0.50, y: 0.82, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Heel hook on H6 to take weight off your fingers for the reach to H5. ' +
      'Switch heel to H8, then match on H7 before reaching the lip jug.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'core', 'legs'],
  },

  {
    id: 'cave-v6',
    name: 'The Lip',
    grade: 'V6',
    wallId: 'cave',
    holds: [
      { id: 'cave-v6-h1',  x: 0.30, y: 0.10, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'cave-v6-h2',  x: 0.55, y: 0.12, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'cave-v6-h3',  x: 0.28, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v6-h4',  x: 0.60, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v6-h5',  x: 0.60, y: 0.28, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'cave-v6-h6',  x: 0.40, y: 0.22, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v6-h7',  x: 0.30, y: 0.48, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      // toe hook for stability before the dyno
      { id: 'cave-v6-h8',  x: 0.55, y: 0.40, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      // dynamic to sloper — the crux
      { id: 'cave-v6-h9',  x: 0.68, y: 0.68, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'cave-v6-h10', x: 0.50, y: 0.88, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Toe hook on H8 to stabilise before the dynamic move to H9. ' +
      'Generate swing from the hips — catch the sloper with open palm. ' +
      'Match H9, then top out.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'core', 'hips', 'legs'],
  },

  {
    id: 'cave-v8',
    name: 'Ceiling Fan',
    grade: 'V8',
    wallId: 'cave',
    holds: [
      { id: 'cave-v8-h1',  x: 0.38, y: 0.10, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'cave-v8-h2',  x: 0.62, y: 0.12, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'cave-v8-h3',  x: 0.32, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v8-h4',  x: 0.68, y: 0.04, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      // big move — 0.22 in y
      { id: 'cave-v8-h5',  x: 0.65, y: 0.34, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'cave-v8-h6',  x: 0.40, y: 0.27, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      // long reach — 0.24 in y from H5
      { id: 'cave-v8-h7',  x: 0.30, y: 0.58, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      // huge move — potential dyno
      { id: 'cave-v8-h8',  x: 0.62, y: 0.75, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'cave-v8-h9',  x: 0.45, y: 0.90, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Compression through the slopers — squeeze arms and legs together. ' +
      'No feet on the roof crux; core tension replaces footholds. ' +
      'The move from H7 to H8 may require a controlled dyno.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'core', 'shoulders', 'back'],
  },

  {
    id: 'cave-v10',
    name: 'Roof Dragon',
    grade: 'V10',
    wallId: 'cave',
    holds: [
      { id: 'cave-v10-h1',  x: 0.42, y: 0.10, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'cave-v10-h2',  x: 0.62, y: 0.12, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'cave-v10-h3',  x: 0.38, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'cave-v10-h4',  x: 0.66, y: 0.05, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      // hard move, small crimp
      { id: 'cave-v10-h5',  x: 0.62, y: 0.35, z: 0.02, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'cave-v10-h6',  x: 0.40, y: 0.28, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      // full dyno — 0.27 in y
      { id: 'cave-v10-h7',  x: 0.30, y: 0.62, z: 0.02, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'cave-v10-h8',  x: 0.55, y: 0.88, z: 0.04, type: 'sloper',   isStart: false, isTop: true,  frictionCoeff: 0.50 },
    ],
    suggestedBeta:
      'Commit to the roof dyno from H5+H7: generate force from the hip and ' +
      'full body swing. Catch the top sloper with open palm at full extension. ' +
      'Maximum contact strength required throughout.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'core', 'shoulders', 'back', 'hips'],
  },
];

// ─── Kilter Board (40°, 18×18 grid) ───────────────────────────────────────
// Hold positions are snapped to 1/17 grid increments (0.059 per step).

const kilterProblems = [
  {
    id: 'kilter-v0',
    name: 'First Light',
    grade: 'V0',
    wallId: 'kilter',
    holds: [
      { id: 'kilter-v0-h1',  x: 0.412, y: 0.176, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'kilter-v0-h2',  x: 0.588, y: 0.176, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'kilter-v0-h3',  x: 0.353, y: 0.059, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v0-h4',  x: 0.647, y: 0.059, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v0-h5',  x: 0.588, y: 0.412, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'kilter-v0-h6',  x: 0.471, y: 0.294, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v0-h7',  x: 0.412, y: 0.647, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'kilter-v0-h8',  x: 0.588, y: 0.529, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v0-h9',  x: 0.529, y: 0.882, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Central ladder on the 40° angle. Alternate hands, keep feet engaged. ' +
      'The board angle is friendly — focus on technique over power.',
    keyMuscles: ['fingers', 'forearms', 'core', 'legs'],
  },

  {
    id: 'kilter-v3',
    name: 'Diagonal Cross',
    grade: 'V3',
    wallId: 'kilter',
    holds: [
      { id: 'kilter-v3-h1',  x: 0.294, y: 0.176, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'kilter-v3-h2',  x: 0.412, y: 0.235, z: 0.05, type: 'jug',      isStart: true,  isTop: false, frictionCoeff: 0.90 },
      { id: 'kilter-v3-h3',  x: 0.235, y: 0.059, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v3-h4',  x: 0.471, y: 0.059, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v3-h5',  x: 0.529, y: 0.353, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'kilter-v3-h6',  x: 0.353, y: 0.235, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v3-h7',  x: 0.647, y: 0.529, z: 0.05, type: 'jug',      isStart: false, isTop: false, frictionCoeff: 0.90 },
      { id: 'kilter-v3-h8',  x: 0.529, y: 0.412, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v3-h9',  x: 0.765, y: 0.706, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'kilter-v3-h10', x: 0.824, y: 0.882, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Cross your right hand on H5, then move left hand to H7. ' +
      'The diagonal forces hip rotation — face into the wall at each move. ' +
      'Crimp H9 hard before topping on the upper-right jug.',
    keyMuscles: ['fingers', 'forearms', 'core', 'hips', 'back'],
  },

  {
    id: 'kilter-v6',
    name: 'Power Pinch',
    grade: 'V6',
    wallId: 'kilter',
    holds: [
      { id: 'kilter-v6-h1',  x: 0.353, y: 0.176, z: 0.04, type: 'pinch',    isStart: true,  isTop: false, frictionCoeff: 0.70 },
      { id: 'kilter-v6-h2',  x: 0.588, y: 0.235, z: 0.04, type: 'pinch',    isStart: true,  isTop: false, frictionCoeff: 0.70 },
      { id: 'kilter-v6-h3',  x: 0.294, y: 0.059, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v6-h4',  x: 0.647, y: 0.059, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v6-h5',  x: 0.706, y: 0.412, z: 0.04, type: 'pinch',    isStart: false, isTop: false, frictionCoeff: 0.70 },
      { id: 'kilter-v6-h6',  x: 0.471, y: 0.294, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v6-h7',  x: 0.294, y: 0.588, z: 0.04, type: 'pinch',    isStart: false, isTop: false, frictionCoeff: 0.70 },
      { id: 'kilter-v6-h8',  x: 0.647, y: 0.471, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v6-h9',  x: 0.588, y: 0.765, z: 0.04, type: 'pinch',    isStart: false, isTop: false, frictionCoeff: 0.70 },
      { id: 'kilter-v6-h10', x: 0.529, y: 0.941, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Squeeze every pinch from both sides simultaneously — this is contact strength training. ' +
      'The wide right-hand reach to H5 requires a hard left-side lock-off. ' +
      'Match H9 before topping.',
    keyMuscles: ['fingers', 'forearms', 'shoulders', 'biceps', 'core'],
  },

  {
    id: 'kilter-v9',
    name: 'The Project',
    grade: 'V9',
    wallId: 'kilter',
    holds: [
      { id: 'kilter-v9-h1',  x: 0.412, y: 0.235, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'kilter-v9-h2',  x: 0.588, y: 0.235, z: 0.03, type: 'crimp',    isStart: true,  isTop: false, frictionCoeff: 0.80 },
      { id: 'kilter-v9-h3',  x: 0.353, y: 0.118, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v9-h4',  x: 0.647, y: 0.118, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      // hard cross — 0.18 x gap and 0.18 y gap
      { id: 'kilter-v9-h5',  x: 0.765, y: 0.412, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'kilter-v9-h6',  x: 0.529, y: 0.294, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      // big move left — potential deadpoint
      { id: 'kilter-v9-h7',  x: 0.235, y: 0.588, z: 0.03, type: 'crimp',    isStart: false, isTop: false, frictionCoeff: 0.80 },
      { id: 'kilter-v9-h8',  x: 0.706, y: 0.471, z: 0.02, type: 'foothold', isStart: false, isTop: false, frictionCoeff: 0.85 },
      { id: 'kilter-v9-h9',  x: 0.706, y: 0.765, z: 0.04, type: 'sloper',   isStart: false, isTop: false, frictionCoeff: 0.50 },
      { id: 'kilter-v9-h10', x: 0.529, y: 0.941, z: 0.05, type: 'jug',      isStart: false, isTop: true,  frictionCoeff: 0.90 },
    ],
    suggestedBeta:
      'Full lock-off from H5 to reach H7 — a near-full-span deadpoint across the board. ' +
      'Open palm the sloper at H9: press into it, do not crimp. ' +
      'Maximum finger strength and contact strength required.',
    keyMuscles: ['fingers', 'forearms', 'biceps', 'shoulders', 'lats', 'core'],
  },
];

// ─── Export ─────────────────────────────────────────────────────────────────

export const problems = [
  ...slabProblems,
  ...verticalProblems,
  ...slightOverhangProblems,
  ...steepOverhangProblems,
  ...caveProblems,
  ...kilterProblems,
];

export default problems;
