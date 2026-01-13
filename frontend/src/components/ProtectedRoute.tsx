import { Navigate } from 'react-router-dom';
import { isAuthenticated, clearAuthToken, getUserRole } from '../utils/auth';
import type { AccountRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AccountRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  // Check if user is authenticated and token is not expired
  const authenticated = isAuthenticated();
  
  if (!authenticated) {
    // Ensure token is cleared if authentication check fails
    clearAuthToken();
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check if the user has it
  if (requiredRole) {
    const userRole = getUserRole();
    
    if (!userRole || userRole !== requiredRole) {
      // User doesn't have the required role - redirect to home
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
