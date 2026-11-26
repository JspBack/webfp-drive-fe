import { type FormEvent, type ReactNode, useEffect, useState } from 'react';

import { createFolder } from '../lib/drive';
import { messageOf } from '../lib/errors';
import { PlusIcon, Spinner, TrashIcon, XIcon } from './icons';

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
      <div
        aria-labelledby="modal-title"
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/20"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-lg font-semibold tracking-tight text-slate-950"
              id="modal-title"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 grid size-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (cause) {
      setError(messageOf(cause, 'Something went wrong.'));
      setBusy(false);
      return;
    }
    setBusy(false);
    onClose();
  }

  return (
    <Modal
      description={message}
      footer={
        <>
          <button
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            disabled={busy}
            onClick={() => void confirm()}
            type="button"
          >
            {busy ? <Spinner /> : <TrashIcon className="size-4" />}
            {confirmLabel}
          </button>
        </>
      }
      onClose={onClose}
      title={title}
    >
      {error && (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}

export function NewFolderDialog({
  defaultParentId,
  onCreated,
  onClose,
}: {
  defaultParentId: string | null;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createFolder(trimmed, defaultParentId);
    } catch (cause) {
      setError(messageOf(cause, 'Unable to create the folder.'));
      setBusy(false);
      return;
    }
    setBusy(false);
    onCreated();
    onClose();
  }

  return (
    <Modal
      footer={
        <>
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
            form="new-folder-form"
            type="submit"
          >
            {busy ? <Spinner /> : <PlusIcon className="size-4" />}
            Create
          </button>
        </>
      }
      onClose={onClose}
      title="New folder"
    >
      <form
        className="mt-5"
        id="new-folder-form"
        onSubmit={(event) => void submit(event)}
      >
        <label
          className="block text-sm font-medium text-slate-700"
          htmlFor="folder-name"
        >
          Folder name
        </label>
        <input
          autoFocus
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          id="folder-name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Design assets"
          value={name}
        />
        {error && (
          <p
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
