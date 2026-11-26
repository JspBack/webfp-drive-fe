import { type FormEvent, useState } from 'react';

import type { DriveFile, ShareLink } from '../lib/drive';
import { createShare } from '../lib/drive';
import { messageOf } from '../lib/errors';
import { Modal } from './dialogs';
import { CopyIcon, LinkIcon, ShareIcon, Spinner } from './icons';

const EXPIRY_CHOICES = [
  { value: '1h', label: 'In 1 hour', hours: 1 },
  { value: '24h', label: 'In 24 hours', hours: 24 },
  { value: '7d', label: 'In 7 days', hours: 24 * 7 },
  { value: '30d', label: 'In 30 days', hours: 24 * 30 },
] as const;

export function ShareDialog({
  file,
  onClose,
}: {
  file: DriveFile;
  onClose: () => void;
}) {
  const [expiry, setExpiry] = useState<string>('24h');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [share, setShare] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const choice =
      EXPIRY_CHOICES.find((item) => item.value === expiry) ?? EXPIRY_CHOICES[1];
    const trimmedMax = maxDownloads.trim();
    let max: number | undefined;
    if (trimmedMax) {
      const parsed = Number(trimmedMax);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setError('Maximum downloads must be a positive whole number.');
        return;
      }
      max = parsed;
    }
    setBusy(true);
    setError('');
    try {
      const created = await createShare(file.id, {
        expiresAt: new Date(
          Date.now() + choice.hours * 3_600_000,
        ).toISOString(),
        maxDownloads: max,
        password: password || undefined,
      });
      setShare(created);
    } catch (cause) {
      setError(messageOf(cause, 'Unable to create the share link.'));
    }
    setBusy(false);
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      setError('Copy failed — select the link and copy it manually.');
    }
  }

  if (share) {
    return (
      <Modal onClose={onClose} title="Share link created">
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <LinkIcon className="size-4" />
            Anyone with the link can download “{file.filename}”
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            Expires {new Date(share.expires_at).toLocaleString()}
          </p>
        </div>
        <label
          className="mt-4 block text-sm font-medium text-slate-700"
          htmlFor="share-url"
        >
          Link
        </label>
        <div className="mt-2 flex gap-2">
          <input
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none"
            id="share-url"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={share.url}
          />
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
            onClick={() => void copyLink()}
            type="button"
          >
            {copied ? 'Copied' : <CopyIcon className="size-4" />}
          </button>
        </div>
        {error && (
          <p
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      description={`Create a link that lets anyone download “${file.filename}”.`}
      onClose={onClose}
      title="Share file"
    >
      <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
        <div>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="share-expiry"
          >
            Link expires
          </label>
          <select
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            id="share-expiry"
            onChange={(event) => setExpiry(event.target.value)}
            value={expiry}
          >
            {EXPIRY_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="share-max"
          >
            Maximum downloads{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            id="share-max"
            min="1"
            onChange={(event) => setMaxDownloads(event.target.value)}
            placeholder="Unlimited"
            type="number"
            value={maxDownloads}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="share-password"
          >
            Password{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            id="share-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Require a password to download"
            type="password"
            value={password}
          />
        </div>
        {error && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <button
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? <Spinner /> : <ShareIcon className="size-4" />}
            Create link
          </button>
        </div>
      </form>
    </Modal>
  );
}
