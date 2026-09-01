
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from '../types';
import { Button } from './Button';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div 
                className="flex-shrink-0 flex items-center cursor-pointer select-none" 
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/');
                }}
              >
                <img 
                  src="https://nacos.org.ng/img/about.jpg" 
                  alt="NACOS Logo" 
                  className="h-9 w-9 sm:h-10 sm:w-10 object-cover rounded-full border border-emerald-100 shadow-sm" 
                />
                <div className="ml-2.5 flex flex-col">
                  <span className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">NACOS</span>
                  <span className="text-[10px] text-emerald-700 font-semibold tracking-wider uppercase hidden sm:block">E-Voting Portal</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation / User Info */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex flex-col text-right mr-1">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{user.fullName}</span>
                    <span className="text-xs text-gray-500 capitalize">{user.role} • {user.department}</span>
                  </div>
                  {user.role === UserRole.ADMIN && location.pathname !== '/admin' && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                      Admin Panel
                    </Button>
                  )}
                  {user.role === UserRole.STUDENT && location.pathname !== '/dashboard' && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                      Dashboard
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={onLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  {location.pathname !== '/login' && (
                    <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                      Student Portal
                    </Button>
                  )}
                  {location.pathname !== '/register' && location.pathname !== '/register-aspirant' && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/register')}>
                      Register
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Header Controls */}
            <div className="flex md:hidden items-center space-x-2">
              {user ? (
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-semibold text-gray-800 truncate max-w-[110px] sm:max-w-[160px]">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Toggle Navigation Menu"
                  >
                    {mobileMenuOpen ? (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {location.pathname !== '/login' && (
                    <Button size="sm" onClick={() => navigate('/login')} className="text-xs py-2 px-3">
                      Login
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Toggle menu"
                  >
                    {mobileMenuOpen ? (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg animate-fade-in px-4 py-4 space-y-3">
            {user ? (
              <>
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-500">{user.matricNo} • {user.department}</p>
                  <span className="inline-block mt-1 text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    {user.role}
                  </span>
                </div>
                {user.role === UserRole.ADMIN && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/admin'); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-emerald-600 min-h-[44px] flex items-center"
                  >
                    Admin Dashboard
                  </button>
                )}
                {user.role === UserRole.STUDENT && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-emerald-600 min-h-[44px] flex items-center"
                  >
                    Student Dashboard
                  </button>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 min-h-[44px] flex items-center"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/'); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
                >
                  Home
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 min-h-[44px] flex items-center"
                >
                  Student Registration
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/register-aspirant'); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 min-h-[44px] flex items-center"
                >
                  Aspirant Registration
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-5 sm:py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm text-gray-500 flex flex-col sm:flex-row justify-center items-center gap-1.5 sm:gap-2">
            <span>&copy; 2025 Nigeria Association of Computing Students (NACOS). All Rights Reserved.</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="font-semibold text-emerald-700">Federal Polytechnic Bida Chapter</span>
          </p>
        </div>
      </footer>
    </div>
  );
};
