import { listFiles, listFolders } from './drive';
import {
  type DeleteBatchItem,
  type DeleteBatchResult,
  deleteItems,
} from './drive-batches';

async function deleteFolderTree(root: DeleteBatchItem) {
  const levels = [[root]];
  const files: DeleteBatchItem[] = [];

  for (const level of levels) {
    const children: DeleteBatchItem[] = [];
    for (const { id } of level) {
      const [folders, contents] = await Promise.all([
        listFolders(id),
        listFiles(id),
      ]);
      children.push(
        ...folders.map(({ id }) => ({ id, kind: 'folder' as const })),
      );
      files.push(...contents.map(({ id }) => ({ id, kind: 'file' as const })));
    }
    if (children.length) levels.push(children);
  }

  function requireSuccess(results: DeleteBatchResult[]) {
    const failure = results.find(({ error }) => error);
    if (failure) throw new Error(failure.error);
  }

  await deleteItems(files, requireSuccess);
  for (const level of levels.reverse()) {
    await deleteItems(level, requireSuccess);
  }
}

export async function deleteDriveItems(
  items: DeleteBatchItem[],
  onBatch: (results: DeleteBatchResult[]) => void,
): Promise<void> {
  await deleteItems(
    items.filter(({ kind }) => kind === 'file'),
    onBatch,
  );
  for (const folder of items.filter(({ kind }) => kind === 'folder')) {
    let result: DeleteBatchResult = folder;
    try {
      await deleteFolderTree(folder);
    } catch (cause) {
      result = {
        ...folder,
        error:
          cause instanceof Error && cause.message
            ? cause.message
            : 'Unable to delete folder.',
      };
    }
    onBatch([result]);
  }
}
