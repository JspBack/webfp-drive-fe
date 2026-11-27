import { useEffect, useState } from 'react';

import type { ShareListItem } from '../lib/drive';
import { listShares, revokeShare } from '../lib/drive';
import { messageOf } from '../lib/errors';
import { formatDate } from '../lib/format';
import { Modal } from './dialogs';
import { CopyIcon, LinkIcon, Spinner, TrashIcon } from './icons';

export function SharesDialog({ onClose }: { onClose: () => void }) {
  const [shares, setShares] = useState<ShareListItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const items = await listShares();
        if (cancelled) return;
        setShares(items);
        if (items.some((item) => item.status === 'preparing')) {
          timer = setTimeout(() => void load(), 3000);
        }
      } catch (cause) {
        if (cancelled) return;
        setShares((previous) => previous ?? []);
        setError(messageOf(cause, 'Unable to load your share links.'));
      }
    }
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  async function copy(share: ShareListItem) {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopiedId(share.id);
      setTimeout(
        () => setCopiedId((id) => (id === share.id ? null : id)),
        2_000,
      );
    } catch {
      setError('Copy failed — select the link and copy it manually.');
    }
  }

  async function revoke(share: ShareListItem) {
    setBusyId(share.id);
    setError('');
    try {
      await revokeShare(share.id);
      setShares((items) =>
        (items ?? []).filter((item) => item.id !== share.id),
      );
    } catch (cause) {
      setError(messageOf(cause, 'Unable to revoke that share link.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal
      description="Active links you have created. Revoking a link disables it immediately."
      onClose={onClose}
      title="Share links"
      footer={
        <button
          className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      }
    >
      {error && (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mt-5 max-h-[55vh] overflow-y-auto pr-1">
        {shares === null ? (
          <div className="grid min-h-32 place-items-center text-slate-400">
            <Spinner className="size-6" />
          </div>
        ) : shares.length === 0 ? (
          <div className="grid min-h-32 place-items-center px-4 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                <LinkIcon className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                No active share links
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Create one from a file or folder actions menu.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-3" data-testid="share-list">
            {shares.map((share) => (
              <li
                className="rounded-2xl border border-slate-200 p-3.5"
                data-testid="share-row"
                key={share.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {share.filename}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {share.status === 'ready'
                        ? `Expires ${formatDate(share.expires_at)} · `
                        : ''}
                      {share.download_count}{' '}
                      {share.download_count === 1 ? 'download' : 'downloads'}
                      {share.max_downloads > 0
                        ? ` of ${share.max_downloads}`
                        : ''}
                      {share.has_password ? ' · password protected' : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {share.status === 'preparing'
                      ? 'Preparing ZIP'
                      : share.status === 'failed'
                        ? 'ZIP failed'
                        : 'Ready'}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  {share.url ? (
                    <>
                      <input
                        aria-label={`Share link for ${share.filename}`}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none"
                        onFocus={(event) => event.currentTarget.select()}
                        readOnly
                        value={share.url}
                      />
                      <button
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        onClick={() => void copy(share)}
                        type="button"
                      >
                        <CopyIcon className="size-3.5" />
                        {copiedId === share.id ? 'Copied' : 'Copy'}
                      </button>
                    </>
                  ) : (
                    <p className="flex-1 self-center text-xs text-slate-500">
                      {share.status === 'failed'
                        ? 'Could not prepare this ZIP. Create a new share to retry.'
                        : 'The download link will appear when the ZIP is ready.'}
                    </p>
                  )}
                  <button
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    disabled={busyId === share.id}
                    onClick={() => void revoke(share)}
                    type="button"
                  >
                    {busyId === share.id ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <TrashIcon className="size-3.5" />
                    )}
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
