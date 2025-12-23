import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../shared/ui/Button';
import { LayoutDashboard, LogOut, Shield, TrendingUp, Settings, Menu, X, Sun, Moon, Building2, Users, FileText, ClipboardCheck } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isManuallyToggled, setIsManuallyToggled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return document.documentElement.classList.contains('dark');
  });

  // Manage dark mode class on HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    setIsManuallyToggled(newState); // Only keep it open if manually opened
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user || (user.role !== 'CENTER_ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800">Unauthorized Access</h2>
          <p className="text-red-600 mt-2">You don't have permission to view this page.</p>
          <Button onClick={() => navigate('/')} className="mt-6" color="red">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Collapsible Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full transition-all duration-300 z-50 ${
          isSidebarOpen 
            ? 'w-20 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-sm shadow-lg' 
            : 'w-1 bg-transparent'
        }`}
        onMouseEnter={() => {
          if (!isSidebarOpen) {
            setIsSidebarOpen(true);
            setIsManuallyToggled(false);
          }
        }}
        onMouseLeave={() => {
          if (!isManuallyToggled) {
            setIsSidebarOpen(false);
          }
        }}
      >
        <div className={`flex flex-col h-full transition-all duration-300 ${
          isSidebarOpen ? 'py-6 opacity-100' : 'py-6 opacity-0'
        }`}>
          {/* Super Admin Icon */}
          {isSuperAdmin && (
            <Link
              to="/super"
              className={`flex items-center justify-center mb-2 rounded-xl transition-all duration-200 ${
                isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
              } ${
                isActive('/super') && location.pathname !== '/super/analytics' && location.pathname !== '/super/centers'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'hover:bg-slate-700/50 text-indigo-400'
              }`}
              title="Super Admin"
            >
              <Shield className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
            </Link>
          )}

          {/* Center Admin Navigation */}
          {!isSuperAdmin && (
            <>
              {/* Dashboard */}
              <Link
                to="/admin"
                className={`flex items-center justify-center mb-2 rounded-xl transition-all duration-200 ${
                  isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
                } ${
                  isActive('/admin')
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'hover:bg-slate-700/50 text-indigo-400'
                }`}
                title="Dashboard"
              >
                <LayoutDashboard className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
              </Link>

              {/* Exam Approvals */}
              <Link
                to="/admin/approvals"
                className={`flex items-center justify-center mb-2 rounded-xl transition-all duration-200 ${
                  isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
                } ${
                  isActive('/admin/approvals')
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'hover:bg-slate-700/50 text-indigo-400'
                }`}
                title="Exam Approvals"
              >
                <Users className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
              </Link>

              {/* Test Management */}
              <Link
                to="/admin/tests"
                className={`flex items-center justify-center mb-2 rounded-xl transition-all duration-200 ${
                  isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
                } ${
                  location.pathname.startsWith('/admin/tests')
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'hover:bg-slate-700/50 text-indigo-400'
                }`}
                title="Test Management"
              >
                <FileText className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
              </Link>

              {/* Submissions */}
              <Link
                to="/admin/submissions"
                className={`flex items-center justify-center mb-2 rounded-xl transition-all duration-200 ${
                  isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
                } ${
                  isActive('/admin/submissions')
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'hover:bg-slate-700/50 text-indigo-400'
                }`}
                title="Submissions & Grading"
              >
                <ClipboardCheck className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
              </Link>
            </>
          )}

          {/* Super Admin Navigation */}
          {isSuperAdmin && (
            <>
              {/* Analytics/Dashboard */}
              <Link
                to="/super/analytics"
                className={`flex items-center justify-center mb-2 rounded-xl transition-all duration-200 ${
                  isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
                } ${
                  isActive('/super/analytics')
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'hover:bg-slate-700/50 text-indigo-400'
                }`}
                title="Analytics"
              >
                <TrendingUp className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
              </Link>

              {/* Center Management */}
              <Link
                to="/super/centers"
                className={`flex items-center justify-center mb-2 rounded-xl transition-all duration-200 ${
                  isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
                } ${
                  isActive('/super/centers')
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'hover:bg-slate-700/50 text-indigo-400'
                }`}
                title="Center & Admin Management"
              >
                <Building2 className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
              </Link>

              {/* Student Management */}
              <Link
                to="/super/students"
                className={`flex items-center justify-center mb-2 rounded-xl transition-all duration-200 ${
                  isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
                } ${
                  isActive('/super/students')
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'hover:bg-slate-700/50 text-indigo-400'
                }`}
                title="Student Management"
              >
                <Users className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
              </Link>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center mb-2 rounded-xl text-yellow-400 hover:bg-slate-700/50 transition-all duration-200 ${
              isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
            }`}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
            ) : (
              <Moon className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`flex items-center justify-center rounded-xl text-red-400 hover:bg-red-900/20 transition-all duration-200 ${
              isSidebarOpen ? 'p-4 mx-2' : 'p-2 mx-0'
            }`}
            title="Logout"
          >
            <LogOut className={`${isSidebarOpen ? 'w-5 h-5' : 'w-3 h-3'}`} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-8 overflow-y-auto transition-all duration-300 ${
        isSidebarOpen && isManuallyToggled ? 'ml-20' : 'ml-0'
      }`}>
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Hamburger Menu Button */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 group"
              aria-label="Toggle sidebar"
            >
              <div className="relative w-6 h-6">
                <Menu 
                  className={`absolute inset-0 w-6 h-6 text-gray-700 dark:text-gray-300 transition-all duration-300 ${
                    isSidebarOpen 
                      ? 'opacity-0 rotate-90 scale-0' 
                      : 'opacity-100 rotate-0 scale-100'
                  }`}
                />
                <X 
                  className={`absolute inset-0 w-6 h-6 text-gray-700 dark:text-gray-300 transition-all duration-300 ${
                    isSidebarOpen 
                      ? 'opacity-100 rotate-0 scale-100' 
                      : 'opacity-0 -rotate-90 scale-0'
                  }`}
                />
              </div>
            </button>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {user.role === 'CENTER_ADMIN' ? 'Center Dashboard' : 'Super Admin Dashboard'}
            </h1>
          </div>
        </header>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

