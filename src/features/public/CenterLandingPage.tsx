import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { centerService } from '../../services';
import type { Center, ExamAttempt, ExamRequest } from '../../types';
import { useAuthStore } from '../../stores/auth.store';
import { BackgroundMeteorsDots } from '../../shared/ui/background-meteors-dots';
import { Button } from '../../shared/ui/Button';
import { Shield, AlertCircle, Sun, Moon, Clock, LogIn, LogOut } from 'lucide-react';
import { useAlert } from '../../shared/ui/AlertProvider';
import { SupabaseExamRequestService } from '../../services/supabase/SupabaseExamRequestService';
import { SupabaseExamAttemptService } from '../../services/supabase/SupabaseExamAttemptService';
import { SupabaseGlobalUserService } from '../../services/supabase/SupabaseGlobalUserService';
import { supabase } from '../../lib/supabase';

const examRequestService = new SupabaseExamRequestService();
const examAttemptService = new SupabaseExamAttemptService();
const globalUserService = new SupabaseGlobalUserService();

export const CenterLandingPage: React.FC = () => {
  const { centerSlug } = useParams<{ centerSlug: string }>();
  const [center, setCenter] = useState<Center | null>(null);
  const [fetchingCenter, setFetchingCenter] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return document.documentElement.classList.contains('dark');
  });
  
  const [exams, setExams] = useState<any[]>([]);
  const [userAttempts, setUserAttempts] = useState<ExamAttempt[]>([]);
  const [userRequests, setUserRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Login/Register state
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [surname, setSurname] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const navigate = useNavigate();
  const { user, login: authLogin } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  useEffect(() => {
    if (centerSlug) {
      loadCenterData();
    }
  }, [centerSlug]);

  useEffect(() => {
    if (user && center) {
      loadUserData();
    }
  }, [user, center]);

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

  const loadCenterData = async () => {
    if (!centerSlug) return;
    
    setFetchingCenter(true);
    try {
      const centerData = await centerService.getCenterBySlug(centerSlug);
      setCenter(centerData);
      
      // Load available exams (tests) for this center
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('center_id', centerData.id);
      
      if (testsError) {
        console.error('Error loading tests:', testsError);
      }
      
      // Map database fields (exam_type) to frontend format (examType)
      const mappedTests = (tests || []).map((test: any) => ({
        ...test,
        examType: test.exam_type, // Map snake_case to camelCase
      }));
      
      console.log('Loaded exams:', mappedTests);
      setExams(mappedTests);
    } catch (err) {
      console.error('Failed to fetch center:', err);
      showError('Center not found');
    } finally {
      setFetchingCenter(false);
    }
  };

  const loadUserData = async () => {
    if (!center) return;
    
    try {
      const attempts = await examAttemptService.getUserAttempts(center.id);
      setUserAttempts(attempts);
      
      const requests = await examRequestService.getUserRequests(center.id);
      setUserRequests(requests);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const handleRegisterForExam = async (examType: string, testId?: string) => {
    if (!center) return;
    
    setLoading(true);
    try {
      await examRequestService.createRequest({
        center_id: center.id,
        exam_type: examType,
        test_id: testId,
      });
      showSuccess('Exam request submitted! Waiting for admin approval.');
      await loadUserData();
    } catch (err: any) {
      showError(err.message || 'Failed to register for exam');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (attemptId: string) => {
    try {
      await examAttemptService.startAttempt(attemptId);
      navigate(`/${centerSlug}/exam/${attemptId}`);
    } catch (err: any) {
      showError(err.message || 'Failed to start exam');
    }
  };

  const getExamStatus = (examType: string): 'none' | 'pending' | 'approved' | 'in_progress' | 'submitted' => {
    // Check if there's an active attempt
    const attempt = userAttempts.find(a => a.exam_type === examType && a.status !== 'expired');
    if (attempt) {
      return attempt.status as any;
    }
    
    // Check if there's a pending or approved request
    const request = userRequests.find(r => r.exam_type === examType && r.status !== 'rejected');
    if (request) {
      return request.status === 'approved' ? 'approved' : 'pending';
    }
    
    return 'none';
  };

  const getAttemptForExam = (examType: string): ExamAttempt | undefined => {
    return userAttempts.find(a => a.exam_type === examType && ['ready', 'in_progress'].includes(a.status));
  };

  if (fetchingCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authLogin(login);
      showSuccess('Login successful!');
      await loadUserData();
    } catch (err: any) {
      showError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await globalUserService.register({
        surname,
        name,
        phone_number: phone,
      });
      
      showSuccess(`Account created! Your login: ${result.login}`);
      
      // Auto-login after registration
      setTimeout(async () => {
        await authLogin(result.login, result.password);
        setMode('login');
      }, 2000);
    } catch (err: any) {
      showError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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

  // If user is logged in, show the exam list interface
  if (user && user.role === 'STUDENT') {
      return (
      <BackgroundMeteorsDots className="min-h-screen p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-purple-900/20 transition-colors duration-300">
      {/* Logout & Dark Mode Toggle */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <Button
          color="gray"
          size="sm"
          onClick={async () => {
            const { logout } = useAuthStore.getState();
            logout();
            navigate('/');
          }}
          leftIcon={<LogOut className="w-4 h-4" />}
          customClassName="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-xl"
        >
          Logout
        </Button>
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

      <div className="relative z-10 max-w-6xl mx-auto py-12">
        {/* Center Header */}
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-6">
            {center.logoUrl ? (
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <img 
                  src={center.logoUrl} 
                  alt={center.name} 
                  className="h-24 w-auto object-contain" 
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center">
                <Shield className="w-16 h-16 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                {center.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Professional Online Assessment Platform
              </p>
            </div>
          </div>
        </div>

        {/* User Not Logged In */}
        {!user && (
          <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-xl p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Login to Register for Exams
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Access your student portal to register for exams at this center
            </p>
            <Button
              color="indigo"
              size="lg"
              onClick={() => navigate('/student')}
            >
              Student Portal
            </Button>
          </div>
        )}

        {/* User Logged In */}
        {user && user.role === 'STUDENT' && (
          <>
            {/* Available Exams */}
            <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Available Exams
              </h2>
              
              {exams.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No exams available at this time</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {exams.map((exam) => {
                    const status = getExamStatus(exam.examType);
                    const attempt = getAttemptForExam(exam.examType);
                    
                    return (
                      <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {exam.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {exam.description || `${exam.examType} Exam`}
                        </p>
                        
                        {status === 'none' && (
                          <Button
                            color="indigo"
                            onClick={() => handleRegisterForExam(exam.examType, exam.id)}
                            disabled={loading}
                            className="w-full"
                          >
                            Register
                          </Button>
                        )}
                        
                        {status === 'pending' && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-center">
                            <span className="text-yellow-800 dark:text-yellow-400 font-medium">
                              Pending Approval
                            </span>
                          </div>
                        )}
                        
                        {status === 'ready' && attempt && (
                          <Button
                            color="green"
                            onClick={() => handleStartExam(attempt.id)}
                            className="w-full"
                          >
                            START TEST
                          </Button>
                        )}
                        
                        {status === 'in_progress' && attempt && (
                          <div className="space-y-2">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-2 text-blue-800 dark:text-blue-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">
                                  Expires: {attempt.expires_at ? new Date(attempt.expires_at).toLocaleString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                            <Button
                              color="indigo"
                              onClick={() => navigate(`/${centerSlug}/exam/${attempt.id}`)}
                              className="w-full"
                            >
                              Continue Exam
                            </Button>
                          </div>
                        )}
                        
                        {status === 'submitted' && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                            <span className="text-green-800 dark:text-green-400 font-medium">
                              Completed ✓
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Exams at This Center */}
            <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Your Past Exams at {center.name}
              </h2>
              
              {userAttempts.filter(a => a.status === 'submitted').length === 0 ? (
                <p className="text-gray-500 text-center py-8">No completed exams yet</p>
              ) : (
                <div className="space-y-3">
                  {userAttempts
                    .filter(a => a.status === 'submitted')
                    .map((attempt) => (
                      <div key={attempt.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {attempt.exam_type}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(attempt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm">
                            Completed
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </BackgroundMeteorsDots>
    );
  }

  // Not logged in - show login/register interface
  return (
    <BackgroundMeteorsDots className="min-h-screen flex items-center justify-center p-4">
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

      <div className="relative z-10 w-full max-w-5xl">
        {/* Two-Column Card */}
        <div className="bg-white/80 dark:bg-gray-800/40 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="grid lg:grid-cols-2 min-h-[550px] relative">
            {/* Left Side - Form (switches between login and register) */}
            <div 
              className={`p-8 lg:p-12 flex flex-col justify-center lg:col-start-1 lg:row-start-1 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                mode === 'register' ? 'lg:translate-x-full' : 'lg:translate-x-0'
              }`}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                {mode === 'login' 
                  ? 'Enter your credentials to access the exam portal' 
                  : 'Register to access exams at this center'
                }
              </p>
 
              {/* Keep a stable height so card size never changes; cross-fade forms to avoid jump */}
              <div className="relative min-h-[360px]">
                {/* Login Form */}
                <div
                  className={`absolute inset-0 transition-all duration-400 ease-out ${
                    mode === 'login'
                      ? 'opacity-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <form onSubmit={handleLogin} className="space-y-5">
                <div>
                      <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 ml-1">
                    Login
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Enter your login" 
                      value={login}
                      onChange={e => setLogin(e.target.value)}
                          className="w-full bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 p-3.5 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      required
                    />
                  </div>
                    </div>

                    <Button
                      type="submit"
                      color="indigo"
                      fullWidth
                      size="lg"
                      isLoading={loading}
                      leftIcon={<LogIn className="w-5 h-5" />}
                      customClassName="py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/25 active:scale-[0.98] transition-all mt-6"
                    >
                      Start Exam
                    </Button>

                    <div className="text-center mt-5">
                      <button
                        type="button"
                        onClick={() => setMode('register')}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors"
                      >
                        Don't have an account? Register
                      </button>
                    </div>
                  </form>
                </div>

                {/* Register Form (same container size; smaller inputs) */}
                <div
                  className={`absolute inset-0 transition-all duration-400 ease-out ${
                    mode === 'register'
                      ? 'opacity-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 translate-y-2 pointer-events-none'
                  }`}
                >
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 ml-1">
                        Surname
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your surname"
                        value={surname}
                        onChange={e => setSurname(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 p-3 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 ml-1">
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 p-3 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        required
                      />
                    </div>

                <div>
                      <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 ml-1">
                        Phone Number
                  </label>
                  <input 
                        type="tel"
                        placeholder="+998 XX XXX XX XX"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 p-3 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
                
                <Button 
                  type="submit"
                  color="indigo"
                  fullWidth
                  size="lg"
                  isLoading={loading}
                      customClassName="py-3.5 rounded-2xl font-bold text-base shadow-xl shadow-indigo-500/25 active:scale-[0.98] transition-all mt-4"
                >
                      Create Account
                </Button>

                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors"
                      >
                        Already have an account? Login
                      </button>
                    </div>
              </form>
                </div>
              </div>

              <div className="mt-auto pt-8">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                  &copy; 2025 EduAssess
                </p>
              </div>
            </div>

            {/* Right Side - Center Info */}
            <div 
              className={`bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 p-8 lg:p-12 flex flex-col items-center justify-center text-white relative overflow-hidden lg:col-start-2 lg:row-start-1 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                mode === 'register' ? 'lg:-translate-x-full' : 'lg:translate-x-0'
              }`}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10 text-center">
                {/* Logo */}
                <div className="mb-6 flex justify-center">
                  {center.logoUrl ? (
                    <div className="bg-white p-6 rounded-3xl shadow-2xl">
                      <img 
                        src={center.logoUrl} 
                        alt={center.name} 
                        className="h-32 w-auto object-contain hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
                      <Shield className="w-24 h-24 text-indigo-600" />
                    </div>
                  )}
                </div>

                {/* Center Name */}
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4 drop-shadow-lg">
                  {center.name}
                </h1>
                <div className="h-1.5 w-28 bg-white/80 mx-auto rounded-full shadow-lg mb-6"></div>
                
                <p className="text-lg text-white/90 font-medium max-w-md mx-auto leading-relaxed">
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
