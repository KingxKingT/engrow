import Sidebar from '../components/Sidebar';
export default function Lessons() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Sidebar />
      <main id="main-content" style={{ flex: 1, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>Lessons — coming soon</p>
      </main>
    </div>
  );
}
