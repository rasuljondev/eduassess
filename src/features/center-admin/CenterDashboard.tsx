import React, { useState, useEffect } from 'react';
import { userGenerationService, submissionService, testService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { useAlert } from '../../shared/ui/AlertProvider';
import { Button } from '../../shared/ui/Button';
import type { TestSession, TestType, Submission } from '../../types';
import { UserPlus, Users, FileText, Copy, Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CenterDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [testType, setTestType] = useState<TestType>('IELTS');
  const [testName, setTestName] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [availableTests, setAvailableTests] = useState<string[]>([]);
  const { showSuccess, showError } = useAlert();

  const handleCopy = async (session: TestSession) => {
    if (!session.password) return;
    
    const textToCopy = `Login: ${session.login}\nPassword: ${session.password}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(session.id);
      showSuccess('Copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      showError('Failed to copy to clipboard');
    }
  };

  // Fetch available tests for the selected test type
  useEffect(() => {
    const loadTests = async () => {
      if (!user?.centerSlug) return;
      try {
        const tests = await testService.getTests(user.centerSlug, testType);
        setAvailableTests(tests.map(t => t.name));
      } catch (err) {
        console.error('Failed to load tests:', err);
        setAvailableTests([]);
      }
    };
    loadTests();
  }, [testType, user]);

  useEffect(() => {
    if (user?.centerSlug) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.centerSlug) return;
    const [fetchedSessions, fetchedSubmissions] = await Promise.all([
      userGenerationService.getGeneratedUsers(user.centerSlug),
      submissionService.getSubmissions(user.centerSlug)
    ]);
    setSessions(fetchedSessions);
    setSubmissions(fetchedSubmissions);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.centerSlug) return;
    
    if (!testName.trim()) {
      showError('Please select or enter a test name');
      return;
    }
    
    setLoading(true);
    try {
      await userGenerationService.generateUsers(user.centerSlug, testType, testName.trim(), count);
      await loadData();
      showSuccess(`Successfully generated ${count} users for ${testName}`);
      // Reset form
      setTestName('');
      setCount(1);
    } catch (err: any) {
      showError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Reset test name when test type changes
  useEffect(() => {
    setTestName('');
  }, [testType]);

  return (
    <div className="space-y-8">
      <section className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Generate Users</h3>
        </div>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Test Type *</label>
            <select 
              value={testType} 
              onChange={e => setTestType(e.target.value as TestType)}
              className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm transition-colors"
            >
              <option value="IELTS">IELTS</option>
              <option value="SAT">SAT</option>
              <option value="APTIS">APTIS</option>
              <option value="MULTI_LEVEL">MULTI_LEVEL</option>
            </select>
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Test Name *</label>
            {availableTests.length > 0 ? (
            <select
              value={testName}
              onChange={e => setTestName(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm transition-colors"
              required
            >
              <option value="">Select a test...</option>
                {availableTests.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            ) : (
              <div className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm flex items-center justify-between">
                <span>No tests available. Create one first.</span>
                <button
                  type="button"
                  onClick={() => navigate('/admin/tests')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium"
                >
                  Create Test
                </button>
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Count *</label>
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={count} 
              onChange={e => setCount(parseInt(e.target.value) || 1)}
              className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm transition-colors"
              required
            />
          </div>
          <div className="md:col-span-2">
          <Button
            type="submit"
            color="indigo"
            size="md"
            isLoading={loading}
            leftIcon={<UserPlus className="w-4 h-4" />}
              className="w-full bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700"
          >
            Generate
          </Button>
          </div>
        </form>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Generated Users</h3>
        </div>
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Login</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Password</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Test Type</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Test Name</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Expires</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                  <td className="p-4 font-mono text-sm text-slate-900 dark:text-slate-100">{s.login}</td>
                  <td className="p-4 font-mono text-sm text-slate-900 dark:text-slate-100">
                    {s.password ? (
                      <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600">{s.password}</span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-600">
                      {s.testType}
                    </span>
                  </td>
                  <td className="p-4 text-slate-900 dark:text-slate-100 text-sm">{s.testName || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      s.status === 'submitted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                      s.status === 'in-progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                      s.status === 'expired' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{new Date(s.expiresAt).toLocaleTimeString()}</td>
                  <td className="p-4">
                    {s.password && (
                      <button
                        onClick={() => handleCopy(s)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        title="Copy login and password"
                      >
                        {copiedId === s.id ? (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">No users generated yet.</div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Submissions</h3>
        </div>
        <div className="space-y-3">
          {submissions.map(sub => (
            <div key={sub.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{sub.fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(sub.submittedAt).toLocaleString()}</p>
              </div>
              <Button variant="outline" size="sm" color="indigo" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                View Details
              </Button>
            </div>
          ))}
          {submissions.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400">No submissions yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

