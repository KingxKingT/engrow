import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '/api';

export default function Settings() {
  const { user, updateSettings, getToken } = useAuth();
  const s = user?.settings || {};
  const [form, setForm] = useState({ dyslexiaFont: s.dyslexiaFont||false, highContrast: s.highContrast||false, simplifiedFirst: s.simplifiedFirst||false, fontSize: s.fontSize||'100', weeklyGoal: s.weeklyGoal||2 });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  function toggle(key) {
    const newForm = { ...form, [key]: !form[key] };
    setForm(newForm);
    document.body.classList.toggle('dyslexia-mode', newForm.dyslexiaFont);
    document.body.classList.toggle('high-contrast', newForm.highContrast);
  }

  async function save() {
    setLoading(true);
    try {
      await fetch(`${API}/auth/settings`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` }, body:JSON.stringify(form) });
      updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* settings saved locally at minimum */ updateSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    finally { setLoading(false); }
  }

  const Toggle = ({ checked, onChange, label, description }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.875rem 0', borderBottom:'1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)' }}>{label}</div>
        {description && <div style={{ fontSize:'12px', color:'var(--text-tertiary)', marginTop:'2px' }}>{description}</div>}
      </div>
      <button onClick={onChange} role="switch" aria-checked={checked} aria-label={label} style={{ width:'40px', height:'22px', borderRadius:'var(--radius-full)', background: checked ? 'var(--blue-primary)' : 'var(--border)', border:'none', cursor:'pointer', position:'relative', transition:'background var(--transition)', flexShrink:0 }}>
        <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'white', position:'absolute', top:'3px', left: checked ? '21px' : '3px', transition:'left var(--transition)', boxShadow:'var(--shadow-sm)' }} />
      </button>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div style={{ padding:'2rem 2.5rem', maxWidth:'600px', margin:'0 auto' }}>
          <h1 style={{ fontSize:'20px', marginBottom:'1.75rem' }}>Settings</h1>

          {/* Accessibility */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem 1.375rem', marginBottom:'1rem' }}>
            <h2 style={{ fontSize:'13px', fontWeight:500, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.25rem' }}>Accessibility</h2>
            <Toggle checked={form.dyslexiaFont} onChange={() => toggle('dyslexiaFont')} label="Dyslexia-friendly font" description="Uses OpenDyslexic font with wider spacing" />
            <Toggle checked={form.highContrast} onChange={() => toggle('highContrast')} label="High contrast" description="Stronger borders and darker secondary text" />
            <Toggle checked={form.simplifiedFirst} onChange={() => toggle('simplifiedFirst')} label="Show simplified explanations first" description="Simpler version appears above standard in lessons" />

            <div style={{ paddingTop:'0.875rem' }}>
              <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)', marginBottom:'8px' }}>Font size</div>
              <div style={{ display:'flex', gap:'8px' }}>
                {[['90','Small'],['100','Normal'],['110','Large'],['125','Extra large']].map(([val, label]) => (
                  <button key={val} onClick={() => { setForm(f => ({...f, fontSize:val})); document.body.className = document.body.className.replace(/font-\d+/g,'').trim(); document.body.classList.add(`font-${val}`); }} style={{ padding:'0.4rem 0.75rem', border:'1.5px solid', borderRadius:'var(--radius-md)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-sans)', borderColor: form.fontSize===val ? 'var(--blue-primary)' : 'var(--border)', background: form.fontSize===val ? 'var(--blue-light)' : 'white', color: form.fontSize===val ? 'var(--blue-primary)' : 'var(--text-secondary)', fontWeight: form.fontSize===val ? 500 : 400 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Learning */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem 1.375rem', marginBottom:'1rem' }}>
            <h2 style={{ fontSize:'13px', fontWeight:500, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.75rem' }}>Learning</h2>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)' }}>Weekly lesson goal</div>
                <div style={{ fontSize:'12px', color:'var(--text-tertiary)', marginTop:'2px' }}>How many lessons you want to complete per week</div>
              </div>
              <select value={form.weeklyGoal} onChange={e => setForm(f => ({...f, weeklyGoal:Number(e.target.value)}))} style={{ padding:'0.4rem 0.6rem', border:'1.5px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:'14px', color:'var(--text)', fontFamily:'var(--font-sans)', background:'white', cursor:'pointer' }}>
                {[2,3,5,7,10].map(n => <option key={n} value={n}>{n} lessons</option>)}
              </select>
            </div>
          </div>

          {/* Save */}
          <button onClick={save} disabled={loading} className="btn btn-primary" style={{ width:'100%', padding:'0.7rem' }}>
            {loading ? <><div className="spinner" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,0.3)', width:'15px', height:'15px' }} />Saving...</> : saved ? '✓ Saved' : 'Save changes'}
          </button>

          {/* Account */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem 1.375rem', marginTop:'1rem' }}>
            <h2 style={{ fontSize:'13px', fontWeight:500, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.75rem' }}>Account</h2>
            <div style={{ fontSize:'14px', color:'var(--text-secondary)', marginBottom:'0.75rem' }}>
              <strong style={{ color:'var(--text)' }}>{user?.name}</strong> · {user?.email}
            </div>
            {!showDelete ? (
              <button onClick={() => setShowDelete(true)} style={{ background:'none', border:'none', fontSize:'13px', color:'#EF4444', cursor:'pointer', fontFamily:'var(--font-sans)', padding:0 }}>
                Delete account
              </button>
            ) : (
              <div style={{ background:'#FFF1F2', border:'1px solid #FECACA', borderRadius:'var(--radius-md)', padding:'1rem' }}>
                <p style={{ fontSize:'13px', color:'#B91C1C', marginBottom:'0.75rem' }}>This will permanently delete your account and all progress. Type <strong>DELETE</strong> to confirm.</p>
                <input type="text" className="form-input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Type DELETE here" style={{ marginBottom:'0.75rem', fontSize:'14px' }} />
                <div style={{ display:'flex', gap:'8px' }}>
                  <button disabled={deleteConfirm !== 'DELETE'} style={{ padding:'0.45rem 1rem', background:'#EF4444', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'13px', cursor: deleteConfirm==='DELETE' ? 'pointer' : 'not-allowed', opacity: deleteConfirm==='DELETE' ? 1 : 0.5, fontFamily:'var(--font-sans)' }}>
                    Delete permanently
                  </button>
                  <button onClick={() => { setShowDelete(false); setDeleteConfirm(''); }} style={{ padding:'0.45rem 1rem', background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
