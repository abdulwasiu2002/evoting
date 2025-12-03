
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AspirantRegistration } from './pages/AspirantRegistration';
import { User, UserRole } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogout = () => {
    setUser(null);
    window.location.hash = '/'; // Reset route
  };

  return (
    <HashRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login onLogin={setUser} />} />
          
          <Route 
            path="/contest" 
            element={
              user 
              ? <AspirantRegistration user={user} /> 
              : <Navigate to="/login" state={{ from: '/contest' }} replace />
            } 
          />
          
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
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
