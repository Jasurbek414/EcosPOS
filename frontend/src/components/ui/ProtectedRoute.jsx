import { Navigate } from 'react-router-dom';
import { useTenantAuthContext } from '../../hooks/useTenantAuthContext';

export default function ProtectedRoute({ children, ownerOnly = false }) {
  const { user, loading, isOwner } = useTenantAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-main)' }}>
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (ownerOnly && !isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
