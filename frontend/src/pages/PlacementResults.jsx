import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SKILL_LABELS = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  reading: 'Reading',
  writing: 'Writing',
  dialogue: 'Dialogue Comprehension'
};

const SKILL_COLORS = {
  grammar: '#2563EB',
  vocabulary: '#7C3AED',
  reading: '#0891B2',
  writing: '#059669',
  dialogue: '#D97706'
};

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const CEFR_PLAIN = {
  A1: 'Beginner — you know the basics',
  A2: 'Elementary — you handle everyday situations',
  B1: 'Intermediate — you manage most common situations',
  B2: 'Upper-intermediate — you understand complex topics',
  C1: 'Advanced — you express yourself fluently',
  C2: 'Mastery — near-native level English'
};

export default function PlacementResults() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { fetchMe } = useAuth();

  const results = state?.results;

  if (!results) {
    navigate('/dashboard');
    return null;
  }

  const { levels, explanations } = results;

  // Find weakest skill
  const skillEntries = Object.entries(levels);
  const weakest = skillEntries.reduce((min, curr) =>
    CEFR_ORDER.indexOf(curr[1]) < CEFR_ORDER.indexOf(min[1]) ? curr : min
  );

  async function goToDashboard() {
    await fetchMe();
    navigate('/dashboard');
  }

  return (
    <div style={styles.page}>
      <div style={styles.container} id="main-content">
        {/* Header */}
        <div style={styles.header}>
          <a href="/" style={styles.logo}>Engrow</a>
          <h1 style={styles.title}>Your English profile</h1>
          <p style={styles.subtitle}>
            Here is exactly where you stand — and why. Each skill was tested separately.
          </p>
        </div>

        {/* Skill results */}
        <div style={styles.skillsGrid}>
          {skillEntries.map(([skill, level]) => {
            const levelIndex = CEFR_ORDER.indexOf(level);
            const percentage = ((levelIndex + 1) / CEFR_ORDER.length) * 100;
            const isWeakest = skill === weakest[0];
            const color = SKILL_COLORS[skill];

            return (
              <div
                key={skill}
                style={{
                  ...styles.skillCard,
                  borderColor: isWeakest ? color : 'var(--color-border)',
                  boxShadow: isWeakest ? `0 0 0 2px ${color}20` : 'none'
                }}
              >
                <div style={styles.skillCardTop}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                        {SKILL_LABELS[skill]}
                      </span>
                      {isWeakest && (
                        <span style={styles.startHereBadge}>Start here</span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginLeft: '16px' }}>
                      {CEFR_PLAIN[level]}
                    </p>
                  </div>
                  <div style={{ ...styles.levelBadge, background: color + '15', color }}>
                    {level}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${percentage}%`, background: color }}
                      role="progressbar"
                      aria-valuenow={levelIndex + 1}
                      aria-valuemin={1}
                      aria-valuemax={6}
                      aria-label={`${SKILL_LABELS[skill]}: ${level}`}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    {CEFR_ORDER.map(l => (
                      <span key={l} style={{ fontSize: '10px', color: l === level ? color : 'var(--color-text-tertiary)', fontWeight: l === level ? 600 : 400 }}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Why explanation */}
                {explanations[skill] && (
                  <p style={styles.explanation}>{explanations[skill]}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div style={styles.summaryCard}>
          <h2 style={{ fontSize: '17px', fontWeight: 500, marginBottom: '0.75rem' }}>
            What happens next
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.75, marginBottom: '0.75rem' }}>
            We will focus on <strong>{SKILL_LABELS[weakest[0]]}</strong> first — your lowest skill. As each skill improves, we move to the next. The goal is to bring everything to B2 before asking if you want to go further.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>
            Every lesson is explained twice — once normally, and once in simpler language. You can change this in settings.
          </p>
        </div>

        {/* "This doesn't feel right" option */}
        <div style={styles.overrideBox}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
            These results don't match how you feel about your English?
          </p>
          <button
            onClick={() => navigate('/placement-test')}
            style={styles.overrideBtn}
          >
            Retake the test
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={goToDashboard}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: '1.5rem' }}
        >
          Start learning →
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    padding: '2rem 1rem 4rem'
  },
  container: {
    maxWidth: '680px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  logo: {
    display: 'block',
    fontFamily: 'var(--font-serif)',
    fontSize: '24px',
    color: 'var(--color-primary)',
    letterSpacing: '-0.02em',
    textDecoration: 'none',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '28px',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem'
  },
  subtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '15px',
    lineHeight: 1.75
  },
  skillsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  skillCard: {
    background: 'var(--color-surface)',
    border: '1px solid',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem 1.5rem',
    transition: 'all 0.2s'
  },
  skillCardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem'
  },
  startHereBadge: {
    background: 'var(--color-primary)',
    color: 'white',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    letterSpacing: '0.02em'
  },
  levelBadge: {
    padding: '4px 14px',
    borderRadius: 'var(--radius-full)',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    flexShrink: 0
  },
  explanation: {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.7,
    borderTop: '1px solid var(--color-border)',
    paddingTop: '10px',
    margin: 0
  },
  summaryCard: {
    background: 'var(--color-primary-light)',
    border: '1px solid var(--blue-200)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem 1.5rem',
    marginBottom: '1rem'
  },
  overrideBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    gap: '1rem'
  },
  overrideBtn: {
    background: 'none',
    border: 'none',
    fontSize: '13px',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'nowrap',
    textDecoration: 'underline',
    padding: 0
  }
};
