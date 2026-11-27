// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { Drive } from './drive';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
  clearAPISession: vi.fn(),
}));

const request = vi.mocked(apiRequest);

function mockDrive({
  full = false,
  plan = 'free',
  folderDeleteFails = false,
  upload = async () => Response.json([{}], { status: 201 }),
}: {
  full?: boolean;
  plan?: 'free' | 'pro' | 'admin';
  folderDeleteFails?: boolean;
  upload?: (signal?: AbortSignal | null) => Promise<Response>;
} = {}) {
  let hasFolder = true;
  let hasFile = true;
  request.mockImplementation(async (path, options) => {
    if (path === '/api/v1/users/me') {
      return Response.json({ email: 'tester@example.test', name: 'Tester' });
    }

    if (path === '/api/v1/folders') {
      return Response.json(
        hasFolder
          ? [{ id: 'folder-1', name: 'Reports', created_at: '2026-01-01' }]
          : [],
      );
    }

    if (path === '/api/v1/files/batch' && options?.method === 'POST') {
      return upload(options.signal);
    }

    if (path === '/api/v1/files') {
      return Response.json(
        hasFile
          ? [
              {
                id: 'file-1',
                filename: 'notes.pdf',
                content_type: 'application/pdf',
                created_at: '2026-01-01',
                size_bytes: 256,
                status: 'ready',
              },
            ]
          : [],
      );
    }

    if (path === '/api/v1/users/me/usage') {
      return Response.json({
        plan,
        used_bytes: full ? 1024 : 256,
        limit_bytes: plan === 'admin' ? 0 : 1024,
        file_count: Number(hasFile),
      });
    }

    if (
      (path === '/api/v1/files/batch' || path === '/api/v1/folders/batch') &&
      options?.method === 'DELETE' &&
      typeof options.body === 'string'
    ) {
      const { ids } = JSON.parse(options.body) as { ids: string[] };
      return Response.json(
        ids.map((id) => {
          if (path === '/api/v1/files/batch') {
            hasFile = false;
          } else if (folderDeleteFails) {
            return { id, error: 'Folder must be empty' };
          } else {
            hasFolder = false;
          }
          return { id };
        }),
      );
    }

    throw new Error(`Unexpected API request to ${path}`);
  });
}

async function openDrive() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Drive />
    </MemoryRouter>,
  );
  await screen.findByRole('checkbox', { name: 'Select all' });
  return user;
}

async function openBulkDelete(user: Awaited<ReturnType<typeof openDrive>>) {
  await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
  await user.click(screen.getByRole('button', { name: 'Delete selected (2)' }));
  return screen.getByRole('dialog', { name: 'Delete selected items' });
}

beforeEach(() => sessionStorage.setItem('webfp-api-token', 'test-token'));

afterEach(() => {
  cleanup();
  request.mockReset();
  sessionStorage.clear();
});

describe('drive actions', () => {
  it('allows canceling bulk deletion without losing the selection', async () => {
    mockDrive();
    const user = await openDrive();
    const dialog = await openBulkDelete(user);

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Delete selected (2)' }),
    ).toBeTruthy();
    expect(
      request.mock.calls.some(([, options]) => options?.method === 'DELETE'),
    ).toBe(false);
  });

  it('deletes selected files and folders and refreshes the grid', async () => {
    mockDrive();
    const user = await openDrive();
    const dialog = await openBulkDelete(user);

    await user.click(
      within(dialog).getByRole('button', { name: 'Delete selected' }),
    );

    expect(await screen.findByText('This folder is empty')).toBeTruthy();
    expect(screen.getByText('2 of 2 items deleted')).toBeTruthy();
    expect(
      request.mock.calls
        .filter(([, options]) => options?.method === 'DELETE')
        .map(([path]) => path),
    ).toEqual(['/api/v1/files/batch', '/api/v1/folders/batch']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a partial failure and keeps only the failed item selected', async () => {
    mockDrive({ folderDeleteFails: true });
    const user = await openDrive();
    const dialog = await openBulkDelete(user);

    await user.click(
      within(dialog).getByRole('button', { name: 'Delete selected' }),
    );

    expect((await within(dialog).findByRole('alert')).textContent).toContain(
      'Reports: Folder must be empty',
    );
    expect(screen.getByText('1 of 2 items deleted')).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole('checkbox', { name: 'Select file notes.pdf' }),
      ).toBeNull();
    });
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Select folder Reports',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Delete selected (1)' }),
    ).toBeTruthy();
  });

  it('disables file and folder pickers when storage is full', async () => {
    mockDrive({ full: true });
    await openDrive();

    expect(screen.getByText('Storage full')).toBeTruthy();
    for (const name of ['Upload files', 'Import folders']) {
      expect(
        (screen.getByRole('button', { name }) as HTMLButtonElement).disabled,
      ).toBe(true);
    }
  });

  it('shows the unlimited Admin plan and lets the upload reach the API', async () => {
    mockDrive({ plan: 'admin' });
    const user = await openDrive();

    expect(screen.getByTestId('storage-usage-text').textContent).toContain(
      'Admin plan · 256 B used (unlimited)',
    );
    const input = document.querySelector<HTMLInputElement>(
      'input[type="file"]:not([webkitdirectory])',
    );
    if (!input) throw new Error('File input is missing');
    await user.upload(input, new File(['contents'], 'report.txt'));

    expect(await screen.findByText('Upload complete')).toBeTruthy();
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(
        '/api/v1/files/batch',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('shows an in-flight upload and reports partial success on a failed batch', async () => {
    let finishUpload!: (response: Response) => void;
    const pendingUpload = new Promise<Response>((resolve) => {
      finishUpload = resolve;
    });
    const upload = vi.fn(() => pendingUpload);
    mockDrive({ upload });
    const user = await openDrive();
    const input = document.querySelector<HTMLInputElement>(
      'input[type="file"]:not([webkitdirectory])',
    );
    if (!input) throw new Error('File input is missing');

    await user.upload(input, [
      new File(['first'], 'first.txt'),
      new File(['second'], 'second.txt'),
    ]);

    expect(await screen.findByText('0 of 2 files uploaded (0%)')).toBeTruthy();
    const progress = screen.getByRole('progressbar', {
      name: 'Uploading files',
    });
    expect(progress.getAttribute('value')).toBe('0');
    expect(progress.getAttribute('max')).toBe('2');

    finishUpload(
      Response.json([{}, { error: 'Upload rejected' }], { status: 201 }),
    );
    expect(await screen.findByText('Upload stopped')).toBeTruthy();
    expect(
      screen.getByText('1 of 2 files uploaded. Upload rejected'),
    ).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('cancels the active request and leaves later batches unsent', async () => {
    const upload = vi.fn(
      (signal?: AbortSignal | null) =>
        new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    mockDrive({ upload });
    const user = await openDrive();
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('File input is missing');

    await user.upload(
      input,
      Array.from(
        { length: 101 },
        (_, index) => new File(['data'], `file-${index}.txt`),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Cancel upload' }));

    expect(await screen.findByText('Upload canceled')).toBeTruthy();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]?.aborted).toBe(true);
  });

  it('refreshes the current listing and keeps selected items', async () => {
    mockDrive();
    const user = await openDrive();
    const selectFile = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Select file notes.pdf',
    });
    await user.click(selectFile);
    request.mockClear();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/api/v1/files', undefined);
      expect(request).toHaveBeenCalledWith('/api/v1/folders', undefined);
    });
    expect(selectFile.checked).toBe(true);
  });
});
