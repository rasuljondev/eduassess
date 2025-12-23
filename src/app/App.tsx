import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AlertProvider } from '../shared/ui/AlertProvider';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <RouterProvider router={router} />
      </AlertProvider>
    </ErrorBoundary>
  );
}

export default App;

