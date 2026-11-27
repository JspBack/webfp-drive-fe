import type { HTMLAttributes, RefObject } from 'react';
import { UploadIcon } from '../components/icons';

type DriveUploadProps = {
  currentName: string;
  folderId: string | undefined;
  hover: string | null;
  storageFull: boolean;
  uploading: number;
  uploadZone: Pick<
    HTMLAttributes<HTMLElement>,
    'onDragOver' | 'onDragLeave' | 'onDrop'
  >;
  inputRef: RefObject<HTMLInputElement | null>;
  handleUpload: (
    files: FileList,
    destination: string | null,
    asFolder?: boolean,
  ) => Promise<void>;
};

export function DriveUpload({
  currentName,
  folderId,
  hover,
  storageFull,
  uploading,
  uploadZone,
  inputRef,
  handleUpload,
}: DriveUploadProps) {
  return (
    <>
      <button
        className={`mt-5 w-full rounded-3xl border-2 border-dashed p-7 text-center transition sm:p-9 ${
          hover === 'upload'
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'
        }`}
        aria-disabled={storageFull || uploading > 0}
        onClick={() => {
          if (!storageFull && uploading === 0) inputRef.current?.click();
        }}
        type="button"
        {...uploadZone}
      >
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <UploadIcon className="size-6" />
        </span>
        <span className="mt-4 block text-sm font-semibold text-slate-900">
          Drag and drop files here
        </span>
        {storageFull ? (
          <span className="mt-1 block text-sm font-medium text-red-600">
            Storage is full — delete files to upload more.
          </span>
        ) : (
          <span className="mt-1 block text-sm text-slate-500">
            or{' '}
            <span className="font-semibold text-blue-700">
              browse your device
            </span>
            {' — uploads go into '}
            <span className="font-semibold text-slate-700">{currentName}</span>
          </span>
        )}
      </button>

      <input
        className="hidden"
        multiple
        onChange={(event) => {
          const chosen = event.target.files;
          if (chosen && chosen.length > 0)
            void handleUpload(chosen, folderId ?? null);
          event.target.value = '';
        }}
        ref={inputRef}
        type="file"
      />
    </>
  );
}
