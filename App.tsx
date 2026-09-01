
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Register } from './pages/Register';
import { RegisterAspirant } from './pages/RegisterAspirant';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { User, UserRole } from './types';
import { sessionService } from './services/sessionService';

const AppRoutes: React.FC<{
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
}> = ({ user, onLogin, onLogout }) => {
  const navigate = useNavigate();

  const handleUserLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <Layout user={user} onLogout={handleUserLogout}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-aspirant" element={<RegisterAspirant />} />
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        
        <Route 
          path="/dashboard" 
          element={
            user && user.role === UserRole.STUDENT 
            ? <StudentDashboard user={user} /> 
            : <Navigate to="/login" replace />
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            user && user.role === UserRole.ADMIN 
            ? <AdminDashboard /> 
            : <Navigate to="/login" replace />
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  // Synchronous session restoration on initial mount so dashboard does not flash login screen
  const [user, setUser] = useState<User | null>(() => sessionService.getValidUser());

  const handleLogin = (newUser: User) => {
    sessionService.saveSession(newUser);
    setUser(newUser);
  };

  const handleLogout = useCallback(() => {
    sessionService.clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    // Listen for session events (cross-tab sync, 10-min inactivity expiration, etc.)
    const unsubscribe = sessionService.initSessionListener((updatedUser, reason) => {
      setUser(updatedUser);

      if (!updatedUser) {
        if (reason === 'expired') {
          // If session expired due to inactivity, redirect to login
          window.location.hash = '/login';
        } else if (reason === 'logout') {
          // Cross-tab or normal logout
          window.location.hash = '/';
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <HashRouter>
      <AppRoutes user={user} onLogin={handleLogin} onLogout={handleLogout} />
    </HashRouter>
  );
}

export default App;
