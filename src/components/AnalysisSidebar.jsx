import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MotionButton } from './motion/Motion';
import useClimbStore from '../store/useClimbStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONO  = "'DM Mono', monospace";
const SPRING = { type: 'spring', stiffness: 280, damping: 26 };

const LIMB_LABEL = {
  handL: 'L Hand', handR: 'R Hand',
  footL: 'L Foot', footR: 'R Foot',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function barColor(pct) {
  if (pct > 100) return '#E74C3C';
  if (pct > 80)  return '#E67E22';
  return 'var(--accent)';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--text-muted)',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function Section({ label, children, noBorder = false }) {
  return (
    <div style={{
      padding: '11px 16px 12px',
      borderBottom: noBorder ? 'none' : '1px solid var(--border)',
    }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

// Animated bar — width 0 → fillPct% on mount; keyed on value for re-animation
function Bar({ pct, maxPct = 150 }) {
  const fillPct = Math.min(pct, maxPct) / maxPct * 100;
  return (
    <div style={{
      flex: 1, height: 4, borderRadius: 2,
      background: 'var(--surface-2)', overflow: 'hidden',
    }}>
      <motion.div
        key={pct}
        initial={{ width: 0 }}
        animate={{ width: `${fillPct}%` }}
        transition={SPRING}
        style={{ height: '100%', borderRadius: 2, background: barColor(pct) }}
      />
    </div>
  );
}

// Side-view SVG: tilted wall line + COM dot
function COMSvg({ com, contacts, pose, wallAngleDeg }) {
  const W = 80, H = 76;
  const groundY = H - 9;
  const WALL_H_M = 6;
  const yScale = (groundY - 7) / WALL_H_M;  // px per metre of height

  const rot = ((wallAngleDeg ?? 90) - 90) * Math.PI / 180;
  const baseX = W * 0.42;
  const wallTopX = baseX + Math.sin(rot) * WALL_H_M * yScale;
  const wallTopY = groundY - Math.cos(rot) * WALL_H_M * yScale;

  // COM height in SVG
  const comSvgY = Math.max(5, Math.min(groundY - 2, groundY - com.y * yScale));
  // COM x: place on viewer-facing side of the wall, offset by 16px + small z contribution
  const t       = Math.max(0, Math.min(1, com.y / WALL_H_M));
  const wallAtY = baseX + t * (wallTopX - baseX);          // x on wall line at same height
  const comSvgX = Math.max(4, Math.min(W - 4, wallAtY + 16 + com.z * 20));

  // Lateral (x) balance check against contact limb positions
  const limbPos = {
    handL: pose?.wristL, handR: pose?.wristR,
    footL: pose?.ankleL, footR: pose?.ankleR,
  };
  const contactXs = (contacts ?? []).map(c => limbPos[c.limb]?.x).filter(v => v != null);
  const inSupport  = contactXs.length === 0 ||
    (com.x >= Math.min(...contactXs) - 0.05 && com.x <= Math.max(...contactXs) + 0.05);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Ground */}
      <line x1={4} y1={groundY} x2={W - 4} y2={groundY}
            stroke="var(--border)" strokeWidth={1} />
      {/* Wall profile line */}
      <line x1={baseX} y1={groundY} x2={wallTopX} y2={wallTopY}
            stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" />
      {/* COM dot */}
      <circle cx={comSvgX} cy={comSvgY} r={4}
              fill={inSupport ? 'var(--accent)' : '#E74C3C'} />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalysisSidebar({ onClose }) {
  const navigate = useNavigate();
  const {
    frameSequence, activeFrameIndex,
    selectedWall, selectedProblem,
  } = useClimbStore();

  const frame  = frameSequence[activeFrameIndex] ?? null;
  const result = frame?.analysisResult ?? null;
  const contacts = frame?.contacts ?? [];

  const holdMap    = Object.fromEntries((selectedProblem?.holds ?? []).map(h => [h.id, h]));
  const wallAngle  = selectedWall?.angleDeg ?? 90;

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', height: '100%',
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Frame Analysis
          </span>
          {frame?.label && (
            <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-primary)' }}>
              {frame.label}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1, padding: 2 }}
          aria-label="Close"
        >✕</button>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* No data state */}
        {!result && (
          <div style={{ padding: '20px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              No analysis yet. Press "Analyze This Frame" to run the force engine.
            </p>
          </div>
        )}

        {result && (<>

          {/* ── 1. Center of mass ─────────────────────────────────────────── */}
          <Section label="Center of Mass">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <COMSvg
                com={result.centerOfMass}
                contacts={contacts}
                pose={frame?.pose}
                wallAngleDeg={wallAngle}
              />
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                  x: {result.centerOfMass.x.toFixed(2)}m
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                  y: {result.centerOfMass.y.toFixed(2)}m
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                  z: {result.centerOfMass.z.toFixed(2)}m
                </div>
              </div>
            </div>
          </Section>

          {/* ── 2. Contact forces ─────────────────────────────────────────── */}
          {result.contactForces.length > 0 && (
            <Section label="Contact Forces">
              {result.contactForces.map((cf, i) => {
                const contact  = contacts[i];
                const limb     = contact?.limb ?? '';
                const hold     = holdMap[contact?.holdId ?? ''];
                const holdType = hold?.type
                  ? hold.type.charAt(0).toUpperCase() + hold.type.slice(1)
                  : '—';
                const fuPct    = Math.round(cf.frictionUtilization * 100);

                return (
                  <div key={cf.holdId ?? i} style={{ marginBottom: i < result.contactForces.length - 1 ? 14 : 0 }}>
                    {/* Limb label + type */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {LIMB_LABEL[limb] ?? limb} — {holdType}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {Math.round(cf.magnitude)} N
                      </span>
                    </div>
                    {/* Friction utilization bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Bar pct={fuPct} />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: barColor(fuPct), flexShrink: 0 }}>
                        {fuPct}%
                      </span>
                    </div>
                    {/* Normal / Tangential */}
                    <div style={{ fontSize: 10, fontFamily: MONO, color: 'var(--text-muted)' }}>
                      Normal {Math.round(cf.normalForce)}N&nbsp;&nbsp;Tangential {Math.round(cf.tangentialForce)}N
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* ── 3. Muscle demands ─────────────────────────────────────────── */}
          <Section label="Muscle Demands">
            {[...result.muscleDemands]
              .sort((a, b) => b.demandPercent - a.demandPercent)
              .slice(0, 7)
              .map((m, i, arr) => (
                <div key={m.muscle} style={{ marginBottom: i < arr.length - 1 ? 9 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{
                      fontSize: 11,
                      color: m.isLimiting ? '#E74C3C' : 'var(--text-secondary)',
                    }}>
                      {m.muscle}
                    </span>
                    <span style={{
                      fontFamily: MONO, fontSize: 11,
                      color: m.isLimiting ? '#E74C3C' : 'var(--text-primary)',
                    }}>
                      {Math.round(m.demandPercent)}%
                    </span>
                  </div>
                  <Bar pct={m.demandPercent} />
                </div>
              ))}
          </Section>

          {/* ── 4. Limiting factors ───────────────────────────────────────── */}
          {result.limitingFactors.length > 0 && (
            <Section label="Limiting Factors">
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 10px',
              }}>
                {result.limitingFactors.map(name => (
                  <div key={name} style={{
                    fontSize: 11, color: '#E74C3C',
                    lineHeight: 1.6,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 8, lineHeight: 1 }}>●</span>
                    {name} exceeds max capacity
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── 5. Summary ────────────────────────────────────────────────── */}
          <Section label="Summary" noBorder>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {result.summary}
            </p>
          </Section>

        </>)}

        {/* ── 6. Footer link ────────────────────────────────────────────────── */}
        <div style={{
          padding: '10px 16px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end',
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
