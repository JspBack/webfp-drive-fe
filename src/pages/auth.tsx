import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  register,
  signIn,
  startGitHubLogin,
  startGoogleLogin,
  VerificationRequiredError,
} from '../lib/api';

import {
  ArrowIcon,
  AuthShowcase,
  Brand,
  GitHubMark,
  GoogleMark,
} from './auth-visuals';

type AuthMode = 'sign-in' | 'sign-up';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'sign-up') {
        const challenge = await register(name.trim(), email, password);
        navigate('/auth/verify', {
          state: {
            email: challenge.email,
            message: challenge.message,
            expiresInMinutes: challenge.expires_in_minutes,
          },
        });
        return;
      }
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (cause) {
      if (cause instanceof VerificationRequiredError) {
        navigate('/auth/verify', { state: { email: cause.email } });
        return;
      }
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 lg:grid lg:grid-cols-2">
      <AuthShowcase />

      <section className="flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-12 xl:px-20">
        <div className="lg:hidden">
          <Brand />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="mb-9">
            <p className="mb-3 text-sm font-semibold tracking-wide text-blue-700">
              {mode === 'sign-in' ? 'WELCOME BACK' : 'GET STARTED'}
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              {mode === 'sign-in'
                ? 'Sign in to your drive'
                : 'Create your account'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {mode === 'sign-in'
                ? 'Pick up right where you left off.'
                : 'Your secure space for all your files starts here.'}
            </p>
          </div>

          <div className="space-y-3">
            <button
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              onClick={startGoogleLogin}
              type="button"
            >
              <GoogleMark />
              Continue with Google
            </button>

            <button
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              onClick={startGitHubLogin}
              type="button"
            >
              <GitHubMark />
              Continue with GitHub
            </button>
          </div>

          <div className="my-7 flex items-center gap-4 text-xs font-medium text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            OR CONTINUE WITH EMAIL
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="space-y-5" onSubmit={submit}>
            {mode === 'sign-up' && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Full name
                </span>
                <input
                  autoComplete="name"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                  value={name}
                />
              </label>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </span>
              <input
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                autoComplete={
                  mode === 'sign-in' ? 'current-password' : 'new-password'
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                type="password"
                value={password}
              />
            </label>
            {error && (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy
                ? 'Please wait…'
                : mode === 'sign-in'
                  ? 'Sign in'
                  : 'Create account'}
              {!busy && <ArrowIcon />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {mode === 'sign-in'
              ? 'New to WebFP Drive?'
              : 'Already have an account?'}{' '}
            <button
              className="font-semibold text-blue-700 transition hover:text-blue-900 disabled:opacity-60"
              disabled={busy}
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                setError('');
              }}
              type="button"
            >
              {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>

        <footer className="text-center text-xs text-slate-400">
          Your files stay yours. Always.
        </footer>
      </section>
    </main>
  );
}
