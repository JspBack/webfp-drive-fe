import { Fragment } from 'react';
import { Link } from 'react-router-dom';

import {
  ChevronRightIcon,
  FolderIcon,
  PlusIcon,
  ShareIcon,
  UploadIcon,
} from '../components/icons';
import { type DriveFolder } from '../lib/drive';

type DropZone = Pick<
  React.HTMLAttributes<HTMLElement>,
  'onDragOver' | 'onDragLeave' | 'onDrop'
>;

export function DriveHeader({
  email,
  signOut,
}: {
  email?: string;
  signOut: () => Promise<void>;
}) {
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link className="inline-flex items-center gap-3" to="/">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-700 text-white shadow-lg shadow-blue-900/15">
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m8.5 3.75-6 10.5 3.75 6.5h12l3.25-5.75-6.5-11.25h-6.5Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="m2.5 14.25 12.5-.5m-6.5-10 6.5 11.25"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight">
            WebFP Drive
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-56 truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-block">
            {email || '…'}
          </span>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            onClick={() => void signOut()}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-4"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="M8.333 5.833V4.167A1.667 1.667 0 0 1 10 2.5h5.833A1.667 1.667 0 0 1 17.5 4.167v11.666a1.667 1.667 0 0 1-1.667 1.667H10a1.667 1.667 0 0 1-1.667-1.667v-1.666M12.5 10H2.5m0 0 3.333-3.333M2.5 10l3.333 3.333"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

type DriveToolbarProps = {
  chain: DriveFolder[];
  currentName: string;
  hover: string | null;
  rootZone: DropZone;
  storageFull: boolean;
  uploading: number;
  onRefresh: () => void;
  onShares: () => void;
  onNewFolder: () => void;
  onImportFolder: () => void;
  onUpload: () => void;
};

export function DriveToolbar({
  chain,
  currentName,
  hover,
  rootZone,
  storageFull,
  uploading,
  onRefresh,
  onShares,
  onNewFolder,
  onImportFolder,
  onUpload,
}: DriveToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav
        aria-label="Folder path"
        className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm"
      >
        <Link
          className={`rounded-lg px-2 py-1 font-semibold transition ${
            'home-crumb' === hover
              ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-500'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          to="/"
          {...rootZone}
        >
          Home
        </Link>
        {chain.slice(0, -1).map((crumb) => (
          <Fragment key={crumb.id}>
            <ChevronRightIcon className="size-4 text-slate-400" />
            <Link
              className="rounded-lg px-2 py-1 font-medium text-slate-700 transition hover:bg-slate-100"
              to={`/f/${crumb.id}`}
            >
              {crumb.name}
            </Link>
          </Fragment>
        ))}
        {chain.length > 0 && (
          <>
            <ChevronRightIcon className="size-4 text-slate-400" />
            <span className="max-w-64 truncate rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-900">
              {currentName}
            </span>
          </>
        )}
      </nav>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          onClick={onRefresh}
          type="button"
        >
          Refresh
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          onClick={onShares}
          type="button"
        >
          <ShareIcon className="size-4" />
          Share links
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          onClick={onNewFolder}
          type="button"
        >
          <PlusIcon className="size-4" />
          New folder
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          disabled={storageFull || uploading > 0}
          onClick={onImportFolder}
          type="button"
        >
          <FolderIcon className="size-4" />
          Import folders
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={storageFull || uploading > 0}
          onClick={onUpload}
          title={storageFull ? 'Storage is full' : undefined}
          type="button"
        >
          <UploadIcon className="size-4" />
          Upload files
        </button>
      </div>
    </div>
  );
}
