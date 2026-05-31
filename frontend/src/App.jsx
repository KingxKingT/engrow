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

function ProtectedRoute({ children }) {
  const { user, loading, needsPlacementTest } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsPlacementTest) return <Navigate to="/placement-test" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading, needsPlacementTest } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    if (needsPlacementTest) return <Navigate to="/placement-test" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
      background: 'var(--color-bg)'
    }}>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '24px',
        color: 'var(--color-primary)',
        letterSpacing: '-0.02em'
      }}>
        Engrow
      </div>
      <div className="spinner" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/placement-test" element={<PlacementTest />} />
      <Route path="/placement-results" element={<PlacementResults />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/lessons" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
      <Route path="/lesson/:id" element={<ProtectedRoute><Lesson /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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
