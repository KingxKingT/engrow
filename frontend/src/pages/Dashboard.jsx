import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

const SKILL_LABELS = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  reading: 'Reading',
  writing: 'Writing',
  dialogue: 'Dialogue'
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
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper-intermediate',
  C1: 'Advanced',
  C2: 'Mastery'
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user, skills, streak } = useAuth();
  const navigate = useNavigate();

  const skillMap = {};
  (skills || []).forEach(s => { skillMap[s.skill] = s; });

  const weakest = skills?.length
    ? skills.reduce((min, curr) =>
        CEFR_ORDER.indexOf(curr.cefr_level) < CEFR_ORDER.indexOf(min.cefr_level) ? curr : min
      )
    : null;

  const currentStreak = streak?.current_streak || 0;

  return (
    <div style={styles.layout}>
      <Sidebar />

      <main id="main-content" style={styles.main}>
        <div style={styles.content}>
          {/* Greeting */}
          <div style={styles.greeting}>
            <div>
              <h1 style={styles.greetingTitle}>
                {getGreeting()}, {user?.name?.split(' ')[0]}.
              </h1>
              {weakest && (
                <p style={styles.greetingSubtitle}>
                  Today's focus: <strong>{SKILL_LABELS[weakest.skill]}</strong> — your current priority area.
                </p>
              )}
            </div>

            {/* Streak */}
            <div style={styles.streakCard} aria-label={`Current streak: ${currentStreak} days`}>
              <div style={styles.streakFlame} aria-hidden="true">
                {currentStreak > 0 ? '🔥' : '💧'}
              </div>
              <div>
                <div style={styles.streakNumber}>{currentStreak}</div>
                <div style={styles.streakLabel}>
                  {currentStreak > 0 ? 'day streak' : 'Start today'}
                </div>
              </div>
            </div>
          </div>

          {/* Today's lesson card */}
          {weakest && (
            <div style={{ ...styles.todayCard, borderColor: SKILL_COLORS[weakest.skill] + '40' }}>
              <div style={styles.todayCardInner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-md)',
                    background: SKILL_COLORS[weakest.skill] + '15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: SKILL_COLORS[weakest.skill] }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Today's lesson
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text)' }}>
                      {SKILL_LABELS[weakest.skill]} — {weakest.cefr_level} level
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 1rem', lineHeight: 1.6 }}>
                  Continue improving your {SKILL_LABELS[weakest.skill].toLowerCase()}. Estimated time: 5–7 minutes.
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => navigate('/lessons')}
                    className="btn btn-primary"
                    style={{ background: SKILL_COLORS[weakest.skill], borderColor: SKILL_COLORS[weakest.skill] }}
                  >
                    Start lesson →
                  </button>
                  <button
                    onClick={() => navigate('/lessons')}
                    className="btn btn-ghost"
                    style={{ fontSize: '13px' }}
                  >
                    Choose different skill
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Skill progress cards */}
          <div>
            <h2 style={styles.sectionTitle}>Your skill levels</h2>
            <div style={styles.skillsGrid}>
              {Object.keys(SKILL_LABELS).map(skill => {
                const skillData = skillMap[skill];
                const level = skillData?.cefr_level || 'A1';
                const levelIndex = CEFR_ORDER.indexOf(level);
                const percentage = ((levelIndex + 1) / CEFR_ORDER.length) * 100;
                const color = SKILL_COLORS[skill];

                return (
                  <button
                    key={skill}
                    onClick={() => navigate('/lessons')}
                    style={styles.skillCard}
                    aria-label={`${SKILL_LABELS[skill]}: ${level} — ${CEFR_PLAIN[level]}. Click to go to lessons.`}
                  >
                    <div style={styles.skillCardTop}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                        {SKILL_LABELS[skill]}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color,
                        background: color + '15',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        {level}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: '2px 0 10px' }}>
                      {CEFR_PLAIN[level]}
                    </p>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${percentage}%`, background: color }}
                        role="progressbar"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review queue reminder */}
          <div style={styles.reviewCard}>
            <div style={styles.reviewCardInner}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>
                  Review past mistakes
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Revisiting what you got wrong is the fastest way to improve.
                </div>
              </div>
              <button
                onClick={() => navigate('/lessons')}
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Review
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--color-bg)'
  },
  main: {
    flex: 1,
    overflow: 'auto'
  },
  content: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '2rem 2rem 4rem'
  },
  greeting: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1.75rem'
  },
  greetingTitle: {
    fontSize: '24px',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    marginBottom: '4px'
  },
  greetingSubtitle: {
    fontSize: '14px',
    color: 'var(--color-text-secondary)'
  },
  streakCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '0.75rem 1rem',
    flexShrink: 0
  },
  streakFlame: {
    fontSize: '24px',
    lineHeight: 1
  },
  streakNumber: {
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: 1,
    color: 'var(--color-text)'
  },
  streakLabel: {
    fontSize: '11px',
    color: 'var(--color-text-tertiary)',
    marginTop: '2px'
  },
  todayCard: {
    background: 'var(--color-surface)',
    border: '1.5px solid',
    borderRadius: 'var(--radius-xl)',
    marginBottom: '2rem',
    overflow: 'hidden'
  },
  todayCardInner: {
    padding: '1.5rem'
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: '0.75rem'
  },
  skillsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  skillCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.125rem',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-sans)',
    transition: 'all var(--transition)',
    width: '100%'
  },
  skillCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px'
  },
  reviewCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden'
  },
  reviewCardInner: {
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem'
  }
};
