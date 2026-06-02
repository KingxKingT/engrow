import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

import Landing from './pages/Landing';
import Auth from './pages/Auth';
import PlacementTest from './pages/PlacementTest';
import PlacementResults from './pages/PlacementResults';
import Dashboard from './pages/Dashboard';
import Lessons from './pages/Lessons';
import Lesson from './pages/Lesson';
import Progress from './pages/Progress';
import Settings from './pages/Settings';

function Protected({ children }) {
  const { user, loading, needsPlacementTest } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsPlacementTest) return <Navigate to="/placement-test" replace />;
  return children;
}

function Public({ children }) {
  const { user, loading, needsPlacementTest } = useAuth();
  if (loading) return <Loader />;
  if (user) return <Navigate to={needsPlacementTest ? '/placement-test' : '/dashboard'} replace />;
  return children;
}

function TestRoute({ children }) {
  // Placement test: requires auth but not completed test
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function Loader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem', background:'var(--bg)' }}>
      <div style={{ fontFamily:'var(--font-serif)', fontSize:'24px', color:'var(--blue-primary)', letterSpacing:'-0.02em' }}>Engrow</div>
      <div className="spinner" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Public><Landing /></Public>} />
      <Route path="/auth" element={<Public><Auth /></Public>} />
      <Route path="/placement-test" element={<TestRoute><PlacementTest /></TestRoute>} />
      <Route path="/placement-results" element={<TestRoute><PlacementResults /></TestRoute>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/lessons" element={<Protected><Lessons /></Protected>} />
      <Route path="/lesson/:id" element={<Protected><Lesson /></Protected>} />
      <Route path="/progress" element={<Protected><Progress /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
