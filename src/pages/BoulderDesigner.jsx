import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionButton, Stagger, StaggerItem } from '../components/motion/Motion';
import Scene3D from '../components/Scene3D';
import { walls } from '../data/walls';
import { problems } from '../data/problems';
import useClimbStore from '../store/useClimbStore';
import { DEFAULT_POSE } from '../components/Climber3D';
import AnalysisSidebar from '../components/AnalysisSidebar';
import { generateBeta } from '../utils/betaGenerator';

// ── Constants ──────────────────────────────────────────────────────────────

const GRADE_FILTERS = ['All', 'V0–V2', 'V3–V5', 'V6–V8', 'V9+'];
const SPRING = { type: 'spring', stiffness: 360, damping: 32 };

const WALL_TYPE_ABBR = {
  slab: 'slab', vertical: 'vert', 'slight-overhang': 'ovhg',
  'steep-overhang': 'steep', cave: 'cave', kilter: 'board',
};

const FRAME_ABBR = {
  Setup: 'Su', Load: 'Lo', Release: 'Re', Peak: 'Pk',
  Catch: 'Ca', Stabilize: 'St', Reach: 'Rc', Latched: 'La',
};

function gradeNum(g) { return parseInt(g.replace('V', ''), 10) || 0; }
function matchGrade(grade, filter) {
  const n = gradeNum(grade);
  if (filter === 'All')   return true;
  if (filter === 'V0–V2') return n <= 2;
  if (filter === 'V3–V5') return n >= 3 && n <= 5;
  if (filter === 'V6–V8') return n >= 6 && n <= 8;
  if (filter === 'V9+')   return n >= 9;
  return true;
}

// ── Reusable primitives ────────────────────────────────────────────────────

function Section({ label, collapsible = false, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 16px', border: 'none',
          background: 'none', cursor: collapsible ? 'pointer' : 'default',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>{label}</span>
        {collapsible && (
          <motion.span
            animate={{ rotate: open ? 0 : -90 }}
            transition={SPRING}
            style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-block', lineHeight: 1 }}
          >▾</motion.span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="c"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatInput({ label, value, unit, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'none', border: 'none',
            borderBottom: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
            padding: '3px 0',
            fontFamily: "'DM Mono', monospace", fontSize: 13,
            color: 'var(--text-primary)', outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
        {unit && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── Left-panel sections ────────────────────────────────────────────────────

function WallSelector({ activeId, onSelect }) {
  return (
    <Section label="Wall" collapsible>
      <div style={{ padding: '2px 8px 10px' }}>
        {walls.map(w => {
          const active = w.id === activeId;
          return (
            <MotionButton
              key={w.id}
              ghost
              onClick={() => onSelect(w)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '7px 8px', borderRadius: 5, marginBottom: 1,
                background: active ? 'var(--accent-muted)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-primary)',
                fontSize: 12,
              }}
            >
              <span>{w.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  fontSize: 9, fontFamily: "'DM Mono', monospace",
                  padding: '2px 5px', borderRadius: 3,
                  background: active ? 'var(--accent)' : 'var(--surface-2)',
                  color: active ? 'white' : 'var(--text-muted)',
                }}>
                  {WALL_TYPE_ABBR[w.type] ?? w.type}
                </span>
                <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: 'var(--text-muted)' }}>
                  {w.angleDeg}°
                </span>
              </div>
            </MotionButton>
          );
        })}
      </div>
    </Section>
  );
}

function ProblemSelector({ wallProblems, filtered, activeId, gradeFilter, setGradeFilter, onSelect }) {
  return (
    <Section label="Problem">
      <div style={{ padding: '2px 16px 12px' }}>
        {/* Grade filter chips */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
          {GRADE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setGradeFilter(f)}
              style={{
                padding: '3px 6px', borderRadius: 3, fontSize: 9,
                fontFamily: "'DM Mono', monospace",
                border: `1px solid ${f === gradeFilter ? 'var(--accent)' : 'var(--border)'}`,
                background: f === gradeFilter ? 'var(--accent-muted)' : 'transparent',
                color: f === gradeFilter ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Problem list */}
        {filtered.length === 0
          ? <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0' }}>No problems in range.</p>
          : filtered.map(p => {
              const active = p.id === activeId;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '6px 8px', borderRadius: 5, marginBottom: 1,
                    background: active ? 'var(--accent-muted)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 12, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {p.grade}
                  </span>
                </button>
              );
            })}

        {/* Create new */}
        <MotionButton
          ghost
          onClick={() => console.log('TODO: create problem')}
          style={{
            display: 'block', width: '100%', marginTop: 8, padding: '7px',
            border: '1px dashed var(--border)', borderRadius: 5,
            fontSize: 11, fontFamily: "'DM Mono', monospace",
            color: 'var(--text-muted)', textAlign: 'center', background: 'transparent',
          }}
        >
          + Create New Problem
        </MotionButton>
      </div>
    </Section>
  );
}

function ClimberStatsSection({ stats, onSave }) {
  const [local, setLocal] = useState(stats);
  useEffect(() => setLocal(stats), [stats]);
  const update = (k, v) => setLocal(s => ({ ...s, [k]: v }));

  return (
    <Section label="Climber" collapsible defaultOpen={false}>
      <div style={{ padding: '2px 16px 12px' }}>
        <StatInput label="Height" value={local.heightCm}       unit="cm" onChange={v => update('heightCm', v)} />
        <StatInput label="Weight" value={local.weightKg}       unit="kg" onChange={v => update('weightKg', v)} />
        <StatInput label="Ape Index" value={local.apeIndexCm}  unit="cm" onChange={v => update('apeIndexCm', v)} />
        <StatInput label="Max Grip" value={local.maxGripForceN} unit="N" onChange={v => update('maxGripForceN', v)} />
        <StatInput label="Max Pull" value={local.maxPullForceN} unit="N" onChange={v => update('maxPullForceN', v)} />
        <MotionButton
          onClick={() => onSave(local)}
          style={{
            width: '100%', padding: '6px', borderRadius: 5, marginTop: 4,
            fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500,
          }}
        >
          Save Stats
        </MotionButton>
      </div>
    </Section>
  );
}

function FrameStepper({ frames, activeIndex, onSet, onPrev, onNext }) {
  if (frames.length === 0) {
    return (
      <div style={{ padding: '6px 0', fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--text-muted)', textAlign: 'center' }}>
        No frames yet
      </div>
    );
  }
  const active = frames[activeIndex];
  return (
    <div style={{ marginBottom: 6 }}>
      {/* Chips row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
        <button onClick={onPrev} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-secondary)', fontSize: 11, flexShrink: 0 }}>◀</button>
        <div style={{ flex: 1, display: 'flex', gap: 2, overflowX: 'auto' }}>
          {frames.map((f, i) => (
            <button
              key={f.id ?? i}
              onClick={() => onSet(i)}
              style={{
                position: 'relative', flexShrink: 0,
                width: 26, height: 22, border: 'none', borderRadius: 4,
                background: 'transparent', cursor: 'pointer', padding: 0,
              }}
            >
              {i === activeIndex && (
                <motion.div
                  layoutId="frameChip"
                  style={{ position: 'absolute', inset: 0, background: 'var(--accent)', borderRadius: 4 }}
                  transition={SPRING}
                />
              )}
              <span style={{
                position: 'relative', zIndex: 1, fontSize: 8,
                fontFamily: "'DM Mono', monospace",
                color: i === activeIndex ? 'white' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%',
              }}>
                {FRAME_ABBR[f.label] ?? f.label?.slice(0, 2) ?? String(i + 1)}
              </span>
            </button>
          ))}
        </div>
        <button onClick={onNext} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-secondary)', fontSize: 11, flexShrink: 0 }}>▶</button>
      </div>
      {/* Readout */}
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)' }}>
        Frame {activeIndex + 1} / {frames.length}{active?.label ? ` — ${active.label}` : ''}
      </div>
    </div>
  );
}

function BetaSection({ controlMode, setControlMode, activeBeta, setActiveBeta, frameSequence, activeFrameIndex, setActiveFrameIndex, nextFrame, prevFrame, onAnalyze, onGenerateBeta }) {
  const pill = (label, active, onClick) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        flex: 1, padding: '5px 0', borderRadius: 4, border: 'none',
        fontSize: 10, fontFamily: "'DM Mono', monospace",
        background: active ? 'var(--accent)' : 'var(--surface-2)',
        color: active ? 'white' : 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >{label}</button>
  );

  const activeFrame = frameSequence[activeFrameIndex];

  return (
    <Section label="Beta">
      <div style={{ padding: '2px 16px 12px' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {pill('Auto Beta', controlMode === 'auto',   () => setControlMode('auto'))}
          {pill('Manual',    controlMode === 'manual', () => setControlMode('manual'))}
        </div>

        {/* Beta variation tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {['A', 'B'].map(b => (
            <button
              key={b}
              onClick={() => setActiveBeta(b)}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 4, cursor: 'pointer',
                border: `1px solid ${b === activeBeta ? 'var(--accent)' : 'var(--border)'}`,
                background: b === activeBeta ? 'var(--accent-muted)' : 'transparent',
                color: b === activeBeta ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 10, fontFamily: "'DM Mono', monospace",
              }}
            >Beta {b}</button>
          ))}
        </div>

        {/* Generate Beta (auto mode only) */}
        {controlMode === 'auto' && (
          <MotionButton
            style={{ width: '100%', padding: '6px', borderRadius: 5, marginBottom: 12, fontSize: 11, fontFamily: "'DM Mono', monospace" }}
            onClick={onGenerateBeta}
          >
            Generate Beta
          </MotionButton>
        )}

        {/* Frame stepper */}
        <FrameStepper
          frames={frameSequence}
          activeIndex={activeFrameIndex}
          onSet={setActiveFrameIndex}
          onPrev={prevFrame}
          onNext={nextFrame}
        />

        {/* Active frame description */}
        {activeFrame?.description && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: '6px 0 10px' }}>
            {activeFrame.description}
          </p>
        )}

        {/* Analyze */}
        <MotionButton
          style={{ width: '100%', padding: '6px', borderRadius: 5, fontSize: 11, fontFamily: "'DM Mono', monospace" }}
          onClick={onAnalyze}
        >
          Analyze This Frame
        </MotionButton>
      </div>
    </Section>
  );
}

// ── Right sidebar ──────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function HoldPanel({ hold }) {
  return (
    <div>
      <InfoRow label="Type"     value={hold.type} />
      <InfoRow label="Friction" value={hold.frictionCoeff} />
      <InfoRow label="X"        value={hold.x.toFixed(2)} />
      <InfoRow label="Y"        value={hold.y.toFixed(2)} />
      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
        {hold.isStart && (
          <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", padding: '2px 6px', borderRadius: 3, background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            START
          </span>
        )}
        {hold.isTop && (
          <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", padding: '2px 6px', borderRadius: 3, background: 'rgba(46,204,113,0.15)', color: '#2ECC71' }}>
            TOP
          </span>
        )}
      </div>
    </div>
  );
}

function FramePanel({ frame }) {
  return (
    <div>
      {frame ? (
        <>
          <InfoRow label="Label"   value={frame.label ?? '—'} />
          <InfoRow label="Move #"  value={frame.moveIndex !== undefined ? frame.moveIndex + 1 : '—'} />
          {frame.description && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: '8px 0 12px' }}>
              {frame.description}
            </p>
          )}
          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Analysis
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {frame.analysisResult
              ? <pre style={{ margin: 0, fontFamily: "'DM Mono', monospace", fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(frame.analysisResult, null, 2)}
                </pre>
              : 'No analysis yet. Run "Analyze This Frame" to see force and muscle data.'}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No active frame.</p>
      )}
    </div>
  );
}

function RightSidebar({ type, hold, frame, onClose }) {
  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {type === 'hold' ? 'Hold Details' : 'Frame Analysis'}
        </span>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1, padding: 2 }}
          aria-label="Close"
        >✕</button>
      </div>
      <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        {type === 'hold' ? <HoldPanel hold={hold} /> : <FramePanel frame={frame} />}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function BoulderDesigner() {
  const {
    selectedWall, setSelectedWall,
    selectedProblem, setSelectedProblem,
    climberStats, setClimberStats,
    controlMode, setControlMode,
    activeBeta, setActiveBeta,
    setBetaVariations,
    frameSequence,
    activeFrameIndex, setActiveFrameIndex,
    nextFrame, prevFrame,
    analyzeActiveFrame,
  } = useClimbStore();

  // Resolve wall object (default to vertical)
  const wall = walls.find(w => w.id === (selectedWall?.id ?? 'vertical')) ?? walls[0];
  const wallProblems = problems.filter(p => p.wallId === wall.id);

  // Resolve problem (default to first for selected wall)
  const problem = problems.find(p => p.id === selectedProblem?.id)
    ?? wallProblems[0]
    ?? null;

  const [gradeFilter, setGradeFilter] = useState('All');
  const filteredProblems = wallProblems.filter(p => matchGrade(p.grade, gradeFilter));

  // Hold highlighting
  const [highlightedHoldId, setHighlightedHoldId] = useState(null);

  // Right sidebar
  const [sidebarType, setSidebarType] = useState(null); // 'hold' | 'frame' | null
  const [sidebarHold, setSidebarHold] = useState(null);
  const sidebarOpen = sidebarType !== null;
  const activeFrame = frameSequence[activeFrameIndex] ?? null;

  const handleWallSelect = (w) => {
    setSelectedWall(w);
    setSelectedProblem(null);
    setHighlightedHoldId(null);
    setSidebarType(null);
    setGradeFilter('All');
  };

  const handleProblemSelect = (p) => {
    setSelectedProblem(p);
    setHighlightedHoldId(null);
    setSidebarType(null);
  };

  const handleHoldClick = (hold) => {
    const next = hold.id === highlightedHoldId ? null : hold.id;
    setHighlightedHoldId(next);
    if (next) { setSidebarHold(hold); setSidebarType('hold'); }
    else { setSidebarType(null); }
  };

  const handleAnalyze = async () => {
    setSidebarType('frame');
    await analyzeActiveFrame();
  };

  const handleGenerateBeta = () => {
    if (!problem) return;
    const result = generateBeta(problem.holds, climberStats, wall.angleDeg);
    setBetaVariations({ A: result.A, B: result.B });
    setActiveBeta('A');
  };

  const closeSidebar = () => { setSidebarType(null); setHighlightedHoldId(null); };

  // Climber pose driven by active frame
  const activePose = activeFrame?.pose ?? DEFAULT_POSE;
  const showClimber = frameSequence.length > 0;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div style={{
        width: 260, flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        overflowY: 'auto', overflowX: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <Stagger style={{ display: 'flex', flexDirection: 'column' }}>
          <StaggerItem>
            <WallSelector activeId={wall.id} onSelect={handleWallSelect} />
          </StaggerItem>
          <StaggerItem>
            <ProblemSelector
              wallProblems={wallProblems}
              filtered={filteredProblems}
              activeId={problem?.id}
              gradeFilter={gradeFilter}
              setGradeFilter={setGradeFilter}
              onSelect={handleProblemSelect}
            />
          </StaggerItem>
          <StaggerItem>
            <ClimberStatsSection stats={climberStats} onSave={setClimberStats} />
          </StaggerItem>
          <StaggerItem>
            <BetaSection
              controlMode={controlMode}
              setControlMode={setControlMode}
              activeBeta={activeBeta}
              setActiveBeta={setActiveBeta}
              frameSequence={frameSequence}
              activeFrameIndex={activeFrameIndex}
              setActiveFrameIndex={setActiveFrameIndex}
              nextFrame={nextFrame}
              prevFrame={prevFrame}
              onAnalyze={handleAnalyze}
              onGenerateBeta={handleGenerateBeta}
            />
          </StaggerItem>
        </Stagger>
      </div>

      {/* ── Center: 3D canvas ───────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <Scene3D
          wall={wall}
          holds={problem?.holds ?? []}
          onHoldClick={handleHoldClick}
          highlightedHoldId={highlightedHoldId}
          climberPose={activePose}
          showClimber={showClimber}
        />
      </div>

      {/* ── Right sidebar (AnimatePresence slide-in) ─────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            style={{ display: 'flex', height: '100%' }}
          >
            {sidebarType === 'frame'
              ? <AnalysisSidebar onClose={closeSidebar} />
              : <RightSidebar
                  type={sidebarType}
                  hold={sidebarHold}
                  frame={activeFrame}
                  onClose={closeSidebar}
                />
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
