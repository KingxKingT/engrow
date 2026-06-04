import { useNavigate } from 'react-router-dom';
export default function Landing() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '520px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', color: 'var(--blue-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>Engrow</div>
        <h1 style={{ fontSize: '28px', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.35 }}>Learn English at your real level</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.75, marginBottom: '2rem' }}>Adaptive lessons per skill. Honest placement. AI that speaks at your level and grows with you.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/auth')} className="btn btn-primary btn-lg">Start for free</button>
          <button onClick={() => navigate('/auth')} className="btn btn-secondary btn-lg">Sign in</button>
        </div>
        <p style={{ marginTop: '1.25rem', fontSize: '13px', color: 'var(--text-tertiary)' }}>Free. No credit card required.</p>
      </div>
    </div>
  );
}
