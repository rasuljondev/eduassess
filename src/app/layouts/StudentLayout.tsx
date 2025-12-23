import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../shared/ui/Button';
import { GraduationCap, LogOut, User } from 'lucide-react';

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <User className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800">Unauthorized Access</h2>
          <p className="text-red-600 mt-2">You don't have student access to this exam.</p>
          <Button onClick={() => navigate('/')} className="mt-6" color="red">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-purple-900/20">
      {/* Header - positioned below timer if it exists */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b dark:border-gray-700 shadow-lg px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            EduAssess
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-300">{user.login}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            color="red"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Logout
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto py-8 px-4">
        <Outlet />
      </main>
    </div>
  );
};

