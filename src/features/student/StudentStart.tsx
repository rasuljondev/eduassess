import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../shared/ui/Button';
import { Play, ShieldAlert } from 'lucide-react';

export const StudentStart: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { centerSlug, testType, sessionId } = useParams<{ centerSlug: string, testType: string, sessionId: string }>();

  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Unauthorized</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Please login to start your exam.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Welcome</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-3">
          Center: <span className="font-semibold">{user.centerSlug?.toUpperCase()}</span>
        </p>
        <p className="text-gray-500 dark:text-gray-400">
          Test: <span className="font-semibold">{user.testType}</span>
        </p>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
          <li>- Make sure your internet connection is stable.</li>
          <li>- Don’t refresh the page during the exam.</li>
          <li>- Click Start when you are ready.</li>
        </ul>
        <div className="mt-6 flex justify-end">
          <Button
            color="indigo"
            size="lg"
            onClick={() => {
              if (centerSlug && testType && sessionId) {
                navigate(`/${centerSlug}/${testType}/${sessionId}/exam`);
              } else {
                navigate('/student/exam');
              }
            }}
            leftIcon={<Play className="w-5 h-5" />}
          >
            Start
          </Button>
        </div>
      </div>
    </div>
  );
};


