import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '/api';

const LESSON_CONTENT = {
  'To be': {
    standard: 'The verb "to be" is the most important verb in English. It changes depending on who we talk about: I am, You are, He/She/It is, We/They are. We use it to describe people, places, and things.',
    simple: 'In English, "to be" means: I AM, YOU ARE, HE IS, SHE IS, IT IS. Think of it as introducing yourself: "I am Maria." "He is tall."',
    exercises: [
      { type:'fill_blank', text:'___ a student.', prefix:'I', correct:'am', options:['am','is','are'] },
      { type:'fill_blank', text:'She ___ my friend.', correct:'is', options:['am','is','are'] },
      { type:'fix_error', text:'They is happy.', correct:'They are happy.', hint:'Which form of "to be" goes with "they"?' },
      { type:'write', instruction:'Write 2 sentences about yourself using "am" and "is".' }
    ]
  },
  'Basic grammar': {
    standard: 'English sentences follow a basic pattern: Subject + Verb + Object. For example: "Maria drinks coffee." Maria is the subject, drinks is the verb, coffee is the object.',
    simple: 'Every English sentence needs: WHO does it (subject) + WHAT they do (verb). Example: "I eat." "She reads." "They work."',
    exercises: [
      { type:'fix_error', text:'Coffee drinks Maria.', correct:'Maria drinks coffee.', hint:'Who is doing the action?' },
      { type:'write', instruction:'Write a sentence about what you do every day. Use: I + verb + object.' }
    ]
  }
};

export default function Lesson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSimple, setShowSimple] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const parts = id?.split('-') || [];
  const skill = parts[0];
  const lessonTitle = parts.slice(3).join(' ') || 'To be';

  const content = LESSON_CONTENT[lessonTitle] || LESSON_CONTENT['To be'];
  const exercises = content.exercises || [];
  const totalSteps = exercises.length + 1;
  const currentExercise = exercises[step - 1];

  async function evaluateAnswer() {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/test/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify({ answer, exercise: currentExercise, lessonTitle })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFeedback(data);
    } catch {
      // Fallback local evaluation
      if (currentExercise.type === 'fill_blank' || currentExercise.type === 'fix_error') {
        const correct = answer.trim().toLowerCase() === (currentExercise.correct || '').toLowerCase();
        setFeedback({ correct, feedback: correct ? 'Well done!' : `Almost. The correct answer is: "${currentExercise.correct}"`, rule: null });
      } else {
        setFeedback({ correct: true, feedback: 'Good effort! Writing practice helps you improve.', rule: null });
      }
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (step < totalSteps - 1) { setStep(s => s+1); setAnswer(''); setFeedback(null); setShowHint(false); }
    else navigate('/lessons');
  }

  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {/* Top bar */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', gap:'1rem', position:'sticky', top:0, zIndex:10 }}>
        <button onClick={() => { if(confirm('Leave lesson? Your progress in this lesson will not be saved.')) navigate('/lessons'); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', fontFamily:'var(--font-sans)', padding:'4px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)', marginBottom:'4px', textAlign:'center' }}>{lessonTitle}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div className="progress-bar" style={{ flex:1 }}>
              <div className="progress-bar-fill" style={{ width:`${progress}%` }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Lesson progress: ${progress}%`} />
            </div>
            <span style={{ fontSize:'11px', color:'var(--text-tertiary)', whiteSpace:'nowrap' }}>{step}/{totalSteps-1}</span>
          </div>
        </div>
        {/* Dyslexia toggle */}
        <button onClick={() => document.body.classList.toggle('dyslexia-mode')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'11px', color:'var(--text-tertiary)', padding:'4px 8px', fontFamily:'var(--font-sans)' }} aria-label="Toggle dyslexia-friendly font">
          Aa
        </button>
      </div>

      {/* Content */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem 1rem' }}>
        <div style={{ width:'100%', maxWidth:'600px' }}>

          {/* Step 0 — Explanation */}
          {step === 0 && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'2rem' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'1rem' }}>Explanation</div>

              {/* Standard explanation */}
              <div style={{ marginBottom:'1.25rem' }}>
                <p style={{ fontSize:'15px', lineHeight:1.8, color:'var(--text)' }}>{content.standard}</p>
              </div>

              {/* Simpler explanation — always visible below */}
              <div style={{ background:'var(--blue-light)', border:'1px solid var(--blue-medium)', borderRadius:'var(--radius-md)', padding:'1rem 1.125rem' }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:'var(--blue-primary)', marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  SIMPLER VERSION
                </div>
                <p style={{ fontSize:'14px', lineHeight:1.75, color:'var(--blue-primary)', margin:0 }}>{content.simple}</p>
              </div>

              <button onClick={() => setStep(1)} className="btn btn-primary btn-lg w-full" style={{ marginTop:'1.5rem' }}>
                Start exercises →
              </button>
            </div>
          )}

          {/* Exercise steps */}
          {step > 0 && currentExercise && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'2rem' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'1.25rem' }}>
                Exercise {step} of {exercises.length}
              </div>

              {/* Question */}
              {currentExercise.type === 'fill_blank' && (
                <div>
                  <p style={{ fontSize:'15px', fontWeight:500, marginBottom:'1rem' }}>Fill in the blank with the correct word.</p>
                  <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'1rem 1.25rem', fontSize:'16px', marginBottom:'1.25rem', lineHeight:1.8 }}>
                    {currentExercise.prefix && <span>{currentExercise.prefix} </span>}
                    <span style={{ display:'inline-block', width:'60px', borderBottom:'2px solid var(--blue-primary)', margin:'0 6px' }} aria-hidden="true" />
                    {currentExercise.text}
                  </div>
                  {!feedback && (
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                      {currentExercise.options?.map(opt => (
                        <button key={opt} onClick={() => setAnswer(opt)} style={{ padding:'0.55rem 1.25rem', border:'1.5px solid', borderRadius:'var(--radius-md)', fontSize:'15px', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all var(--transition)', borderColor: answer===opt ? 'var(--blue-primary)' : 'var(--border)', background: answer===opt ? 'var(--blue-light)' : 'white', color: answer===opt ? 'var(--blue-primary)' : 'var(--text)', fontWeight: answer===opt ? 500 : 400 }} aria-pressed={answer===opt}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentExercise.type === 'fix_error' && (
                <div>
                  <p style={{ fontSize:'15px', fontWeight:500, marginBottom:'1rem' }}>Fix the mistake in this sentence.</p>
                  <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'var(--radius-md)', padding:'1rem 1.25rem', fontSize:'16px', fontStyle:'italic', color:'#B91C1C', marginBottom:'1.25rem' }}>
                    "{currentExercise.text}"
                  </div>
                  {!feedback && (
                    <input type="text" className="form-input" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type the corrected sentence..." onKeyDown={e => e.key==='Enter' && answer.trim() && evaluateAnswer()} autoFocus style={{ fontSize:'15px' }} aria-label="Your corrected sentence" />
                  )}
                </div>
              )}

              {currentExercise.type === 'write' && (
                <div>
                  <p style={{ fontSize:'15px', fontWeight:500, marginBottom:'1rem' }}>{currentExercise.instruction}</p>
                  {!feedback && (
                    <textarea className="form-input" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your answer here..." rows={4} style={{ fontSize:'15px' }} aria-label="Your written answer" />
                  )}
                </div>
              )}

              {/* Hint */}
              {!feedback && currentExercise.hint && (
                <div style={{ marginTop:'0.75rem' }}>
                  {showHint ? (
                    <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:'var(--radius-md)', padding:'0.6rem 0.875rem', fontSize:'13px', color:'#92400E' }}>
                      <strong>Hint: </strong>{currentExercise.hint}
                    </div>
                  ) : (
                    <button onClick={() => setShowHint(true)} style={{ background:'none', border:'none', fontSize:'13px', color:'var(--blue-primary)', cursor:'pointer', fontFamily:'var(--font-sans)', padding:0, textDecoration:'underline' }}>
                      Need a hint?
                    </button>
                  )}
                </div>
              )}

              {/* Submit */}
              {!feedback && (
                <button onClick={evaluateAnswer} disabled={!answer.trim() || loading} className="btn btn-primary" style={{ marginTop:'1.25rem', width:'100%', padding:'0.7rem' }} aria-busy={loading}>
                  {loading ? <><div className="spinner" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,0.3)', width:'15px', height:'15px' }} />Checking...</> : 'Submit answer'}
                </button>
              )}

              {/* Feedback */}
              {feedback && (
                <div>
                  <div style={{ border:'1.5px solid', borderRadius:'var(--radius-lg)', padding:'1.125rem', borderColor: feedback.correct ? '#86EFAC' : '#FCA5A5', background: feedback.correct ? 'var(--green-light)' : '#FFF1F2', marginTop:'0' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                      <div style={{ width:'20px', height:'20px', borderRadius:'50%', background: feedback.correct ? 'var(--green-accent)' : '#EF4444', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {feedback.correct
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        }
                      </div>
                      <span style={{ fontSize:'14px', fontWeight:600, color: feedback.correct ? 'var(--green-accent)' : '#DC2626' }}>
                        {feedback.correct ? 'Well done!' : 'Almost there'}
                      </span>
                    </div>
                    <p style={{ fontSize:'14px', color:'var(--text)', margin:0 }}>{feedback.feedback}</p>
                    {feedback.rule && <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginTop:'6px', borderTop:'1px solid rgba(0,0,0,0.07)', paddingTop:'6px' }}><strong>Rule: </strong>{feedback.rule}</p>}
                  </div>
                  <button onClick={next} className="btn btn-primary" style={{ width:'100%', marginTop:'0.875rem', padding:'0.7rem' }}>
                    {step < totalSteps - 1 ? 'Next exercise →' : 'Finish lesson ✓'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Completion */}
          {step >= totalSteps && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'2.5rem', textAlign:'center' }}>
              <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'var(--green-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-accent)" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontSize:'20px', marginBottom:'0.5rem' }}>Lesson complete</h2>
              <p style={{ color:'var(--text-secondary)', fontSize:'14px', marginBottom:'1.5rem' }}>You finished all exercises. Keep going — consistency is what builds real skill.</p>
              <button onClick={() => navigate('/lessons')} className="btn btn-primary btn-lg" style={{ width:'100%' }}>Back to lessons</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
