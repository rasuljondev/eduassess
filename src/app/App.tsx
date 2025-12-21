import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AlertProvider } from '../shared/ui/AlertProvider';

function App() {
  return (
    <AlertProvider>
      <RouterProvider router={router} />
    </AlertProvider>
  );
}

export default App;

