import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../shared/ui/Button';
import { useAlert } from '../../shared/ui/AlertProvider';
import { BackgroundBeamsWithCollision } from '../../shared/ui/background-beams-with-collision';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const { showError, showSuccess } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      
      showSuccess('Login successful!');
      
      // Role-based redirect
      if (user?.role === 'SUPER_ADMIN') {
        navigate('/super');
      } else if (user?.role === 'CENTER_ADMIN') {
        navigate('/admin');
      } else if (user?.role === 'STUDENT') {
        navigate('/student');
      }
    } catch (err: any) {
      showError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-purple-900/20 overflow-hidden transition-colors duration-300">
      {/* AppBar/Menu Bar */}
      <header className="w-full z-50 pt-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-full bg-white/60 dark:bg-gray-800/60 border border-white/30 dark:border-gray-700/30 shadow-sm">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <img 
                  src="/logo_noback.png" 
                  alt="EduAssess Logo" 
                  className="h-10 w-10 object-contain"
                />
              </div>

              {/* Back to Home Button */}
              <Button
                size="md"
                color="blue"
                onClick={() => navigate('/')}
                customClassName="bg-blue-600/80 text-white hover:bg-blue-700 focus:ring-blue-500"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Login Section with Dot Connections Animation */}
      <BackgroundBeamsWithCollision className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-10 transition-colors">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Welcome Back</h1>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">Sign in to your account</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                  Login
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter login (e.g. test_ielts_ab12c) or email"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <Button
                type="submit"
                fullWidth
                size="lg"
                color="blue"
                isLoading={loading}
                leftIcon={<LogIn className="w-5 h-5" />}
              >
                Sign In
              </Button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
              >
                Back to Home
              </button>
            </form>
          </div>
        </div>
      </BackgroundBeamsWithCollision>
    </div>
  );
};

