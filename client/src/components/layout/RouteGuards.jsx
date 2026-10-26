import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageLoader } from '../ui/index.jsx';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: loc }} replace />;
}

// signed in + email confirmed + college ID approved
export function RequireVerified() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (user.verification?.status !== 'approved') {
    return <Navigate to="/verification" replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/market" replace />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to="/market" replace /> : <Outlet />;
}
