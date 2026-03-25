import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import LogoDark from '../../images/logo/logo-dark.svg';
import Logo from '../../images/logo/logo.svg';
import { useAuth } from '../../context/AuthContext';
import { loginRequest } from '../../lib/api';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/users';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const identifier = String(form.get('identifier') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!identifier || !password) {
      toast.error('Enter email or username and password');
      return;
    }

    const isEmail = identifier.includes('@');
    const body = isEmail
      ? { email: identifier, password }
      : { username: identifier, password };

    setSubmitting(true);
    try {
      const { token, user } = await loginRequest(body);
      login(token, user);
      toast.success('Signed in');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-boxdark-2">
      <div className="flex min-h-screen flex-wrap items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-block">
              <img className="hidden dark:block" src={Logo} alt="Logo" />
              <img className="dark:hidden" src={LogoDark} alt="Logo" />
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Admin sign in</h1>
            <p className="mt-2 text-sm text-body dark:text-bodydark">
              Sign in with your email or username to manage users.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                Email or username
              </label>
              <input
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="you@example.com or player1"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">Password</label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary py-3 font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
