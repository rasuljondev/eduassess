import { createBrowserRouter, Navigate } from 'react-router-dom';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Feature components (to be implemented)
import { LandingPage } from '../features/public/LandingPage';
import { LoginPage } from '../features/public/LoginPage';
import { CenterLandingPage } from '../features/public/CenterLandingPage';
import { CenterEntryPage } from '../features/public/CenterEntryPage';
import { ExamShell } from '../features/student/ExamShell';
import { StudentStart } from '../features/student/StudentStart';
import { CenterDashboard } from '../features/center-admin/CenterDashboard';
import { TestManagement } from '../features/center-admin/TestManagement';
import { QuestionManagement } from '../features/center-admin/QuestionManagement';
import { SubmissionsManagement } from '../features/center-admin/SubmissionsManagement';
import { SuperDashboard } from '../features/super-admin/SuperDashboard';
import { AnalyticsView } from '../features/super-admin/AnalyticsView';
import { CenterManagementView } from '../features/super-admin/CenterManagementView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/:centerSlug',
    element: <CenterLandingPage />,
  },
  {
    path: '/:centerSlug/:testType',
    element: <CenterEntryPage />,
  },
  {
    path: '/:centerSlug/:testType/:sessionId',
    element: <StudentLayout />,
    children: [
      {
        path: '',
        element: <StudentStart />,
      },
      {
        path: 'exam',
        element: <ExamShell />,
      },
    ]
  },
  {
    path: '/student',
    element: <StudentLayout />,
    children: [
      {
        path: '',
        element: <StudentStart />,
      }
      ,
      {
        path: 'exam',
        element: <ExamShell />,
      },
    ]
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: '',
        element: <CenterDashboard />,
      },
      {
        path: 'tests',
        element: <TestManagement />,
      },
      {
        path: 'tests/:testId/questions',
        element: <QuestionManagement />,
      },
      {
        path: 'submissions',
        element: <SubmissionsManagement />,
      }
    ]
  },
  {
    path: '/super',
    element: <AdminLayout />,
    children: [
      {
        path: '',
        element: <Navigate to="/super/analytics" replace />,
      },
      {
        path: 'analytics',
        element: <AnalyticsView />,
      },
      {
        path: 'centers',
        element: <CenterManagementView />,
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
]);

