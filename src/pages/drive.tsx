import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConfirmDialog, NewFolderDialog } from '../components/dialogs';
import { TrashIcon } from '../components/icons';
import { ShareDialog } from '../components/ShareDialog';
import { SharesDialog } from '../components/SharesDialog';
import { type DriveFile, deleteFile, deleteFolder } from '../lib/drive';
import { messageOf } from '../lib/errors';
import { formatBytes } from '../lib/format';
import { type DeleteTarget, DriveGrid } from './drive-grid';
import { DriveHeader, DriveToolbar } from './drive-navigation';
import { DriveUpload } from './drive-upload';
import { useDriveData } from './use-drive-data';
import { useDriveTransfers } from './use-drive-transfers';

const storagePlanLabels = { free: 'Free', pro: 'Pro', admin: 'Admin' } as const;

export function Drive() {
  const { folderId } = useParams<{ folderId?: string }>();
  const {
    user,
    folders,
    files,
    chain,
    currentName,
    loading,
    error,
    setError,
    usage,
    refresh,
    signOut,
  } = useDriveData(folderId);
  const transfers = useDriveTransfers(
    folderId,
    files,
    usage,
    refresh,
    setError,
  );
  const { hover, uploading, rootZone, uploadZone, handleUpload } = transfers;
  const [shareFile, setShareFile] = useState<DriveFile | null>(null);
  const [sharesOpen, setSharesOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the selection when navigating to another folder.
  useEffect(() => {
    setSelection(new Set());
    setBulkDeleteOpen(false);
    setError('');
  }, [folderId, setError]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'file') await deleteFile(deleteTarget.id);
    else await deleteFolder(deleteTarget.id);
    refresh();
  }

  const items: DeleteTarget[] = [
    ...folders.map(({ id, name }) => ({ kind: 'folder' as const, id, name })),
    ...files.map(({ id, filename }) => ({
      kind: 'file' as const,
      id,
      name: filename,
    })),
  ];
  const selectedItems = items.filter((item) =>
    selection.has(selectionKey(item)),
  );

  function selectionKey(item: Pick<DeleteTarget, 'kind' | 'id'>) {
    return `${item.kind}:${item.id}`;
  }

  function selectionBox(kind: DeleteTarget['kind'], id: string, name: string) {
    const key = selectionKey({ kind, id });
    return (
      <input
        aria-label={`Select ${kind} ${name}`}
        checked={selection.has(key)}
        className="size-5 shrink-0 accent-blue-700"
        onChange={(event) => {
          const checked = event.currentTarget.checked;
          setSelection((previous) => {
            const next = new Set(previous);
            if (checked) next.add(key);
            else next.delete(key);
            return next;
          });
        }}
        type="checkbox"
      />
    );
  }

  async function confirmBulkDelete() {
    const failed = new Set<string>();
    const errors: string[] = [];
    for (const item of selectedItems) {
      try {
        if (item.kind === 'file') await deleteFile(item.id);
        else await deleteFolder(item.id);
      } catch (cause) {
        failed.add(selectionKey(item));
        errors.push(`${item.name}: ${messageOf(cause, 'Delete failed.')}`);
      }
    }
    setSelection(failed);
    refresh();
    if (errors.length) throw new Error(errors.join(' • '));
  }

  const storageFull =
    usage !== null &&
    usage.limit_bytes > 0 &&
    usage.used_bytes >= usage.limit_bytes;
  const usagePercent =
    usage && usage.limit_bytes > 0
      ? Math.min(100, Math.round((usage.used_bytes / usage.limit_bytes) * 100))
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <DriveHeader email={user?.email} signOut={signOut} />

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8">
        <DriveToolbar
          chain={chain}
          currentName={currentName}
          hover={hover}
          rootZone={rootZone}
          storageFull={storageFull}
          uploading={uploading}
          onShares={() => setSharesOpen(true)}
          onNewFolder={() => setNewFolderOpen(true)}
          onImportFolder={() => folderInputRef.current?.click()}
          onUpload={() => inputRef.current?.click()}
        />

        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
          {currentName}
        </h1>

        {usage && (
          <div className="mt-4" data-testid="storage-usage">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span data-testid="storage-usage-text">
                {storagePlanLabels[usage.plan]} plan ·{' '}
                {formatBytes(usage.used_bytes)}
                {usage.limit_bytes > 0
                  ? ` of ${formatBytes(usage.limit_bytes)} used`
                  : ' used (unlimited)'}
                {storageFull && (
                  <span className="ml-2 font-semibold text-red-600">
                    Storage full
                  </span>
                )}
              </span>
              <span>
                {usage.file_count} {usage.file_count === 1 ? 'file' : 'files'}
              </span>
            </div>
            {usage.limit_bytes > 0 && (
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${storageFull ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            role="alert"
          >
            <p>{error}</p>
            <button
              aria-label="Dismiss error"
              className="font-semibold text-red-400 transition hover:text-red-700"
              onClick={() => setError('')}
              type="button"
            >
              Dismiss
            </button>
          </div>
        )}

        <DriveUpload
          currentName={currentName}
          folderId={folderId}
          hover={hover}
          storageFull={storageFull}
          uploading={uploading}
          uploadZone={uploadZone}
          inputRef={inputRef}
          folderInputRef={folderInputRef}
          handleUpload={handleUpload}
        />

        {!loading && items.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                checked={selectedItems.length === items.length}
                className="size-5 accent-blue-700"
                onChange={(event) =>
                  setSelection(
                    new Set(
                      event.currentTarget.checked
                        ? items.map(selectionKey)
                        : [],
                    ),
                  )
                }
                type="checkbox"
              />
              Select all
            </label>
            {selectedItems.length > 0 && (
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                onClick={() => setBulkDeleteOpen(true)}
                type="button"
              >
                <TrashIcon className="size-4" />
                Delete selected ({selectedItems.length})
              </button>
            )}
          </div>
        )}

        <DriveGrid
          loading={loading}
          folders={folders}
          files={files}
          transfers={transfers}
          selectionBox={selectionBox}
          setDeleteTarget={setDeleteTarget}
          setShareFile={setShareFile}
          setError={setError}
        />
      </section>

      {newFolderOpen && (
        <NewFolderDialog
          defaultParentId={folderId ?? null}
          onClose={() => setNewFolderOpen(false)}
          onCreated={refresh}
        />
      )}
      {shareFile && (
        <ShareDialog file={shareFile} onClose={() => setShareFile(null)} />
      )}
      {sharesOpen && <SharesDialog onClose={() => setSharesOpen(false)} />}
      {bulkDeleteOpen && (
        <ConfirmDialog
          confirmLabel="Delete selected"
          message={`Permanently delete ${selectedItems.length} selected items? Folders must be empty. This cannot be undone.`}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={confirmBulkDelete}
          title="Delete selected items"
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          confirmLabel="Delete"
          message={
            deleteTarget.kind === 'file'
              ? `“${deleteTarget.name}” will be permanently deleted. This cannot be undone.`
              : `“${deleteTarget.name}” will be permanently deleted. The folder must be empty.`
          }
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          title={`Delete ${deleteTarget.kind}`}
        />
      )}
    </main>
  );
}
