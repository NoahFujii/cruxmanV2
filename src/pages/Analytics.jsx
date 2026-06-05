import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MotionCard, MotionButton, Stagger, StaggerItem } from '../components/motion/Motion';
import useClimbStore, { getActiveBeta } from '../store/useClimbStore';
import { walls } from '../data/walls';
import { holdToWorldSpace } from '../utils/wallCoordinates';

const MONO = "'DM Mono', monospace";
const SPRING = { type: 'spring', stiffness: 300, damping: 26 };

const MUSCLE_GROUP = {
  Fingers: 'Grip',
  Forearms: 'Grip',
  Biceps: 'Arm',
  Triceps: 'Arm',
  Shoulders: 'Shoulder',
  Lats: 'Shoulder',
  Traps: 'Shoulder',
  Rhomboids: 'Shoulder',
  Chest: 'Shoulder',
  Abs: 'Core',
  Obliques: 'Core',
  Quads: 'Leg',
  Hamstrings: 'Leg',
  Glutes: 'Leg',
  Calves: 'Leg',
};

const TRAINING_FOCUS = {
  Grip: 'hangboard repeaters',
  Arm: 'lock-offs and slow eccentrics',
  Shoulder: 'weighted pull-ups + scapular pulls',
  Core: 'tension front levers',
  Leg: 'calf raises + smear drills',
  Other: 'movement drills on similar holds',
};

const LIMB_SHORT = {
  handL: 'L Hand',
  handR: 'R Hand',
  footL: 'L Foot',
  footR: 'R Foot',
};

const LIMB_FULL = {
  handL: 'left hand',
  handR: 'right hand',
  footL: 'left foot',
  footR: 'right foot',
};

const LIMB_POSSESSIVE = {
  handL: 'left-hand',
  handR: 'right-hand',
  footL: 'left-foot',
  footR: 'right-foot',
};

function kgToLb(kg) {
  return kg * 2.20462;
}

function cap(s) {
  if (!s) return '-';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function bodyweightPct(contact, climberStats) {
  if (Number.isFinite(contact?.bodyweightPct)) return contact.bodyweightPct;
  const weightKg = climberStats?.weightKg ?? 70;
  return weightKg > 0 ? ((contact?.forceKg ?? 0) / weightKg) * 100 : 0;
}

function calcArmSpan(stats) {
  const heightCm = stats?.heightCm ?? 175;
  const apeIndexCm = stats?.apeIndexCm ?? 0;
  return heightCm * (1 + apeIndexCm / heightCm) * 0.0044;
}

function dist3(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function barColor(pct) {
  if (pct > 100) return '#E74C3C';
  if (pct > 80) return '#E67E22';
  return 'var(--accent)';
}

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
  const fill = Math.min(Math.max(pct, 0), 150) / 150 * 100;
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

function buildFrameRows(beta) {
  if (!beta) return [];
  const rows = [];

  beta.positions.forEach((pos, posIdx) => {
    const isDynamicLabel = pos.moveFrames.some(mf => mf.label === 'Release' || mf.label === 'Peak');
    const moveGroup = posIdx === 0 ? 'Start' : `Move ${posIdx} - ${isDynamicLabel ? 'Dynamic' : 'Static'}`;

    if (posIdx === 0) {
      rows.push({
        key: 'pos-0',
        posIndex: posIdx,
        mfIndex: null,
        label: 'Start',
        frame: pos,
        moveGroup,
      });
      return;
    }

    pos.moveFrames.forEach((mf, mfIdx) => {
      rows.push({
        key: mf.id ?? `pos-${posIdx}-mf-${mfIdx}`,
        posIndex: posIdx,
        mfIndex: mfIdx,
        label: mf.label,
        frame: mf,
        moveGroup,
      });
    });

    rows.push({
      key: `pos-${posIdx}`,
      posIndex: posIdx,
      mfIndex: null,
      label: pos.label,
      frame: pos,
      moveGroup,
    });
  });

  return rows;
}

function getAnalyzedRows(frameRows) {
  return frameRows
    .map(row => ({ ...row, result: row.frame?.analysisResult ?? null }))
    .filter(row => row.result);
}

function getMoveStats(beta, selectedProblem, wall, climberStats) {
  const positions = beta?.positions ?? [];
  const holdMap = Object.fromEntries((selectedProblem?.holds ?? []).map(h => [h.id, h]));
  const angle = wall?.angleDeg ?? 90;
  const armSpan = calcArmSpan(climberStats);

  let moveCount = 0;
  let dynamicCount = 0;

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const next = positions[i];
    const changedHand = ['handL', 'handR'].find(limb => {
      const prevId = prev.contacts?.find(c => c.limb === limb)?.holdId;
      const nextId = next.contacts?.find(c => c.limb === limb)?.holdId;
      return prevId && nextId && prevId !== nextId;
    });

    moveCount += 1;
    if (!changedHand) continue;

    const prevHoldId = prev.contacts?.find(c => c.limb === changedHand)?.holdId;
    const nextHoldId = next.contacts?.find(c => c.limb === changedHand)?.holdId;
    const reach = dist3(
      holdToWorldSpace(holdMap[prevHoldId], angle),
      holdToWorldSpace(holdMap[nextHoldId], angle),
    );

    if (reach > armSpan) dynamicCount += 1;
  }

  return { moveCount, dynamicCount };
}

function synthesizeClimb(frameRows, beta, selectedProblem, wall, climberStats) {
  const analyzedRows = getAnalyzedRows(frameRows);
  if (!analyzedRows.length) return null;

  const muscleTotals = {};
  const smearWarnings = [];
  let peakContact = null;

  analyzedRows.forEach(row => {
    Object.entries(row.result.muscleTotalsKg ?? {}).forEach(([muscle, kg]) => {
      muscleTotals[muscle] = (muscleTotals[muscle] ?? 0) + kg;
    });

    (row.result.contacts ?? []).forEach((contact, contactIndex) => {
      const enriched = { ...contact, row, contactIndex };

      if (!peakContact || (contact.forceKg ?? 0) > (peakContact.forceKg ?? 0)) {
        peakContact = enriched;
      }

      if ((contact.frictionUtil ?? 0) > 1) {
        smearWarnings.push(enriched);
      }
    });
  });

  const hardestMuscles = Object.entries(muscleTotals)
    .map(([muscle, totalKg]) => ({
      muscle,
      group: MUSCLE_GROUP[muscle] ?? 'Other',
      totalKg,
      totalLb: kgToLb(totalKg),
    }))
    .sort((a, b) => b.totalKg - a.totalKg)
    .slice(0, 5);

  return {
    analyzedRows,
    peakContact,
    hardestMuscles,
    smearWarnings,
    ...getMoveStats(beta, selectedProblem, wall, climberStats),
  };
}

function peakContactSentence(contact) {
  if (!contact) return 'No contact loads were found in the analyzed frames.';
  return `Peak contact is the ${LIMB_FULL[contact.limb] ?? contact.limb} on a ${contact.holdType ?? 'hold'} at ${contact.row.label}, ${contact.forceKg.toFixed(1)} kg (${Math.round(contact.forceLb ?? kgToLb(contact.forceKg))} lb).`;
}

function struggleSentence(contact, climberStats) {
  if (!contact) return 'Analyze contacts to identify the hardest grip target.';
  const pct = Math.round(bodyweightPct(contact, climberStats));
  const limb = LIMB_POSSESSIVE[contact.limb] ?? LIMB_FULL[contact.limb] ?? contact.limb;
  const gripWord = contact.limb?.startsWith('hand') ? 'grip' : 'foot tension';
  return `Holding the ${limb} ${contact.holdType ?? 'hold'} on ${contact.row.label} (${contact.forceKg.toFixed(1)} kg, ${pct}% of your bodyweight) is the crux for your ${gripWord}.`;
}

function techniqueNote(synthesis) {
  const moves = synthesis?.moveCount ?? 0;
  const dynamic = synthesis?.dynamicCount ?? 0;
  if (moves === 0) return 'No hand moves detected yet.';
  if (dynamic === 0) return `${moves} move${moves === 1 ? '' : 's'}, none over arm span: keep it controlled and precise.`;
  return `${moves} move${moves === 1 ? '' : 's'}, ${dynamic} dynamic: commit hips first and catch with tension.`;
}

function FrameDetail({ result }) {
  if (!result) return null;
  const contacts = result.contacts ?? [];
  const topMuscles = Object.entries(result.muscleTotalsKg ?? {})
    .map(([muscle, kg]) => ({ muscle, group: MUSCLE_GROUP[muscle] ?? 'Other', kg }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 5);

  return (
    <div style={{ padding: '14px 20px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <SectionLabel>Contact Loads</SectionLabel>
          {contacts.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No active contacts</div>
          )}
          {contacts.map((contact, i) => {
            const fuPct = Math.round((contact.frictionUtil ?? 0) * 100);
            const isSlip = (contact.frictionUtil ?? 0) > 1;
            return (
              <div key={`${contact.limb}-${contact.holdId ?? i}`} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: isSlip ? '#E74C3C' : 'var(--text-secondary)' }}>
                    {LIMB_SHORT[contact.limb] ?? `Contact ${i + 1}`} on {cap(contact.holdType)}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {contact.forceKg.toFixed(1)} kg
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
          <SectionLabel>Muscle Load</SectionLabel>
          {topMuscles.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No muscle totals</div>
          )}
          {topMuscles.map(m => (
            <div key={m.muscle} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {m.muscle} <span style={{ color: 'var(--text-muted)' }}>({m.group})</span>
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {m.kg.toFixed(1)} kg
                </span>
              </div>
              <MiniBar pct={m.kg} />
            </div>
          ))}
        </div>
      </div>
      {contacts.some(c => (c.frictionUtil ?? 0) > 1) && (
        <p style={{ fontSize: 12, color: '#E74C3C', marginTop: 12, lineHeight: 1.5, marginBottom: 0 }}>
          Feet likely to slip here - needs better foot tension / a real foothold.
        </p>
      )}
    </div>
  );
}

function TrainingFocusCard({ muscle, group, totalKg }) {
  return (
    <MotionCard style={{
      border: '1px solid var(--border)', borderRadius: 8,
      padding: '12px 14px', marginBottom: 10,
      background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
          {muscle} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({group})</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {Math.round(totalKg)} kg
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
        Focus: {TRAINING_FOCUS[group] ?? TRAINING_FOCUS.Other}.
      </p>
    </MotionCard>
  );
}

export default function Analytics() {
  const selectedProblem = useClimbStore(s => s.selectedProblem);
  const climberStats = useClimbStore(s => s.climberStats);
  const beta = useClimbStore(getActiveBeta);
  const selectedWall = useClimbStore(s => s.selectedWall);

  const [activeRowKey, setActiveRowKey] = useState(null);
  const [problemText, setProblemText] = useState('');

  const wall = selectedWall ?? walls.find(w => w.id === selectedProblem?.wallId);
  const wallName = wall?.name ?? selectedProblem?.wallId ?? '-';
  const frameRows = useMemo(() => buildFrameRows(beta), [beta]);
  const analyzed = useMemo(() => (
    Object.fromEntries(
      frameRows
        .filter(row => row.frame?.analysisResult)
        .map(row => [row.key, row.frame.analysisResult]),
    )
  ), [frameRows]);

  const activeResult = activeRowKey ? (analyzed[activeRowKey] ?? null) : null;
  const synthesis = useMemo(
    () => synthesizeClimb(frameRows, beta, selectedProblem, wall, climberStats),
    [frameRows, beta, selectedProblem, wall, climberStats],
  );

  const isEmpty = !selectedProblem || !beta || beta.positions.length === 0;

  if (isEmpty) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12,
      }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>Analytics</span>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          No climb data yet. Design a boulder problem and generate beta first.
        </p>
        <Link to="/designer" style={{
          fontFamily: MONO, fontSize: 12, color: 'var(--accent)',
          textDecoration: 'none', border: '1px solid var(--accent)',
          borderRadius: 6, padding: '6px 14px',
        }}>
          Go to Designer
        </Link>
      </div>
    );
  }

  if (!synthesis) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12, padding: 24,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Analytics
        </span>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6, margin: 0 }}>
          No frames are analyzed yet. Analyze positions or move frames in the Boulder Designer to build contact-driven analytics.
        </p>
        <Link to="/designer" style={{
          fontFamily: MONO, fontSize: 12, color: 'var(--accent)',
          textDecoration: 'none', border: '1px solid var(--accent)',
          borderRadius: 6, padding: '6px 14px',
        }}>
          Open Boulder Designer
        </Link>
      </div>
    );
  }

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
        </tr>,
      );
      lastGroup = row.moveGroup;
    }

    const result = analyzed[row.key];
    const contacts = result?.contacts ?? [];
    const peak = contacts.reduce((best, c) => (!best || c.forceKg > best.forceKg ? c : best), null);
    const slipCount = contacts.filter(c => (c.frictionUtil ?? 0) > 1).length;
    const topMuscle = Object.entries(result?.muscleTotalsKg ?? {}).sort((a, b) => b[1] - a[1])[0];
    const isActive = activeRowKey === row.key;
    const bgColor = isActive ? 'var(--accent-muted)' : rowIdx % 2 === 0 ? '#ffffff' : '#FAFAF8';

    tableContent.push(
      <tr
        key={row.key}
        onClick={() => result && setActiveRowKey(isActive ? null : row.key)}
        style={{ cursor: result ? 'pointer' : 'default', background: bgColor, transition: 'background 0.1s' }}
      >
        <td style={{ padding: '7px 10px 7px 16px', fontFamily: MONO, fontSize: 11, color: 'var(--text-muted)' }}>
          {rowIdx + 1}
        </td>
        <td style={{ padding: '7px 10px', fontSize: 12, color: 'var(--text-primary)' }}>
          {row.label}
        </td>
        <td style={{ padding: '7px 10px', fontSize: 11, color: topMuscle ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
          {topMuscle ? `${topMuscle[0]} (${MUSCLE_GROUP[topMuscle[0]] ?? 'Other'})` : '-'}
        </td>
        <td style={{ padding: '7px 10px', fontFamily: MONO, fontSize: 11, color: 'var(--text-primary)' }}>
          {peak ? `${peak.forceKg.toFixed(1)} kg` : '-'}
        </td>
        <td style={{ padding: '7px 16px 7px 10px', fontFamily: MONO, fontSize: 10, color: slipCount ? '#E74C3C' : 'var(--text-muted)' }}>
          {result ? (slipCount ? `${slipCount} slip` : 'OK') : '-'}
        </td>
      </tr>,
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
                <FrameDetail result={activeResult} />
              </motion.div>
            </AnimatePresence>
          </td>
        </tr>,
      );
    }
  });

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{
        width: '55%', flexShrink: 0, overflowY: 'auto',
        borderRight: '1px solid var(--border)',
      }}>
        <Stagger style={{ display: 'flex', flexDirection: 'column' }}>
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
              {wallName} / {synthesis.analyzedRows.length} analyzed frame{synthesis.analyzedRows.length === 1 ? '' : 's'}
            </span>
          </StaggerItem>

          <StaggerItem>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 44 }} />
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '31%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    {['#', 'Label', 'Top Muscle', 'Peak Contact', 'Slip'].map(h => (
                      <th key={h} style={{
                        padding: '9px 10px 8px',
                        fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--text-muted)',
                        textAlign: 'left', fontWeight: 600,
                        borderBottom: '1px solid var(--border)',
                        ...(h === '#' ? { paddingLeft: 16 } : {}),
                        ...(h === 'Slip' ? { paddingRight: 16 } : {}),
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{tableContent}</tbody>
              </table>
            </div>
          </StaggerItem>

          <StaggerItem style={{ padding: '16px 20px 20px' }}>
            <SectionLabel>What this climb demands</SectionLabel>
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '14px 16px',
            }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {peakContactSentence(synthesis.peakContact)}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {synthesis.hardestMuscles.map(m => (
                  <div key={m.muscle} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {m.muscle} ({m.group}) - {Math.round(m.totalKg)} kg total across the climb
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {Math.round(m.totalLb)} lb
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ margin: '12px 0 0', fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {techniqueNote(synthesis)}
              </p>
            </div>
          </StaggerItem>
        </Stagger>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Stagger style={{ display: 'flex', flexDirection: 'column' }}>
          <StaggerItem style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel>Where you'll struggle</SectionLabel>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {struggleSentence(synthesis.peakContact, climberStats)}
            </p>
          </StaggerItem>

          {synthesis.smearWarnings.length > 0 && (
            <StaggerItem style={{ padding: '16px 20px 0' }}>
              <SectionLabel>Smear Warnings</SectionLabel>
              <div style={{
                background: 'rgba(231,76,60,0.06)',
                border: '1px solid rgba(231,76,60,0.20)',
                borderRadius: 8,
                padding: '10px 12px',
              }}>
                {synthesis.smearWarnings.map((contact, i) => (
                  <p key={`${contact.row.key}-${contact.contactIndex}`} style={{
                    margin: i === 0 ? 0 : '8px 0 0',
                    fontSize: 12, color: '#E74C3C', lineHeight: 1.45,
                  }}>
                    {cap(LIMB_FULL[contact.limb])} on {contact.row.label}: feet likely to slip here - needs better foot tension / a real foothold.
                  </p>
                ))}
              </div>
            </StaggerItem>
          )}

          <StaggerItem style={{ padding: '16px 20px 16px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel>Train this</SectionLabel>
            {synthesis.hardestMuscles.map(m => (
              <TrainingFocusCard key={m.muscle} {...m} />
            ))}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: '10px 0 0' }}>
              Detailed, animated exercise guides come from the recommendations library in Prompt 14.
            </p>
          </StaggerItem>

          <StaggerItem style={{ padding: '16px 20px 20px' }}>
            <SectionLabel>Training Recommendations</SectionLabel>
            <textarea
              value={problemText}
              onChange={e => setProblemText(e.target.value)}
              placeholder="Describe a specific climbing problem you're struggling with..."
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
                style={{ padding: '7px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500 }}
                onClick={() => {}}
              >
                Get Recommendations
              </MotionButton>
            </div>
          </StaggerItem>
        </Stagger>
      </div>
    </div>
  );
}
