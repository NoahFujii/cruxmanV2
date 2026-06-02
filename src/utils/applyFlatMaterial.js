import * as THREE from 'three';

/**
 * Replaces every mesh material in object3d with a single flat-shaded
 * MeshStandardMaterial. Old materials are disposed (shared instances tracked
 * to avoid double-dispose). Call this on a cloned scene, not the cached original.
 */
export function applyFlatMaterial(object3d, hexColor) {
  const material = new THREE.MeshStandardMaterial({
    color: hexColor,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });

  const disposed = new Set();

  object3d.traverse((node) => {
    if (!node.isMesh) return;
    const old = node.material;
    if (Array.isArray(old)) {
      old.forEach((m) => {
        if (!disposed.has(m)) { m.dispose(); disposed.add(m); }
      });
    } else if (old && !disposed.has(old)) {
      old.dispose();
      disposed.add(old);
    }
    node.material = material;
  });
}
