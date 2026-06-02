import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { applyFlatMaterial } from '../utils/applyFlatMaterial';
import ModelErrorBoundary from './ModelErrorBoundary';

const DEFAULT_COLOR = '#C0C9D0';

/**
 * Inner component — only rendered when `src` is provided. useGLTF suspends
 * while loading and throws on a failed fetch, which the surrounding
 * ErrorBoundary catches.
 *
 * Note: scene.clone(true) works for static meshes. If the climber GLB has
 * a skeleton, swap in SkeletonUtils.clone (three/addons/utils/SkeletonUtils.js).
 */
function GLBModel({ src, color }) {
  const { scene } = useGLTF(src);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    applyFlatMaterial(c, color);
    return c;
  }, [scene, color]);

  return <primitive object={cloned} />;
}

/**
 * Renders a real .glb model when the file is present, or the `fallback`
 * element (a procedural primitive) when it is missing or fails.
 *
 * Props:
 *   src      — path to the .glb file, e.g. "/models/holds/jug.glb"
 *   fallback — R3F JSX to show when src is absent or fails to load
 *   color    — hex string for the flat-material override (default: #C0C9D0)
 *   ...rest  — position / rotation / scale forwarded to the wrapping <group>
 */
export default function ModelOrFallback({ src, fallback, color = DEFAULT_COLOR, ...rest }) {
  return (
    <group {...rest}>
      {src ? (
        // key={src} resets the error boundary if src changes
        <ModelErrorBoundary key={src} fallback={fallback}>
          <Suspense fallback={null}>
            <GLBModel src={src} color={color} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        fallback
      )}
    </group>
  );
}
