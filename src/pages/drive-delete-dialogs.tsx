import { ConfirmDialog } from '../components/dialogs';
import type { DeleteTarget } from './drive-grid';

export function DriveDeleteDialogs({
  target,
  bulk,
  count,
  closeTarget,
  closeBulk,
  deleteTarget,
  deleteBulk,
}: {
  target: DeleteTarget | null;
  bulk: boolean;
  count: number;
  closeTarget: () => void;
  closeBulk: () => void;
  deleteTarget: () => Promise<void>;
  deleteBulk: () => Promise<void>;
}) {
  return (
    <>
      {bulk && (
        <ConfirmDialog
          confirmLabel="Delete selected"
          message={`Permanently delete ${count} selected items? Selected folders and their contents will be deleted. This cannot be undone.`}
          onClose={closeBulk}
          onConfirm={deleteBulk}
          title="Delete selected items"
        />
      )}
      {target && (
        <ConfirmDialog
          confirmLabel="Delete"
          message={
            target.kind === 'file'
              ? `“${target.name}” will be permanently deleted. This cannot be undone.`
              : `“${target.name}” will be permanently deleted. All files and subfolders inside it will be deleted. This cannot be undone.`
          }
          onClose={closeTarget}
          onConfirm={deleteTarget}
          title={`Delete ${target.kind}`}
        />
      )}
    </>
  );
}
