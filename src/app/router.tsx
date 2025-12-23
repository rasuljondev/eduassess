import { createBrowserRouter, Navigate } from 'react-router-dom';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { RouteError } from '../shared/ui/RouteError';

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
    errorElement: <RouteError />,
  },
  {
    path: '/login',
    element: <AdminLoginPage />, // Admin/SuperAdmin login with email + password
    errorElement: <RouteError />,
  },
  {
    path: '/student',
    element: <StudentPortal />, // Student login/register + Dashboard
    errorElement: <RouteError />,
  },
  {
    path: '/:centerSlug',
    element: <CenterLandingPage />, // Center page with exam list
    errorElement: <RouteError />,
  },
  {
    path: '/:centerSlug/exam/:attemptId',
    element: <StudentLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: '',
        element: <ExamShell />, // Active exam interface
        errorElement: <RouteError />,
      },
    ]
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: '',
        element: <CenterDashboard />,
        errorElement: <RouteError />,
      },
      {
        path: 'approvals',
        element: <ApprovalManagement />, // NEW: Exam request approvals
        errorElement: <RouteError />,
      },
      {
        path: 'tests',
        element: <TestManagement />,
        errorElement: <RouteError />,
      },
      {
        path: 'tests/:testId/questions',
        element: <QuestionManagement />,
        errorElement: <RouteError />,
      },
      {
        path: 'submissions',
        element: <SubmissionsManagement />,
        errorElement: <RouteError />,
      }
    ]
  },
  {
    path: '/super',
    element: <AdminLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: '',
        element: <Navigate to="/super/analytics" replace />,
        errorElement: <RouteError />,
      },
      {
        path: 'analytics',
        element: <AnalyticsView />,
        errorElement: <RouteError />,
      },
      {
        path: 'centers',
        element: <CenterManagementView />,
        errorElement: <RouteError />,
      },
      {
        path: 'students',
        element: <StudentManagementView />,
        errorElement: <RouteError />,
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
    errorElement: <RouteError />,
  }
]);
