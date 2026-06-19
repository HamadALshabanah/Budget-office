'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { login, register } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
        await login(username, password);
      }
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--base)' }}
    >
      <div
        className="w-full max-w-sm panel p-8 flex flex-col gap-6"
        style={{ background: 'var(--surface)' }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="font-heading text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Budget Office
          </h1>
          <span
            className="text-[10px] px-2 py-0.5 rounded font-data"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </span>
        </div>

        {/* Tab toggle */}
        <div
          className="flex rounded-lg p-0.5 gap-0.5"
          style={{ background: 'var(--surface-inset)', border: '1px solid var(--border)' }}
        >
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: mode === m ? 'var(--surface)' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                border: mode === m ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Username
            </label>
            <input
              className="input-field px-3 py-2 text-sm w-full"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              className="input-field px-3 py-2 text-sm w-full"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-md"
              style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2 text-sm"
            style={{ color: '#fff' }}
          >
            {loading
              ? 'Please wait…'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
