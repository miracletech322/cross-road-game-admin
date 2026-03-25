import { Navigate, Outlet, useLocation } from 'react-router-dom';

import DefaultLayout from './DefaultLayout';
import { useAuth } from '../context/AuthContext';

export default function ProtectedLayout() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/auth/signin" replace state={{ from: location }} />;
  }

  return (
    <DefaultLayout>
      <Outlet />
    </DefaultLayout>
  );
}
