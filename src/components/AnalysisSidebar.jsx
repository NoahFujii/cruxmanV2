import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MotionButton } from './motion/Motion';
import useClimbStore, { getActiveFrame } from '../store/useClimbStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONO   = "'DM Mono', monospace";
const SPRING = { type: 'spring', stiffness: 280, damping: 26 };

const LIMB_FULL = {
  handL: 'Left Hand',
  handR: 'Right Hand',
  footL: 'Left Foot',
  footR: 'Right Foot',
};

function cap(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Share bar (accent fill, always 0–100%) ────────────────────────────────────

function ShareBar({ pct }) {
  const fill = Math.min(100, Math.max(0, pct));
  return (
    <div style={{
      flex: 1, height: 3, borderRadius: 2,
      background: 'var(--surface-2)', overflow: 'hidden',
    }}>
      <motion.div
        key={fill}
        initial={{ width: 0 }}
        animate={{ width: `${fill}%` }}
        transition={SPRING}
        style={{ height: '100%', borderRadius: 2, background: 'var(--accent)' }}
      />
    </div>
  );
}

// ── Single contact card ───────────────────────────────────────────────────────

function ContactCard({ contact, isOpen, onToggle }) {
  const {
    limb, kind, holdType,
    forceKg, forceLb,
    frictionUtil, bodyweightPct,
    muscles = [],
  } = contact;

  const isSlipping = kind === 'smear' && frictionUtil > 1;
  const top4       = muscles.slice(0, 4);

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>

      {/* ── Header button ─────────────────────────────────────────────────── */}
      <button
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          columnGap: 10,
          rowGap: 3,
          width: '100%',
          padding: '9px 12px 8px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Row 1: limb name | force */}
        <span style={{
          fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
          alignSelf: 'center',
        }}>
          {LIMB_FULL[limb] ?? limb}
        </span>
        <span style={{
          fontFamily: MONO, fontSize: 12, color: 'var(--text-primary)',
          textAlign: 'right', whiteSpace: 'nowrap', alignSelf: 'center',
        }}>
          {forceKg.toFixed(1)} kg · {Math.round(forceLb)} lb
        </span>

        {/* Row 2: hold pill + slipping | bw% + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontFamily: MONO, fontSize: 9,
            padding: '1px 6px', borderRadius: 4,
            background: isSlipping ? 'rgba(231,76,60,0.08)' : 'var(--surface-2)',
            color: isSlipping ? '#E74C3C' : 'var(--text-muted)',
            border: `1px solid ${isSlipping ? 'rgba(231,76,60,0.25)' : 'var(--border)'}`,
            letterSpacing: '0.03em',
          }}>
            {cap(holdType)}
          </span>
          {isSlipping && (
            <span style={{
              fontFamily: MONO, fontSize: 9, color: '#E74C3C',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span style={{ fontSize: 8, lineHeight: 1 }}>⚠</span>
              slipping
            </span>
          )}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', gap: 6,
        }}>
          <span style={{
            fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)',
          }}>
            ({Math.round(bodyweightPct)}% bw)
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={SPRING}
            style={{
              fontSize: 12, color: 'var(--text-muted)',
              display: 'inline-block', lineHeight: 1,
            }}
          >
            ▾
          </motion.span>
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '8px 12px 12px',
              borderTop: '1px solid var(--border)',
            }}>
              {top4.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  No muscle data
                </div>
              ) : top4.map((m, i) => (
                <div key={m.muscle} style={{ marginBottom: i < top4.length - 1 ? 10 : 0 }}>
                  {/* Name + group | kg·lb */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {m.muscle}{' '}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        ({m.group})
                      </span>
                    </span>
                    <span style={{
                      fontFamily: MONO, fontSize: 10,
                      color: 'var(--text-primary)',
                      flexShrink: 0, marginLeft: 8, whiteSpace: 'nowrap',
                    }}>
                      {m.forceKg.toFixed(1)} kg · {Math.round(m.forceLb)} lb
                    </span>
                  </div>
                  {/* Share bar + % */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShareBar pct={m.sharePct} />
                    <span style={{
                      fontFamily: MONO, fontSize: 10,
                      color: 'var(--accent)', flexShrink: 0,
                    }}>
                      {Math.round(m.sharePct)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export default function AnalysisSidebar({ onClose }) {
  const navigate = useNavigate();
  const frame    = useClimbStore(getActiveFrame);
  const result   = frame?.analysisResult ?? null;
  const contacts = result?.contacts ?? [];

  // First card open by default; reset when the frame changes.
  const [openIdx, setOpenIdx] = useState(0);
  const frameKey = `${frame?.id ?? ''}-${frame?.label ?? ''}`;
  useEffect(() => { setOpenIdx(0); }, [frameKey]);

  const toggle = i => setOpenIdx(prev => (prev === i ? null : i));

  return (
    <div style={{
      width: 288, flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', height: '100%',
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px 10px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3,
          }}>
            Frame Analysis
          </div>
          {frame?.label && (
            <div style={{
              fontFamily: MONO, fontSize: 12,
              color: 'var(--text-primary)', fontWeight: 500, marginBottom: 3,
            }}>
              {frame.label}
            </div>
          )}
          {result?.summary && (
            <div style={{
              fontFamily: MONO, fontSize: 10,
              color: 'var(--text-secondary)', lineHeight: 1.45,
            }}>
              {result.summary}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--text-muted)',
            lineHeight: 1, padding: 2, flexShrink: 0, marginTop: 2,
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Empty state */}
        {!result && (
          <div style={{ padding: '20px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              No analysis yet. Press "Analyze This Frame" to run the force engine.
            </p>
          </div>
        )}

        {/* Contact cards */}
        {result && (
          <div style={{ padding: '12px 12px 4px' }}>
            {contacts.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55, padding: '4px 4px 8px' }}>
                No active contacts in this frame.
              </p>
            )}
            {contacts.map((contact, i) => (
              <div key={`${contact.limb}-${i}`} style={{ marginBottom: 8 }}>
                <ContactCard
                  contact={contact}
                  isOpen={openIdx === i}
                  onToggle={() => toggle(i)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '10px 16px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end',
          marginTop: result ? 4 : 0,
        }}>
          <MotionButton
            ghost
            onClick={() => navigate('/analytics')}
            style={{ fontSize: 12, fontFamily: MONO }}
          >
            View Full Analytics →
          </MotionButton>
        </div>

      </div>
    </div>
  );
}
