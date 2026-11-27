import type { ShowDriveToast } from '../components/drive-toast-state';
import { deleteDriveItems } from '../lib/drive-delete';
import { messageOf } from '../lib/errors';
import type { DeleteTarget } from './drive-grid';

export async function deleteDriveSelection(
  selectedItems: DeleteTarget[],
  selectionKey: (item: Pick<DeleteTarget, 'kind' | 'id'>) => string,
  setSelection: (selection: Set<string>) => void,
  refresh: () => void,
  showToast: ShowDriveToast,
) {
  const failed = new Set<string>();
  const errors: string[] = [];
  const total = selectedItems.length;
  let completed = 0;
  function showProgress() {
    showToast('delete', {
      kind: 'progress',
      title: 'Deleting items',
      message: `${completed.toLocaleString()} of ${total.toLocaleString()} items processed`,
      completed,
      total,
    });
  }
  showProgress();
  const byItem = new Map(
    selectedItems.map((item) => [selectionKey(item), item]),
  );
  try {
    await deleteDriveItems(selectedItems, (results) => {
      for (const result of results) {
        const key = selectionKey(result);
        const item = byItem.get(key);
        if (result.error && item) {
          failed.add(key);
          errors.push(`${item.name}: ${result.error}`);
        }
        byItem.delete(key);
      }
      completed += results.length;
      showProgress();
    });
  } catch (cause) {
    for (const key of byItem.keys()) failed.add(key);
    errors.push(messageOf(cause, 'Unable to delete selected items.'));
  }
  setSelection(failed);
  refresh();
  showToast('delete', {
    kind: failed.size > 0 ? 'error' : 'success',
    title:
      failed.size > 0 ? 'Some items could not be deleted' : 'Items deleted',
    message: `${(total - failed.size).toLocaleString()} of ${total.toLocaleString()} items deleted`,
  });
  if (errors.length) throw new Error(errors.join(' • '));
}
