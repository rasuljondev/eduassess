import React, { useEffect, useState } from 'react';
import { submissionService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { useAlert } from '../../shared/ui/AlertProvider';
import { Button } from '../../shared/ui/Button';
import type { Submission } from '../../types';
import { ClipboardCheck, FileText, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CenterDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!user?.centerSlug) return;
    const fetchedSubmissions = await submissionService.getSubmissions(user.centerSlug);
    setSubmissions(fetchedSubmissions);
  };

  useEffect(() => {
    if (user?.centerSlug) {
      loadData().catch((e) => console.error(e));
    }
  }, [user?.centerSlug]);

  return (
    <div className="space-y-8">
      <section className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Center Admin</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Approve exam requests, manage tests, and grade submissions.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              color="indigo"
              leftIcon={<ClipboardCheck className="w-4 h-4" />}
              onClick={() => navigate('/admin/approvals')}
            >
              Approvals
            </Button>
            <Button
              type="button"
              color="gray"
              leftIcon={<FileText className="w-4 h-4" />}
              onClick={() => navigate('/admin/submissions')}
            >
              Submissions
            </Button>
            <Button
              type="button"
              color="gray"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/admin/tests')}
            >
              Tests
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Recent Submissions</h3>
          </div>
          <Button
            type="button"
            color="gray"
            size="sm"
            isLoading={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await loadData();
                showSuccess('Refreshed');
              } catch (e: any) {
                showError(e?.message || 'Failed to refresh');
              } finally {
                setLoading(false);
              }
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Student</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Test</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Submitted</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.slice(0, 10).map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <td className="p-4 text-slate-900 dark:text-slate-100 text-sm">{s.fullName}</td>
                  <td className="p-4 text-slate-900 dark:text-slate-100 text-sm">{(s as any).testName || 'Unknown'}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{new Date(s.submittedAt).toLocaleString()}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        (s as any).isGraded
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {(s as any).isGraded ? 'GRADED' : 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No submissions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};


