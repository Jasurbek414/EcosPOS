import { Navigate } from 'react-router-dom';
import { useSuperAdminAuthContext } from '../../hooks/useSuperAdminAuthContext';

export default function PlatformProtectedRoute({ children }) {
  const { user } = useSuperAdminAuthContext();

  if (!user) {
    return <Navigate to="/spd" replace />;
  }

  return children;
}
