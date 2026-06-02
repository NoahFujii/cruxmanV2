import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { MotionCard, MotionButton, Stagger, StaggerItem } from '../components/motion/Motion';
import BoulderWallVisual from '../components/BoulderWallVisual';

// ─── Analytics diagram ─────────────────────────────────────────────────

function AnalyticsDiagram() {
  const bars = [
    { lbl: 'fing',  x: 265, h: 43 },
    { lbl: 'shldr', x: 297, h: 32 },
    { lbl: 'core',  x: 329, h: 22 },
    { lbl: 'legs',  x: 361, h: 14 },
  ];

  return (
    <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* Grid */}
      {[60, 120, 180, 240, 300, 360].map(x => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" stroke="var(--border)" strokeWidth="1" />
      ))}
      {[60, 120, 180, 240].map(y => (
        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="var(--border)" strokeWidth="1" />
      ))}

      {/* Stick figure — climbing position */}
      <circle cx="168" cy="58" r="14" fill="none" stroke="#4A90D9" strokeWidth="2.5" />
      <g stroke="#4A90D9" strokeWidth="2.5" fill="none" strokeLinecap="round">
        {/* Neck → shoulder junction */}
        <line x1="168" y1="72" x2="168" y2="87" />
        {/* Clavicles */}
        <line x1="168" y1="87" x2="148" y2="90" />
        <line x1="168" y1="87" x2="188" y2="90" />
        {/* Torso */}
        <line x1="168" y1="87" x2="168" y2="132" />
        {/* Left arm: shoulder → elbow → hand at hold */}
        <line x1="148" y1="90" x2="118" y2="68" />
        <line x1="118" y1="68" x2="85" y2="47" />
        {/* Right arm */}
        <line x1="188" y1="90" x2="218" y2="66" />
        <line x1="218" y1="66" x2="252" y2="46" />
        {/* Left leg */}
        <line x1="158" y1="132" x2="136" y2="163" />
        <line x1="136" y1="163" x2="120" y2="193" />
        {/* Right leg */}
        <line x1="178" y1="132" x2="200" y2="160" />
        <line x1="200" y1="160" x2="218" y2="188" />
      </g>

      {/* Force vectors */}
      {/* 87N – left hand */}
      <line x1="85" y1="47" x2="48" y2="24"
        stroke="#4A90D9" strokeWidth="1.5" strokeOpacity="0.8" />
      <circle cx="48" cy="24" r="3" fill="#4A90D9" fillOpacity="0.85" />
      <text x="6" y="28" fill="#4A90D9" fontSize="13"
        fontFamily="'DM Mono',monospace" fillOpacity="0.9">87N</text>

      {/* 43N – right hand */}
      <line x1="252" y1="46" x2="290" y2="22"
        stroke="#4A90D9" strokeWidth="1.5" strokeOpacity="0.8" />
      <circle cx="290" cy="22" r="3" fill="#4A90D9" fillOpacity="0.85" />
      <text x="298" y="28" fill="#4A90D9" fontSize="13"
        fontFamily="'DM Mono',monospace" fillOpacity="0.9">43N</text>

      {/* 31N – left foot */}
      <line x1="120" y1="193" x2="93" y2="230"
        stroke="#4A90D9" strokeWidth="1.5" strokeOpacity="0.8" />
      <circle cx="93" cy="230" r="3" fill="#4A90D9" fillOpacity="0.85" />
      <text x="54" y="238" fill="#4A90D9" fontSize="13"
        fontFamily="'DM Mono',monospace" fillOpacity="0.9">31N</text>

      {/* Bar chart */}
      <line x1="265" y1="204" x2="265" y2="278" stroke="var(--border)" strokeWidth="1" />
      <line x1="265" y1="278" x2="386" y2="278" stroke="var(--border)" strokeWidth="1" />
      {bars.map(({ lbl, x, h }) => (
        <g key={lbl}>
          <rect x={x} y={278 - h} width="18" height={h}
            fill="#4A90D9" fillOpacity="0.15"
            stroke="#4A90D9" strokeWidth="0.8" strokeOpacity="0.5" />
          <text x={x + 9} y="292" fill="var(--text-muted)" fontSize="10"
            textAnchor="middle" fontFamily="'DM Mono',monospace">
            {lbl}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────


function NavCard({ label, title, desc, preview, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <MotionCard
      onHoverChange={setHovered}
      onClick={onClick}
      style={{
        flex: 1,
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
      }}
    >
      {/* Preview — fills remaining card height; absolute inner gives canvas a reliable pixel height */}
      <div style={{
        flex: 1,
        position: 'relative',
        minHeight: 0,
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {preview(hovered)}
        </div>
      </div>

      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}>
          {label}
        </span>
        <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.35 }}>
          {title}
        </h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          {desc}
        </p>
        <MotionButton
          style={{
            alignSelf: 'flex-start',
            marginTop: 6,
            padding: '5px 13px',
            borderRadius: 5,
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
          }}
        >
          Explore
          <span style={{
            display: 'inline-block',
            transform: hovered ? 'translateX(4px)' : 'translateX(0)',
            transition: 'transform 0.2s ease-out',
          }}>→</span>
        </MotionButton>
      </div>
    </MotionCard>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      padding: '52px 36px 36px',
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <h1 style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 42,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          Cruxman
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
          3D climbing analysis and training tool.
        </p>
      </header>

      <Stagger style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
        <StaggerItem style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <NavCard
            label="Boulder Designer"
            title="Design and climb a problem"
            desc="Place holds, sequence beta, and inspect forces at any position."
            onClick={() => navigate('/designer')}
            preview={(isHovered) => (
              <div style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                <BoulderWallVisual isHovered={isHovered} />
              </div>
            )}
          />
        </StaggerItem>
        <StaggerItem style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <NavCard
            label="Analytics"
            title="Understand what a climb demands"
            desc="Force breakdowns by muscle group, with targeted training recommendations."
            onClick={() => navigate('/analytics')}
            preview={() => <AnalyticsDiagram />}
          />
        </StaggerItem>
      </Stagger>

      <Stagger delay={0.12} style={{ flexShrink: 0 }}>
        <StaggerItem>
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            height: 42,
            padding: '0 22px',
          }}>
            {['V0 – V18 problems', '3D force analysis', 'Muscle-specific recommendations'].map((item, i) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 18px' }} />}
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
