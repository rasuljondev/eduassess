import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAlert } from '../../shared/ui/AlertProvider';
import { Button } from '../../shared/ui/Button';
import { testService, questionService } from '../../services';
import type { Test, Question } from '../../types';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, GripVertical } from 'lucide-react';

export const QuestionManagement: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  // Form state
  const [questionText, setQuestionText] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (testId) {
      loadTest();
      loadQuestions();
    }
  }, [testId]);

  const loadTest = async () => {
    if (!testId) return;
    try {
      const fetchedTest = await testService.getTestById(testId);
      setTest(fetchedTest);
    } catch (err: any) {
      showError(err.message || 'Failed to load test');
      navigate('/admin/tests');
    }
  };

  const loadQuestions = async () => {
    if (!testId) return;
    try {
      const fetchedQuestions = await questionService.getQuestions(testId);
      setQuestions(fetchedQuestions);
    } catch (err: any) {
      showError(err.message || 'Failed to load questions');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId) return;
    
    setLoading(true);

    try {
      if (editingQuestion) {
        await questionService.updateQuestion(editingQuestion.id, {
          questionText,
          expectedAnswer,
        });
        showSuccess('Question updated successfully!');
      } else {
        await questionService.addQuestion(testId, {
          questionText,
          expectedAnswer,
          orderNum: questions.length,
        });
        showSuccess('Question added successfully!');
      }
      
      resetForm();
      await loadQuestions();
    } catch (err: any) {
      showError(err.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await questionService.deleteQuestion(questionId);
      showSuccess('Question deleted successfully!');
      await loadQuestions();
    } catch (err: any) {
      showError(err.message || 'Failed to delete question');
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setExpectedAnswer('');
    setShowForm(false);
    setEditingQuestion(null);
  };

  const startEdit = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.questionText);
    setExpectedAnswer(question.expectedAnswer);
    setShowForm(true);
  };

  if (!test) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/tests')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Tests
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{test.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage questions for this test ({questions.length} questions)
            </p>
          </div>
        </div>
        {!showForm && (
          <Button
            color="indigo"
            onClick={() => setShowForm(true)}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            Add Question
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {editingQuestion ? 'Edit Question' : 'Add New Question'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Question Text *
              </label>
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                placeholder="Enter the question here..."
                rows={4}
                className="w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 p-3 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Expected Answer *
              </label>
              <textarea
                value={expectedAnswer}
                onChange={e => setExpectedAnswer(e.target.value)}
                placeholder="Enter the expected answer or key points..."
                rows={3}
                className="w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 p-3 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                This will be used by admins for grading reference
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                leftIcon={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="indigo"
                isLoading={loading}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {editingQuestion ? 'Update Question' : 'Add Question'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Questions</h3>
        
        {questions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-center">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No questions yet</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Add your first question to get started</p>
            {!showForm && (
              <Button
                color="indigo"
                onClick={() => setShowForm(true)}
                leftIcon={<Plus className="w-5 h-5" />}
              >
                Add First Question
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
                    <GripVertical className="w-5 h-5" />
                    <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">#{index + 1}</span>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium mb-2 whitespace-pre-wrap">
                      {question.questionText}
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Expected Answer:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {question.expectedAnswer}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(question)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      color="red"
                      onClick={() => handleDelete(question.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      {questions.length > 0 && (
        <div className="flex justify-center pt-6">
          <Button
            size="lg"
            color="indigo"
            onClick={() => navigate('/admin/tests')}
            leftIcon={<ArrowLeft className="w-5 h-5" />}
          >
            Finish & Return to Tests
          </Button>
        </div>
      )}
    </div>
  );
};

