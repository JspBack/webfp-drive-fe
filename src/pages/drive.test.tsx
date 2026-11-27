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
}: {
  full?: boolean;
  plan?: 'free' | 'pro' | 'admin';
  folderDeleteFails?: boolean;
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

    if (path === '/api/v1/files' && options?.method === 'POST') {
      return new Response(null, { status: 201 });
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

    if (options?.method === 'DELETE') {
      if (path === '/api/v1/folders/folder-1') {
        if (folderDeleteFails) {
          return Response.json(
            { error: 'Folder must be empty' },
            { status: 409 },
          );
        }
        hasFolder = false;
        return new Response(null, { status: 204 });
      }
      if (path === '/api/v1/files/file-1') {
        hasFile = false;
        return new Response(null, { status: 204 });
      }
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
    for (const name of ['Upload files', 'Import folder']) {
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

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(
        '/api/v1/files',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
