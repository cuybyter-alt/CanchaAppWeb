import { Navigate, Outlet } from 'react-router-dom';
import { tokenStorage } from '../../services/AuthService';
import { useAuth } from '../../context/AuthContext';

const ADMIN_ROLES = ['Owner', 'Manager'];

/**
 * Protects routes that require Owner or Manager role.
 * Redirects unauthenticated users to /login and unauthorized users to /.
 */
export default function RequireAdmin() {
  const { user, loading } = useAuth();
  const isAuthenticated = !!tokenStorage.getAccess();

  // While auth is resolving, don't redirect yet
  if (loading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !ADMIN_ROLES.includes(user.role_name)) return <Navigate to="/" replace />;

  return <Outlet />;
}
