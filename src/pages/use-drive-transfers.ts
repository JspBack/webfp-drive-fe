import { type DragEvent, useCallback, useRef, useState } from 'react';
import {
  DRAG_MIME,
  type DragPayload,
  type DriveFile,
  type DriveFolder,
  importFolder,
  isFileDrag,
  isItemDrag,
  moveFile,
  moveFolder,
  parseDragPayload,
  type StorageUsage,
  uploadFiles,
} from '../lib/drive';
import { messageOf } from '../lib/errors';
import { formatBytes } from '../lib/format';

export function useDriveTransfers(
  folderId: string | undefined,
  files: DriveFile[],
  usage: StorageUsage | null,
  refresh: () => void,
  setError: (message: string) => void,
) {
  const [uploading, setUploading] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const uploadInProgress = useRef(false);

  const handleUpload = useCallback(
    async (
      chosen: FileList | File[],
      destination: string | null,
      asFolder = false,
    ) => {
      const uploads = Array.from(chosen);
      if (uploads.length === 0 || uploadInProgress.current) return;
      if (usage) {
        const incoming = uploads.reduce((total, file) => total + file.size, 0);
        if (usage.used_bytes + incoming > usage.limit_bytes) {
          setError(
            `Storage is full: these uploads need ${formatBytes(incoming)} but only ${formatBytes(
              Math.max(usage.limit_bytes - usage.used_bytes, 0),
            )} is left. Delete files to free space.`,
          );
          return;
        }
      }
      uploadInProgress.current = true;
      setUploading(uploads.length);
      try {
        if (asFolder) await importFolder(uploads, destination);
        else await uploadFiles(uploads, destination);
        setError('');
      } catch (cause) {
        setError(messageOf(cause, 'Upload failed.'));
      } finally {
        uploadInProgress.current = false;
        setUploading(0);
        refresh();
      }
    },
    [refresh, setError, usage],
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

  return {
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
