import React from 'react';
import { Navigate } from 'react-router-dom';

export const SuperDashboard: React.FC = () => {
  return <Navigate to="/super/analytics" replace />;
};

