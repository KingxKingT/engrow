import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

const SKILL_LABELS = { grammar:'Grammar', vocabulary:'Vocabulary', reading:'Reading', writing:'Writing', dialogue:'Dialogue', listening:'Listening' };
const CEFR_ORDER = ['A1','A2','B1','B2','C1','C2'];
const CEFR_PLAIN = { A1:'Beginner', A2:'Elementary', B1:'Intermediate', B2:'Upper-intermediate', C1:'Advanced', C2:'Mastery' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user, skills } = useAuth();
  const navigate = useNavigate();
  const skillMap = {};
  (skills || []).forEach(s => { skillMap[s.skill] = s; });
  const weakest = skills?.length ? skills.reduce((min, curr) => CEFR_ORDER.indexOf(curr.cefr_level) < CEFR_ORDER.indexOf(min.cefr_level) ? curr : min) : null;
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="app-layout">
      <Sidebar />
      <main id="main-content" className="app-main" style={{ display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'2rem 2.5rem', maxWidth:'820px', width:'100%', margin:'0 auto', gap:'1.5rem' }}>

          {/* Header */}
          <div>
            <h1 style={{ fontSize:'22px', marginBottom:'3px' }}>{getGreeting()}, {firstName}.</h1>
            <p style={{ fontSize:'13.5px', color:'var(--text-secondary)' }}>
              {weakest ? <>Your priority today: <strong style={{ color:'var(--text)' }}>{SKILL_LABELS[weakest.skill]}</strong></> : 'Complete your placement test to get started.'}
            </p>
          </div>

          {/* Today's lesson — main action */}
          {weakest && (
            <div style={{ background:'var(--blue-primary)', borderRadius:'var(--radius-xl)', padding:'1.5rem', color:'white' }}>
              <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.06em', opacity:0.7, marginBottom:'6px', textTransform:'uppercase' }}>Today's lesson</div>
              <div style={{ fontSize:'18px', fontWeight:500, marginBottom:'4px' }}>{SKILL_LABELS[weakest.skill]}</div>
              <div style={{ fontSize:'13px', opacity:0.8, marginBottom:'1.25rem' }}>
                {weakest.cefr_level} level — {CEFR_PLAIN[weakest.cefr_level]}. Estimated 5–7 minutes.
              </div>
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <button onClick={() => navigate('/lessons')} style={{ background:'white', color:'var(--blue-primary)', border:'none', padding:'0.55rem 1.25rem', borderRadius:'var(--radius-md)', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-sans)' }}>
                  Start lesson →
                </button>
                <button onClick={() => navigate('/lessons')} style={{ background:'none', border:'1px solid rgba(255,255,255,0.35)', color:'white', padding:'0.55rem 1.1rem', borderRadius:'var(--radius-md)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
                  Choose skill
                </button>
              </div>
            </div>
          )}

          {/* Skill levels — all 5 visible, no scroll */}
          <div>
            <h2 style={{ fontSize:'13px', fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' }}>Your skill levels</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'10px' }}>
              {Object.keys(SKILL_LABELS).map(skill => {
                const d = skillMap[skill];
                const level = d?.cefr_level || 'A1';
                const pct = ((CEFR_ORDER.indexOf(level) + 1) / CEFR_ORDER.length) * 100;
                return (
                  <button key={skill} onClick={() => navigate('/lessons')} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem', textAlign:'left', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='var(--blue-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
                    aria-label={`${SKILL_LABELS[skill]}: ${level}`}>
                    <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginBottom:'4px' }}>{SKILL_LABELS[skill]}</div>
                    <div style={{ fontSize:'16px', fontWeight:600, color:'var(--blue-primary)', marginBottom:'10px' }}>{level}</div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width:`${pct}%` }} role="progressbar" aria-valuenow={CEFR_ORDER.indexOf(level)+1} aria-valuemin={1} aria-valuemax={6} aria-label={level} />
                    </div>
                    <div style={{ fontSize:'11px', color:'var(--text-tertiary)', marginTop:'5px' }}>{CEFR_PLAIN[level]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <button onClick={() => navigate('/progress')} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem 1.25rem', textAlign:'left', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'border-color var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--blue-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)', marginBottom:'2px' }}>View progress</div>
              <div style={{ fontSize:'12px', color:'var(--text-tertiary)' }}>See how far you've come</div>
            </button>
            <button onClick={() => navigate('/lessons')} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem 1.25rem', textAlign:'left', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'border-color var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--blue-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)', marginBottom:'2px' }}>Review mistakes</div>
              <div style={{ fontSize:'12px', color:'var(--text-tertiary)' }}>Practice what you got wrong</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
