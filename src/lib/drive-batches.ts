import type { DriveFolder } from './drive';
import { expect, readBatchResults, request } from './drive-http';
import { retryRateLimited, type UploadOptions } from './upload-retry';

type DeleteBatchItem = { id: string; kind: 'file' | 'folder' };
type DeleteBatchResult = DeleteBatchItem & { error?: string };

type FolderInput = { name: string; parent_id: string | null };
type FolderResult = { folder?: DriveFolder; error?: string };

const maxDeleteBatch = 1000;

export async function deleteItems(
  items: DeleteBatchItem[],
  onBatch: (results: DeleteBatchResult[]) => void,
): Promise<void> {
  const idsByKind: Record<DeleteBatchItem['kind'], string[]> = {
    file: [],
    folder: [],
  };
  for (const { id, kind } of items) idsByKind[kind].push(id);
  for (const kind of ['file', 'folder'] as const) {
    const ids = idsByKind[kind];
    for (let offset = 0; offset < ids.length; offset += maxDeleteBatch) {
      const batch = ids.slice(offset, offset + maxDeleteBatch);
      const response = await expect(
        await request(`/api/v1/${kind}s/batch`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch }),
        }),
        `Unable to delete selected ${kind}s.`,
      );
      const results = await readBatchResults<Omit<DeleteBatchResult, 'kind'>>(
        response,
        batch.length,
      );
      if (results.some((result, index) => result.id !== batch[index])) {
        throw new Error('Invalid delete batch response.');
      }
      onBatch(results.map((result) => ({ ...result, kind })));
    }
  }
}

export async function createFolderBatch(
  folders: FolderInput[],
  options: UploadOptions = {},
): Promise<FolderResult[]> {
  const response = await expect(
    await retryRateLimited(
      () =>
        request('/api/v1/folders/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folders }),
          signal: options.signal,
        }),
      options,
    ),
    'Unable to create the selected folders.',
  );
  return readBatchResults<FolderResult>(response, folders.length);
}
