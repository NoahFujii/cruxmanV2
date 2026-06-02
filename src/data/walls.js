/**
 * Wall definitions for the Cruxman Boulder Designer.
 *
 * angleDeg: the wall's overhanging angle measured from the floor.
 *   90° = perfectly vertical, >90° = overhang, <90° = slab.
 *
 * modelFile: path under public/models/ used by ModelOrFallback.
 *   Falls back to procedural geometry when the file is absent.
 *
 * gridWidth / gridHeight: wall dimensions in metres (or grid units for kilter).
 *   Used by the hold-placement grid and procedural wall geometry.
 */

export const walls = [
  {
    id: 'slab',
    name: 'Slab',
    angleDeg: 10,
    type: 'slab',
    description:
      'A 10° slab — the wall leans slightly away from you. ' +
      'Footwork and balance dominate; every weight shift counts.',
    gridWidth: 4,
    gridHeight: 4,
    modelFile: 'walls/slab.glb',
  },
  {
    id: 'vertical',
    name: 'Vertical',
    angleDeg: 90,
    type: 'vertical',
    description:
      'A perfectly vertical face. The all-rounder: technique, ' +
      'strength, and endurance are tested in equal measure.',
    gridWidth: 4,
    gridHeight: 5,
    modelFile: 'walls/vertical.glb',
  },
  {
    id: 'slight-overhang',
    name: 'Slight Overhang',
    angleDeg: 105,
    type: 'slight-overhang',
    description:
      'A 105° wall. The added angle begins pulling you off, ' +
      'demanding core tension and active hip engagement.',
    gridWidth: 4,
    gridHeight: 5,
    modelFile: 'walls/overhang.glb',
  },
  {
    id: 'steep-overhang',
    name: 'Steep Overhang',
    angleDeg: 120,
    type: 'steep-overhang',
    description:
      'A 120° overhanging wall. Power moves, long reaches, and ' +
      'significant finger strength required throughout.',
    gridWidth: 4,
    gridHeight: 5,
    modelFile: 'walls/steep-overhang.glb',
  },
  {
    id: 'cave',
    name: 'Cave',
    angleDeg: 145,
    type: 'cave',
    description:
      'A 145° cave — nearly horizontal. Pure power: lock-offs, ' +
      'heel hooks, and dynamic lunges to the lip.',
    gridWidth: 4,
    gridHeight: 3,
    modelFile: 'walls/cave.glb',
  },
  {
    id: 'kilter',
    name: 'Kilter Board',
    angleDeg: 40,
    type: 'kilter',
    description:
      'An 18×18 grid board at 40°. Standard holds at known grid ' +
      'positions — ideal for progressive training and benchmark problems.',
    gridWidth: 18,
    gridHeight: 18,
    modelFile: 'walls/kilter.glb',
  },
];

export default walls;
