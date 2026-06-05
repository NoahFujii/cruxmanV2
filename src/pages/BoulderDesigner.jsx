import { useEffect, useMemo, useState } from 'react';
import { cmToFtIn, kgToLb } from '../utils/units';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionButton, Stagger, StaggerItem } from '../components/motion/Motion';
import Scene3D from '../components/Scene3D';
import { walls } from '../data/walls';
import { problems } from '../data/problems';
import useClimbStore, { getActivePose } from '../store/useClimbStore';
import { DEFAULT_POSE } from '../utils/defaultPose';
import AnalysisSidebar from '../components/AnalysisSidebar';
import { generateBeta } from '../utils/betaGenerator';

// ── Constants ──────────────────────────────────────────────────────────────

const MONO = "'DM Mono', monospace";

const GRADE_FILTERS = ['All', 'V0–V2', 'V3–V5', 'V6–V8', 'V9+'];
const SPRING        = { type: 'spring', stiffness: 360, damping: 32 };

const WALL_TYPE_ABBR = {
  slab: 'slab', vertical: 'vert', 'slight-overhang': 'ovhg',
  'steep-overhang': 'steep', cave: 'cave', kilter: 'board',
};

const LIMB_SHORT = { handL: 'LH', handR: 'RH', footL: 'LF', footR: 'RF' };

function gradeNum(g)  { return parseInt(g.replace('V', ''), 10) || 0; }
function matchGrade(grade, filter) {
  const n = gradeNum(grade);
  if (filter === 'All')   return true;
  if (filter === 'V0–V2') return n <= 2;
  if (filter === 'V3–V5') return n >= 3 && n <= 5;
  if (filter === 'V6–V8') return n >= 6 && n <= 8;
  if (filter === 'V9+')   return n >= 9;
  return true;
}

// ── Shared design tokens ────────────────────────────────────────────────────

const SECTION_LABEL_STYLE = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 11, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-muted)',
};

const CHIP_BASE = {
  padding: '4px 9px', borderRadius: 8, cursor: 'pointer',
  fontFamily: "'DM Mono', monospace", fontSize: 10,
  border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-muted)',
  transition: 'all 0.12s',
};

const CHIP_ACTIVE = {
  ...CHIP_BASE,
  border: '1px solid var(--accent)',
  background: 'var(--accent-muted)',
  color: 'var(--accent)',
};

// ── Reusable primitives ────────────────────────────────────────────────────

function Section({ label, collapsible = false, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '14px 16px 10px', border: 'none',
          background: 'none', cursor: collapsible ? 'pointer' : 'default',
          textAlign: 'left',
        }}
      >
        <span style={SECTION_LABEL_STYLE}>{label}</span>
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

function StatSlider({ label, value, min, max, step = 1, onChange, readout }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-secondary)' }}>{readout}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="range" min={min} max={max} step={step} value={value}
               onChange={e => onChange(Number(e.target.value))}
               style={{ flex: 1, accentColor: 'var(--accent)', height: 2 }} />
        <input type="number" min={min} max={max} step={step} value={value}
               onChange={e => onChange(Number(e.target.value))}
               style={{ width: 52, background: 'none', border: 'none',
                        borderBottom: '1px solid var(--border)', padding: '2px 0',
                        fontFamily: "'DM Mono', monospace", fontSize: 12,
                        color: 'var(--text-primary)', outline: 'none', textAlign: 'right' }} />
      </div>
    </div>
  );
}

// ── Hold-type knowledge ────────────────────────────────────────────────────

function capFirst(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const HOLD_USAGE = {
  jug:      'Large, positive edge — pull in any direction; forgiving and endurance-focused.',
  crimp:    'Small edge gripped with curled fingers; high tendon load, demands precise footwork.',
  pinch:    'Squeezed between thumb and fingers; trains pinch-specific grip strength.',
  pocket:   'One or two fingers in a hole; isolates individual finger strength.',
  sloper:   'Rounded, open-hand press; rewards keeping hips close and weight directly under it.',
  foothold: 'Dedicated foot placement; maximise rubber contact and commit your weight to it.',
};

const LEGEND_SHORT = {
  jug:      'Large positive — pull any direction',
  crimp:    'Small edge — curled fingers, high tendon load',
  pinch:    'Squeeze thumb + fingers',
  pocket:   '1–2 finger hole',
  sloper:   'Rounded dome — open hand, weight under',
  foothold: 'Foot placement only',
  smear:    'Friction only — rubber on wall, no hold',
};

const LEGEND_ORDER = ['jug', 'crimp', 'pinch', 'pocket', 'sloper', 'foothold', 'smear'];

function HoldLegend({ holds, hasSmears }) {
  const types = useMemo(() => {
    const seen = new Set((holds ?? []).map(h => h.type));
    if (hasSmears) seen.add('smear');
    return LEGEND_ORDER.filter(t => seen.has(t));
  }, [holds, hasSmears]);

  if (!types.length) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, zIndex: 10,
      background: 'rgba(255,253,250,0.90)',
      border: '1px solid #E0DED9',
      borderRadius: 8,
      padding: '8px 10px',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      pointerEvents: 'none',
    }}>
      {types.map((type, i) => (
        <div key={type} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: i < types.length - 1 ? 4 : 0,
        }}>
          <span style={{
            fontFamily: MONO, fontSize: 9,
            background: '#F5F4F1', border: '1px solid #E0DED9',
            borderRadius: 3, padding: '1px 5px',
            color: '#6B6B6B', flexShrink: 0,
          }}>
            {capFirst(type)}
          </span>
          <span style={{ fontSize: 10, color: '#9A9791', lineHeight: 1.3 }}>
            {LEGEND_SHORT[type]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Left-panel sections ────────────────────────────────────────────────────

function WallSelector({ activeId, onSelect }) {
  return (
    <Section label="Wall" collapsible>
      <div style={{ padding: '2px 8px 14px' }}>
        {walls.map(w => {
          const active = w.id === activeId;
          return (
            <MotionButton
              key={w.id}
              ghost
              onClick={() => onSelect(w)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '7px 8px', borderRadius: 8, marginBottom: 1,
                background: active ? 'var(--accent-muted)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-primary)',
                border: active ? '1px solid var(--accent)' : '1px solid transparent',
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
      <div style={{ padding: '2px 16px 14px' }}>
        {/* Grade filter chips */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
          {GRADE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setGradeFilter(f)}
              style={f === gradeFilter ? CHIP_ACTIVE : CHIP_BASE}
            >{f}</button>
          ))}
        </div>

        {/* Problem list */}
        {filtered.length === 0
          ? <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0' }}>No problems in range.</p>
          : filtered.map(p => {
              const active = p.id === activeId;
              return (
                <MotionButton
                  key={p.id}
                  ghost
                  onClick={() => onSelect(p)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '6px 8px', borderRadius: 8, marginBottom: 1,
                    background: active ? 'var(--accent-muted)' : 'transparent',
                    border: active ? '1px solid var(--accent)' : '1px solid transparent',
                    color: active ? 'var(--accent)' : 'var(--text-primary)',
                    fontSize: 12,
                  }}
                >
                  <span>{p.name}</span>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {p.grade}
                  </span>
                </MotionButton>
              );
            })}

        <MotionButton
          ghost
          onClick={() => console.log('TODO: create problem')}
          style={{
            display: 'block', width: '100%', marginTop: 8, padding: '7px',
            border: '1px dashed var(--border)', borderRadius: 8,
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
      <div style={{ padding: '6px 16px 14px' }}>
        <StatSlider label="Height" value={local.heightCm} min={140} max={210}
                    onChange={v => update('heightCm', v)}
                    readout={`${local.heightCm} cm · ${cmToFtIn(local.heightCm)}`} />
        <StatSlider label="Weight" value={local.weightKg} min={40} max={120}
                    onChange={v => update('weightKg', v)}
                    readout={`${local.weightKg} kg · ${kgToLb(local.weightKg)} lb`} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['Male', 'male'], ['Female', 'female']].map(([lbl, val]) => {
              const active = local.gender === val;
              return (
                <MotionButton key={val} onClick={() => update('gender', val)}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8,
                           border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                           background: active ? 'var(--accent-muted)' : 'transparent',
                           color: active ? 'var(--accent)' : 'var(--text-secondary)',
                           fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                  {lbl}
                </MotionButton>
              );
            })}
          </div>
        </div>

        <MotionButton onClick={() => onSave(local)}
          style={{ width: '100%', padding: '6px', borderRadius: 8, marginTop: 4,
                   fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
          Save Stats
        </MotionButton>
      </div>
    </Section>
  );
}

// ── Beta section — 3-level navigation ─────────────────────────────────────

function contactSummary(contacts, holds) {
  if (!contacts?.length) return '—';
  const holdMap = Object.fromEntries((holds ?? []).map(h => [h.id, h]));
  return contacts.map(c => {
    if (c.smear) return `${LIMB_SHORT[c.limb] ?? c.limb} smear`;
    const hold = holdMap[c.holdId];
    return `${LIMB_SHORT[c.limb] ?? c.limb} ${hold?.type ?? '?'}`;
  }).join(' · ');
}

function BetaSection({
  generatedBetas, activeBetaId, activePositionIndex, activeMoveFrameIndex,
  setActiveBeta, setActivePosition, setActiveMoveFrame,
  onAnalyze, onGenerateBeta,
  controlMode, setControlMode,
  holds,
}) {
  const activeBeta        = generatedBetas.find(b => b.id === activeBetaId);
  const activePosition    = activeBeta?.positions[activePositionIndex];
  const activeMoveFrame   = activeMoveFrameIndex !== null
    ? activePosition?.moveFrames[activeMoveFrameIndex]
    : null;
  const hasFrames         = activeMoveFrameIndex !== null;
  const hasMoveLevel      = activePositionIndex > 0 && (activePosition?.moveFrames?.length ?? 0) > 0;

  return (
    <Section label="Beta">
      <div style={{ padding: '0 16px 16px' }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, marginTop: 4 }}>
          {[['Auto Beta', 'auto'], ['Manual', 'manual']].map(([lbl, mode]) => {
            const active = controlMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setControlMode(mode)}
                style={{
                  flex: 1, padding: '5px 0', borderRadius: 8, border: 'none',
                  fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: 'pointer',
                  background: active ? 'var(--accent)' : 'var(--surface-2)',
                  color: active ? 'white' : 'var(--text-secondary)',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >{lbl}</button>
            );
          })}
        </div>

        {/* Generate Beta */}
        {controlMode === 'auto' && (
          <MotionButton
            style={{
              width: '100%', padding: '7px', borderRadius: 8, marginBottom: 14,
              fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500,
            }}
            onClick={onGenerateBeta}
          >
            Generate Beta
          </MotionButton>
        )}

        {/* ── LEVEL 1: Beta tabs ─────────────────────────────────────────── */}
        {generatedBetas.length > 0 && (
          <>
            <div style={{ ...SECTION_LABEL_STYLE, fontSize: 9, marginBottom: 6 }}>Beta</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {generatedBetas.map(beta => {
                const active = beta.id === activeBetaId;
                return (
                  <button
                    key={beta.id}
                    onClick={() => setActiveBeta(beta.id)}
                    style={{
                      position: 'relative', flex: 1, padding: '5px 0',
                      borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
                      background: 'transparent',
                      color: active ? 'white' : 'var(--text-secondary)',
                      zIndex: 0, overflow: 'hidden',
                      transition: 'color 0.15s',
                    }}
                  >
                    {active && (
                      <motion.div
                        layoutId="betaTab"
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'var(--accent)', borderRadius: 8, zIndex: -1,
                        }}
                        transition={SPRING}
                      />
                    )}
                    {beta.label}
                  </button>
                );
              })}
            </div>

            {/* Beta description */}
            {activeBeta?.description && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45, margin: '0 0 14px' }}>
                {activeBeta.description}
              </p>
            )}

            {/* ── LEVEL 2: Position chips ───────────────────────────────── */}
            {activeBeta?.positions?.length > 0 && (
              <>
                <div style={{ ...SECTION_LABEL_STYLE, fontSize: 9, marginBottom: 6 }}>Position</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {activeBeta.positions.map((pos, i) => {
                    const active     = i === activePositionIndex;
                    // "Top" when hand is on the finishing hold; otherwise P1, P2, …
                    const chipLabel  = pos.label === 'Top' ? 'Top' : `P${i + 1}`;
                    return (
                      <button
                        key={i}
                        title={pos.label}
                        onClick={() => { setActivePosition(i); setActiveMoveFrame(null); }}
                        style={active ? CHIP_ACTIVE : CHIP_BASE}
                      >
                        {chipLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Contact summary */}
                {activePosition && (
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 11,
                    color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5,
                  }}>
                    {contactSummary(
                      hasFrames ? activeMoveFrame?.contacts : activePosition.contacts,
                      holds,
                    )}
                  </div>
                )}

                {/* ── LEVEL 3: Move frame buttons ───────────────────────── */}
                {hasMoveLevel && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: 12, marginBottom: 4,
                  }}>
                    {/* Header row */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 8,
                    }}>
                      <span style={{ ...SECTION_LABEL_STYLE, fontSize: 9 }}>
                        Move into {activePosition.label}
                      </span>
                      <MotionButton
                        ghost
                        onClick={() => setActiveMoveFrame(null)}
                        style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: '2px 0' }}
                      >
                        ↩ position
                      </MotionButton>
                    </div>

                    {/* Frame pills */}
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
                      {activePosition.moveFrames.map((frame, i) => {
                        const active = i === activeMoveFrameIndex;
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveMoveFrame(i)}
                            style={{
                              padding: '4px 9px', borderRadius: 8, border: 'none',
                              cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10,
                              background: active ? 'var(--accent)' : 'var(--surface-2)',
                              color: active ? 'white' : 'var(--text-secondary)',
                              transition: 'background 0.12s, color 0.12s',
                            }}
                          >
                            {frame.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active frame description */}
                    {activeMoveFrame?.description && (
                      <p style={{
                        fontSize: 12, color: 'var(--text-secondary)',
                        lineHeight: 1.5, margin: '0 0 4px',
                      }}>
                        {activeMoveFrame.description}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Analyze This Frame */}
        <MotionButton
          style={{
            width: '100%', padding: '7px', borderRadius: 8, marginTop: 10,
            fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500,
          }}
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
  const role = hold.isStart && hold.isTop ? 'Start + Top'
             : hold.isStart               ? 'Start'
             : hold.isTop                 ? 'Top'
                                          : 'Intermediate';
  const usage = HOLD_USAGE[hold.type] ?? null;

  return (
    <div>
      {/* Type + role chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{
          fontFamily: MONO, fontSize: 12, fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          {capFirst(hold.type)}
        </span>
        <span style={{
          fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4,
          background: hold.isStart ? 'var(--accent-muted)' : hold.isTop ? 'rgba(46,204,113,0.15)' : 'var(--surface-2)',
          color: hold.isStart ? 'var(--accent)' : hold.isTop ? '#2ECC71' : 'var(--text-muted)',
          border: `1px solid ${hold.isStart ? 'var(--accent-muted)' : hold.isTop ? 'rgba(46,204,113,0.25)' : 'var(--border)'}`,
        }}>
          {role}
        </span>
      </div>

      {/* Usage note */}
      {usage && (
        <p style={{
          fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55,
          marginBottom: 12,
        }}>
          {usage}
        </p>
      )}

      {/* Stats */}
      <InfoRow label="Friction μ" value={hold.frictionCoeff} />
      <InfoRow label="Position X" value={hold.x.toFixed(2)} />
      <InfoRow label="Position Y" value={hold.y.toFixed(2)} />
    </div>
  );
}

function RightSidebar({ type, hold, onClose }) {
  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
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
        {type === 'hold' && hold && <HoldPanel hold={hold} />}
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
    generatedBetas, activeBetaId, activePositionIndex, activeMoveFrameIndex,
    setBetas, setActiveBeta, setActivePosition, setActiveMoveFrame,
    analyzeActiveFrame,
  } = useClimbStore();

  const activePose = useClimbStore(s => getActivePose(s));

  const wall         = walls.find(w => w.id === (selectedWall?.id ?? 'vertical')) ?? walls[0];
  const wallProblems = problems.filter(p => p.wallId === wall.id);
  const problem      = problems.find(p => p.id === selectedProblem?.id)
    ?? wallProblems[0] ?? null;

  const [gradeFilter, setGradeFilter]         = useState('All');
  const filteredProblems                      = wallProblems.filter(p => matchGrade(p.grade, gradeFilter));
  const [highlightedHoldId, setHighlightedHoldId] = useState(null);
  const [sidebarType, setSidebarType]         = useState(null);
  const [sidebarHold, setSidebarHold]         = useState(null);
  const sidebarOpen                           = sidebarType !== null;
  const [showHoldLabels, setShowHoldLabels]   = useState(true);

  const hasSmearsInBeta = useMemo(() =>
    generatedBetas.some(beta =>
      beta.positions.some(pos =>
        pos.contacts.some(c => c.smear) ||
        pos.moveFrames.some(mf => mf.contacts?.some(c => c.smear))
      )
    ),
  [generatedBetas]);

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
    else       { setSidebarType(null); }
  };

  const handleAnalyze = async () => {
    setSidebarType('frame');
    await analyzeActiveFrame();
  };

  const handleGenerateBeta = () => {
    if (!problem) return;
    setSelectedWall(wall);
    const { betas } = generateBeta(problem.holds, climberStats, wall);
    setBetas(betas);
  };

  const closeSidebar = () => { setSidebarType(null); setHighlightedHoldId(null); };

  const showClimber = generatedBetas.length > 0;
  const displayPose = activePose ?? DEFAULT_POSE;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div style={{
        width: 264, flexShrink: 0,
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
              generatedBetas={generatedBetas}
              activeBetaId={activeBetaId}
              activePositionIndex={activePositionIndex}
              activeMoveFrameIndex={activeMoveFrameIndex}
              setActiveBeta={setActiveBeta}
              setActivePosition={setActivePosition}
              setActiveMoveFrame={setActiveMoveFrame}
              onAnalyze={handleAnalyze}
              onGenerateBeta={handleGenerateBeta}
              controlMode={controlMode}
              setControlMode={setControlMode}
              holds={problem?.holds ?? []}
            />
          </StaggerItem>
        </Stagger>
      </div>

      {/* ── Center: 3D canvas ───────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>

        {/* Labels toggle — top-left overlay */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
          <MotionButton
            onClick={() => setShowHoldLabels(v => !v)}
            style={{
              padding: '4px 11px', borderRadius: 7,
              fontSize: 10, fontFamily: MONO,
              border: `1px solid ${showHoldLabels ? 'var(--accent)' : 'var(--border)'}`,
              background: showHoldLabels ? 'var(--accent-muted)' : 'rgba(255,253,250,0.82)',
              color: showHoldLabels ? 'var(--accent)' : 'var(--text-muted)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            Labels{showHoldLabels ? ' ✓' : ''}
          </MotionButton>
        </div>

        {/* Hold-type legend — bottom-left overlay */}
        <HoldLegend holds={problem?.holds ?? []} hasSmears={hasSmearsInBeta} />

        <Scene3D
          wall={wall}
          holds={problem?.holds ?? []}
          onHoldClick={handleHoldClick}
          highlightedHoldId={highlightedHoldId}
          climberPose={displayPose}
          showClimber={showClimber}
          showHoldLabels={showHoldLabels}
        />
      </div>

      {/* ── Right sidebar ───────────────────────────────────────────────── */}
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
              : <RightSidebar type={sidebarType} hold={sidebarHold} onClose={closeSidebar} />
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
