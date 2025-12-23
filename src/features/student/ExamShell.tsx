import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { questionService } from '../../services';
import { useAlert } from '../../shared/ui/AlertProvider';
import { Button } from '../../shared/ui/Button';
import { getExamById } from '../exams/registry';
import type { Question, ExamAttempt } from '../../types';
import { CheckCircle, Send, MessageCircle, Phone, Clock, AlertCircle } from 'lucide-react';
import { SupabaseExamAttemptService } from '../../services/supabase/SupabaseExamAttemptService';

const examAttemptService = new SupabaseExamAttemptService();

// Default exam component to display questions when no specific exam component is available
const DefaultExamComponent: React.FC<{
  questions: Question[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ questions, answers, onAnswerChange, onSubmit }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Exam Questions
      </h2>
      
      <form onSubmit={onSubmit} className="space-y-8">
        {questions.map((question, index) => (
          <div key={question.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
            <div className="mb-4">
              <label className="text-lg font-semibold text-gray-900 dark:text-white">
                Question {index + 1}
              </label>
              <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                {question.questionText}
              </p>
            </div>
            
            <div className="mt-4">
              <textarea
                value={answers[question.id] || ''}
                onChange={(e) => onAnswerChange(question.id, e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white resize-y min-h-[120px]"
                placeholder="Type your answer here..."
                required
              />
            </div>
          </div>
        ))}
        
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="submit"
            color="indigo"
            size="lg"
            className="w-full"
            leftIcon={<Send className="w-5 h-5" />}
          >
            Submit Answers
          </Button>
        </div>
      </form>
    </div>
  );
};

export const ExamShell: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showStudentInfoModal, setShowStudentInfoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const { showSuccess, showError } = useAlert();

  const examDef = attempt?.exam_type ? getExamById(attempt.exam_type as any) : null;

  useEffect(() => {
    if (attemptId) {
      loadExamAttempt();
    }
  }, [attemptId]);

  // Timer to check expiration
  useEffect(() => {
    if (!attempt?.expires_at) return;
    
    const updateTimer = () => {
      const expiresAt = new Date(attempt.expires_at!);
      const now = new Date();
      const remaining = expiresAt.getTime() - now.getTime();
      
      if (remaining <= 0) {
        showError('Exam time has expired');
        navigate('/student');
        return;
      }
      
      setTimeRemaining(remaining);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [attempt]);

  const loadExamAttempt = async () => {
    if (!attemptId) return;
    
    setLoadingAttempt(true);
    try {
      const attemptData = await examAttemptService.getAttempt(attemptId);
      
      if (!attemptData) {
        showError('Exam attempt not found');
        navigate('/student');
        return;
      }
      
      // Check if expired
      if (attemptData.expires_at && new Date(attemptData.expires_at) < new Date()) {
        showError('Exam time has expired');
        navigate('/student');
        return;
      }
      
      // Check if already submitted
      if (attemptData.status === 'submitted') {
        showError('This exam has already been submitted');
        navigate('/student');
        return;
      }
      
      // If status is 'ready', start it now
      if (attemptData.status === 'ready') {
        const startedAttempt = await examAttemptService.startAttempt(attemptId);
        setAttempt(startedAttempt);
      } else {
        setAttempt(attemptData);
      }
      
      // Load questions
      if (attemptData.test_id) {
        try {
          const fetchedQuestions = await questionService.getQuestions(attemptData.test_id);
          
          if (fetchedQuestions.length === 0) {
            console.warn('[ExamShell] No questions found for test_id:', attemptData.test_id);
            showError('This test has no questions yet. Please contact your administrator.');
            setQuestions([]);
          } else {
            setQuestions(fetchedQuestions);
            
            // Initialize answers object
            const initialAnswers: Record<string, string> = {};
            fetchedQuestions.forEach(q => {
              initialAnswers[q.id] = '';
            });
            setAnswers(initialAnswers);
          }
        } catch (err: any) {
          console.error('[ExamShell] Error loading questions:', err);
          showError(err.message || 'Failed to load questions');
          setQuestions([]);
        }
      } else {
        console.warn('[ExamShell] Attempt has no test_id:', attemptData);
        showError('This exam attempt is not properly configured. Please contact your administrator.');
        setQuestions([]);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load exam');
      navigate('/student');
    } finally {
      setLoadingAttempt(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all questions are answered
    const unanswered = questions.filter(q => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      showError(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
      return;
    }
    
    // Show student info modal
    setShowStudentInfoModal(true);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attemptId || !fullName.trim()) return;
    
    setLoading(true);
    try {
      await examAttemptService.submitAttempt(attemptId, answers, fullName);
      
      setSubmitted(true);
      setShowStudentInfoModal(false);
      showSuccess('Test submitted successfully! Your results will be available soon.');
      
      // Redirect to student portal after 3 seconds
      setTimeout(() => {
        navigate('/student');
      }, 3000);
    } catch (err: any) {
      showError(err.message || 'Failed to submit test');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (loadingAttempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 max-w-2xl text-center">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Test Submitted Successfully!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Your answers have been recorded. You will be notified when your results are ready.
          </p>
          <p className="text-gray-500 dark:text-gray-500 mb-6">
            Redirecting to Student Portal...
          </p>
          <Button
            color="indigo"
            onClick={() => navigate('/student')}
          >
            Go to Portal Now
          </Button>
        </div>
      </div>
    );
  }

  // Use default component if no specific exam component is available
  const ExamComponent = examDef?.component || DefaultExamComponent;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Timer Header - Fixed at top, above StudentLayout header */}
      {timeRemaining !== null && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-indigo-600 text-white py-3 px-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6" />
              <span className="font-semibold">
                Time Remaining: {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
            {attempt && (
              <span className="text-sm opacity-90 uppercase">
                {attempt.exam_type} Exam
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content area - adjust padding based on timer visibility */}
      {/* Timer header is ~48px, StudentLayout header is ~56px, total ~104px = pt-26 */}
      <div className={`${timeRemaining !== null ? 'pt-28' : 'pt-0'} pb-12 px-4`}>
        <div className="max-w-4xl mx-auto">
          {/* Exam Content */}
          {questions.length > 0 ? (
            <ExamComponent
              questions={questions}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleInitialSubmit}
            />
          ) : !loadingAttempt ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No Questions Available
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {attempt?.test_id 
                    ? 'This test doesn\'t have any questions yet. Please contact your administrator.'
                    : 'This exam attempt doesn\'t have a test assigned. Please contact your administrator.'}
                </p>
                <Button onClick={() => navigate('/student')}>
                  Back to Portal
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Student Info Modal */}
      {showStudentInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Confirm Submission
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please provide your contact information to complete the submission.
            </p>
            
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2 font-medium">
                  <MessageCircle className="w-4 h-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2 font-medium">
                  <Phone className="w-4 h-4" />
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  placeholder="+998 XX XXX XX XX"
                />
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mt-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  <strong>Note:</strong> Once you submit, you cannot change your answers.
                </p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  color="gray"
                  onClick={() => setShowStudentInfoModal(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="indigo"
                  disabled={loading}
                  leftIcon={<Send className="w-4 h-4" />}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Test'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
