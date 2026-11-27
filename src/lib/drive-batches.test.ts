import { afterEach, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { deleteItems } from './drive-batches';
import { uploadFiles } from './drive-uploads';
import { prepareImportFolders } from './folder-import-plan';

vi.mock('./api', () => ({ apiRequest: vi.fn(), clearAPISession: vi.fn() }));

const request = vi.mocked(apiRequest);
afterEach(() => request.mockReset());

it('sends a thousand deletes in one request and preserves per-item failures', async () => {
  const items = Array.from({ length: 1000 }, (_, index) => ({
    id: `file-${index}`,
    kind: 'file' as const,
  }));
  const results: ((typeof items)[number] & { error?: string })[] = items.map(
    (item, index) =>
      index === 0 ? { ...item, error: 'File not found' } : item,
  );
  request.mockResolvedValueOnce(
    Response.json(results.map(({ id, error }) => ({ id, error }))),
  );
  const onBatch = vi.fn();

  await deleteItems(items, onBatch);

  expect(request).toHaveBeenCalledExactlyOnceWith(
    '/api/v1/files/batch',
    expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ ids: items.map(({ id }) => id) }),
    }),
  );
  expect(onBatch).toHaveBeenCalledWith(results);
});

it('uploads a thousand files in ten batches and reports each completed file', async () => {
  const files = Array.from(
    { length: 1000 },
    (_, index) => new File(['data'], `file-${index}.txt`),
  );
  const onFileUploaded = vi.fn();
  request.mockImplementation(async (_path, options) => {
    if (!(options?.body instanceof FormData))
      throw new Error('Missing multipart body');
    return Response.json(options.body.getAll('file').map(() => ({})));
  });

  await uploadFiles(files, 'folder-1', { onFileUploaded });

  expect(request).toHaveBeenCalledTimes(10);
  expect(
    request.mock.calls.every(
      ([path]) => path === '/api/v1/files/batch?folder_id=folder-1',
    ),
  ).toBe(true);
  expect(onFileUploaded).toHaveBeenCalledTimes(1000);
});

it('creates folder levels in batches and skips descendants of failed parents', async () => {
  const files = ['Reports/2026/a.txt', 'Blocked/Skipped/b.txt'].map((path) => {
    const file = new File(['data'], 'document.txt');
    Object.defineProperty(file, 'webkitRelativePath', { value: path });
    return file;
  });
  request
    .mockResolvedValueOnce(
      Response.json([
        { folder: { id: 'reports' } },
        { error: 'Name already exists' },
      ]),
    )
    .mockResolvedValueOnce(Response.json([{ folder: { id: 'reports-2026' } }]));

  const destinations = await prepareImportFolders(files, 'root', {});

  expect(
    request.mock.calls.map(([path, options]) => [
      path,
      JSON.parse(String(options?.body)),
    ]),
  ).toEqual([
    [
      '/api/v1/folders/batch',
      {
        folders: [
          { name: 'Reports', parent_id: 'root' },
          { name: 'Blocked', parent_id: 'root' },
        ],
      },
    ],
    [
      '/api/v1/folders/batch',
      { folders: [{ name: '2026', parent_id: 'reports' }] },
    ],
  ]);
  expect(destinations.get('/Reports/2026')).toEqual({ id: 'reports-2026' });
  expect(destinations.get('/Blocked/Skipped')).toEqual(
    destinations.get('/Blocked'),
  );
});
