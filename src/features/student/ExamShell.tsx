import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { submissionService, questionService, testService } from '../../services';
import { useAlert } from '../../shared/ui/AlertProvider';
import { Button } from '../../shared/ui/Button';
import { getExamById } from '../exams/registry';
import type { Question, Test } from '../../types';
import { CheckCircle, Send, MessageCircle, Phone } from 'lucide-react';

export const ExamShell: React.FC = () => {
  const { user } = useAuthStore();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showStudentInfoModal, setShowStudentInfoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const { showSuccess, showError } = useAlert();

  const examDef = user?.testType ? getExamById(user.testType) : null;

  useEffect(() => {
    loadTestAndQuestions();
  }, [user]);

  const loadTestAndQuestions = async () => {
    if (!user?.centerSlug || !user?.testType) {
      showError('User information is incomplete. Please try logging in again.');
      return;
    }
    
    setLoadingQuestions(true);
    try {
      // Find test by exam type for this center
      const tests = await testService.getTests(user.centerSlug, user.testType);
      
      if (tests.length === 0) {
        showError(`No ${user.testType} test found for this center. Please contact your administrator.`);
        setLoadingQuestions(false);
        return;
      }
      
      // Use the first matching test (in real implementation, this would be more specific)
      const selectedTest = tests[0];
      setTest(selectedTest);
      
      // Load questions for this test
      const fetchedQuestions = await questionService.getQuestions(selectedTest.id);
      
      if (fetchedQuestions.length === 0) {
        showError('This test has no questions yet. Please contact your administrator.');
        setLoadingQuestions(false);
        return;
      }
      
      setQuestions(fetchedQuestions);
      
      // Initialize answers object
      const initialAnswers: Record<string, string> = {};
      fetchedQuestions.forEach(q => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);
    } catch (err: any) {
      showError(err.message || 'Failed to load test questions');
    } finally {
      setLoadingQuestions(false);
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
    if (!user || !test || !fullName.trim()) return;
    
    setLoading(true);
    try {
      await submissionService.submitTest(user.id, fullName, {
        testId: test.id,
        answers,
        phoneNumber,
      });
      setShowStudentInfoModal(false);
      setSubmitted(true);
      showSuccess('Test submitted successfully!');
    } catch (err: any) {
      showError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 p-8 rounded-2xl mb-8 shadow-lg">
          <CheckCircle className="w-20 h-20 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-3 text-green-800 dark:text-green-200">Submission Successful!</h2>
          <p className="text-green-700 dark:text-green-300">Your answers have been stored securely.</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-lg">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-2xl text-blue-800 dark:text-blue-200">Get Your Results</h3>
          </div>
          
          <div className="bg-white/50 dark:bg-gray-800/50 p-6 rounded-xl mb-6">
            <p className="text-lg text-blue-700 dark:text-blue-300 mb-4">
              To receive your results once they're ready:
            </p>
            <ol className="text-left space-y-3 text-blue-700 dark:text-blue-300">
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">1</span>
                <span>Find <strong className="font-bold">@eduassess_bot</strong> on Telegram</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">2</span>
                <span>Send your login: <code className="bg-blue-200 dark:bg-blue-900 px-2 py-1 rounded font-mono text-sm">{user?.login}</code></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">3</span>
                <span>We'll notify you when your results are published!</span>
              </li>
            </ol>
          </div>
          
          <Button
            color="blue"
            size="lg"
            onClick={() => window.open('https://t.me/eduassess_bot', '_blank')}
            leftIcon={<MessageCircle className="w-5 h-5" />}
          >
            Open Telegram
          </Button>
        </div>
      </div>
    );
  }

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading test questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600 dark:text-gray-400">No questions available for this test.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
        <div className="mb-8 pb-6 border-b dark:border-gray-700">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{test?.name || examDef?.name || user?.testType}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Center: <span className="font-semibold">{user?.centerSlug?.toUpperCase()}</span> | 
            Duration: <span className="font-semibold">{test?.durationMinutes} minutes</span> | 
            Questions: <span className="font-semibold">{questions.length}</span>
          </p>
        </div>

        <form onSubmit={handleInitialSubmit} className="space-y-8">
          {/* Questions */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Test Questions</h3>
            {questions.map((question, index) => (
              <div key={question.id} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4 mb-4">
                  <span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    {index + 1}
                  </span>
                  <p className="text-gray-900 dark:text-gray-100 font-medium whitespace-pre-wrap flex-1">
                    {question.questionText}
                  </p>
                </div>
                <textarea
                  value={answers[question.id] || ''}
                  onChange={e => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Type your answer here..."
                  rows={4}
                  className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  required
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              color="green"
              size="lg"
              leftIcon={<Send className="w-5 h-5" />}
            >
              FINISH & SUBMIT
            </Button>
          </div>
        </form>
      </div>

      {/* Student Information Modal */}
      {showStudentInfoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Student Information</h2>
            
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number (Recommended)
                </label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  We'll use this to contact you about your results
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  color="gray"
                  fullWidth
                  onClick={() => setShowStudentInfoModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="green"
                  fullWidth
                  isLoading={loading}
                  disabled={!fullName.trim()}
                  leftIcon={<Send className="w-5 h-5" />}
                >
                  Submit Test
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

