import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function RouteError() {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred';
  let errorDetails: string | null = null;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message || `Error ${error.status}`;
    errorDetails = error.data?.error || null;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || null;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Page Error
          </h1>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {errorMessage}
        </p>

        {process.env.NODE_ENV === 'development' && errorDetails && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <details>
              <summary className="text-sm text-red-700 dark:text-red-300 cursor-pointer mb-2">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto max-h-64">
                {errorDetails}
              </pre>
            </details>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Page
          </Button>
          <Link to="/">
            <Button
              color="gray"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

