import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';
const SKILL_LABELS = { grammar:'Grammar', vocabulary:'Vocabulary', reading:'Reading', writing:'Writing', dialogue:'Dialogue' };
const CEFR_ORDER = ['A1','A2','B1','B2','C1','C2'];
const CEFR_PLAIN = { A1:'Beginner — you know the basics', A2:'Elementary — you handle everyday situations', B1:'Intermediate — you manage most common situations', B2:'Upper-intermediate — you understand complex topics', C1:'Advanced — you express yourself fluently', C2:'Mastery — near-native level' };

export default function PlacementResults() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { getToken, fetchMe } = useAuth();
  const [results, setResults] = useState(state?.results || null);
  const [loading, setLoading] = useState(!results);

  useEffect(() => {
    if (results) return;
    (async () => {
      try {
        const res = await fetch(`${API}/test/status`, { headers:{ Authorization:`Bearer ${getToken()}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.status === 'completed' && data.results) {
          setResults(data.results);
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch {
        navigate('/dashboard', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem', background:'var(--bg)' }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'24px', color:'var(--blue-primary)' }}>Engrow</div>
        <div className="spinner" />
      </div>
    );
  }

  if (!results) return null;

  const { levels, explanations } = results;
  const skillEntries = Object.entries(levels);
  const weakest = skillEntries.reduce((min, curr) =>
    CEFR_ORDER.indexOf(curr[1]) < CEFR_ORDER.indexOf(min[1]) ? curr : min
  );

  async function goToDashboard() {
    await fetchMe();
    navigate('/dashboard');
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'2rem 1rem 4rem' }}>
      <div style={{ maxWidth:'640px', margin:'0 auto' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'24px', color:'var(--blue-primary)', letterSpacing:'-0.02em', marginBottom:'1.5rem' }}>Engrow</div>
          <h1 style={{ fontSize:'26px', fontWeight:500, letterSpacing:'-0.02em', marginBottom:'0.5rem' }}>Your English profile</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'14px', lineHeight:1.75 }}>Each skill was tested and placed separately. Here is exactly where you stand — and why.</p>
        </div>

        {/* Skill cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'1.25rem' }}>
          {skillEntries.map(([skill, level]) => {
            const levelIndex = CEFR_ORDER.indexOf(level);
            const pct = ((levelIndex + 1) / CEFR_ORDER.length) * 100;
            const isWeakest = skill === weakest[0];

            return (
              <div key={skill} style={{ background:'var(--surface)', border:`1.5px solid ${isWeakest ? 'var(--blue-primary)' : 'var(--border)'}`, borderRadius:'var(--radius-lg)', padding:'1.125rem 1.375rem', boxShadow: isWeakest ? '0 0 0 3px rgba(27,79,216,0.08)' : 'none' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem', marginBottom:'10px' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                      <span style={{ fontSize:'14px', fontWeight:500, color:'var(--text)' }}>{SKILL_LABELS[skill]}</span>
                      {isWeakest && (
                        <span style={{ background:'var(--blue-primary)', color:'white', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'var(--radius-full)', letterSpacing:'0.03em' }}>
                          PRIORITY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'12px', color:'var(--text-tertiary)' }}>{CEFR_PLAIN[level]}</div>
                  </div>
                  <div style={{ fontSize:'20px', fontWeight:700, color:'var(--blue-primary)', flexShrink:0 }}>{level}</div>
                </div>

                {/* Level bar */}
                <div style={{ marginBottom:'10px' }}>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width:`${pct}%` }} role="progressbar" aria-valuenow={levelIndex+1} aria-valuemin={1} aria-valuemax={6} aria-label={`${SKILL_LABELS[skill]}: ${level}`} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:'3px' }}>
                    {CEFR_ORDER.map(l => (
                      <span key={l} style={{ fontSize:'10px', color: l===level ? 'var(--blue-primary)' : 'var(--text-tertiary)', fontWeight: l===level ? 700 : 400 }}>{l}</span>
                    ))}
                  </div>
                </div>

                {explanations[skill] && (
                  <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.7, borderTop:'1px solid var(--border)', paddingTop:'10px', margin:0 }}>
                    {explanations[skill]}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* What happens next */}
        <div style={{ background:'var(--blue-light)', border:'1px solid var(--blue-medium)', borderRadius:'var(--radius-lg)', padding:'1.125rem 1.375rem', marginBottom:'1rem' }}>
          <h2 style={{ fontSize:'14px', fontWeight:600, color:'var(--blue-primary)', marginBottom:'6px' }}>What happens next</h2>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.75, margin:0 }}>
            We will start with <strong style={{ color:'var(--text)' }}>{SKILL_LABELS[weakest[0]]}</strong> — your weakest area. As each skill improves, the others get more attention too. Every lesson is explained twice: once normally, and once in simpler language. You can change this in settings.
          </p>
        </div>

        {/* Override option */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', marginBottom:'1.25rem', gap:'1rem' }}>
          <span style={{ fontSize:'13px', color:'var(--text-tertiary)' }}>These results don't feel right?</span>
          <button onClick={() => navigate('/placement-test')} style={{ background:'none', border:'none', fontSize:'13px', color:'var(--blue-primary)', cursor:'pointer', fontFamily:'var(--font-sans)', padding:0, textDecoration:'underline', flexShrink:0 }}>
            Retake the test
          </button>
        </div>

        <button onClick={goToDashboard} className="btn btn-primary btn-lg" style={{ width:'100%' }}>
          Start learning →
        </button>
      </div>
    </div>
  );
}
