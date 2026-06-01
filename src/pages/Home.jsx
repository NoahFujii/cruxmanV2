import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import BoulderWallVisual from '../components/BoulderWallVisual';

const KEYFRAMES = `
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 0.85; }
  }
  @keyframes pulseFast {
    0%, 100% { opacity: 0.55; }
    50%       { opacity: 1; }
  }
`;

function BoulderVisual3D({ hovered }) {
  return <BoulderWallVisual hovered={hovered} />;
}

// ─── Analytics SVG ─────────────────────────────────────────────────────

function AnalyticsVisual({ hovered }) {
  const J = {
    head: [108, 24], neck: [108, 36],
    lSho: [84,  50], rSho: [132, 50],
    lElb: [68,  74], rElb: [148, 70],
    lHnd: [52,  96], rHnd: [164, 88],
    hip:  [108, 108],
    lKne: [92,  133], rKne: [124, 128],
    lFt:  [80,  157], rFt:  [134, 154],
  };

  const segs = [
    [J.neck, J.lSho], [J.neck, J.rSho], [J.neck, J.hip],
    [J.lSho, J.lElb], [J.lElb, J.lHnd],
    [J.rSho, J.rElb], [J.rElb, J.rHnd],
    [J.hip,  J.lKne], [J.lKne, J.lFt],
    [J.hip,  J.rKne], [J.rKne, J.rFt],
  ];

  const dotJoints = [
    J.neck, J.lSho, J.rSho, J.lElb, J.rElb,
    J.lHnd, J.rHnd, J.hip, J.lKne, J.rKne, J.lFt, J.rFt,
  ];

  const forces = [
    { from: J.lHnd, to: [32, 76],  label: '87N', ldx: -20, delay: 0   },
    { from: J.rHnd, to: [184, 70], label: '43N', ldx:   4, delay: 0.2 },
    { from: J.lFt,  to: [66, 164], label: '31N', ldx: -20, delay: 0.4 },
  ];

  const bars = [
    { lbl: 'fing',  h: 68 },
    { lbl: 'shldr', h: 42 },
    { lbl: 'core',  h: 55 },
    { lbl: 'legs',  h: 28 },
  ];

  return (
    <svg viewBox="0 0 296 168" style={{ width: '100%', height: '100%', display: 'block' }}>
      {[40,80,120,160,200,240,280].map(x => (
        <line key={`gx${x}`} x1={x} y1="0" x2={x} y2="168" stroke="#ECEAE5" strokeWidth="0.5" />
      ))}
      {[42, 84, 126].map(y => (
        <line key={`gy${y}`} x1="0" y1={y} x2="296" y2={y} stroke="#ECEAE5" strokeWidth="0.5" />
      ))}
      {segs.map(([[x1,y1],[x2,y2]], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#4A90D9" strokeWidth="1.5" strokeOpacity="0.5" />
      ))}
      <circle cx={J.head[0]} cy={J.head[1]} r="10"
        fill="none" stroke="#4A90D9" strokeWidth="1.5" strokeOpacity="0.5" />
      {dotJoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5"
          fill="white" stroke="#4A90D9" strokeWidth="1" strokeOpacity="0.6" />
      ))}
      {forces.map((f, i) => (
        <g key={i} style={{
          animation: hovered
            ? `pulseFast 0.8s ease-in-out infinite ${f.delay}s`
            : `pulse 2.2s ease-in-out infinite ${f.delay}s`,
        }}>
          <line x1={f.from[0]} y1={f.from[1]} x2={f.to[0]} y2={f.to[1]}
            stroke="#4A90D9" strokeWidth="1.2" strokeOpacity="0.8" />
          <circle cx={f.to[0]} cy={f.to[1]} r="2.5" fill="#4A90D9" fillOpacity="0.85" />
          <text x={f.to[0]+f.ldx} y={f.to[1]+4}
            fill="#4A90D9" fontSize="7.5" fillOpacity="0.65"
            fontFamily="'DM Mono',monospace">
            {f.label}
          </text>
        </g>
      ))}
      <g transform="translate(200, 22)">
        <line x1="0" y1="0"   x2="0"  y2="102" stroke="#D8D5D0" strokeWidth="0.5" />
        <line x1="0" y1="102" x2="88" y2="102" stroke="#D8D5D0" strokeWidth="0.5" />
        {bars.map(({ lbl, h }, i) => (
          <g key={lbl} style={{
            animation: hovered
              ? `pulseFast 0.8s ease-in-out infinite ${i * 0.15}s`
              : `pulse 2.2s ease-in-out infinite ${i * 0.3}s`,
          }}>
            <rect x={i*22+3} y={102-h} width="16" height={h}
              fill="#4A90D9" fillOpacity="0.12"
              stroke="#4A90D9" strokeWidth="0.8" strokeOpacity="0.45" />
            <text x={i*22+11} y="112" fill="#A8A8A8" fontSize="5.5"
              textAnchor="middle" fontFamily="'DM Mono',monospace">{lbl}</text>
          </g>
        ))}
      </g>
      {[[0,0,1,1],[296,0,-1,1],[0,168,1,-1],[296,168,-1,-1]].map(([cx,cy,sx,sy],i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={cx+sx*10} y2={cy}        stroke="#4A90D9" strokeWidth="1.2" strokeOpacity="0.2" />
          <line x1={cx} y1={cy} x2={cx}        y2={cy+sy*10} stroke="#4A90D9" strokeWidth="1.2" strokeOpacity="0.2" />
        </g>
      ))}
    </svg>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────

function NavCard({ visual, label, title, desc, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        background: '#F8F9FA',
        border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s',
        minHeight: 0,
      }}
    >
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {visual(hovered)}
      </div>
      <div style={{ flexShrink: 0, padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {label}
          </span>
          <span style={{ fontSize: 13, color: hovered ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.2s', lineHeight: 1 }}>→</span>
        </div>
        <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.35 }}>{title}</h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>{desc}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{ padding: '40px 36px 36px', display: 'flex', flexDirection: 'column', gap: 28, height: '100%', boxSizing: 'border-box' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Cruxman
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            3D climbing analysis and training tool.
          </p>
        </header>

        <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
          <NavCard
            label="Boulder Designer"
            title="Design and climb a problem"
            desc="Place holds, sequence beta, and inspect forces at any position."
            onClick={() => navigate('/designer')}
            visual={(h) => <BoulderVisual3D hovered={h} />}
          />
          <NavCard
            label="Analytics"
            title="Understand what a climb demands"
            desc="Force breakdowns by muscle group, with targeted training recommendations."
            onClick={() => navigate('/analytics')}
            visual={(h) => <AnalyticsVisual hovered={h} />}
          />
        </div>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', height: 42, padding: '0 22px', flexShrink: 0 }}>
          {['V0 – V18 problems', '3D force analysis', 'Muscle-specific recommendations'].map((item, i) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 18px' }} />}
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
