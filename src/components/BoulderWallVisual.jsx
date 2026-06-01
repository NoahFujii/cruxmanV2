import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HERO_WALL_YAW = 0.34;

function buildReferenceWallGeometry() {
  const positions = [];
  const normals = [];
  const materialIndices = [];

  const normalFor = (a, b, c) => {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    return new THREE.Vector3().crossVectors(ab, ac).normalize();
  };

  const tri = (a, b, c, materialIndex) => {
    const normal = normalFor(a, b, c);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
    materialIndices.push(materialIndex);
  };

  const quad = (a, b, c, d, materialIndex) => {
    tri(a, b, c, materialIndex);
    tri(a, c, d, materialIndex);
  };

  const v = {
    flb: new THREE.Vector3(-1.12, -2.18, 0.52),
    fcb: new THREE.Vector3(-0.1, -2.26, 0.66),
    frb: new THREE.Vector3(1.04, -2.08, 0.42),
    flm: new THREE.Vector3(-1.38, -0.42, 0.45),
    fml: new THREE.Vector3(-0.56, -0.18, 0.72),
    fmc: new THREE.Vector3(0.22, 0.36, 0.82),
    fmr: new THREE.Vector3(1.14, -0.28, 0.5),
    ful: new THREE.Vector3(-1.48, 1.48, 0.28),
    fuc: new THREE.Vector3(-0.08, 1.16, 0.5),
    fur: new THREE.Vector3(1.02, 1.54, 0.24),
    ftc: new THREE.Vector3(-0.24, 2.08, 0.12),

    blb: new THREE.Vector3(-1.0, -2.18, -0.78),
    bcb: new THREE.Vector3(-0.02, -2.24, -0.86),
    brb: new THREE.Vector3(1.18, -2.02, -0.66),
    blm: new THREE.Vector3(-1.28, -0.38, -0.7),
    bmr: new THREE.Vector3(1.2, -0.18, -0.58),
    bul: new THREE.Vector3(-1.28, 1.48, -0.56),
    buc: new THREE.Vector3(-0.12, 2.02, -0.58),
    bur: new THREE.Vector3(1.18, 1.5, -0.5),
  };

  quad(v.flb, v.fcb, v.fml, v.flm, 0);
  quad(v.fcb, v.frb, v.fmr, v.fml, 1);
  tri(v.flm, v.fml, v.ful, 2);
  tri(v.fml, v.fuc, v.ful, 3);
  tri(v.fml, v.fmc, v.fuc, 4);
  tri(v.fml, v.fmr, v.fmc, 5);
  quad(v.fmc, v.fmr, v.fur, v.fuc, 2);
  tri(v.fuc, v.fur, v.ftc, 0);
  tri(v.fuc, v.ftc, v.ful, 1);
  tri(v.fmr, v.frb, v.fur, 3);

  quad(v.frb, v.brb, v.bmr, v.fmr, 6);
  quad(v.fmr, v.bmr, v.bur, v.fur, 7);
  tri(v.fur, v.bur, v.buc, 8);
  tri(v.fur, v.buc, v.ftc, 8);
  quad(v.ftc, v.buc, v.bul, v.ful, 9);
  quad(v.ful, v.bul, v.blm, v.flm, 7);
  quad(v.flm, v.blm, v.blb, v.flb, 6);
  quad(v.flb, v.blb, v.bcb, v.fcb, 8);
  quad(v.fcb, v.bcb, v.brb, v.frb, 9);
  quad(v.blb, v.blm, v.bul, v.buc, 7);
  tri(v.blb, v.buc, v.bcb, 7);
  tri(v.bcb, v.buc, v.bur, 6);
  tri(v.bcb, v.bur, v.brb, 6);
  tri(v.brb, v.bur, v.bmr, 6);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  for (let i = 0; i < materialIndices.length; i += 1) {
    geometry.addGroup(i * 3, 3, materialIndices[i]);
  }

  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingSphere();

  return geometry;
}

function buildGridGeometry() {
  const points = [];
  const size = 2.8;
  const step = 0.35;
  const y = -1.76;

  for (let i = -size; i <= size + 0.001; i += step) {
    points.push(-size, y, i, size, y, i);
    points.push(i, y, -size, i, y, size);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

function makeMinimalHolds() {
  return [
    [-0.86, -1.38, 0.57, 0.8], [-0.62, -1.1, 0.63, 0.65], [-0.28, -1.62, 0.72, 0.75],
    [0.14, -1.28, 0.73, 0.72], [0.42, -1.52, 0.63, 0.6], [-0.98, -0.74, 0.53, 0.56],
    [-0.5, -0.66, 0.67, 0.64], [-0.04, -0.86, 0.78, 0.58], [0.56, -0.58, 0.57, 0.66],
    [-1.04, -0.1, 0.49, 0.54], [-0.56, 0.12, 0.69, 0.58], [0.02, 0.24, 0.82, 0.52],
    [0.62, 0.08, 0.56, 0.58], [-0.96, 0.58, 0.43, 0.5], [-0.42, 0.72, 0.62, 0.54],
    [0.34, 0.78, 0.61, 0.5],
  ].map(([x, y, z, scale], index) => ({
    position: [x, y, z],
    rotation: [0.08, 0.02 * (index % 3), index * 0.72],
    scale,
  }));
}

function BlueprintFloor() {
  const gridGeometry = useMemo(() => buildGridGeometry(), []);
  const gridMaterial = useMemo(() => (
    new THREE.LineBasicMaterial({
      color: '#AAB6BF',
      transparent: true,
      opacity: 0.14,
    })
  ), []);

  return (
    <group position={[0.04, 0, -0.18]}>
      <lineSegments geometry={gridGeometry} material={gridMaterial} />
      <mesh position={[0, -1.765, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.1, 2.4]} />
        <meshBasicMaterial color="#D8DEE3" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh position={[0.16, -1.758, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.05, 0.48, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color="#7C8A94" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ReferenceWall({ hovered }) {
  const groupRef = useRef();
  const hoveredRef = useRef(hovered);
  const swingRef = useRef(0);
  const swingDirectionRef = useRef(1);

  const wallGeometry = useMemo(() => buildReferenceWallGeometry(), []);
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(wallGeometry, 16), [wallGeometry]);
  const holds = useMemo(() => makeMinimalHolds(), []);
  const wallMaterials = useMemo(() => (
    ['#DCE1E4', '#CAD2D8', '#EEF1F2', '#C0C9D0', '#E6EAED', '#B5C0C8', '#A7B1BA', '#BFC8CF', '#F3F4F4', '#CDD5DA'].map((color) => (
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92,
        metalness: 0.01,
        flatShading: true,
        side: THREE.DoubleSide,
      })
    ))
  ), []);
  const edgeMaterial = useMemo(() => (
    new THREE.LineBasicMaterial({
      color: '#65717A',
      transparent: true,
      opacity: 0.28,
    })
  ), []);
  const holdMaterial = useMemo(() => (
    new THREE.MeshStandardMaterial({
      color: '#6F7A82',
      roughness: 0.84,
      metalness: 0,
    })
  ), []);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (hoveredRef.current) {
      swingRef.current += delta * 0.18 * swingDirectionRef.current;

      if (swingRef.current > 0.16) {
        swingRef.current = 0.16;
        swingDirectionRef.current = -1;
      } else if (swingRef.current < -0.18) {
        swingRef.current = -0.18;
        swingDirectionRef.current = 1;
      }
    } else {
      swingRef.current = THREE.MathUtils.damp(swingRef.current, 0, 4, delta);
    }

    groupRef.current.rotation.y = HERO_WALL_YAW + swingRef.current;
  });

  return (
    <group ref={groupRef} position={[0, 0.08, 0.04]} rotation={[0, HERO_WALL_YAW, 0]} scale={0.84}>
      <mesh geometry={wallGeometry} material={wallMaterials} castShadow />
      <lineSegments geometry={edgeGeometry} material={edgeMaterial} />
      {holds.map((hold, index) => (
        <mesh
          key={index}
          position={hold.position}
          rotation={hold.rotation}
          scale={hold.scale}
          material={holdMaterial}
        >
          <boxGeometry args={[0.08, 0.018, 0.026]} />
        </mesh>
      ))}
    </group>
  );
}

export default function BoulderWallVisual({ hovered = false, dark = false }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [3.8, 3.5, 5.6], zoom: 134, near: 0.1, far: 100 }}
      gl={{ alpha: !dark, antialias: true }}
      dpr={[1, 2]}
      shadows
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      style={{ width: '100%', height: '100%', background: dark ? '#15181B' : 'transparent' }}
    >
      <color attach="background" args={[dark ? '#15181B' : '#F8F9FA']} />
      <ambientLight intensity={1.12} color="#F7FAFC" />
      <hemisphereLight intensity={0.58} color="#FFFFFF" groundColor="#CFD6DC" />
      <directionalLight position={[4.5, 6, 5.5]} intensity={1.38} color="#FFFFFF" castShadow />
      <directionalLight position={[-4, 2.4, 2.2]} intensity={0.44} color="#DDE8F0" />
      <BlueprintFloor />
      <ReferenceWall hovered={hovered} />
    </Canvas>
  );
}
