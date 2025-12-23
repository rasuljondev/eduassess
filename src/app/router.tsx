import { createBrowserRouter, Navigate } from 'react-router-dom';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Feature components
import { LandingPage } from '../features/public/LandingPage';
import { AdminLoginPage } from '../features/public/AdminLoginPage';
import { CenterLandingPage } from '../features/public/CenterLandingPage';
import { StudentPortal } from '../features/student/StudentPortal';
import { ExamShell } from '../features/student/ExamShell';
import { CenterDashboard } from '../features/center-admin/CenterDashboard';
import { TestManagement } from '../features/center-admin/TestManagement';
import { QuestionManagement } from '../features/center-admin/QuestionManagement';
import { SubmissionsManagement } from '../features/center-admin/SubmissionsManagement';
import { ApprovalManagement } from '../features/center-admin/ApprovalManagement';
import { SuperDashboard } from '../features/super-admin/SuperDashboard';
import { AnalyticsView } from '../features/super-admin/AnalyticsView';
import { CenterManagementView } from '../features/super-admin/CenterManagementView';
import { StudentManagementView } from '../features/super-admin/StudentManagementView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <AdminLoginPage />, // Admin/SuperAdmin login with email + password
  },
  {
    path: '/student',
    element: <StudentPortal />, // Student login/register + Dashboard
  },
  {
    path: '/:centerSlug',
    element: <CenterLandingPage />, // Center page with exam list
  },
  {
    path: '/:centerSlug/exam/:attemptId',
    element: <StudentLayout />,
    children: [
      {
        path: '',
        element: <ExamShell />, // Active exam interface
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
        path: 'approvals',
        element: <ApprovalManagement />, // NEW: Exam request approvals
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
      },
      {
        path: 'students',
        element: <StudentManagementView />,
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
]);
