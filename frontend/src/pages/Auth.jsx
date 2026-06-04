import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const passwordRules = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'One uppercase letter', test: p => /[A-Z]/.test(p) },
  { label: 'One number', test: p => /[0-9]/.test(p) }
];

export default function Auth() {
  const [tab, setTab] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signup') {
        await signup(form.name, form.email, form.password);
        navigate('/placement-test');
      } else {
        const data = await login(form.email, form.password);
        navigate(data.needsPlacementTest ? '/placement-test' : '/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = tab === 'signup'
    ? passwordRules.filter(r => r.test(form.password)).length
    : 0;

  return (
    <div style={styles.page}>
      <main id="main-content" style={styles.card}>
        {/* Logo */}
        <a href="/" style={styles.logo}>Engrow</a>
        <p style={styles.tagline}>
          {tab === 'signup' ? 'Start your English journey' : 'Welcome back'}
        </p>

        {/* Tabs */}
        <div style={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'signin'}
            style={{ ...styles.tab, ...(tab === 'signin' ? styles.tabActive : {}) }}
            onClick={() => { setTab('signin'); setError(''); }}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={tab === 'signup'}
            style={{ ...styles.tab, ...(tab === 'signup' ? styles.tabActive : {}) }}
            onClick={() => { setTab('signup'); setError(''); }}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {error && (
            <div className="alert alert-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {tab === 'signup' && (
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password" className="form-label">Password</label>
              {tab === 'signin' && (
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Forgot password?</span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={tab === 'signup' ? 'At least 8 characters' : 'Your password'}
                value={form.password}
                onChange={handleChange}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {tab === 'signup' && form.password.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      height: '3px',
                      flex: 1,
                      borderRadius: '999px',
                      background: i < passwordStrength
                        ? passwordStrength === 1 ? 'var(--amber-error)'
                          : passwordStrength === 2 ? 'var(--amber-error)'
                            : 'var(--green-accent)'
                        : 'var(--border)',
                      transition: 'background 0.2s'
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {passwordRules.map(rule => (
                    <div key={rule.label} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: rule.test(form.password) ? 'var(--green-accent)' : 'var(--text-tertiary)'
                    }}>
                      {rule.test(form.password) ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid currentColor' }} />
                      )}
                      {rule.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {tab === 'signup' && (
            <label style={styles.remember}>
              <input type="checkbox" style={{ accentColor: 'var(--blue-primary)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Remember me on this device
              </span>
            </label>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                {tab === 'signup' ? 'Creating your account...' : 'Signing in...'}
              </>
            ) : tab === 'signup' ? 'Create account — it\'s free' : 'Sign in'}
          </button>
        </form>

        {/* Note about no social login */}
        <p style={styles.note}>
          We use email only to keep things simple and secure.
        </p>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    background: 'var(--bg)'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '2.5rem',
    boxShadow: 'var(--shadow-md)'
  },
  logo: {
    display: 'block',
    fontFamily: 'var(--font-serif)',
    fontSize: '26px',
    color: 'var(--blue-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '0.25rem',
    textDecoration: 'none'
  },
  tagline: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginBottom: '1.75rem'
  },
  tabs: {
    display: 'flex',
    background: 'var(--surface-2)',
    borderRadius: 'var(--radius-md)',
    padding: '3px',
    marginBottom: '1.5rem',
    gap: '2px'
  },
  tab: {
    flex: 1,
    padding: '0.5rem',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: 'calc(var(--radius-md) - 2px)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    fontFamily: 'var(--font-sans)'
  },
  tabActive: {
    background: 'white',
    color: 'var(--text)',
    boxShadow: 'var(--shadow-sm)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    padding: '4px'
  },
  remember: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  note: {
    marginTop: '1.5rem',
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    borderTop: '1px solid var(--border)',
    paddingTop: '1rem'
  }
};
