import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'rider' | 'driver' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F3F4F6',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E0E7FF',
            borderTopColor: '#4F46E5',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#6B7280', fontSize: '0.875rem', fontWeight: 500 }}>
            Loading...
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (requiredRole && user.role !== requiredRole) {
    // If admin tries to access user routes, send to admin. Vice versa.
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'driver') {
      return <Navigate to="/driver" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Force Driver KYC
  // If they are a driver and trying to access a driver-only route (requiredRole === 'driver'),
  // OR they are a driver trying to access the default dashboard, enforce KYC check.
  // We allow them to be on '/onboarding' (which has no requiredRole) but block them from '/driver/*'
  if (user.role === 'driver' && requiredRole === 'driver') {
    if (user.kycStatus !== 'approved' && user.kycStatus !== 'pending') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
};
