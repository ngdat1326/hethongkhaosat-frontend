import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Lo?i b? t?t c? c�c class bo tr�n (rounded, rounded-lg, rounded-xl, rounded-full, ...) ?? to�n b? giao di?n v? vu�ng g�c.