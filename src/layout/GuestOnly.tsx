import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export default function GuestOnly() {
  const { token } = useAuth();

  if (token) {
    return <Navigate to="/users" replace />;
  }

  return <Outlet />;
}
