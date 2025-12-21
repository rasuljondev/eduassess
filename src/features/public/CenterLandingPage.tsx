import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { centerService } from '../../services';
import type { Center } from '../../types';
import { useAuthStore } from '../../stores/auth.store';
import { BackgroundMeteorsDots } from '../../shared/ui/background-meteors-dots';
import { Button } from '../../shared/ui/Button';
import { LogIn, Shield, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAlert } from '../../shared/ui/AlertProvider';

export const CenterLandingPage: React.FC = () => {
  const { centerSlug } = useParams<{ centerSlug: string }>();
  const [center, setCenter] = useState<Center | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCenter, setFetchingCenter] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return document.documentElement.classList.contains('dark');
  });
  
  const navigate = useNavigate();
  const authLogin = useAuthStore(state => state.login);
  const { showError, showSuccess } = useAlert();

  useEffect(() => {
    if (centerSlug) {
      setFetchingCenter(true);
      centerService.getCenterBySlug(centerSlug)
        .then(setCenter)
        .catch(err => {
          console.error('Failed to fetch center:', err);
          showError('Center not found');
        })
        .finally(() => setFetchingCenter(false));
    }
  }, [centerSlug, showError]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authLogin(login, password);
      showSuccess('Login successful!');
      
      const user = useAuthStore.getState().user;
      
      // Determine where to redirect based on role
      if (user?.role === 'STUDENT') {
        const testType = user.testType?.toLowerCase() || 'multi-level';
        navigate(`/${user.centerSlug}/${testType}/${user.id}`);
      } else if (user?.role === 'CENTER_ADMIN') {
        navigate('/admin');
      } else if (user?.role === 'SUPER_ADMIN') {
        navigate('/super');
      }
    } catch (err: any) {
      showError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!center) {
    return (
      <BackgroundMeteorsDots className="min-h-screen flex flex-col items-center justify-center text-white p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Center Not Found</h1>
        <p className="text-gray-400 mb-8">The educational center you are looking for does not exist.</p>
        <Button onClick={() => navigate('/')} color="indigo">
          Go to Homepage
        </Button>
      </BackgroundMeteorsDots>
    );
  }

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

      <div className="relative z-10 w-full max-w-6xl">
        {/* Two-Column Card */}
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden transition-all">
          <div className="grid lg:grid-cols-2 min-h-[600px]">
            {/* Left Side - Login Form */}
            <div className="p-10 lg:p-16 flex flex-col justify-center">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Welcome Back</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-10">Enter your credentials to access the exam portal</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2.5 ml-1">
                    Login
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Enter your login" 
                      value={login}
                      onChange={e => setLogin(e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 p-4 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-lg"
                      required
                    />
                  </div>
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
                  Start Exam
                </Button>
              </form>

              <div className="mt-auto pt-10">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                  &copy; 2025 EduAssess
                </p>
              </div>
            </div>

            {/* Right Side - Center Info */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 p-10 lg:p-16 flex flex-col items-center justify-center text-white relative overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10 text-center">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                  {center.logoUrl ? (
                    <div className="bg-white p-8 rounded-3xl shadow-2xl">
                      <img 
                        src={center.logoUrl} 
                        alt={center.name} 
                        className="h-40 w-auto object-contain hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
                      <Shield className="w-32 h-32 text-indigo-600" />
                    </div>
                  )}
                </div>

                {/* Center Name */}
                <h1 className="text-5xl lg:text-6xl font-black tracking-tight mb-6 drop-shadow-lg">
                  {center.name}
                </h1>
                <div className="h-2 w-32 bg-white/80 mx-auto rounded-full shadow-lg mb-8"></div>
                
                <p className="text-xl text-white/90 font-medium max-w-md mx-auto leading-relaxed">
                  Professional Online Assessment Platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundMeteorsDots>
  );
};

