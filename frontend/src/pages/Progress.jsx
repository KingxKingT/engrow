import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const SKILL_LABELS = { grammar:'Grammar', vocabulary:'Vocabulary', reading:'Reading', writing:'Writing', dialogue:'Dialogue' };
const CEFR_ORDER = ['A1','A2','B1','B2','C1','C2'];
const CEFR_PLAIN = { A1:'Beginner', A2:'Elementary', B1:'Intermediate', B2:'Upper-intermediate', C1:'Advanced', C2:'Mastery' };

export default function Progress() {
  const { skills, user } = useAuth();
  const skillMap = {};
  (skills || []).forEach(s => { skillMap[s.skill] = s; });
  const joinDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { month:'long', year:'numeric' }) : '';

  return (
    <div className="app-layout">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div style={{ padding:'2rem 2.5rem', maxWidth:'760px', margin:'0 auto' }}>
          <div style={{ marginBottom:'1.75rem' }}>
            <h1 style={{ fontSize:'20px', marginBottom:'4px' }}>Your progress</h1>
            {joinDate && <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Learning with Engrow since {joinDate}</p>}
          </div>

          {/* Skill progress */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'2rem' }}>
            {Object.keys(SKILL_LABELS).map(skill => {
              const d = skillMap[skill];
              const level = d?.cefr_level || 'A1';
              const levelIndex = CEFR_ORDER.indexOf(level);
              const pct = ((levelIndex + 1) / CEFR_ORDER.length) * 100;
              const nextLevel = CEFR_ORDER[levelIndex + 1];
              return (
                <div key={skill} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1.125rem 1.375rem' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)' }}>{SKILL_LABELS[skill]}</div>
                      <div style={{ fontSize:'12px', color:'var(--text-tertiary)' }}>{CEFR_PLAIN[level]}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'18px', fontWeight:700, color:'var(--blue-primary)' }}>{level}</div>
                      {nextLevel && <div style={{ fontSize:'11px', color:'var(--text-tertiary)' }}>Next: {nextLevel}</div>}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width:`${pct}%` }} role="progressbar" aria-valuenow={levelIndex+1} aria-valuemin={1} aria-valuemax={6} aria-label={`${SKILL_LABELS[skill]}: ${level}`} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                    {CEFR_ORDER.map(l => (
                      <span key={l} style={{ fontSize:'10px', color: l===level ? 'var(--blue-primary)' : 'var(--text-tertiary)', fontWeight: l===level ? 700 : 400 }}>{l}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Milestones */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1.25rem 1.375rem' }}>
            <h2 style={{ fontSize:'14px', fontWeight:500, marginBottom:'1rem' }}>Milestones</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', color:'var(--text-secondary)' }}>
                <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'var(--green-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green-accent)" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                Account created — welcome to Engrow
              </div>
              {skills?.some(s => CEFR_ORDER.indexOf(s.cefr_level) >= 2) && (
                <div style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', color:'var(--text-secondary)' }}>
                  <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'var(--green-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green-accent)" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  Reached B1 in at least one skill
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
