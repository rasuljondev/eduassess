import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AlertType } from './Alert';
import { Alert } from './Alert';

interface AlertItem {
  id: string;
  type: AlertType;
  message: string;
  duration?: number;
  icon?: React.ReactNode;
}

interface AlertContextType {
  showAlert: (type: AlertType, message: string, icon?: React.ReactNode, duration?: number) => void;
  showSuccess: (message: string, icon?: React.ReactNode, duration?: number) => void;
  showError: (message: string, icon?: React.ReactNode, duration?: number) => void;
  showWarning: (message: string, icon?: React.ReactNode, duration?: number) => void;
  showInfo: (message: string, icon?: React.ReactNode, duration?: number) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider = ({ children }: AlertProviderProps) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const showAlert = useCallback(
    (type: AlertType, message: string, icon?: React.ReactNode, duration = 2000) => {
      const id = Math.random().toString(36).substring(7);
      setAlerts((prev) => [...prev, { id, type, message, duration, icon }]);
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, icon?: React.ReactNode, duration?: number) => {
      showAlert('success', message, icon, duration);
    },
    [showAlert]
  );

  const showError = useCallback(
    (message: string, icon?: React.ReactNode, duration?: number) => {
      showAlert('error', message, icon, duration);
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (message: string, icon?: React.ReactNode, duration?: number) => {
      showAlert('warning', message, icon, duration);
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (message: string, icon?: React.ReactNode, duration?: number) => {
      showAlert('info', message, icon, duration);
    },
    [showAlert]
  );

  return (
    <AlertContext.Provider value={{ showAlert, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            style={{
              transform: `translateY(${index * 10}px)`,
            }}
          >
            <Alert
              type={alert.type}
              message={alert.message}
              duration={alert.duration}
              icon={alert.icon}
              onClose={() => removeAlert(alert.id)}
            />
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};

