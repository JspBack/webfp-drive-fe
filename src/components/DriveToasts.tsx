import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  type DriveToast,
  DriveToastContext,
  type ShowDriveToast,
} from './drive-toast-state';
import { XIcon } from './icons';

type Channel = Parameters<ShowDriveToast>[0];

function ToastCard({
  toast,
  dismiss,
}: {
  toast: DriveToast;
  dismiss: () => void;
}) {
  const { kind, title, message } = toast;

  useEffect(() => {
    if (toast.kind !== 'success') return;
    const timeout = window.setTimeout(dismiss, 6000);
    return () => window.clearTimeout(timeout);
  }, [toast, dismiss]);

  return (
    <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" role="status">
            {title}
          </p>
          <p className="mt-1 wrap-break-word text-sm text-slate-600">
            {message}
          </p>
        </div>
        {kind !== 'progress' && (
          <button
            aria-label={`Dismiss ${title}`}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={dismiss}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      {toast.kind === 'progress' && (
        <div className="mt-3 flex items-center gap-3">
          <progress
            aria-label={title}
            className="h-2 min-w-0 flex-1 accent-blue-700"
            max={toast.total}
            value={toast.completed}
          />
          {toast.cancel && (
            <button
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={toast.cancel}
              type="button"
            >
              Cancel upload
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DriveToasts({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Partial<Record<Channel, DriveToast>>>(
    {},
  );
  const show = useCallback<ShowDriveToast>((channel, toast) => {
    setToasts((current) => ({ ...current, [channel]: toast }));
  }, []);
  const dismissUpload = useCallback(() => {
    setToasts((current) => ({ ...current, upload: undefined }));
  }, []);
  const dismissDelete = useCallback(() => {
    setToasts((current) => ({ ...current, delete: undefined }));
  }, []);

  return (
    <DriveToastContext.Provider value={show}>
      {children}
      <aside
        aria-label="Drive notifications"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col gap-3 sm:left-auto sm:w-96"
      >
        {toasts.upload && (
          <ToastCard dismiss={dismissUpload} toast={toasts.upload} />
        )}
        {toasts.delete && (
          <ToastCard dismiss={dismissDelete} toast={toasts.delete} />
        )}
      </aside>
    </DriveToastContext.Provider>
  );
}
