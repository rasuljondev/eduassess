import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useAlert } from '../../shared/ui/AlertProvider';
import { Button } from '../../shared/ui/Button';
import { testService } from '../../services';
import type { TestType, Test } from '../../types';
import { Plus, Edit2, Trash2, ArrowLeft, FileText, Clock, Calendar, ListOrdered } from 'lucide-react';

export const TestManagement: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();
  
  const [tests, setTests] = useState<Test[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  
  // Form state
  const [testName, setTestName] = useState('');
  const [testType, setTestType] = useState<TestType>('IELTS');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(120);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    if (!user?.centerSlug) return;
    try {
      // Mock: Using centerSlug as centerId for now
      const fetchedTests = await testService.getTests(user.centerSlug);
      setTests(fetchedTests);
    } catch (err: any) {
      showError(err.message || 'Failed to load tests');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.centerSlug) return;
    
    setLoading(true);

    try {
      if (editingTest) {
        await testService.updateTest(editingTest.id, {
          name: testName,
          description: description || undefined,
          durationMinutes: duration,
        });
        showSuccess('Test updated successfully!');
      } else {
        const newTest = await testService.createTest(user.centerSlug, {
          name: testName,
          examType: testType,
          description: description || undefined,
          durationMinutes: duration,
        });
        showSuccess('Test created successfully!');
        // Navigate to question creation page
        navigate(`/admin/tests/${newTest.id}/questions`);
        return; // Don't reset form, we're navigating away
      }
      
      // Reset form
      resetForm();
      await loadTests();
    } catch (err: any) {
      showError(err.message || 'Failed to save test');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? This will also delete all associated questions.')) return;

    try {
      await testService.deleteTest(testId);
      showSuccess('Test deleted successfully!');
      await loadTests();
    } catch (err: any) {
      showError(err.message || 'Failed to delete test');
    }
  };

  const resetForm = () => {
    setTestName('');
    setTestType('IELTS');
    setDescription('');
    setDuration(120);
    setShowCreateForm(false);
    setEditingTest(null);
  };

  const startEdit = (test: Test) => {
    setEditingTest(test);
    setTestName(test.name);
    setTestType(test.examType);
    setDescription(test.description || '');
    setDuration(test.durationMinutes);
    setShowCreateForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Dashboard
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Test Management</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage your exam tests</p>
          </div>
        </div>
        {!showCreateForm && (
          <Button
            color="indigo"
            onClick={() => setShowCreateForm(true)}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            Create New Test
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {editingTest ? 'Edit Test' : 'Create New Test'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Test Name *
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  placeholder="e.g., IELTS Academic Practice Test 2024"
                  className="w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 p-3 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Test Type *
                </label>
                <select
                  value={testType}
                  onChange={e => setTestType(e.target.value as TestType)}
                  className="w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 p-3 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                >
                  <option value="IELTS">IELTS</option>
                  <option value="SAT">SAT</option>
                  <option value="APTIS">APTIS</option>
                  <option value="MULTI_LEVEL">MULTI_LEVEL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of the test..."
                rows={3}
                className="w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 p-3 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 0)}
                min="1"
                max="600"
                className="w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 p-3 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="indigo"
                isLoading={loading}
              >
                {editingTest ? 'Update Test' : 'Create Test'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tests List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Your Tests</h3>
        
        {tests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-center">
            <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tests yet</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first test to start generating user sessions</p>
            {!showCreateForm && (
              <Button
                color="indigo"
                onClick={() => setShowCreateForm(true)}
                leftIcon={<Plus className="w-5 h-5" />}
              >
                Create Your First Test
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map(test => (
              <div
                key={test.id}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{test.name}</h4>
                    <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
                      {test.examType}
                    </span>
                  </div>
                </div>

                {test.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {test.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{test.durationMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/admin/tests/${test.id}/questions`)}
                    leftIcon={<ListOrdered className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Questions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(test)}
                    leftIcon={<Edit2 className="w-4 h-4" />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    color="red"
                    onClick={() => handleDelete(test.id)}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

