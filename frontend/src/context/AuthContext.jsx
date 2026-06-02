import { createContext, useContext, useState, useEffect } from 'react';
const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  // Default TRUE — assume test is needed until we confirm otherwise
  const [needsPlacementTest, setNeedsPlacementTest] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('engrow_token');
    if (token) fetchMe(token);
    else { setLoading(false); setNeedsPlacementTest(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    const s = user.settings || {};
    document.body.classList.toggle('dyslexia-mode', !!s.dyslexiaFont);
    document.body.classList.toggle('high-contrast', !!s.highContrast);
    document.body.className = document.body.className.replace(/font-\d+/g,'').trim();
    document.body.classList.add(`font-${s.fontSize || '100'}`);
  }, [user]);

  async function fetchMe(token) {
    try {
      const res = await fetch(`${API}/auth/me`, { headers:{ Authorization:`Bearer ${token}` } });
      if (!res.ok) throw new Error('auth failed');
      const data = await res.json();
      setUser(data.user);
      setSkills(data.skills || []);
      setStreak(data.streak);

      // Check placement test status — only set to false if CONFIRMED completed
      try {
        const testRes = await fetch(`${API}/test/status`, { headers:{ Authorization:`Bearer ${token}` } });
        if (testRes.ok) {
          const testData = await testRes.json();
          const testDone = testData.hasTest && testData.status === 'completed';
          setNeedsPlacementTest(!testDone);
        }
        // If test status call fails: keep needsPlacementTest = true (safe default)
      } catch {
        // Keep needsPlacementTest = true — better to show test than skip it
      }
    } catch {
      localStorage.removeItem('engrow_token');
      setNeedsPlacementTest(false);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await fetch(`${API}/auth/login`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('engrow_token', data.token);
    setNeedsPlacementTest(true); // assume needed — fetchMe will correct it
    await fetchMe(data.token);
    return data;
  }

  async function signup(name, email, password) {
    const res = await fetch(`${API}/auth/signup`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name, email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    localStorage.setItem('engrow_token', data.token);
    setUser(data.user);
    setSkills([]);
    setNeedsPlacementTest(true); // new user always needs test
    setLoading(false);
    return data;
  }

  function logout() {
    localStorage.removeItem('engrow_token');
    setUser(null); setSkills([]); setStreak(null); setNeedsPlacementTest(false);
  }

  function getToken() { return localStorage.getItem('engrow_token'); }
  function updateSettings(s) { setUser(prev => ({ ...prev, settings: { ...prev?.settings, ...s } })); }

  return (
    <AuthContext.Provider value={{ user, skills, streak, loading, needsPlacementTest, login, signup, logout, getToken, updateSettings, fetchMe: () => fetchMe(getToken()) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
