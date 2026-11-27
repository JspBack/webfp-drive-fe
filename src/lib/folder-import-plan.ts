import { createFolderBatch } from './drive-batches';
import type { UploadOptions } from './upload-retry';

type FolderPath = { path: string; name: string; parentPath: string };
type Destination = { id: string } | { error: unknown };

const maxFolderBatch = 100;

export async function prepareImportFolders(
  files: File[],
  parentId: string | null,
  options: UploadOptions,
): Promise<Map<string, Destination>> {
  const levels: Map<string, FolderPath>[] = [];
  for (const file of files) {
    let parentPath = '';
    const names = file.webkitRelativePath.split('/').slice(0, -1);
    for (const [depth, name] of names.entries()) {
      const path = `${parentPath}/${name}`;
      levels[depth] ??= new Map();
      const level = levels[depth];
      if (!level.has(path)) level.set(path, { path, parentPath, name });
      parentPath = path;
    }
  }

  const destinations = new Map<string, Destination>();
  for (const level of levels) {
    const ready: { path: string; name: string; parent_id: string | null }[] =
      [];
    for (const folder of level.values()) {
      const parent = destinations.get(folder.parentPath);
      if (parent && 'error' in parent) {
        destinations.set(folder.path, parent);
      } else {
        ready.push({
          path: folder.path,
          name: folder.name,
          parent_id: parent?.id ?? parentId,
        });
      }
    }
    for (let offset = 0; offset < ready.length; offset += maxFolderBatch) {
      options.signal?.throwIfAborted();
      const batch = ready.slice(offset, offset + maxFolderBatch);
      try {
        const results = await createFolderBatch(
          batch.map(({ name, parent_id }) => ({ name, parent_id })),
          options,
        );
        for (const [index, { path }] of batch.entries()) {
          const result = results[index];
          destinations.set(
            path,
            result.folder
              ? { id: result.folder.id }
              : {
                  error: new Error(result.error ?? 'Folder creation failed'),
                },
          );
        }
      } catch (error) {
        if (options.signal?.aborted || !options.onFileFailed) throw error;
        for (const { path } of batch) destinations.set(path, { error });
      }
    }
  }
  return destinations;
}
