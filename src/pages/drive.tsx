import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DriveToasts } from '../components/DriveToasts';
import { NewFolderDialog } from '../components/dialogs';
import { useDriveToast } from '../components/drive-toast-state';
import { TrashIcon } from '../components/icons';
import { ShareDialog } from '../components/ShareDialog';
import { SharesDialog } from '../components/SharesDialog';
import type { ShareTarget } from '../lib/drive';
import { deleteDriveItems } from '../lib/drive-delete';
import { messageOf } from '../lib/errors';
import { deleteDriveSelection } from './drive-bulk-delete';
import { DriveDeleteDialogs } from './drive-delete-dialogs';
import { type DeleteTarget, DriveGrid } from './drive-grid';
import { DriveHeader, DriveToolbar } from './drive-navigation';
import { DriveStorageUsage } from './drive-storage-usage';
import { DriveUpload } from './drive-upload';
import { FolderImportDialog } from './folder-import-dialog';
import { useDriveData } from './use-drive-data';
import { useDriveTransfers } from './use-drive-transfers';

export function Drive() {
  return (
    <DriveToasts>
      <DriveScreen />
    </DriveToasts>
  );
}

function DriveScreen() {
  const showToast = useDriveToast();
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
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [sharesOpen, setSharesOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the selection when navigating to another folder.
  useEffect(() => {
    setSelection(new Set());
    setBulkDeleteOpen(false);
    setError('');
  }, [folderId, setError]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDriveItems([deleteTarget], ([result]) => {
        if (result.error) throw new Error(result.error);
      });
    } catch (cause) {
      if (deleteTarget.kind === 'folder') refresh();
      showToast('delete', {
        kind: 'error',
        title: 'Delete failed',
        message: messageOf(cause, 'Unable to delete the item.'),
      });
      throw cause;
    }
    showToast('delete', {
      kind: 'success',
      title: 'Item deleted',
      message: deleteTarget.name,
    });
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

  const storageFull =
    usage !== null &&
    usage.limit_bytes > 0 &&
    usage.used_bytes >= usage.limit_bytes;
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
          onImportFolder={transfers.openFolderQueue}
          onRefresh={refresh}
          onUpload={() => inputRef.current?.click()}
        />

        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
          {currentName}
        </h1>

        {usage && <DriveStorageUsage storageFull={storageFull} usage={usage} />}

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
          setShareTarget={setShareTarget}
          setError={setError}
        />
      </section>
      {transfers.folderQueue && (
        <FolderImportDialog
          files={transfers.folderQueue.files}
          addFiles={transfers.addQueuedFolders}
          close={transfers.closeFolderQueue}
          start={transfers.startFolderImport}
        />
      )}
      {newFolderOpen && (
        <NewFolderDialog
          defaultParentId={folderId ?? null}
          onClose={() => setNewFolderOpen(false)}
          onCreated={refresh}
        />
      )}
      {shareTarget && (
        <ShareDialog
          target={shareTarget}
          onClose={() => setShareTarget(null)}
          openShares={() => {
            setShareTarget(null);
            setSharesOpen(true);
          }}
        />
      )}
      {sharesOpen && <SharesDialog onClose={() => setSharesOpen(false)} />}
      <DriveDeleteDialogs
        bulk={bulkDeleteOpen}
        closeBulk={() => setBulkDeleteOpen(false)}
        closeTarget={() => setDeleteTarget(null)}
        count={selectedItems.length}
        deleteBulk={() =>
          deleteDriveSelection(
            selectedItems,
            selectionKey,
            setSelection,
            refresh,
            showToast,
          )
        }
        deleteTarget={confirmDelete}
        target={deleteTarget}
      />
    </main>
  );
}
