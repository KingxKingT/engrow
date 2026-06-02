import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { to: '/lessons', label: 'My lessons', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { to: '/progress', label: 'Progress', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { to: '/settings', label: 'Settings', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav style={{ width:'var(--sidebar-width)', flexShrink:0, height:'100vh', background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'1.25rem 0.625rem' }} aria-label="Main navigation">
      <div style={{ padding:'0 0.5rem', marginBottom:'1.75rem' }}>
        <span style={{ fontFamily:'var(--font-serif)', fontSize:'21px', color:'var(--blue-primary)', letterSpacing:'-0.02em' }}>Engrow</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'2px', flex:1 }} role="list">
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} role="listitem" style={({ isActive }) => ({
            display:'flex', alignItems:'center', gap:'9px', padding:'0.55rem 0.75rem',
            borderRadius:'var(--radius-md)', fontSize:'13.5px', textDecoration:'none',
            transition:'all var(--transition)',
            background: isActive ? 'var(--blue-light)' : 'transparent',
            color: isActive ? 'var(--blue-primary)' : 'var(--text-secondary)',
            fontWeight: isActive ? 500 : 400
          })}>
            {item.icon}{item.label}
          </NavLink>
        ))}
      </div>
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:'0.75rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', overflow:'hidden' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--blue-primary)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:600, flexShrink:0 }} aria-hidden="true">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize:'11px', color:'var(--text-tertiary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', display:'flex', alignItems:'center', padding:'5px', borderRadius:'var(--radius-sm)', flexShrink:0 }} aria-label="Sign out">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </nav>
  );
}
