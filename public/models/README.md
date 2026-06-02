# Cruxman — 3D Model Asset Workflow

The app loads `.glb` files from this directory. Every loader is wrapped in
`<ModelOrFallback>` so missing files silently fall back to a procedural
primitive — the app never crashes when a model is absent.

---

## CLIMBER (one-time setup — do this for a real human figure)

**Option A — Mixamo (free, rigged, industry-standard):**
1. Go to https://www.mixamo.com, log in, pick any character.
2. Download as **FBX** in **T-Pose** (Animation: "T-Pose", Format: FBX, no skin).
3. Import into Blender: File > Import > FBX.
4. Export: File > Export > **glTF 2.0 (.glb)**, tick "+Y up", Apply Modifiers.
5. Save as `public/models/climber/figure.glb`.
6. Keep the armature/skeleton — we pose individual bones, we do NOT play animations.

**Option B — Ready Player Me (fastest):**
1. Go to https://readyplayer.me, create an avatar.
2. Download the `.glb` directly from the export URL.
3. Save as `public/models/climber/figure.glb`.

---

## HOLDS (optional — procedural fallback works without these)

Build in Blender or download from Sketchfab (CC-licensed):

| Hold type | Blender approach |
|-----------|-----------------|
| crimp     | Beveled cube, narrow top face |
| jug       | Cylinder with curved undercut |
| sloper    | Flattened sphere |
| pinch     | Two-lobe merged cylinders |
| pocket    | Sphere with boolean hole |
| foothold  | Small flat disc, slightly domed |

**Export settings (all holds):**
- Apply All Transforms: Ctrl+A → All Transforms
- Origin to geometry: Object > Set Origin > Origin to Geometry
- Export: File > Export > **glTF Binary (.glb)** into `public/models/holds/`
- Keep polycount low: **< 500 triangles per hold** for web performance
- Do NOT bake textures — `applyFlatMaterial` overrides them anyway

---

## WALLS (optional)

Wall panels: plane with creased edges, ~4–5k triangles max.
Export into `public/models/walls/`.

---

## EXPECTED FILENAMES (loader looks for these exact paths)

```
public/models/holds/jug.glb
public/models/holds/crimp.glb
public/models/holds/sloper.glb
public/models/holds/pinch.glb
public/models/holds/pocket.glb
public/models/holds/foothold.glb

public/models/walls/slab.glb
public/models/walls/vertical.glb
public/models/walls/overhang.glb
public/models/walls/cave.glb
public/models/walls/kilter.glb

public/models/climber/figure.glb
```

---

## HOW THE LOADER WORKS

```jsx
<ModelOrFallback
  src="/models/holds/jug.glb"   // omit or leave empty → shows fallback
  fallback={<mesh><boxGeometry /></mesh>}
  color="#C0C9D0"
  position={[0, 0, 0]}
/>
```

- File present → loads GLB, applies flat grey material, renders it.
- File missing → catches the 404 in `ModelErrorBoundary`, renders `fallback`.
- No `src` prop → renders `fallback` immediately with no network request.

`applyFlatMaterial` (src/utils/applyFlatMaterial.js) strips all original
textures and replaces every mesh with a single `MeshStandardMaterial`
(roughness 0.9, metalness 0.02, flatShading) to match the Cruxman aesthetic.

---

## NOTES

- For the **climber** specifically: `scene.clone(true)` handles static poses.
  If you ever need to drive skeletal animation at runtime, swap for
  `SkeletonUtils.clone` from `three/addons/utils/SkeletonUtils.js`.
- Vite serves `public/` at the root URL, so `/models/holds/jug.glb` in code
  maps to `public/models/holds/jug.glb` on disk.
