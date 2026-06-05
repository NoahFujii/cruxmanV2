import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { runFullAnalysis } from '../utils/forceAnalysis';

/*
 * ─── 3-level beta structure ─────────────────────────────────────────────────
 *
 * generatedBetas: [
 *   {
 *     id: "A" | "B" | "C",
 *     label: string,
 *     description: string,
 *     positions: [
 *       {
 *         index: number,
 *         label: string,          // "Position 1", "Position 2", ... "Top"
 *         contacts: Array<{ limb, holdId }>,
 *         pose: object,           // settled body pose
 *         analysisResult: object|null,
 *         moveFrames: [           // transition frames into this position
 *           {                     // empty for Position 1 (start)
 *             id: string,
 *             label: string,      // "Load" | "Reach" | "Grab" | "Settle"
 *                                 // or "Setup"|"Load"|"Release"|"Peak"|"Catch"|"Stabilize"
 *             description: string,
 *             pose: object,
 *             contacts: Array<{ limb, holdId }>,
 *             analysisResult: object|null,
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * ]
 */

const DEFAULT_CLIMBER_STATS = {
  heightCm: 175,
  weightKg: 70,
  gender:   'male',
};

// ── Pure selectors (export for use in components) ─────────────────────────────

export function getActiveBeta(state) {
  return state.generatedBetas.find(b => b.id === state.activeBetaId) ?? null;
}

export function getActivePosition(state) {
  const beta = getActiveBeta(state);
  return beta?.positions[state.activePositionIndex] ?? null;
}

/** Returns the move frame if one is selected, otherwise the settled position object. */
export function getActiveFrame(state) {
  const pos = getActivePosition(state);
  if (!pos) return null;
  if (state.activeMoveFrameIndex !== null) {
    return pos.moveFrames[state.activeMoveFrameIndex] ?? null;
  }
  return pos;
}

/** Returns the pose that the 3D scene should display. */
export function getActivePose(state) {
  return getActiveFrame(state)?.pose ?? null;
}

// ── Session-only initial state ────────────────────────────────────────────────

const INITIAL_SESSION = {
  selectedWall:          null,
  selectedProblem:       null,
  importedWall:          null,
  generatedBetas:        [],
  activeBetaId:          'A',
  activePositionIndex:   0,
  activeMoveFrameIndex:  null,
  controlMode:           'auto',
  activeHold:            null,
};

// ── Store ─────────────────────────────────────────────────────────────────────

const useClimbStore = create(
  persist(
    (set, get) => ({
      ...INITIAL_SESSION,
      climberStats: { ...DEFAULT_CLIMBER_STATS },

      // ── Wall / problem ───────────────────────────────────────────────────

      setSelectedWall:    (wall)    => set({ selectedWall: wall }),
      setSelectedProblem: (problem) => set({ selectedProblem: problem }),
      setImportedWall:    (url)     => set({ importedWall: url }),

      setClimberStats: (patch) =>
        set(s => ({ climberStats: { ...s.climberStats, ...patch } })),

      // ── Beta generation ──────────────────────────────────────────────────

      setBetas: (betas) => set({
        generatedBetas:       betas,
        activeBetaId:         betas[0]?.id ?? 'A',
        activePositionIndex:  0,
        activeMoveFrameIndex: null,
      }),

      setActiveBeta: (id) => set({
        activeBetaId:         id,
        activePositionIndex:  0,
        activeMoveFrameIndex: null,
      }),

      setActivePosition: (i) => set({
        activePositionIndex:  i,
        activeMoveFrameIndex: null,
      }),

      // Pass null to return to viewing the settled position
      setActiveMoveFrame: (i) => set({ activeMoveFrameIndex: i }),

      // ── Control / hold ───────────────────────────────────────────────────

      setControlMode: (mode) => set({ controlMode: mode }),
      setActiveHold:  (hold) => set({ activeHold: hold }),

      // ── Analysis ────────────────────────────────────────────────────────
      //
      // Runs on whatever is currently active — either the settled position
      // (activeMoveFrameIndex === null) or the specific move frame — and
      // writes the result back into the generatedBetas tree.

      analyzeActiveFrame: async () => {
        const state  = get();
        const frame  = getActiveFrame(state);
        if (!frame) return;

        const result = runFullAnalysis(
          frame,
          state.climberStats,
          state.selectedProblem?.holds ?? [],
          state.selectedWall?.angleDeg ?? 90,
        );

        const { activeBetaId, activePositionIndex, activeMoveFrameIndex } = state;

        set(s => ({
          generatedBetas: s.generatedBetas.map(beta => {
            if (beta.id !== activeBetaId) return beta;
            return {
              ...beta,
              positions: beta.positions.map((pos, pIdx) => {
                if (pIdx !== activePositionIndex) return pos;
                if (activeMoveFrameIndex !== null) {
                  // Write to the move frame
                  return {
                    ...pos,
                    moveFrames: pos.moveFrames.map((mf, mfIdx) =>
                      mfIdx === activeMoveFrameIndex ? { ...mf, analysisResult: result } : mf
                    ),
                  };
                }
                // Write to the settled position
                return { ...pos, analysisResult: result };
              }),
            };
          }),
        }));
      },

      // ── Reset ────────────────────────────────────────────────────────────

      resetClimb: () => set({ ...INITIAL_SESSION }),
    }),
    {
      name: 'cruxman-climber-stats',
      partialize: (state) => ({ climberStats: state.climberStats }),
    },
  ),
);

export default useClimbStore;
