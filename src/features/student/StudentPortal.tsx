import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { SupabaseGlobalUserService } from '../../services/supabase/SupabaseGlobalUserService';
import { Button } from '../../shared/ui/Button';
import { LogOut } from 'lucide-react';

const globalUserService = new SupabaseGlobalUserService();

export const StudentPortal: React.FC = () => {
  const { user, login: authLogin } = useAuthStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login form
  const [loginValue, setLoginValue] = useState('');
  
  // Register form
  const [surname, setSurname] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Dashboard state
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [globalUser, setGlobalUser] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      loadDashboardData();
    } else if (user?.role === 'CENTER_ADMIN') {
      navigate('/admin');
    } else if (user?.role === 'SUPER_ADMIN') {
      navigate('/super');
    }
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      const currentUser = await globalUserService.getCurrentUser();
      if (currentUser) {
        setGlobalUser(currentUser);
        const history = await globalUserService.getUserExamHistory(currentUser.id);
        setExamHistory(history);
      }
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await authLogin(loginValue);
      // User state will update automatically via store
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await globalUserService.register({
        surname,
        name,
        phone_number: phone,
      });
      
      setSuccess(`Account created! Your login: ${result.login}, Password: ${result.password}`);
      setSurname('');
      setName('');
      setPhone('');
      
      // Auto-login after registration
      setTimeout(() => {
        authLogin(result.login, result.password);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in as student, show dashboard
  if (user?.role === 'STUDENT') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Logout Button */}
          <div className="flex justify-end mb-4">
            <Button
              color="gray"
              size="sm"
              onClick={() => {
                const { logout } = useAuthStore.getState();
                logout();
                navigate('/');
              }}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Logout
            </Button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Welcome, {globalUser?.name || user.fullName}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your login: <span className="font-mono font-semibold">{user.login}</span>
            </p>

            {/* Telegram Connect Banner */}
            {globalUser && !globalUser.telegram_id && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-800 dark:text-blue-200 font-medium">
                      📱 Connect your Telegram to receive exam results via bot
                    </p>
                  </div>
                  <Button
                    color="indigo"
                    onClick={() => setShowTelegramModal(true)}
                  >
                    Connect Telegram
                  </Button>
                </div>
              </div>
            )}

            {/* Telegram Instructions Modal */}
            {showTelegramModal && globalUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    Connect Your Telegram
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Send this information to <span className="font-bold">@EduAssessBot</span> on Telegram:
                  </p>
                  <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg font-mono text-sm mb-4">
                    {globalUser.surname} {globalUser.name} {globalUser.phone_number}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    The bot will automatically link your account and you can view results via Telegram!
                  </p>
                  <Button
                    onClick={() => setShowTelegramModal(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* Exam History */}
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Your Exam History
            </h2>
            
            {examHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No exams taken yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Visit a center page to register for an exam
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Center</th>
                      <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Exam Type</th>
                      <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Date</th>
                      <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examHistory.map((attempt: any) => (
                      <tr key={attempt.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                          {attempt.center_name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                          {attempt.exam_type}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                          {new Date(attempt.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-sm ${
                            attempt.status === 'submitted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            attempt.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            attempt.status === 'ready' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {attempt.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                          {attempt.is_published && attempt.final_score ? 
                            JSON.stringify(attempt.final_score) : 
                            attempt.status === 'submitted' ? 'Pending' : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Not logged in - show login/register
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">
          Student Portal
        </h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
              activeTab === 'login'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => {
              setActiveTab('login');
              setError('');
              setSuccess('');
            }}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
              activeTab === 'register'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => {
              setActiveTab('register');
              setError('');
              setSuccess('');
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Login Tab */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Login
              </label>
              <input
                type="text"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="student_abc123"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              color="indigo"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        )}

        {/* Register Tab */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Surname
              </label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Karimov"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Javohir"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="+998901234567"
                required
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Telegram connection is optional (can be added later)
            </p>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              color="indigo"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

