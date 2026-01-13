import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  // Check if user is authenticated
  const authenticated = isAuthenticated();
  
  if (authenticated) {
    // Redirect authenticated users to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
