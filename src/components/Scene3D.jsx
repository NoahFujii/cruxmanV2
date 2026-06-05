import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import ModelOrFallback from './ModelOrFallback';
import Climber3D from './Climber3D';
import { holdToWorldSpace } from '../utils/wallCoordinates';

// ── Layout constants ────────────────────────────────────────────────────────

const WALL_W = 4;    // metres wide
const WALL_H = 6;    // metres tall
const GRID_STEP = 0.5;

// Hold colours: start / top / regular / highlighted
const HC = {
  start:       '#4A90D9',
  top:         '#2ECC71',
  regular:     '#9A9791',
  highlighted: '#E8A020',
};

// ── Procedural wall ─────────────────────────────────────────────────────────

function WallGrid() {
  const geo = useMemo(() => {
    const pts = [];
    const z = 0.006; // just above wall face to prevent z-fighting
    for (let x = -WALL_W / 2; x <= WALL_W / 2 + 0.001; x += GRID_STEP) {
      pts.push(x, 0, z,       x, WALL_H, z);
    }
    for (let y = 0; y <= WALL_H + 0.001; y += GRID_STEP) {
      pts.push(-WALL_W / 2, y, z,   WALL_W / 2, y, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#C0BDB8" transparent opacity={0.36} />
    </lineSegments>
  );
}

function ProceduralWall() {
  return (
    <group>
      {/* Plane centre at (0, WALL_H/2, 0) so its bottom edge sits at y=0 */}
      <mesh position={[0, WALL_H / 2, 0]}>
        <planeGeometry args={[WALL_W, WALL_H]} />
        <meshStandardMaterial
          color="#D4D1CC"
          roughness={0.85}
          metalness={0.01}
          flatShading
        />
      </mesh>
      <WallGrid />
    </group>
  );
}

// ── Floor grid ──────────────────────────────────────────────────────────────
// Rendered in world space so it stays horizontal regardless of wall angle.
//
// The extent is computed per-wall so the grid is always centred under the
// wall's actual footprint:
//   wallTopZ  = how far the wall top projects into Z (positive = toward viewer)
//   zCentre   = midpoint between wall base (z=0) and wall top (z=wallTopZ)
//   floor z   = zCentre ± PAD   ← equal margins either side of the wall body
//
// For a vertical wall: wallTopZ=0, zCentre=0, floor −4 … +4  (symmetric ✓)
// For a cave (145°):   wallTopZ≈5, zCentre≈2.5, floor −1.5 … +6.5
// For a slab (10°):    wallTopZ≈−6, zCentre≈−3, floor −7 … +1

const FLOOR_HALF = 7; // half-extent in every direction → 14 × 14 m perfect square

function FloorGrid({ wall }) {
  const { lineGeo, planeCZ } = useMemo(() => {
    const rotX     = ((wall.angleDeg - 90) * Math.PI) / 180;
    const wallTopZ  = WALL_H * Math.sin(rotX);
    const zCentre   = wallTopZ / 2;

    const xMin = -FLOOR_HALF, xMax = FLOOR_HALF;
    const zMin = zCentre - FLOOR_HALF;
    const zMax = zCentre + FLOOR_HALF;

    const pts = [];
    const step = 0.5;
    const y = -0.001;

    for (let x = xMin; x <= xMax + 0.001; x += step) {
      pts.push(x, y, zMin,  x, y, zMax);
    }
    for (let z = zMin; z <= zMax + 0.001; z += step) {
      pts.push(xMin, y, z,  xMax, y, z);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));

    return { lineGeo: g, planeCZ: zCentre };
  }, [wall.angleDeg]);

  return (
    <group>
      {/* Ghost plane — barely-there surface to anchor the floor visually */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, planeCZ]}>
        <planeGeometry args={[FLOOR_HALF * 2, FLOOR_HALF * 2]} />
        <meshStandardMaterial
          color="#D0CCC6"
          transparent
          opacity={0.07}
          depthWrite={false}
          roughness={1}
        />
      </mesh>

      {/* See-through grid lines */}
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          color="#A8A49F"
          transparent
          opacity={0.36}
          depthWrite={false}
        />
      </lineSegments>

    </group>
  );
}

// ── Procedural hold shapes ───────────────────────────────────────────────────
//
// Convention: holds sit on the wall surface (face +Z in wall-local space).
// Cylindrical geometries (jug, foothold) are rotated so their height axis
// aligns with +Z (protrudes toward the climber). Pocket torus already faces
// +Z by default.

function ProceduralHoldContent({ type, color }) {
  const mat = { color, roughness: 0.78, flatShading: true };

  if (type === 'pinch') {
    return (
      <group>
        <mesh position={[-0.04, 0, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.04]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[0.04, 0, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.04]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      </group>
    );
  }

  if (type === 'sloper') {
    // Flatten in Z (depth) so it reads as a rounded dome on the wall face.
    return (
      <mesh scale={[1, 1, 0.55]}>
        <sphereGeometry args={[0.07, 14, 10]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    );
  }

  // Single-mesh types — build geometry then decide orientation.
  const isCylindrical = type === 'jug' || type === 'foothold';
  const geo = {
    jug:      <cylinderGeometry args={[0.06, 0.055, 0.04, 16]} />,
    crimp:    <boxGeometry args={[0.08, 0.02, 0.04]} />,
    pocket:   <torusGeometry args={[0.05, 0.018, 10, 20]} />,
    foothold: <cylinderGeometry args={[0.04, 0.04, 0.012, 16]} />,
  }[type] ?? <sphereGeometry args={[0.05, 8, 6]} />;

  return (
    <mesh rotation={isCylindrical ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
      {geo}
      <meshStandardMaterial {...mat} />
    </mesh>
  );
}

// ── Capitalise helper ────────────────────────────────────────────────────────

function capFirst(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Individual hold with smooth hover-scale ──────────────────────────────────

function HoldMesh({ hold, wall, isHighlighted, onClick, showHoldLabels }) {
  const groupRef  = useRef();
  const scaleNow  = useRef(1.0);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    const target = hovered ? 1.15 : 1.0;
    scaleNow.current = THREE.MathUtils.lerp(scaleNow.current, target, 0.15);
    groupRef.current?.scale.setScalar(scaleNow.current);
  });

  const color = isHighlighted  ? HC.highlighted
              : hold.isStart   ? HC.start
              : hold.isTop     ? HC.top
                               : HC.regular;

  const p    = holdToWorldSpace(hold, wall);
  const rotX = ((wall.angleDeg - 90) * Math.PI) / 180;

  return (
    <group
      ref={groupRef}
      position={[p.x, p.y, p.z]}
      rotation={[rotX, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(hold);
      }}
    >
      <ModelOrFallback
        src={`/models/holds/${hold.type}.glb`}
        color={color}
        fallback={<ProceduralHoldContent type={hold.type} color={color} />}
      />

      {/* Billboarded label — offset in local Z (wall-surface normal, always toward viewer) */}
      {showHoldLabels && (
        <Html
          center
          distanceFactor={10}
          position={[0, 0, 0.20]}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[4, 0]}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            background: 'rgba(255,253,250,0.93)',
            border: '1px solid #E0DED9',
            borderRadius: 4,
            padding: '2px 5px',
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            color: '#6B6B6B',
            whiteSpace: 'nowrap',
            lineHeight: '1.3',
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {capFirst(hold.type)}
            {hold.isStart && (
              <span style={{ color: '#4A90D9', fontWeight: 700, fontSize: 8 }}>S</span>
            )}
            {hold.isTop && (
              <span style={{ color: '#2ECC71', fontWeight: 700, fontSize: 8 }}>T</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Wall + holds group (rotated to wall angle) ───────────────────────────────
//
// angleDeg is measured from the floor:
//   90° = vertical, <90° = slab (top leans away), >90° = overhang (top leans in).
//
// Rotation formula: rotX = (angleDeg − 90) × π/180.
//   At 90°: rotX = 0   → wall is vertical (no tilt)
//   At 10°: rotX = −80° → top leans back (slab)
//   At 145°: rotX = 55° → top leans over viewer (cave)
//
// The group pivot is at world (0,0,0), which becomes the bottom edge of the
// wall — so the floor attachment point is always fixed regardless of angle.

function WallScene({ wall, holds, onHoldClick, highlightedHoldId, showHoldLabels }) {
  const rotX = ((wall.angleDeg - 90) * Math.PI) / 180;

  return (
    <>
      <group rotation={[rotX, 0, 0]}>
        <ModelOrFallback
          src={wall.modelFile ? `/models/${wall.modelFile}` : null}
          color="#D4D1CC"
          fallback={<ProceduralWall />}
        />
      </group>
      {(holds ?? []).map((hold) => (
        <HoldMesh
          key={hold.id}
          hold={hold}
          wall={wall}
          isHighlighted={hold.id === highlightedHoldId}
          onClick={onHoldClick}
          showHoldLabels={showHoldLabels}
        />
      ))}
    </>
  );
}

// ── Camera centring ──────────────────────────────────────────────────────────
// The wall rotates around its bottom edge (world origin), so the visual centre
// moves with the angle. CameraSync re-aims both the camera position and the
// OrbitControls target at the wall's true world-space centre whenever the wall
// changes, keeping the wall always centred in the viewport.
//
// Wall centre in world space:
//   cy = (WALL_H / 2) × cos(rotX)     ← rises as wall tilts toward viewer
//   cz = (WALL_H / 2) × sin(rotX)     ← moves forward for overhangs, back for slabs
//
// Camera sits CAMERA_DIST metres in front of that centre (along +Z).

// Camera is positioned CAMERA_DIST metres in front (+Z) of the wall centre
// and CAMERA_ELEV metres above it, giving a mild bird's-eye angle (~18°) that
// shows the full wall surface plus the 14 × 14 m floor grid in one view.
const CAMERA_DIST = 16;
const CAMERA_ELEV = 5;

function CameraSync({ wy, wz, controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, wy + CAMERA_ELEV, wz + CAMERA_DIST);
    const ctrl = controlsRef.current;
    if (ctrl) {
      ctrl.target.set(0, wy, wz);
      ctrl.update();
    }
  }, [camera, wy, wz, controlsRef]); // controlsRef is stable — listed for lint

  return null;
}

// ── Scene3D — public API ─────────────────────────────────────────────────────

/**
 * Props:
 *   wall            — wall object from walls.js (required)
 *   holds           — array of hold objects from problems.js
 *   onHoldClick     — (hold) => void  called when a hold is clicked
 *   highlightedHoldId — id of the hold to show in highlighted colour
 *   climberPose     — pose object forwarded to Climber3D
 *   showClimber     — whether to render the climber figure
 */
export default function Scene3D({
  wall,
  holds = [],
  onHoldClick,
  highlightedHoldId,
  climberPose,
  showClimber = false,
  showHoldLabels = false,
}) {
  const controlsRef = useRef();

  if (!wall) return null;

  // Wall centre in world space — recomputed whenever the wall angle changes
  const rotX = ((wall.angleDeg - 90) * Math.PI) / 180;
  const wallCY = (WALL_H / 2) * Math.cos(rotX);
  const wallCZ = (WALL_H / 2) * Math.sin(rotX);

  return (
    <Canvas
      camera={{ position: [0, wallCY + CAMERA_ELEV, wallCZ + CAMERA_DIST], fov: 55 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => { document.body.style.cursor = 'default'; }}
    >
      {/* Background */}
      <color attach="background" args={['#F0EFEB']} />

      {/* Lighting — three sources for readable face variation without drama */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]}  intensity={1.2} />
      <directionalLight position={[-3, 2, 1]} intensity={0.45} color="#D8E8FF" />

      {/* Camera controls — target set imperatively by CameraSync */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0}
        maxPolarAngle={Math.PI * 0.85}
        enablePan={false}
        makeDefault
      />

      {/* Re-centres camera and orbit target whenever the wall angle changes */}
      <CameraSync wy={wallCY} wz={wallCZ} controlsRef={controlsRef} />

      {/* Floor grid lives in world space — not inside WallScene's rotation */}
      <FloorGrid wall={wall} />

      {/* Heavy GL content behind Suspense */}
      <Suspense fallback={null}>
        <WallScene
          wall={wall}
          holds={holds}
          onHoldClick={onHoldClick}
          highlightedHoldId={highlightedHoldId}
          showHoldLabels={showHoldLabels}
        />
        {showClimber && <Climber3D pose={climberPose} visible />}
      </Suspense>
    </Canvas>
  );
}
