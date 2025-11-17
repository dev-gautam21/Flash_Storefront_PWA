import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, fetchAdminProfile } from '../services/api';

interface AdminLoginProps {
  onSuccess?: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    fetchAdminProfile(token)
      .then(() => {
        if (onSuccess) onSuccess();
        else navigate('/admin', { replace: true });
      })
      .catch(() => localStorage.removeItem('adminToken'));
  }, [navigate, onSuccess]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
        const { token, expiresIn } = await adminLogin(email, password);
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminTokenExpiresAt', String(Date.now() + expiresIn * 1000));

        if (onSuccess) onSuccess();
        else navigate('/admin', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, navigate, onSuccess, password]
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Admin Console</h1>
        <p className="mt-2 text-sm text-gray-500 text-center">
          Sign in to manage campaigns, flash sales, and analytics.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-600">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-600">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-lg bg-blue-600 py-2 text-white font-semibold transition-colors ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 text-center">
          Protected by JWT authentication. Access is limited to authorized campaign managers.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;

