import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { Button } from './Button';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isPublic = !user;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate('/')}>
                <img 
                  src="https://nacos.org.ng/img/about.jpg" 
                  alt="NACOSS Logo" 
                  className="h-10 w-10 object-cover rounded-full border border-emerald-100" 
                />
                <span className="ml-2 text-xl font-bold text-gray-900">NACOSS <span className="text-emerald-600">E-Voting</span></span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="hidden md:flex flex-col text-right mr-2">
                    <span className="text-sm font-medium text-gray-900">{user.fullName}</span>
                    <span className="text-xs text-gray-500 capitalize">{user.role} • {user.department}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={onLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                location.pathname !== '/login' && (
                  <Button variant="primary" onClick={() => navigate('/login')}>
                    Student Portal
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Nigeria Association of Computer Science Students (NACOSS). All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};