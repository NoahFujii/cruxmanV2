import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { runFullAnalysis } from '../utils/forceAnalysis';

/*
 * ─── Frame shape ────────────────────────────────────────────────────────────
 * A Frame is one FROZEN body position in a climb sequence — not an animation
 * keyframe, but a fully-resolved snapshot a climber can inspect and annotate.
 *
 * {
 *   id:             string      — unique id (e.g. crypto.randomUUID())
 *   moveIndex:      number      — which move this frame belongs to
 *   label:          string      — one of:
 *                                 "Setup" | "Load" | "Release" | "Peak" |
 *                                 "Catch" | "Stabilize" | "Reach" | "Latched"
 *   description:    string      — plain-English one-liner
 *   pose:           object      — full body pose (joint angles etc.); see Climber prompt
 *   contacts:       Array<{ limb: string, holdId: string }>
 *                               — which limbs are on which holds THIS frame
 *   analysisResult: object|null — force/muscle output written by analyzeFrame();
 *                                 null until the frame has been analysed
 * }
 */

const DEFAULT_CLIMBER_STATS = {
  heightCm: 175,
  weightKg: 70,
  apeIndexCm: 0,
  maxGripForceN: 300,
  maxPullForceN: 500,
  shoulderFlexionDeg: 180,
  hipFlexibilityDeg: 90,
};

// Everything except climberStats is session-only (not persisted).
const INITIAL_SESSION = {
  selectedWall: null,       // { id, name, angleDeg, type, modelFile }
  selectedProblem: null,    // { id, name, grade, holds: [] }
  importedWall: null,       // reserved for gym-scan feature (a glb url)
  frameSequence: [],        // Frame[]
  activeFrameIndex: 0,
  betaVariations: { A: [], B: [] },
  activeBeta: 'A',
  controlMode: 'auto',      // 'auto' | 'manual'
  activeHold: null,
};

const useClimbStore = create(
  persist(
    (set, get) => ({
      ...INITIAL_SESSION,
      climberStats: { ...DEFAULT_CLIMBER_STATS },

      // ─── Wall / problem / import ───────────────────────────────────────

      setSelectedWall: (wall) => set({ selectedWall: wall }),

      setSelectedProblem: (problem) => set({ selectedProblem: problem }),

      setImportedWall: (url) => set({ importedWall: url }),

      setClimberStats: (patch) =>
        set((s) => ({ climberStats: { ...s.climberStats, ...patch } })),

      // ─── Frame sequence ────────────────────────────────────────────────

      setFrameSequence: (frames) =>
        set({ frameSequence: frames, activeFrameIndex: 0 }),

      appendFrame: (frame) =>
        set((s) => ({ frameSequence: [...s.frameSequence, frame] })),

      updateFrame: (index, patch) =>
        set((s) => {
          if (index < 0 || index >= s.frameSequence.length) return {};
          const frames = [...s.frameSequence];
          frames[index] = { ...frames[index], ...patch };
          return { frameSequence: frames };
        }),

      removeFrame: (index) =>
        set((s) => {
          const frames = s.frameSequence.filter((_, i) => i !== index);
          return {
            frameSequence: frames,
            activeFrameIndex: Math.min(
              s.activeFrameIndex,
              Math.max(0, frames.length - 1)
            ),
          };
        }),

      reorderFrames: (fromIndex, toIndex) =>
        set((s) => {
          const frames = [...s.frameSequence];
          const [moved] = frames.splice(fromIndex, 1);
          frames.splice(toIndex, 0, moved);
          return { frameSequence: frames };
        }),

      clearFrames: () => set({ frameSequence: [], activeFrameIndex: 0 }),

      // ─── Frame navigation ──────────────────────────────────────────────

      setActiveFrameIndex: (i) =>
        set((s) => {
          if (s.frameSequence.length === 0) return { activeFrameIndex: 0 };
          return {
            activeFrameIndex: Math.max(
              0,
              Math.min(i, s.frameSequence.length - 1)
            ),
          };
        }),

      nextFrame: () =>
        set((s) => {
          if (s.frameSequence.length === 0) return {};
          return {
            activeFrameIndex: Math.min(
              s.activeFrameIndex + 1,
              s.frameSequence.length - 1
            ),
          };
        }),

      prevFrame: () =>
        set((s) => ({
          activeFrameIndex: Math.max(s.activeFrameIndex - 1, 0),
        })),

      // ─── Beta variations ───────────────────────────────────────────────

      setBetaVariations: ({ A, B }) =>
        set({ betaVariations: { A, B } }),

      // setActiveBeta also mirrors that variation into frameSequence so the
      // rest of the app always reads from frameSequence without knowing which
      // beta is active.
      setActiveBeta: (beta) =>
        set((s) => ({
          activeBeta: beta,
          frameSequence: [...(s.betaVariations[beta] ?? [])],
          activeFrameIndex: 0,
        })),

      // ─── Control / hold ────────────────────────────────────────────────

      setControlMode: (mode) => set({ controlMode: mode }),

      setActiveHold: (hold) => set({ activeHold: hold }),

      // ─── Analysis ─────────────────────────────────────────────────────

      analyzeFrame: async (index) => {
        const { frameSequence, climberStats, selectedProblem, updateFrame } = get();
        const frame = frameSequence[index];
        if (!frame) return;
        const result = runFullAnalysis(frame, climberStats, selectedProblem?.holds ?? []);
        updateFrame(index, { analysisResult: result });
      },

      analyzeActiveFrame: () => {
        const { activeFrameIndex, analyzeFrame } = get();
        return analyzeFrame(activeFrameIndex);
      },

      // ─── Reset ────────────────────────────────────────────────────────
      // Wipes all session state back to initial values; climberStats is
      // intentionally kept (user filled them in, don't throw them away).

      resetClimb: () => set({ ...INITIAL_SESSION }),
    }),
    {
      name: 'cruxman-climber-stats',
      // Only climberStats survives a page refresh; everything else is rebuilt
      // from user interaction each session.
      partialize: (state) => ({ climberStats: state.climberStats }),
    }
  )
);

export default useClimbStore;
