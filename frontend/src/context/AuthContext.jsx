import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsPlacementTest, setNeedsPlacementTest] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('engrow_token');
    if (token) {
      fetchMe(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Apply user settings to body
  useEffect(() => {
    if (!user) return;
    const s = user.settings;
    document.body.classList.toggle('dyslexia-mode', s.dyslexiaFont);
    document.body.classList.toggle('high-contrast', s.highContrast);
    document.body.className = document.body.className
      .replace(/font-\d+/g, '')
      .trim();
    document.body.classList.add(`font-${s.fontSize}`);
  }, [user]);

  async function fetchMe(token) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Invalid token');
      const data = await res.json();
      setUser(data.user);
      setSkills(data.skills);
      setStreak(data.streak);
    } catch {
      localStorage.removeItem('engrow_token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('engrow_token', data.token);
    setUser(data.user);
    setNeedsPlacementTest(data.needsPlacementTest);
    await fetchMe(data.token);
    return data;
  }

  async function signup(name, email, password) {
    const res = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    localStorage.setItem('engrow_token', data.token);
    setUser(data.user);
    setNeedsPlacementTest(true);
    return data;
  }

  function logout() {
    localStorage.removeItem('engrow_token');
    setUser(null);
    setSkills([]);
    setStreak(null);
    setNeedsPlacementTest(false);
  }

  function getToken() {
    return localStorage.getItem('engrow_token');
  }

  function updateSettings(newSettings) {
    setUser(prev => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
  }

  return (
    <AuthContext.Provider value={{
      user, skills, streak, loading, needsPlacementTest,
      login, signup, logout, getToken, updateSettings, fetchMe: () => fetchMe(getToken())
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
