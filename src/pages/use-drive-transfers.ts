import {
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useDriveToast } from '../components/drive-toast-state';
import {
  type DriveFile,
  type DriveFolder,
  moveFile,
  moveFolder,
  type StorageUsage,
} from '../lib/drive';
import {
  DRAG_MIME,
  type DragPayload,
  isFileDrag,
  isItemDrag,
  parseDragPayload,
} from '../lib/drive-drag';
import { importFolder, uploadFiles } from '../lib/drive-uploads';
import { droppedFolders } from '../lib/dropped-folders';
import { messageOf } from '../lib/errors';
import { formatBytes } from '../lib/format';

export function useDriveTransfers(
  folderId: string | undefined,
  files: DriveFile[],
  usage: StorageUsage | null,
  refresh: () => void,
  setError: (message: string) => void,
) {
  const showToast = useDriveToast();
  const [uploading, setUploading] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const uploadInProgress = useRef<AbortController | null>(null);
  const [folderQueue, setFolderQueue] = useState<{
    files: File[];
    destination: string | null;
  } | null>(null);

  useEffect(() => () => uploadInProgress.current?.abort(), []);

  const handleUpload = useCallback(
    async (
      chosen: FileList | File[],
      destination: string | null,
      asFolder = false,
    ) => {
      const uploads = Array.from(chosen);
      if (uploads.length === 0 || uploadInProgress.current) return;
      if (usage && usage.limit_bytes > 0) {
        const incoming = uploads.reduce((total, file) => total + file.size, 0);
        if (usage.used_bytes + incoming > usage.limit_bytes) {
          showToast('upload', {
            kind: 'error',
            title: 'Not enough storage',
            message: `These uploads need ${formatBytes(incoming)}, but only ${formatBytes(
              Math.max(usage.limit_bytes - usage.used_bytes, 0),
            )} is available.`,
          });
          return;
        }
      }
      const controller = new AbortController();
      uploadInProgress.current = controller;
      const total = uploads.length;
      setUploading(total);
      let completed = 0;
      let failed = 0;
      let lastError = '';
      const progressMessage = () =>
        `${completed.toLocaleString()} of ${total.toLocaleString()} files uploaded`;
      function showProgress(retryDelay?: number) {
        const percent = Math.floor(((completed + failed) / total) * 100);
        const progress = failed
          ? `${progressMessage()} · ${failed} failed (${percent}% processed)`
          : `${progressMessage()} (${percent}%)`;
        showToast('upload', {
          kind: 'progress',
          title: asFolder ? 'Importing folder' : 'Uploading files',
          message: retryDelay
            ? `${progressMessage()}. Retrying in ${retryDelay} seconds.`
            : progress,
          cancel: () => controller.abort(),
          completed: completed + failed,
          total,
        });
      }
      function fileUploaded() {
        completed += 1;
        showProgress();
      }
      showProgress();
      const options = {
        signal: controller.signal,
        onFileUploaded: fileUploaded,
        onRetry: showProgress,
      };
      try {
        if (asFolder) {
          await importFolder(uploads, destination, {
            ...options,
            onFileFailed: (file, cause) => {
              failed += 1;
              lastError = `${file.name}: ${messageOf(cause, 'Upload failed.')}`;
              showProgress();
            },
          });
        } else {
          await uploadFiles(uploads, destination, options);
        }
        controller.signal.throwIfAborted();
        setError('');
        showToast('upload', {
          kind: failed ? 'error' : 'success',
          title: failed
            ? 'Import finished with errors'
            : asFolder
              ? 'Folder imported'
              : 'Upload complete',
          message: failed
            ? `${progressMessage()} · ${failed} failed. ${lastError}`
            : progressMessage(),
        });
      } catch (cause) {
        showToast('upload', {
          kind: 'error',
          title: controller.signal.aborted
            ? 'Upload canceled'
            : 'Upload stopped',
          message: controller.signal.aborted
            ? `${progressMessage()}. Completed files remain in Drive.`
            : `${progressMessage()}. ${messageOf(cause, 'Upload failed.')}`,
        });
      } finally {
        uploadInProgress.current = null;
        setUploading(0);
        refresh();
      }
    },
    [refresh, setError, showToast, usage],
  );

  const handleMove = useCallback(
    async (payload: DragPayload, destination: string | null) => {
      if (payload.kind === 'folder') {
        if (payload.id === destination || destination === folderId) return;
      } else {
        const current = files.find((file) => file.id === payload.id);
        if (current && (current.folder_id ?? null) === destination) return;
      }
      try {
        if (payload.kind === 'folder')
          await moveFolder(payload.id, destination);
        else await moveFile(payload.id, destination);
        setError('');
        refresh();
      } catch (cause) {
        setError(messageOf(cause, 'Unable to move that item.'));
      }
    },
    [files, folderId, refresh, setError],
  );

  function makeZone(destination: string | null, key: string) {
    return {
      onDragOver: (event: DragEvent) => {
        if (!isFileDrag(event) && !isItemDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setHover(key);
      },
      onDragLeave: (event: DragEvent) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null))
          return;
        event.stopPropagation();
        setHover((value) => (value === key ? null : value));
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setHover(null);
        if (isFileDrag(event)) {
          if (uploadInProgress.current) return;
          const folders = droppedFolders(event.dataTransfer.items);
          if (folders) {
            void folders
              .then((files) => {
                if (!files.length) {
                  showToast('upload', {
                    kind: 'error',
                    title: 'No files to import',
                    message: 'The dropped folders are empty.',
                  });
                  return;
                }
                setFolderQueue({ files, destination });
              })
              .catch((cause: unknown) =>
                showToast('upload', {
                  kind: 'error',
                  title: 'Could not read dropped folders',
                  message: messageOf(
                    cause,
                    'Use the folder picker to try again.',
                  ),
                }),
              );
            return;
          }
          const dropped = event.dataTransfer.files;
          if (dropped.length > 0) void handleUpload(dropped, destination);
          return;
        }
        const payload = parseDragPayload(event.dataTransfer.getData(DRAG_MIME));
        if (payload) void handleMove(payload, destination);
      },
    };
  }

  const uploadZone = makeZone(folderId ?? null, 'upload');
  const gridZone = makeZone(folderId ?? null, 'grid');
  const rootZone = makeZone(null, 'home-crumb');

  function folderTileProps(folder: DriveFolder) {
    const zone = makeZone(folder.id, folder.id);
    return {
      zone,
      root: {
        draggable: true,
        onDragStart: (event: DragEvent) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData(
            DRAG_MIME,
            JSON.stringify({ kind: 'folder', id: folder.id }),
          );
          event.dataTransfer.setData('text/plain', folder.name);
        },
      },
    };
  }

  function fileTileProps(file: DriveFile) {
    return {
      draggable: true,
      onDragStart: (event: DragEvent) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(
          DRAG_MIME,
          JSON.stringify({ kind: 'file', id: file.id }),
        );
        event.dataTransfer.setData('text/plain', file.filename);
      },
    };
  }

  function addQueuedFolders(files: File[]) {
    setFolderQueue((queue) => {
      if (!queue) return null;
      const paths = new Map(
        queue.files.map((file) => [file.webkitRelativePath, file]),
      );
      for (const file of files) {
        if (file.webkitRelativePath) paths.set(file.webkitRelativePath, file);
      }
      return { ...queue, files: [...paths.values()] };
    });
  }

  return {
    folderQueue,
    openFolderQueue: () =>
      setFolderQueue({ files: [], destination: folderId ?? null }),
    closeFolderQueue: () => setFolderQueue(null),
    addQueuedFolders,
    startFolderImport: () => {
      if (!folderQueue?.files.length) return;
      setFolderQueue(null);
      void handleUpload(folderQueue.files, folderQueue.destination, true);
    },
    uploading,
    hover,
    uploadZone,
    gridZone,
    rootZone,
    handleUpload,
    folderTileProps,
    fileTileProps,
  };
}
