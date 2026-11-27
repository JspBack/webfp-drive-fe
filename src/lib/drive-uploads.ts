import { expect, readBatchResults, request } from './drive-http';
import { prepareImportFolders } from './folder-import-plan';
import { retryRateLimited, type UploadOptions } from './upload-retry';

const maxBatchFiles = 100;
const maxBatchBytes = 48 * 1024 * 1024;

function* uploadBatches(files: File[]) {
  let batch: File[] = [];
  let bytes = 0;
  for (const file of files) {
    if (
      batch.length &&
      (batch.length >= maxBatchFiles || bytes + file.size > maxBatchBytes)
    ) {
      yield batch;
      batch = [];
      bytes = 0;
    }
    batch.push(file);
    bytes += file.size;
  }
  if (batch.length) yield batch;
}

async function uploadBatch(
  files: File[],
  folderId: string | null,
  options: UploadOptions,
) {
  const form = new FormData();
  for (const file of files) form.append('file', file, file.name);
  const folderQuery = folderId
    ? `?folder_id=${encodeURIComponent(folderId)}`
    : '';
  const response = await expect(
    await retryRateLimited(
      () =>
        request(`/api/v1/files/batch${folderQuery}`, {
          method: 'POST',
          body: form,
          signal: options.signal,
        }),
      options,
    ),
    'Upload batch failed.',
  );
  const results = await readBatchResults<{ error?: string }>(
    response,
    files.length,
  );
  let firstError: Error | undefined;
  for (const [index, file] of files.entries()) {
    const error = results[index].error;
    if (!error) {
      options.onFileUploaded?.();
      continue;
    }
    const cause = new Error(error);
    firstError ??= cause;
    options.onFileFailed?.(file, cause);
  }
  if (firstError && !options.onFileFailed) throw firstError;
}

export async function uploadFiles(
  files: File[],
  folderId: string | null,
  options: UploadOptions = {},
): Promise<void> {
  for (const batch of uploadBatches(files)) {
    try {
      await uploadBatch(batch, folderId, options);
    } catch (cause) {
      if (options.signal?.aborted || !options.onFileFailed) throw cause;
      for (const file of batch) options.onFileFailed(file, cause);
    }
  }
}

export async function importFolder(
  files: File[],
  parentId: string | null,
  options: UploadOptions = {},
): Promise<void> {
  if (files.some((file) => !file.webkitRelativePath.includes('/'))) {
    throw new Error('Your browser did not provide the selected folder paths.');
  }
  const destinations = await prepareImportFolders(files, parentId, options);
  const grouped = new Map<string, File[]>();
  for (const file of files) {
    options.signal?.throwIfAborted();
    const path = `/${file.webkitRelativePath.slice(0, file.webkitRelativePath.lastIndexOf('/'))}`;
    const destination = destinations.get(path);
    if (!destination || 'error' in destination) {
      const error =
        destination?.error ?? new Error('Import destination unavailable.');
      if (!options.onFileFailed) throw error;
      options.onFileFailed(file, error);
      continue;
    }
    const group = grouped.get(destination.id);
    if (group) group.push(file);
    else grouped.set(destination.id, [file]);
  }
  for (const [destination, group] of grouped) {
    await uploadFiles(group, destination, options);
  }
}
