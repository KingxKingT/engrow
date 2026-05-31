import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '/api';

const SKILL_LABELS = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  reading: 'Reading',
  writing: 'Writing',
  dialogue: 'Dialogue'
};

const SKILL_DESCRIPTIONS = {
  grammar: 'How well you use English rules',
  vocabulary: 'How many words you know and use',
  reading: 'How well you understand written English',
  writing: 'How well you express ideas in writing',
  dialogue: 'How well you understand real conversations'
};

const SKILL_COLORS = {
  grammar: '#2563EB',
  vocabulary: '#7C3AED',
  reading: '#0891B2',
  writing: '#059669',
  dialogue: '#D97706'
};

export default function PlacementTest() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('welcome'); // welcome, testing, skill_complete, all_complete
  const [testId, setTestId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [skillComplete, setSkillComplete] = useState(null);
  const [error, setError] = useState('');
  const questionRef = useRef(null);

  // Save progress to localStorage
  useEffect(() => {
    if (testId) localStorage.setItem('engrow_test_id', testId);
  }, [testId]);

  async function startTest() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/test/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await res.json();
      setTestId(data.testId);
      setPhase('testing');
      await fetchQuestion(data.testId);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuestion(id) {
    const tid = id || testId;
    setLoading(true);
    setFeedback(null);
    setAnswer('');
    setShowHint(false);
    try {
      const res = await fetch(`${API}/test/${tid}/question`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();

      if (data.completed) {
        await completeTest(tid);
        return;
      }

      if (data.skillComplete) {
        if (data.allComplete) {
          await completeTest(tid);
        } else {
          setSkillComplete({ skill: data.completedSkill, level: data.completedLevel, nextSkill: data.nextSkill });
          setPhase('skill_complete');
        }
        return;
      }

      setQuestion(data.question);
      setProgress(data.progress);

      // Move focus to question for accessibility
      setTimeout(() => questionRef.current?.focus(), 100);
    } catch {
      setError('Could not load question. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/test/${testId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          answer: answer.trim(),
          skill: question.skill,
          level: question.level,
          questionType: question.type,
          questionData: question
        })
      });
      const data = await res.json();
      setFeedback(data);
    } catch {
      setError('Could not submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function completeTest(tid) {
    setPhase('completing');
    try {
      const res = await fetch(`${API}/test/${tid}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      localStorage.removeItem('engrow_test_id');
      navigate('/placement-results', { state: { results: data } });
    } catch {
      setError('Could not complete test. Please refresh.');
    }
  }

  function continueToNextSkill() {
    setPhase('testing');
    setSkillComplete(null);
    fetchQuestion();
  }

  if (phase === 'welcome') return <WelcomeScreen onStart={startTest} loading={loading} />;
  if (phase === 'skill_complete') return <SkillCompleteScreen info={skillComplete} onContinue={continueToNextSkill} />;
  if (phase === 'completing') return <CompletingScreen />;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <div style={styles.skillPills}>
            {Object.keys(SKILL_LABELS).map((s, i) => {
              const isCurrent = progress?.currentSkill === s;
              const isDone = progress ? i < progress.skillIndex : false;
              return (
                <div key={s} style={{
                  ...styles.skillPill,
                  background: isDone ? 'var(--color-success-light)' : isCurrent ? SKILL_COLORS[s] + '15' : 'transparent',
                  color: isDone ? 'var(--color-success)' : isCurrent ? SKILL_COLORS[s] : 'var(--color-text-tertiary)',
                  borderColor: isDone ? 'var(--color-success)' : isCurrent ? SKILL_COLORS[s] : 'var(--color-border)',
                  fontWeight: isCurrent ? 600 : 400
                }}>
                  {isDone && <span aria-hidden="true">✓ </span>}
                  {SKILL_LABELS[s]}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (confirm('Leave the test? Your progress is saved and you can continue later.')) {
                navigate('/dashboard');
              }
            }}
            style={styles.exitBtn}
            aria-label="Exit test — your progress is saved"
          >
            Save & exit
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }} role="alert">
            {error}
          </div>
        )}

        {/* Question area */}
        {loading ? (
          <QuestionSkeleton />
        ) : question ? (
          <div style={styles.questionCard}>
            {/* Skill header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: SKILL_COLORS[question.skill],
                flexShrink: 0
              }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {SKILL_LABELS[question.skill]} — {SKILL_DESCRIPTIONS[question.skill]}
              </span>
            </div>

            {/* Encouragement if struggling */}
            {progress?.showEncouragement && (
              <div style={styles.encouragement}>
                This is meant to be hard — that's how we find your real level. Keep going.
              </div>
            )}

            {/* Question */}
            <div
              ref={questionRef}
              tabIndex={-1}
              style={styles.questionText}
              aria-live="polite"
            >
              <p style={styles.instruction}>{question.instruction}</p>

              {/* Reading passage */}
              {question.text && question.type !== 'fill_blank' && question.type !== 'fix_error' && (
                <div style={styles.passage}>{question.text}</div>
              )}

              {/* Question for comprehension */}
              {question.question && (
                <p style={styles.questionPrompt}>{question.question}</p>
              )}

              {/* Fix error sentence */}
              {question.type === 'fix_error' && (
                <div style={styles.errorSentence}>
                  <span style={{ color: 'var(--color-error)', fontStyle: 'italic' }}>"{question.text}"</span>
                </div>
              )}

              {/* Word to define or use */}
              {question.word && (
                <div style={styles.wordHighlight}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--color-primary)' }}>
                    {question.word}
                  </span>
                </div>
              )}
            </div>

            {/* Answer area */}
            {!feedback && (
              <div style={{ marginTop: '1.5rem' }}>
                {question.type === 'fill_blank' && question.options ? (
                  // Multiple choice for fill in blank
                  <div style={styles.optionsGrid} role="group" aria-label="Choose your answer">
                    {question.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setAnswer(opt)}
                        style={{
                          ...styles.optionBtn,
                          borderColor: answer === opt ? 'var(--color-primary)' : 'var(--color-border)',
                          background: answer === opt ? 'var(--color-primary-light)' : 'white',
                          color: answer === opt ? 'var(--color-primary)' : 'var(--color-text)',
                          fontWeight: answer === opt ? 500 : 400
                        }}
                        aria-pressed={answer === opt}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : question.type === 'choose_correct' && question.options ? (
                  <div style={styles.optionsGrid} role="group" aria-label="Choose your answer">
                    {question.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setAnswer(opt)}
                        style={{
                          ...styles.optionBtn,
                          borderColor: answer === opt ? 'var(--color-primary)' : 'var(--color-border)',
                          background: answer === opt ? 'var(--color-primary-light)' : 'white',
                          color: answer === opt ? 'var(--color-primary)' : 'var(--color-text)'
                        }}
                        aria-pressed={answer === opt}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  // Text input for everything else
                  <div>
                    {question.type === 'free_write' ? (
                      <textarea
                        className="form-input"
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Write your answer here..."
                        rows={6}
                        aria-label="Your answer"
                        style={{ fontSize: '15px' }}
                      />
                    ) : (
                      <input
                        type="text"
                        className="form-input"
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        onKeyDown={e => e.key === 'Enter' && answer.trim() && submitAnswer()}
                        aria-label="Your answer"
                        autoFocus
                      />
                    )}

                    {/* Word count for free write */}
                    {question.type === 'free_write' && (
                      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '6px', textAlign: 'right' }}>
                        {answer.trim().split(/\s+/).filter(Boolean).length} words
                        {question.minWords && ` (aim for at least ${question.minWords})`}
                      </p>
                    )}
                  </div>
                )}

                {/* Hint */}
                {question.hint && (
                  <div style={{ marginTop: '1rem' }}>
                    {showHint ? (
                      <div style={styles.hintBox}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-warning)' }}>Hint: </span>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{question.hint}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowHint(true)}
                        style={styles.hintBtn}
                        aria-label="Show hint"
                      >
                        Need a hint?
                      </button>
                    )}
                  </div>
                )}

                {/* Submit */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '1.25rem' }}>
                  <button
                    onClick={submitAnswer}
                    disabled={!answer.trim() || submitting}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.7rem' }}
                    aria-busy={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)', width: '16px', height: '16px' }} />
                        Checking...
                      </>
                    ) : 'Submit answer'}
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div style={{ marginTop: '1.5rem' }} aria-live="polite" aria-label="Feedback on your answer">
                <div style={{
                  ...styles.feedbackBox,
                  borderColor: feedback.correct ? 'var(--green-500)' : 'var(--color-error)',
                  background: feedback.correct ? 'var(--color-success-light)' : 'var(--color-error-light)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: feedback.correct ? 'var(--color-success)' : 'var(--color-error)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {feedback.correct ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: feedback.correct ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      {feedback.correct ? 'Well done!' : 'Almost there'}
                    </span>
                  </div>

                  <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: feedback.correction ? '8px' : 0 }}>
                    {feedback.feedback}
                  </p>

                  {feedback.correction && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>
                        Correct answer:
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                        {feedback.correction}
                      </span>
                    </div>
                  )}

                  {feedback.rule && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>
                        The rule:
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        {feedback.rule}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => fetchQuestion()}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem', padding: '0.7rem' }}
                >
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

function WelcomeScreen({ onStart, loading }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        <a href="/" style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--color-primary)', letterSpacing: '-0.02em', textDecoration: 'none', display: 'block', marginBottom: '2.5rem' }}>
          Engrow
        </a>

        <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Let's find your real English level
        </h1>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', lineHeight: 1.75, marginBottom: '2rem' }}>
          This test checks 5 skills separately: grammar, vocabulary, reading, writing, and dialogue comprehension. It takes about <strong>10 to 15 minutes</strong>.
        </p>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
          {[
            'The questions get harder as you do well — that\'s how we find your real level.',
            'If you feel stuck near the end, that\'s normal and expected.',
            'Each skill is tested separately. You may score differently on each one.',
            'Your progress is saved if you need to stop and come back.'
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: i < 3 ? '10px' : 0 }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0, marginTop: '2px' }}>
                {i + 1}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{item}</p>
            </div>
          ))}
        </div>

        <button onClick={onStart} disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          {loading ? (
            <><div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />Starting...</>
          ) : 'Start placement test'}
        </button>

        <p style={{ marginTop: '1rem', fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
          Free — no credit card needed
        </p>
      </div>
    </div>
  );
}

function SkillCompleteScreen({ info, onContinue }) {
  const nextLabel = SKILL_LABELS[info.nextSkill];
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '0.75rem' }}>
          {SKILL_LABELS[info.skill]} complete
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', lineHeight: 1.75 }}>
          That skill is done. Up next: <strong>{nextLabel}</strong> — {SKILL_DESCRIPTIONS[info.nextSkill]}.
        </p>
        <button onClick={onContinue} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          Continue to {nextLabel} →
        </button>
      </div>
    </div>
  );
}

function CompletingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px' }}>Analysing your results...</p>
    </div>
  );
}

function QuestionSkeleton() {
  return (
    <div style={{ ...styles.questionCard }}>
      <div className="skeleton" style={{ height: '16px', width: '40%', marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ height: '20px', width: '85%', marginBottom: '0.75rem' }} />
      <div className="skeleton" style={{ height: '80px', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: '44px', marginBottom: '0.75rem' }} />
      <div className="skeleton" style={{ height: '44px', width: '60%' }} />
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1.5rem 1rem 3rem'
  },
  container: {
    width: '100%',
    maxWidth: '640px'
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    gap: '1rem'
  },
  skillPills: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  skillPill: {
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    fontWeight: 400,
    border: '1px solid',
    transition: 'all 0.2s'
  },
  exitBtn: {
    background: 'none',
    border: 'none',
    fontSize: '13px',
    color: 'var(--color-text-tertiary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-sans)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-md)'
  },
  questionCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '2rem',
    boxShadow: 'var(--shadow-md)'
  },
  encouragement: {
    background: 'var(--amber-50)',
    border: '1px solid var(--amber-100)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--amber-600)',
    marginBottom: '1.25rem'
  },
  instruction: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: '1rem'
  },
  passage: {
    background: 'var(--gray-50)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem 1.25rem',
    fontSize: '15px',
    lineHeight: 1.8,
    color: 'var(--color-text)',
    marginBottom: '1.25rem',
    whiteSpace: 'pre-line'
  },
  questionPrompt: {
    fontSize: '16px',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginTop: '0.75rem'
  },
  errorSentence: {
    background: 'var(--red-50)',
    border: '1px solid var(--red-100)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    marginBottom: '0.5rem'
  },
  wordHighlight: {
    background: 'var(--color-primary-light)',
    border: '1px solid var(--blue-200)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 20px',
    marginBottom: '0.5rem',
    textAlign: 'center'
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px'
  },
  optionBtn: {
    padding: '0.65rem 1rem',
    border: '1.5px solid',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    transition: 'all 0.15s',
    textAlign: 'center'
  },
  hintBox: {
    background: 'var(--amber-50)',
    border: '1px solid var(--amber-100)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px'
  },
  hintBtn: {
    background: 'none',
    border: 'none',
    fontSize: '13px',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    padding: 0,
    textDecoration: 'underline'
  },
  feedbackBox: {
    border: '1.5px solid',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    transition: 'all 0.2s'
  },
  questionText: {
    outline: 'none'
  }
};
