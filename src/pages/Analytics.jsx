import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MotionCard, MotionButton, Stagger, StaggerItem } from '../components/motion/Motion';
import useClimbStore, { getActiveBeta } from '../store/useClimbStore';
import { runFullAnalysis } from '../utils/forceAnalysis';
import { walls } from '../data/walls';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONO = "'DM Mono', monospace";
const SPRING = { type: 'spring', stiffness: 300, damping: 26 };

const EXERCISE_MAP = {
  'Finger Flexors':    { name: 'Hangboard Repeaters',    description: 'Half-crimp on 20mm edge, 7s on / 3s off × 6 reps. Focus on controlled engagement, not maximum load.', sets: 3, reps: 6, tags: ['fingers', 'endurance'] },
  'Biceps/Brachialis': { name: 'Lock-off Holds',          description: 'Lock off at 90° and 120° for 5 s each with a slow 3 s descent. Build mid-range pulling strength.', sets: 3, reps: 5, tags: ['pull', 'strength'] },
  'Lats':              { name: 'Weighted Pull-ups',        description: 'Full ROM pull-ups with 3 s eccentric. Add weight only once bodyweight reps are controlled.', sets: 4, reps: 6, tags: ['lats', 'strength'] },
  'Deltoid':           { name: 'Shoulder Press',           description: 'Overhead press to build shoulder stability and pressing strength for high reach positions.', sets: 3, reps: 10, tags: ['shoulder', 'stability'] },
  'Core':              { name: 'Front Lever Progressions', description: 'Tuck front lever to straddle to full extension. Prioritize a hollow body position throughout.', sets: 3, reps: 5, tags: ['core', 'anti-extension'] },
  'Quads':             { name: 'Single-leg Squats',        description: 'Pistol squat progressions build the leg drive needed on steep walls and dynamic moves.', sets: 3, reps: 8, tags: ['legs', 'power'] },
  'Glutes/Hamstrings': { name: 'Hip Hinge / RDL',         description: 'Romanian deadlifts to strengthen the posterior chain for hip turns and high foot placements.', sets: 3, reps: 10, tags: ['hips', 'strength'] },
};

const FALLBACK_EXERCISES = [
  { name: 'Route Reading', description: 'Spend 2–3 minutes studying the problem from the ground. Visualize each move sequence before touching the wall.', tags: ['technique', 'mental'] },
  { name: 'Movement Drills', description: 'Climb easy routes focusing only on footwork precision — place your foot and do not move it until the next move.', tags: ['footwork', 'efficiency'] },
  { name: 'Antagonist Training', description: 'Wrist extensions, reverse wrist curls, and shoulder external rotation to balance pulling muscles.', tags: ['injury prevention', 'antagonist'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function barColor(pct) {
  if (pct > 100) return '#E74C3C';
  if (pct > 80) return '#E67E22';
  return 'var(--accent)';
}

function difficultyLabel(d) {
  if (d > 0.9) return 'V.Hard';
  if (d > 0.7) return 'Hard';
  if (d > 0.5) return 'Med';
  if (d > 0.3) return 'Low';
  return 'Min';
}

function difficultyColor(d) {
  if (d > 0.9) return '#E74C3C';
  if (d > 0.7) return '#E67E22';
  if (d > 0.5) return '#F1C40F';
  return 'var(--accent)';
}

function buildFrameRows(beta) {
  if (!beta) return [];
  const rows = [];

  beta.positions.forEach((pos, posIdx) => {
    const isDynamic = pos.moveFrames.some(
      mf => mf.label === 'Release' || mf.label === 'Peak'
    );
    const moveGroup =
      posIdx === 0 ? 'Start' : `Move ${posIdx} — ${isDynamic ? 'Dynamic' : 'Static'}`;

    if (posIdx === 0) {
      rows.push({
        key: `pos-0`,
        posIndex: posIdx,
        mfIndex: null,
        label: 'Start',
        frame: pos,
        moveGroup,
        isDynamic: false,
      });
    } else {
      pos.moveFrames.forEach((mf, mfIdx) => {
        rows.push({
          key: mf.id ?? `pos-${posIdx}-mf-${mfIdx}`,
          posIndex: posIdx,
          mfIndex: mfIdx,
          label: mf.label,
          frame: mf,
          moveGroup,
          isDynamic,
        });
      });
      rows.push({
        key: `pos-${posIdx}`,
        posIndex: posIdx,
        mfIndex: null,
        label: pos.label,
        frame: pos,
        moveGroup,
        isDynamic,
      });
    }
  });

  return rows;
}

function synthesizeClimb(frameRows, analyzed) {
  const allResults = frameRows.map(r => analyzed[r.key]).filter(Boolean);
  if (!allResults.length) return null;

  // Hardest frame
  let hardestIdx = 0;
  allResults.forEach((r, i) => {
    if (r.overallDifficulty > allResults[hardestIdx].overallDifficulty) hardestIdx = i;
  });
  const hardestRow = frameRows[hardestIdx];

  // Required technique from dynamic moves
  const dynamicMoveNums = [];
  let lastDynGroup = null;
  frameRows.forEach(r => {
    if (r.isDynamic && r.moveGroup !== lastDynGroup) {
      const m = r.moveGroup.match(/Move (\d+)/);
      if (m) dynamicMoveNums.push(parseInt(m[1], 10));
      lastDynGroup = r.moveGroup;
    }
  });

  // Limiting muscles (frequency)
  const muscleCount = {};
  allResults.forEach(r => {
    (r.limitingFactors ?? []).forEach(m => {
      muscleCount[m] = (muscleCount[m] ?? 0) + 1;
    });
  });
  const limitingMuscles = Object.entries(muscleCount)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);

  // Top muscle across all frames (even if not limiting)
  const topMuscleCounts = {};
  allResults.forEach(r => {
    const top = [...(r.muscleDemands ?? [])].sort((a, b) => b.demandPercent - a.demandPercent)[0];
    if (top) topMuscleCounts[top.muscle] = (topMuscleCounts[top.muscle] ?? 0) + 1;
  });
  const dominantMuscle = Object.entries(topMuscleCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Min grip strength: max peak hand force across all frames / μ
  const maxHandForce = Math.max(0, ...allResults.flatMap(r =>
    r.contactForces
      .filter((_, i) => {
        const frameRow = frameRows[allResults.indexOf(r)];
        return frameRow?.frame?.contacts?.[i]?.limb?.startsWith('hand') ?? false;
      })
      .map(cf => cf.magnitude)
  ));

  const peakDemand = Math.max(0, ...allResults.map(r => r.overallDifficulty));

  return {
    hardestRow,
    hardestResult: allResults[hardestIdx],
    dynamicMoveNums,
    limitingMuscles,
    dominantMuscle,
    maxHandForce,
    peakDemand,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function MiniBar({ pct }) {
  const fill = Math.min(pct, 150) / 150 * 100;
  return (
    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
      <motion.div
        key={pct}
        initial={{ width: 0 }}
        animate={{ width: `${fill}%` }}
        transition={SPRING}
        style={{ height: '100%', borderRadius: 2, background: barColor(pct) }}
      />
    </div>
  );
}

function FrameDetail({ result, contacts }) {
  if (!result) return null;

  const LIMB_LABEL = { handL: 'L Hand', handR: 'R Hand', footL: 'L Foot', footR: 'R Foot' };

  return (
    <div style={{ padding: '14px 20px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <SectionLabel>Contact Forces</SectionLabel>
          {result.contactForces.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No active contacts</div>
          )}
          {result.contactForces.map((cf, i) => {
            const limb = contacts?.[i]?.limb ?? '';
            const fuPct = Math.round(cf.frictionUtilization * 100);
            return (
              <div key={cf.holdId ?? i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {LIMB_LABEL[limb] ?? `Contact ${i + 1}`}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-primary)' }}>
                    {Math.round(cf.magnitude)} N
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MiniBar pct={fuPct} />
                  <span style={{ fontFamily: MONO, fontSize: 10, color: barColor(fuPct), flexShrink: 0 }}>
                    {fuPct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <SectionLabel>Muscle Demands</SectionLabel>
          {[...result.muscleDemands]
            .sort((a, b) => b.demandPercent - a.demandPercent)
            .slice(0, 5)
            .map(m => (
              <div key={m.muscle} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: m.isLimiting ? '#E74C3C' : 'var(--text-secondary)' }}>
                    {m.muscle}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: m.isLimiting ? '#E74C3C' : 'var(--text-primary)' }}>
                    {Math.round(m.demandPercent)}%
                  </span>
                </div>
                <MiniBar pct={m.demandPercent} />
              </div>
            ))}
        </div>
      </div>
      {result.summary && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.5, margin: '12px 0 0' }}>
          {result.summary}
        </p>
      )}
    </div>
  );
}

function ExerciseCard({ name, description, sets, reps, tags }) {
  return (
    <MotionCard style={{
      border: '1px solid var(--border)', borderRadius: 8,
      padding: '12px 14px', marginBottom: 10,
      background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span>
        {sets && reps && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)' }}>
            {sets}×{reps}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
        {description}
      </p>
      {tags && tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <span key={tag} style={{
              fontFamily: MONO, fontSize: 9, color: 'var(--accent)',
              border: '1px solid var(--accent-muted)', borderRadius: 4,
              padding: '2px 6px', background: 'var(--accent-muted)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </MotionCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Analytics() {
  const selectedProblem = useClimbStore(s => s.selectedProblem);
  const climberStats    = useClimbStore(s => s.climberStats);
  const beta            = useClimbStore(getActiveBeta);
  const selectedWall    = useClimbStore(s => s.selectedWall);

  const [analyzed, setAnalyzed]       = useState({});
  const [activeRowKey, setActiveRowKey] = useState(null);
  const [problemText, setProblemText]  = useState('');

  const wallName = selectedWall?.name
    ?? walls.find(w => w.id === selectedProblem?.wallId)?.name
    ?? selectedProblem?.wallId
    ?? '—';

  // Flatten the active beta into a displayable row sequence
  const frameRows = useMemo(() => buildFrameRows(beta), [beta]);

  // Run analysis for all frames that lack a stored result
  useEffect(() => {
    if (!climberStats || !selectedProblem || !frameRows.length) return;
    const batch = {};
    frameRows.forEach(row => {
      const frame = row.frame;
      if (frame.analysisResult) {
        batch[row.key] = frame.analysisResult;
      } else if (frame.pose) {
        const result = runFullAnalysis(frame, climberStats, selectedProblem.holds ?? []);
        if (result) batch[row.key] = result;
      }
    });
    setAnalyzed(batch);
  }, [frameRows, climberStats, selectedProblem]);

  const activeResult = activeRowKey ? (analyzed[activeRowKey] ?? null) : null;
  const activeRow    = frameRows.find(r => r.key === activeRowKey);

  const synthesis = useMemo(
    () => synthesizeClimb(frameRows, analyzed),
    [frameRows, analyzed]
  );

  // Auto exercise recommendations
  const exercises = useMemo(() => {
    if (!synthesis) return [];
    if (synthesis.limitingMuscles.length > 0) {
      return synthesis.limitingMuscles
        .slice(0, 3)
        .map(m => EXERCISE_MAP[m])
        .filter(Boolean);
    }
    if (synthesis.dominantMuscle && EXERCISE_MAP[synthesis.dominantMuscle]) {
      return [EXERCISE_MAP[synthesis.dominantMuscle], ...FALLBACK_EXERCISES.slice(0, 1)];
    }
    return FALLBACK_EXERCISES;
  }, [synthesis]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  const isEmpty = !selectedProblem || !beta || beta.positions.length === 0;

  if (isEmpty) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12,
      }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>📊</span>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
          No climb data yet. Design a boulder problem and generate beta first.
        </p>
        <Link to="/designer" style={{
          fontFamily: MONO, fontSize: 12, color: 'var(--accent)',
          textDecoration: 'none', border: '1px solid var(--accent)',
          borderRadius: 6, padding: '6px 14px',
        }}>
          Go to Designer →
        </Link>
      </div>
    );
  }

  // ── Build table rows with dividers ──────────────────────────────────────────
  const tableContent = [];
  let lastGroup = null;
  frameRows.forEach((row, rowIdx) => {
    if (row.moveGroup !== lastGroup) {
      tableContent.push(
        <tr key={`div-${row.moveGroup}`}>
          <td colSpan={5} style={{
            padding: '5px 16px 4px',
            background: 'var(--surface-2)',
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            borderTop: lastGroup ? '1px solid var(--border)' : 'none',
            borderBottom: '1px solid var(--border)',
          }}>
            {row.moveGroup}
          </td>
        </tr>
      );
      lastGroup = row.moveGroup;
    }

    const result = analyzed[row.key];
    const isActive = activeRowKey === row.key;
    const bgColor = isActive ? 'var(--accent-muted)' : rowIdx % 2 === 0 ? '#ffffff' : '#FAFAF8';

    const limitingMuscle = result
      ? (result.limitingFactors[0] ?? [...result.muscleDemands].sort((a, b) => b.demandPercent - a.demandPercent)[0]?.muscle ?? '—')
      : '—';

    const peakForce = result
      ? Math.round(Math.max(0, ...result.contactForces.map(cf => cf.magnitude)))
      : '—';

    const difficulty = result ? result.overallDifficulty : null;

    tableContent.push(
      <tr
        key={row.key}
        onClick={() => setActiveRowKey(isActive ? null : row.key)}
        style={{
          cursor: 'pointer',
          background: bgColor,
          transition: 'background 0.1s',
        }}
      >
        <td style={{ padding: '7px 10px 7px 16px', fontFamily: MONO, fontSize: 11, color: 'var(--text-muted)' }}>
          {rowIdx + 1}
        </td>
        <td style={{ padding: '7px 10px', fontSize: 12, color: 'var(--text-primary)' }}>
          {row.label}
        </td>
        <td style={{ padding: '7px 10px', fontSize: 11, color: limitingMuscle === '—' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
          {limitingMuscle}
        </td>
        <td style={{ padding: '7px 10px', fontFamily: MONO, fontSize: 11, color: 'var(--text-primary)' }}>
          {peakForce === 0 ? '—' : peakForce}
        </td>
        <td style={{ padding: '7px 16px 7px 10px' }}>
          {difficulty !== null ? (
            <span style={{
              fontFamily: MONO, fontSize: 10, color: difficultyColor(difficulty),
              fontWeight: 500,
            }}>
              {difficultyLabel(difficulty)}
            </span>
          ) : '—'}
        </td>
      </tr>
    );

    if (isActive) {
      tableContent.push(
        <tr key={`detail-${row.key}`}>
          <td colSpan={5} style={{ padding: 0 }}>
            <AnimatePresence>
              <motion.div
                key={row.key}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING}
                style={{ overflow: 'hidden' }}
              >
                <FrameDetail result={activeResult} contacts={activeRow?.frame?.contacts} />
              </motion.div>
            </AnimatePresence>
          </td>
        </tr>
      );
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── LEFT PANEL (55%) — Climb Analysis ─────────────────────────────── */}
      <div style={{
        width: '55%', flexShrink: 0, overflowY: 'auto',
        borderRight: '1px solid var(--border)',
      }}>
        <Stagger style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <StaggerItem style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)', fontWeight: 600 }}>
                {selectedProblem.name}
              </h2>
              <span style={{ fontFamily: MONO, fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>
                {selectedProblem.grade}
              </span>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {wallName}
            </span>
          </StaggerItem>

          {/* Frame-by-frame table */}
          <StaggerItem>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                tableLayout: 'fixed',
              }}>
                <colgroup>
                  <col style={{ width: 44 }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    {['#', 'Label', 'Limiting Muscle', 'Peak Force', 'Difficulty'].map(h => (
                      <th key={h} style={{
                        padding: '9px 10px 8px',
                        fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--text-muted)',
                        textAlign: 'left', fontWeight: 600,
                        borderBottom: '1px solid var(--border)',
                        ...(h === '#' ? { paddingLeft: 16 } : {}),
                        ...(h === 'Difficulty' ? { paddingRight: 16 } : {}),
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableContent}
                </tbody>
              </table>
            </div>
          </StaggerItem>

          {/* What's required box */}
          {synthesis && (
            <StaggerItem style={{ padding: '16px 20px 20px' }}>
              <SectionLabel>What's required to complete this climb</SectionLabel>
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Hardest moment */}
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Peak demand
                    </span>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {synthesis.hardestRow
                        ? `${synthesis.hardestRow.label} in ${synthesis.hardestRow.moveGroup} — ${Math.round(synthesis.peakDemand * 100)}% of max capacity`
                        : 'Unable to determine'}
                    </p>
                  </div>

                  {/* Required technique */}
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Required technique
                    </span>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {synthesis.dynamicMoveNums.length > 0
                        ? `Dynamic commitment on move${synthesis.dynamicMoveNums.length > 1 ? 's' : ''} ${synthesis.dynamicMoveNums.join(', ')}. Explosive hip drive and precise target lock-on are essential.`
                        : 'Static, controlled movement throughout. Focus on hip-to-wall proximity and quiet feet.'}
                    </p>
                  </div>

                  {/* Limiting muscles */}
                  {synthesis.limitingMuscles.length > 0 && (
                    <div>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Limiting muscles
                      </span>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: '#E74C3C', lineHeight: 1.5 }}>
                        {synthesis.limitingMuscles.join(', ')} exceed max capacity at peak frames.
                      </p>
                    </div>
                  )}

                  {/* Min grip strength */}
                  {synthesis.maxHandForce > 0 && (
                    <div>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Min grip strength
                      </span>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Peak contact force ~{Math.round(synthesis.maxHandForce)} N. Requires sustained grip output near max for key moves.
                      </p>
                    </div>
                  )}

                  {/* Body position */}
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Key body-position constraint
                    </span>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Center of mass must stay within the base of support on every frame. Dropping hips away from the wall increases friction demands exponentially.
                    </p>
                  </div>

                </div>
              </div>
            </StaggerItem>
          )}

        </Stagger>
      </div>

      {/* ── RIGHT PANEL (45%) — Training Recommendations ──────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Stagger style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Problem input + button */}
          <StaggerItem style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel>Training Recommendations</SectionLabel>
            <textarea
              value={problemText}
              onChange={e => setProblemText(e.target.value)}
              placeholder="Describe a specific climbing problem you're struggling with…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                resize: 'vertical', minHeight: 72,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6, padding: '9px 11px',
                fontSize: 13, color: 'var(--text-primary)',
                fontFamily: 'inherit', lineHeight: 1.5,
                outline: 'none',
              }}
            />
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <MotionButton
                style={{
                  padding: '7px 18px', borderRadius: 7,
                  fontSize: 13, fontWeight: 500,
                }}
                onClick={() => {/* wired in Prompt 14 */}}
              >
                Get Recommendations
              </MotionButton>
            </div>
          </StaggerItem>

          {/* Auto recommendations */}
          <StaggerItem style={{ padding: '16px 20px 20px' }}>
            {exercises.length > 0 && (
              <>
                <SectionLabel>
                  {synthesis?.limitingMuscles.length > 0
                    ? 'Targeted exercises for your limiting factors'
                    : 'General training recommendations'}
                </SectionLabel>
                {exercises.map((ex, i) => (
                  <ExerciseCard key={i} {...ex} />
                ))}
              </>
            )}
            {exercises.length === 0 && frameRows.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Analyze frames to generate targeted exercise recommendations.
              </p>
            )}
          </StaggerItem>

        </Stagger>
      </div>

    </div>
  );
}
