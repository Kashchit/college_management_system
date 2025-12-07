import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Enroll from './pages/Enroll';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Scanner from './pages/Scanner';
import Dashboard from './pages/Dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Subjects from './pages/Subjects';
import Assignments from './pages/Assignments';
import Chat from './pages/Chat';
import Profile from './pages/Profile';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleSignup = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const ProtectedLayout = () => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    return (
      <Layout>
        <Outlet />
      </Layout>
    );
  };

  // Role-based Dashboard Component
  const RoleDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'TEACHER' || user.role === 'ADMIN') {
      return <TeacherDashboard />;
    }
    return <StudentDashboard />;
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/" /> : <Signup onSignup={handleSignup} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<RoleDashboard />} />
          <Route path="/students" element={<Enroll />} />
          <Route path="/attendance" element={<Scanner />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          {/* Fallback for old routes or redirects */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/enroll" element={<Navigate to="/students" replace />} />
          <Route path="/scanner" element={<Navigate to="/attendance" replace />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
