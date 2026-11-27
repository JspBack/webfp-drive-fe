import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  DownloadIcon,
  FileIcon,
  FolderIcon,
  ShareIcon,
  Spinner,
  TrashIcon,
} from '../components/icons';
import { KebabMenu } from '../components/KebabMenu';
import type { ShareTarget } from '../lib/drive';
import { type DriveFile, type DriveFolder, downloadFile } from '../lib/drive';
import { messageOf } from '../lib/errors';
import { formatBytes, formatDate } from '../lib/format';
import type { useDriveTransfers } from './use-drive-transfers';

export type DeleteTarget = {
  kind: 'file' | 'folder';
  id: string;
  name: string;
};

function fileIconColor(file: DriveFile): string {
  const mime = file.content_type.toLowerCase();
  const extension = file.filename.split('.').pop()?.toLowerCase() ?? '';
  if (mime === 'application/pdf' || extension === 'pdf')
    return 'bg-red-50 text-red-700';
  if (
    mime.startsWith('image/') ||
    /^(png|jpe?g|gif|svg|webp|heic|avif)$/.test(extension)
  )
    return 'bg-fuchsia-50 text-fuchsia-700';
  if (mime.startsWith('video/') || /^(mp4|mov|webm|mkv)$/.test(extension))
    return 'bg-indigo-50 text-indigo-700';
  if (mime.startsWith('audio/') || /^(mp3|wav|flac|m4a|ogg)$/.test(extension))
    return 'bg-teal-50 text-teal-700';
  if (/^(zip|7z|rar|gz|tar|bz2)$/.test(extension))
    return 'bg-amber-50 text-amber-700';
  if (
    /spreadsheet|excel|\/csv/.test(mime) ||
    /^(xls[xm]?|ods|csv|tsv)$/.test(extension)
  )
    return 'bg-emerald-50 text-emerald-700';
  if (/presentation|powerpoint/.test(mime) || /^(pptx?|odp)$/.test(extension))
    return 'bg-orange-50 text-orange-700';
  if (
    mime.startsWith('text/') ||
    /wordprocessing|msword/.test(mime) ||
    /^(docx?|odt|rtf|txt|md)$/.test(extension)
  )
    return 'bg-sky-50 text-sky-700';
  return 'bg-slate-100 text-slate-600';
}

type GridProps = {
  loading: boolean;
  folders: DriveFolder[];
  files: DriveFile[];
  transfers: ReturnType<typeof useDriveTransfers>;
  selectionBox: (
    kind: DeleteTarget['kind'],
    id: string,
    name: string,
  ) => ReactNode;
  setDeleteTarget: (target: DeleteTarget) => void;
  setShareTarget: (target: ShareTarget) => void;
  setError: (message: string) => void;
};

export function DriveGrid({
  loading,
  folders,
  files,
  transfers,
  selectionBox,
  setDeleteTarget,
  setShareTarget,
  setError,
}: GridProps) {
  const { hover, gridZone, folderTileProps, fileTileProps } = transfers;
  const isEmpty = folders.length === 0 && files.length === 0;
  return (
    <div
      className={`mt-6 rounded-3xl border p-5 transition sm:p-6 ${
        hover === 'grid'
          ? 'border-blue-500 bg-blue-50/60'
          : 'border-slate-200 bg-white'
      }`}
      {...gridZone}
    >
      {loading ? (
        <div className="grid min-h-52 place-items-center text-slate-400">
          <Spinner className="size-7" />
        </div>
      ) : isEmpty ? (
        <div className="grid min-h-52 place-items-center px-4 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <FolderIcon className="size-6" />
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-900">
              This folder is empty
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Drop files here, create a folder, or drag an item in from
              somewhere else.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => {
            const { zone, root } = folderTileProps(folder);
            const highlighted = hover === folder.id;
            return (
              <div
                className={`group relative rounded-2xl border p-4 transition ${
                  highlighted
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/40'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
                key={folder.id}
                {...root}
                {...zone}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <FolderIcon className="size-5.5" />
                  </span>
                  <div className="flex items-center gap-2">
                    {selectionBox('folder', folder.id, folder.name)}
                    <KebabMenu
                      actions={[
                        {
                          label: 'Share as ZIP',
                          icon: <ShareIcon className="size-4" />,
                          onSelect: () =>
                            setShareTarget({
                              kind: 'folder',
                              id: folder.id,
                              name: folder.name,
                            }),
                        },
                        {
                          label: 'Delete',
                          danger: true,
                          icon: <TrashIcon className="size-4" />,
                          onSelect: () =>
                            setDeleteTarget({
                              kind: 'folder',
                              id: folder.id,
                              name: folder.name,
                            }),
                        },
                      ]}
                      label={`Actions for folder ${folder.name}`}
                    />
                  </div>
                </div>
                <Link
                  className="mt-3 block rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
                  to={`/f/${folder.id}`}
                >
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {folder.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Folder · {formatDate(folder.created_at)}
                  </p>
                </Link>
              </div>
            );
          })}

          {files.map((file) => (
            <div
              className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              key={file.id}
              {...fileTileProps(file)}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`grid size-11 place-items-center rounded-xl ${fileIconColor(file)}`}
                >
                  <FileIcon className="size-5.5" />
                </span>
                <div className="flex items-center gap-2">
                  {selectionBox('file', file.id, file.filename)}
                  <KebabMenu
                    actions={[
                      {
                        label: 'Share',
                        icon: <ShareIcon className="size-4" />,
                        onSelect: () =>
                          setShareTarget({
                            kind: 'file',
                            id: file.id,
                            name: file.filename,
                          }),
                      },
                      {
                        label: 'Delete',
                        danger: true,
                        icon: <TrashIcon className="size-4" />,
                        onSelect: () =>
                          setDeleteTarget({
                            kind: 'file',
                            id: file.id,
                            name: file.filename,
                          }),
                      },
                    ]}
                    label={`Actions for file ${file.filename}`}
                  />
                </div>
              </div>
              <button
                className="mt-3 block w-full rounded-lg text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
                onClick={() =>
                  void downloadFile(file).catch((cause: unknown) =>
                    setError(messageOf(cause, 'Download failed.')),
                  )
                }
                title={`Download ${file.filename}`}
                type="button"
              >
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {file.filename}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                  {file.status !== 'ready' && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      {file.status}
                    </span>
                  )}
                </span>
              </button>
              <span className="pointer-events-none absolute bottom-4 right-4 hidden text-slate-300 group-hover:block">
                <DownloadIcon className="size-4" />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
