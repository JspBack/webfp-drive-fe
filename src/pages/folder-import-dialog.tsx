import { useRef } from 'react';
import { Modal } from '../components/dialogs';

export function FolderImportDialog({
  files,
  addFiles,
  start,
  close,
}: {
  files: File[];
  addFiles: (files: File[]) => void;
  start: () => void;
  close: () => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const folders = [
    ...new Set(files.map((file) => file.webkitRelativePath.split('/')[0])),
  ];

  return (
    <Modal
      description="Add folders one at a time or drop several into Drive. Their folder structure is preserved."
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
            onClick={() => picker.current?.click()}
            type="button"
          >
            Add folder
          </button>
          <button
            className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={files.length === 0}
            onClick={start}
            type="button"
          >
            Start import
          </button>
        </div>
      }
      onClose={close}
      title="Import folders"
    >
      <input
        className="hidden"
        multiple
        onChange={(event) => {
          addFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = '';
        }}
        ref={(input) => {
          picker.current = input;
          input?.setAttribute('webkitdirectory', '');
        }}
        type="file"
      />
      {folders.length > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold">
            {folders.length} {folders.length === 1 ? 'folder' : 'folders'},{' '}
            {files.length.toLocaleString()} files
          </p>
          <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-slate-600">
            {folders.map((folder) => (
              <li key={folder}>{folder}</li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
