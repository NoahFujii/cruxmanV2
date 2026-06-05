export const DEFAULT_POSE = {
  hips:   { x: 0, y: 0.95, z: 0 },
  spine:  { rotX: 0, rotZ: 0 },

  shoulderL: { rotX: 0.05, rotY: 0,    rotZ:  0.10 },
  elbowL:    { rotX: 0.15 },
  wristL:    { x: -0.24, y: 0.90, z: 0.04 },  // ~0.503m from shoulder → within 0.53m reach

  shoulderR: { rotX: 0.05, rotY: 0,    rotZ: -0.10 },
  elbowR:    { rotX: 0.15 },
  wristR:    { x:  0.24, y: 0.90, z: 0.04 },

  hipL:  { rotX: 0, rotY: 0, rotZ:  0.04 },
  kneeL: { rotX: 0.05 },
  ankleL: { x: -0.10, y: 0.14, z: 0 },  // 0.77m from hip joint → within 0.80m reach

  hipR:  { rotX: 0, rotY: 0, rotZ: -0.04 },
  kneeR: { rotX: 0.05 },
  ankleR: { x:  0.10, y: 0.14, z: 0 },
};
