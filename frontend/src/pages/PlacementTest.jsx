import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '/api';
const SKILL_LABELS = { grammar:'Grammar', vocabulary:'Vocabulary', reading:'Reading', writing:'Writing', dialogue:'Dialogue Comprehension' };
const SKILL_DESCRIPTIONS = { grammar:'Grammar rules and sentence structure', vocabulary:'Word knowledge and usage', reading:'Understanding written English', writing:'Expressing ideas in writing', dialogue:'Understanding real conversations' };
const SKILL_ORDER = ['grammar','vocabulary','reading','writing','dialogue'];

export default function PlacementTest() {
  const { getToken, markTestComplete } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('welcome');
  const [testId, setTestId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [skillDone, setSkillDone] = useState(null);
  const [error, setError] = useState('');
  const [writingLevel, setWritingLevel] = useState(null);
  const [serverWaking, setServerWaking] = useState(false);
  const wakeTimerRef = useRef(null);
  const topRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('engrow_test_id');
    if (saved) setTestId(saved);
    return () => { if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current); };
  }, []);

  async function startTest() {
    setLoading(true);
    setError('');
    // Show "waking up" message if API takes more than 4 seconds
    wakeTimerRef.current = setTimeout(() => setServerWaking(true), 4000);
    try {
      const res = await fetch(`${API}/test/start`, {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` }
      });
      clearTimeout(wakeTimerRef.current);
      setServerWaking(false);
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setTestId(data.testId);
      localStorage.setItem('engrow_test_id', data.testId);
      setPhase('testing');
      await fetchQuestion(data.testId);
    } catch (e) {
      clearTimeout(wakeTimerRef.current);
      setServerWaking(false);
      setError('Could not connect. Please try again — sometimes the server takes up to 30 seconds to wake up.');
      setLoading(false);
    }
  }

  async function fetchQuestion(id) {
    const tid = id || testId;
    setLoading(true);
    setFeedback(null);
    setAnswer('');
    setShowHint(false);
    setWritingLevel(null);
    setError('');
    try {
      const res = await fetch(`${API}/test/${tid}/question`, { headers:{ Authorization:`Bearer ${getToken()}` } });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.completed || (data.skillComplete && data.allComplete)) {
        await completeTest(tid); return;
      }
      if (data.skillComplete) {
        setSkillDone({ skill:data.completedSkill, level:data.completedLevel, next:data.nextSkill });
        setPhase('skill_done'); setLoading(false); return;
      }
      setQuestion(data.question);
      setProgress(data.progress);
      setTimeout(() => topRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 100);
    } catch {
      setError('Could not load question. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;

    setError('');
    setSubmitting(true);
    wakeTimerRef.current = setTimeout(() => setServerWaking(true), 4000);
    try {
      const res = await fetch(`${API}/test/${testId}/answer`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify({ answer:answer.trim(), skill:question.skill, level:question.level, questionType:question.type, questionData:question })
      });
      clearTimeout(wakeTimerRef.current);
      setServerWaking(false);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.tooShort) { setError(data.feedback); return; }
      if (data.writingLevel) setWritingLevel(data.writingLevel);
      setFeedback(data);
    } catch {
      clearTimeout(wakeTimerRef.current);
      setServerWaking(false);
      setError('Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function completeTest(tid) {
    setPhase('completing');
    try {
      const res = await fetch(`${API}/test/${tid}/complete`, { method:'POST', headers:{ Authorization:`Bearer ${getToken()}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      markTestComplete();
      localStorage.removeItem('engrow_test_id');
      navigate('/placement-results', { state:{ results:data } });
    } catch {
      setError('Could not complete test. Please refresh and try again.');
      setPhase('testing');
    }
  }

  function continueSkill() { setPhase('testing'); setSkillDone(null); fetchQuestion(); }

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).filter(Boolean).length : 0;

  if (phase === 'welcome') return <Welcome onStart={startTest} loading={loading} serverWaking={serverWaking} error={error} />;
  if (phase === 'skill_done') return <SkillDone info={skillDone} onContinue={continueSkill} />;
  if (phase === 'completing') return <Completing />;

  return (
    <div style={S.page}>
      <div ref={topRef} style={S.container}>

        {/* Skill progress pills */}
        {progress && (
          <div style={S.skillBar}>
            {SKILL_ORDER.map((s, i) => {
              const done = i < progress.skillIndex;
              const current = s === progress.currentSkill;
              return (
                <div key={s} style={{ ...S.skillChip,
                  background: done ? '#DCFCE7' : current ? '#EEF2FF' : 'var(--surface)',
                  borderColor: done ? '#86EFAC' : current ? 'var(--blue-primary)' : 'var(--border)',
                  color: done ? '#15803D' : current ? 'var(--blue-primary)' : 'var(--text-tertiary)',
                  fontWeight: current ? 600 : 400
                }}>
                  {done && '✓ '}{SKILL_LABELS[s]}
                </div>
              );
            })}
            <button onClick={() => { if(confirm('Leave? Progress is saved — you can continue later.')) navigate('/dashboard'); }} style={S.exitBtn}>
              Save & exit
            </button>
          </div>
        )}

        {/* Server waking up notice */}
        {serverWaking && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'13px', color:'#92400E', display:'flex', alignItems:'center', gap:'8px' }}>
            <div className="spinner" style={{ width:'14px', height:'14px', borderWidth:'2px', borderColor:'#FCD34D', borderTopColor:'#D97706' }} />
            The server is waking up — this can take up to 30 seconds. Please wait.
          </div>
        )}

        {error && !serverWaking && (
          <div className="alert alert-error" style={{ marginBottom:'1rem' }} role="alert">{error}</div>
        )}

        {/* Question card */}
        {loading && !question ? <Skeleton /> : question ? (
          <div style={S.card}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'1.25rem' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'var(--blue-primary)', flexShrink:0 }} />
              <span style={{ fontSize:'13px', color:'var(--text-secondary)' }}>
                {SKILL_LABELS[question.skill]} — {SKILL_DESCRIPTIONS[question.skill]}
              </span>
            </div>

            {progress?.showEncouragement && (
              <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:'var(--radius-md)', padding:'0.65rem 0.875rem', fontSize:'13px', color:'#92400E', marginBottom:'1.25rem' }}>
                Getting harder on purpose — this is how we find your real ceiling. Keep going.
              </div>
            )}

            <p style={{ fontSize:'15px', fontWeight:500, color:'var(--text)', marginBottom:'1rem', lineHeight:1.5 }}>
              {question.instruction}
            </p>

            {/* Passage */}
            {question.text && !['fill_blank','fix_error'].includes(question.type) && (
              <div style={S.passage}>{question.text}</div>
            )}

            {/* Comprehension question */}
            {question.question && (
              <p style={{ fontSize:'15px', fontWeight:500, color:'var(--text)', marginTop:'0.75rem', marginBottom:'1rem' }}>
                {question.question}
              </p>
            )}

            {/* Error sentence */}
            {question.type === 'fix_error' && (
              <div style={{ background:'#FFF1F2', border:'1px solid #FECACA', borderRadius:'var(--radius-md)', padding:'0.875rem 1rem', marginBottom:'1rem', fontStyle:'italic', color:'#B91C1C', fontSize:'15px' }}>
                "{question.text}"
              </div>
            )}

            {/* Word highlight */}
            {question.word && (
              <div style={{ background:'var(--blue-light)', border:'1px solid var(--blue-medium)', borderRadius:'var(--radius-md)', padding:'0.875rem 1.25rem', marginBottom:'1rem', textAlign:'center' }}>
                <span style={{ fontFamily:'var(--font-serif)', fontSize:'26px', color:'var(--blue-primary)' }}>{question.word}</span>
              </div>
            )}

            {/* Answer area */}
            {!feedback && (
              <div>
                {/* Multiple choice */}
                {(question.type === 'fill_blank' || question.type === 'choose_correct') && question.options ? (
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'1rem' }} role="group" aria-label="Choose your answer">
                    {question.options.map(opt => (
                      <button key={opt} onClick={() => setAnswer(opt)} aria-pressed={answer===opt}
                        style={{ padding:'0.6rem 1.25rem', border:'1.5px solid', borderRadius:'var(--radius-md)', fontSize:'14px', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all 0.14s',
                          borderColor:answer===opt?'var(--blue-primary)':'var(--border)',
                          background:answer===opt?'var(--blue-light)':'white',
                          color:answer===opt?'var(--blue-primary)':'var(--text)',
                          fontWeight:answer===opt?500:400
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : question.type === 'free_write' ? (
                  <div>
                    <div style={{ background:'var(--blue-light)', border:'1px solid var(--blue-medium)', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', marginBottom:'0.875rem', fontSize:'13px', color:'var(--blue-primary)', lineHeight:1.6 }}>
                      Write about a real experience — the more genuine, the more accurate your result will be. Aim for at least a paragraph.
                    </div>
                    <textarea className="form-input" value={answer} onChange={e => { setAnswer(e.target.value); setError(''); }}
                      placeholder="Write your answer here..." rows={8} aria-label="Your written answer"
                      style={{ fontSize:'15px', lineHeight:1.8 }} />
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'5px' }}>
                      <span style={{ fontSize:'12px', color:'var(--text-tertiary)' }}>
                        {wordCount} words
                      </span>
                      <span style={{ fontSize:'12px', color:'var(--text-tertiary)' }}>Suggested: 80–150 words</span>
                    </div>
                  </div>
                ) : (
                  <input type="text" className="form-input" value={answer}
                    onChange={e => { setAnswer(e.target.value); setError(''); }}
                    placeholder="Type your answer here..."
                    onKeyDown={e => e.key==='Enter' && answer.trim() && !submitting && submitAnswer()}
                    autoFocus aria-label="Your answer" style={{ fontSize:'15px' }} />
                )}

                {/* Submit */}
                <button onClick={submitAnswer} disabled={!answer.trim() || submitting} className="btn btn-primary"
                  style={{ width:'100%', marginTop:'1.125rem', padding:'0.7rem' }} aria-busy={submitting}>
                  {submitting
                    ? <><div className="spinner" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,0.3)', width:'15px', height:'15px' }} />
                        {question.type==='free_write' ? 'Analysing your writing...' : 'Checking your answer...'}
                      </>
                    : question.type === 'free_write' ? 'Submit writing →' : 'Submit answer →'
                  }
                </button>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div aria-live="polite">
                {writingLevel ? (
                  <div style={{ background:'var(--blue-light)', border:'1.5px solid var(--blue-medium)', borderRadius:'var(--radius-lg)', padding:'1.25rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--blue-primary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:'14px', fontWeight:600, color:'var(--blue-primary)' }}>Writing analysed</div>
                        <div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Detected level: <strong>{writingLevel}</strong></div>
                      </div>
                    </div>
                    <p style={{ fontSize:'13px', color:'var(--text-secondary)', margin:0, lineHeight:1.7 }}>{feedback.feedback}</p>
                  </div>
                ) : (
                  <div style={{ border:'1.5px solid', borderRadius:'var(--radius-lg)', padding:'1.125rem',
                    borderColor:feedback.correct?'#86EFAC':'#FECACA',
                    background:feedback.correct?'#F0FDF4':'#FFF1F2'
                  }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                      <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:feedback.correct?'var(--green-accent)':'#EF4444', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'2px' }}>
                        {feedback.correct
                          ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        }
                      </div>
                      <p style={{ fontSize:'14px', color:'var(--text)', margin:0, lineHeight:1.65, flex:1 }}>
                        {feedback.feedback}
                      </p>
                    </div>
                    {feedback.correction && (
                      <div style={{ background:'rgba(255,255,255,0.7)', borderRadius:'var(--radius-md)', padding:'8px 10px', marginTop:'6px' }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text-secondary)', marginBottom:'2px' }}>CORRECT ANSWER</div>
                        <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)' }}>{feedback.correction}</div>
                      </div>
                    )}
                    {feedback.rule && (
                      <div style={{ background:'rgba(255,255,255,0.7)', borderRadius:'var(--radius-md)', padding:'8px 10px', marginTop:'6px' }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text-secondary)', marginBottom:'2px' }}>THE RULE</div>
                        <div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{feedback.rule}</div>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => fetchQuestion()} className="btn btn-primary" style={{ width:'100%', marginTop:'0.875rem', padding:'0.7rem' }}>
                  Next question →
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Welcome({ onStart, loading, serverWaking, error }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:'2rem 1rem' }}>
      <div style={{ maxWidth:'500px', width:'100%' }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'26px', color:'var(--blue-primary)', letterSpacing:'-0.02em', marginBottom:'2rem', textAlign:'center' }}>Engrow</div>
        <h1 style={{ fontSize:'24px', fontWeight:500, marginBottom:'0.875rem', letterSpacing:'-0.02em', textAlign:'center' }}>Your placement test</h1>
        <p style={{ color:'var(--text-secondary)', fontSize:'14px', lineHeight:1.75, marginBottom:'1.5rem', textAlign:'center' }}>
          This test checks 5 skills separately. It adapts to your level as you go. Takes about <strong>12–18 minutes</strong>.
        </p>

        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1.125rem 1.375rem', marginBottom:'1.25rem' }}>
          {[
            ['Grammar','Fix errors and write sentences — tests real knowledge'],
            ['Vocabulary','Define words and use them — tests depth, not guessing'],
            ['Reading','Passages that get harder — tests real comprehension'],
            ['Writing','Write 80–150 words — AI reads and assesses your level'],
            ['Dialogue','Real conversations — tests meaning and tone']
          ].map(([skill, desc], i) => (
            <div key={skill} style={{ display:'flex', gap:'10px', alignItems:'flex-start', marginBottom: i < 4 ? '10px' : 0 }}>
              <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'var(--blue-light)', color:'var(--blue-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0, marginTop:'2px' }}>{i+1}</div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)' }}>{skill}</div>
                <div style={{ fontSize:'12px', color:'var(--text-tertiary)', marginTop:'1px' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:'var(--blue-light)', border:'1px solid var(--blue-medium)', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', marginBottom:'1.25rem', fontSize:'13px', color:'var(--blue-primary)', lineHeight:1.6 }}>
          The test gets harder near the end on purpose — this is how we find your real ceiling. If it feels hard, that is correct.
        </div>

        {serverWaking && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'13px', color:'#92400E', display:'flex', alignItems:'center', gap:'8px' }}>
            <div className="spinner" style={{ width:'14px', height:'14px', borderWidth:'2px', borderColor:'#FCD34D', borderTopColor:'#D97706' }} />
            Server is waking up — please wait up to 30 seconds. Do not refresh.
          </div>
        )}

        {error && !serverWaking && (
          <div className="alert alert-error" style={{ marginBottom:'1rem' }} role="alert">{error}
            <button onClick={onStart} style={{ marginLeft:'10px', background:'none', border:'none', color:'var(--amber-error)', textDecoration:'underline', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:'13px' }}>
              Try again
            </button>
          </div>
        )}

        <button onClick={onStart} disabled={loading} className="btn btn-primary btn-lg" style={{ width:'100%' }}>
          {loading && !serverWaking
            ? <><div className="spinner" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,0.3)' }} />Connecting...</>
            : loading && serverWaking
            ? <><div className="spinner" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,0.3)' }} />Waiting for server...</>
            : 'Start placement test'}
        </button>
        <p style={{ textAlign:'center', fontSize:'12px', color:'var(--text-tertiary)', marginTop:'0.875rem' }}>
          Free — progress is saved if you need to stop
        </p>
      </div>
    </div>
  );
}

function SkillDone({ info, onContinue }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:'2rem 1rem' }}>
      <div style={{ maxWidth:'440px', width:'100%', textAlign:'center' }}>
        <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize:'20px', fontWeight:500, marginBottom:'0.5rem' }}>{SKILL_LABELS[info?.skill]} complete</h2>
        <p style={{ color:'var(--text-secondary)', fontSize:'14px', lineHeight:1.75, marginBottom:'1.5rem' }}>
          Next: <strong>{SKILL_LABELS[info?.next]}</strong> — {SKILL_DESCRIPTIONS[info?.next]}
        </p>
        <button onClick={onContinue} className="btn btn-primary btn-lg" style={{ width:'100%' }}>Continue →</button>
      </div>
    </div>
  );
}

function Completing() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:'1rem' }}>
      <div className="spinner" style={{ width:'28px', height:'28px', borderWidth:'2.5px' }} />
      <p style={{ color:'var(--text-secondary)', fontSize:'15px' }}>Analysing your results...</p>
      <p style={{ color:'var(--text-tertiary)', fontSize:'13px' }}>This takes about 15 seconds</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'2rem' }}>
      <div className="skeleton" style={{ height:'12px', width:'40%', marginBottom:'1.5rem' }} />
      <div className="skeleton" style={{ height:'16px', width:'75%', marginBottom:'1rem' }} />
      <div className="skeleton" style={{ height:'80px', marginBottom:'1.5rem' }} />
      <div className="skeleton" style={{ height:'40px', width:'55%' }} />
    </div>
  );
}

const S = {
  page: { minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', padding:'1.5rem 1rem 3rem' },
  container: { width:'100%', maxWidth:'620px' },
  skillBar: { display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'1.25rem' },
  skillChip: { padding:'3px 10px', borderRadius:'var(--radius-full)', fontSize:'12px', border:'1px solid', transition:'all 0.15s' },
  exitBtn: { marginLeft:'auto', background:'none', border:'none', fontSize:'12px', color:'var(--text-tertiary)', cursor:'pointer', fontFamily:'var(--font-sans)', padding:'3px 6px' },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'2rem', boxShadow:'var(--shadow-md)' },
  passage: { background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'1rem 1.125rem', fontSize:'14px', lineHeight:1.85, color:'var(--text)', marginBottom:'1rem', whiteSpace:'pre-line' }
};
