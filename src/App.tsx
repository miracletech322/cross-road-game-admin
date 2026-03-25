import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import GuestOnly from './layout/GuestOnly';
import ProtectedLayout from './layout/ProtectedLayout';
import SignIn from './pages/Authentication/SignIn';
import UserManagement from './pages/UserManagement';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 400);
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/auth/signin" element={<SignIn />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/users" element={<UserManagement />} />
        <Route path="/" element={<Navigate to="/users" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
