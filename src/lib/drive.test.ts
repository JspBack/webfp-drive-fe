import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { importFolder, parseDragPayload, uploadFiles } from './drive';

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
      if (path === '/api/v1/folders' && typeof options?.body === 'string') {
        folders.push(JSON.parse(options.body));
        return Response.json({ id: `folder-${folders.length}` });
      }
      if (path === '/api/v1/files' && options?.body instanceof FormData) {
        const file = options.body.get('file');
        uploads.push([
          file instanceof File ? file.name : null,
          options.body.get('folder_id'),
        ]);
        return new Response(null, { status: 201 });
      }
      throw new Error(`Unexpected request to ${path}`);
    });

    await importFolder(
      [
        pickedFile('Reports/January/a.txt'),
        pickedFile('Reports/January/b.txt'),
        pickedFile('Reports/root.txt'),
      ],
      'destination',
    );

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
    expect(path).toBe('/api/v1/files');
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
