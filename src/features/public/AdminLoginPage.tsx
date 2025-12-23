import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { BackgroundMeteorsDots } from '../../shared/ui/background-meteors-dots';
import { Button } from '../../shared/ui/Button';
import { LogIn, Shield, Users, Sun, Moon } from 'lucide-react';
import { useAlert } from '../../shared/ui/AlertProvider';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return document.documentElement.classList.contains('dark');
  });
  
  const navigate = useNavigate();
  const { login: authLogin, user } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'CENTER_ADMIN') {
        navigate('/admin');
      } else if (user.role === 'SUPER_ADMIN') {
        navigate('/super');
      } else if (user.role === 'STUDENT') {
        navigate('/student');
      }
    }
  }, [user, navigate]);

  // Manage dark mode
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authLogin(email, password);
      showSuccess('Login successful!');
      
      const currentUser = useAuthStore.getState().user;
      
      // Determine where to redirect based on role
      if (currentUser?.role === 'STUDENT') {
        navigate('/student');
      } else if (currentUser?.role === 'CENTER_ADMIN') {
        navigate('/admin');
      } else if (currentUser?.role === 'SUPER_ADMIN') {
        navigate('/super');
      }
    } catch (err: any) {
      showError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundMeteorsDots className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-purple-900/20 transition-colors duration-300">
      {/* Dark Mode Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-xl hover:scale-110 transition-all duration-300"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <Sun className="w-6 h-6 text-yellow-500" />
          ) : (
            <Moon className="w-6 h-6 text-indigo-600" />
          )}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden transition-all">
          <div className="p-10 lg:p-12">
            {/* Logo/Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl">
                <Shield className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight text-center">
              Admin Login
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
              Enter your credentials to access the dashboard
            </p>
            
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2.5 ml-1">
                  Email
                </label>
                <input 
                  type="email" 
                  placeholder="admin@example.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 p-4 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2.5 ml-1">
                  Password
                </label>
                <input 
                  type="password" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 p-4 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-lg"
                  required
                />
              </div>
              
              <Button 
                type="submit"
                color="indigo"
                fullWidth
                size="lg"
                isLoading={loading}
                leftIcon={<LogIn className="w-6 h-6" />}
                customClassName="py-5 rounded-2xl font-bold text-xl shadow-xl shadow-indigo-500/25 active:scale-[0.98] transition-all mt-8"
              >
                Login
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400">
                  or
                </span>
              </div>
            </div>

            {/* Student Portal Button */}
            <Button
              type="button"
              color="gray"
              fullWidth
              size="lg"
              leftIcon={<Users className="w-6 h-6" />}
              onClick={() => navigate('/student')}
              customClassName="py-4 rounded-2xl font-semibold text-lg"
            >
              Student Portal
            </Button>

            {/* Footer */}
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors block mx-auto"
              >
                ← Back to Home
              </button>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                &copy; 2025 EduAssess
              </p>
            </div>
          </div>
        </div>
      </div>
    </BackgroundMeteorsDots>
  );
};

