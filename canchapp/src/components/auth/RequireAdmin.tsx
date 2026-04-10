import { Navigate, Outlet } from 'react-router-dom';
import { tokenStorage } from '../../services/AuthService';

const ADMIN_ROLES = ['Owner', 'Manager'];

/**
 * Protects routes that require Owner or Manager role.
 * Redirects unauthenticated users to /login and unauthorized users to /.
 */
export default function RequireAdmin() {
  const user = tokenStorage.getUser();
  const isAuthenticated = !!tokenStorage.getAccess();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !ADMIN_ROLES.includes(user.role_name)) return <Navigate to="/" replace />;

  return <Outlet />;
}
