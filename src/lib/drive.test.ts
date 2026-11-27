import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { parseDragPayload } from './drive-drag';
import { importFolder, uploadFiles } from './drive-uploads';

vi.mock('./api', () => ({ apiRequest: vi.fn(), clearAPISession: vi.fn() }));

const request = vi.mocked(apiRequest);

afterEach(() => request.mockReset());

function pickedFile(path: string) {
  const file = new File(['contents'], path.split('/').at(-1) ?? path);
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

describe('folder import', () => {
  it('preserves nested paths and reuses folders for sibling files', async () => {
    const folders: unknown[] = [];
    const uploads: unknown[] = [];
    request.mockImplementation(async (path, options) => {
      if (
        path === '/api/v1/folders/batch' &&
        typeof options?.body === 'string'
      ) {
        const { folders: batch } = JSON.parse(options.body) as {
          folders: unknown[];
        };
        return Response.json(
          batch.map((folder) => {
            folders.push(folder);
            return { folder: { id: `folder-${folders.length}` } };
          }),
        );
      }
      if (
        path.startsWith('/api/v1/files/batch') &&
        options?.body instanceof FormData
      ) {
        const folderId = new URL(path, 'https://example.test').searchParams.get(
          'folder_id',
        );
        return Response.json(
          options.body.getAll('file').map((file) => {
            uploads.push([file instanceof File ? file.name : null, folderId]);
            return {};
          }),
        );
      }
      throw new Error(`Unexpected request to ${path}`);
    });

    const onFileUploaded = vi.fn();
    await importFolder(
      [
        pickedFile('Reports/January/a.txt'),
        pickedFile('Reports/January/b.txt'),
        pickedFile('Reports/root.txt'),
      ],
      'destination',
      { onFileUploaded },
    );
    expect(onFileUploaded).toHaveBeenCalledTimes(3);

    expect(folders).toEqual([
      { name: 'Reports', parent_id: 'destination' },
      { name: 'January', parent_id: 'folder-1' },
    ]);
    expect(uploads).toEqual([
      ['a.txt', 'folder-2'],
      ['b.txt', 'folder-2'],
      ['root.txt', 'folder-1'],
    ]);
  });

  it('continues to another folder after a file permanently fails', async () => {
    request
      .mockResolvedValueOnce(
        Response.json([
          { folder: { id: 'first-folder' } },
          { folder: { id: 'second-folder' } },
        ]),
      )
      .mockResolvedValueOnce(
        Response.json([{ error: 'Too large' }], { status: 201 }),
      )
      .mockResolvedValueOnce(Response.json([{}], { status: 201 }));
    const onFileUploaded = vi.fn();
    const onFileFailed = vi.fn();
    const first = pickedFile('First/large.txt');

    await importFolder([first, pickedFile('Second/small.txt')], null, {
      onFileUploaded,
      onFileFailed,
    });

    expect(onFileFailed).toHaveBeenCalledWith(first, expect.any(Error));
    expect(onFileUploaded).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('rejects a selection without relative paths before changing the drive', async () => {
    await expect(
      importFolder([pickedFile('Reports/a.txt'), pickedFile('b.txt')], null),
    ).rejects.toThrow('did not provide the selected folder paths');
    expect(request).not.toHaveBeenCalled();
  });
});

describe('uploads', () => {
  it('omits the folder ID at the root and reports quota errors', async () => {
    request.mockResolvedValueOnce(
      Response.json({ error: 'Quota exceeded' }, { status: 413 }),
    );

    await expect(uploadFiles([pickedFile('report.txt')], null)).rejects.toThrow(
      'Quota exceeded',
    );
    const [path, options] = request.mock.calls[0];
    expect(path).toBe('/api/v1/files/batch');
    expect(options?.method).toBe('POST');
    expect(
      options?.body instanceof FormData && !options.body.has('folder_id'),
    ).toBe(true);
  });
});

describe('drag payloads', () => {
  it('accepts an internal folder payload', () => {
    expect(parseDragPayload('{"kind":"folder","id":"reports"}')).toEqual({
      kind: 'folder',
      id: 'reports',
    });
  });

  it.each(['not JSON', 'null', '{"kind":"share","id":"1"}', '{"kind":"file"}'])(
    'rejects invalid input %s',
    (payload) => {
      expect(parseDragPayload(payload)).toBeNull();
    },
  );
});
