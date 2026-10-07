import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendVerification, verifyEmail } from '../lib/api';

type VerifyState = {
  email?: string;
  message?: string;
  expiresInMinutes?: number;
};

export function Verify() {
  const location = useLocation();
  const state = (location.state ?? {}) as VerifyState;
  const email = (state.email ?? '').trim();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await verifyEmail(email, code.trim());
      navigate('/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResending(true);
    setError('');
    setNotice('');
    try {
      await resendVerification(email);
      setNotice('A new code is on its way. Check your inbox.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not resend the code.',
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white px-6 py-7 text-slate-900 sm:px-10">
      <div className="flex items-center justify-between">
        <Link className="inline-flex w-fit items-center gap-3" to="/">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-700 text-white shadow-lg shadow-blue-950/15">
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m8.5 3.75-6 10.5 3.75 6.5h12l3.25-5.75-6.5-11.25h-6.5Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="m2.5 14.25 12.5-.5m-6.5-10 6.5 11.25"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.7"
              />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            WebFP Drive
          </span>
        </Link>
        <Link
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          to="/auth/sign-in"
        >
          Back to sign in
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        <div className="mb-9">
          <p className="mb-3 text-sm font-semibold tracking-wide text-blue-700">
            VERIFY YOUR EMAIL
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Check your inbox
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {email ? (
              <>
                We sent an email to{' '}
                <span className="font-medium text-slate-900">{email}</span>.
                Enter the six-digit code from that email to finish creating your
                account.
                {typeof state.expiresInMinutes === 'number' &&
                  ` The code expires in ${state.expiresInMinutes} minutes.`}
              </>
            ) : (
              'We emailed you a six-digit code to finish creating your account.'
            )}
          </p>
        </div>

        {!email ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
            We could not find an email to verify.{' '}
            <Link className="font-semibold underline" to="/auth/sign-up">
              Sign up again
            </Link>{' '}
            to get a new code.
          </p>
        ) : (
          <>
            <form className="space-y-5" onSubmit={submit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Verification code
                </span>
                <input
                  autoComplete="one-time-code"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-center font-mono text-lg font-semibold tracking-[0.4em] text-slate-900 outline-none transition placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  pattern="[0-9]*"
                  placeholder="000000"
                  required
                  value={code}
                />
              </label>
              {notice && (
                <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-700">
                  {notice}
                </p>
              )}
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
                disabled={busy || code.length !== 6}
                type="submit"
              >
                {busy ? 'Verifying…' : 'Verify and continue'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                className="font-semibold text-blue-700 transition hover:text-blue-900 disabled:opacity-60"
                disabled={resending}
                onClick={resend}
                type="button"
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
              <Link
                className="text-slate-500 transition hover:text-slate-900"
                to="/auth/sign-up"
              >
                Use a different email
              </Link>
            </div>
          </>
        )}
      </div>

      <footer className="text-center text-xs text-slate-400">
        Your files stay yours. Always.
      </footer>
    </main>
  );
}
