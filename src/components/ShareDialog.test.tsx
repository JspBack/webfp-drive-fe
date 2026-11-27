// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { ShareDialog } from './ShareDialog';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
  clearAPISession: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(apiRequest).mockReset();
});

it('queues a folder ZIP and opens its status list instead of showing an incomplete link', async () => {
  vi.mocked(apiRequest).mockResolvedValue(
    Response.json(
      { id: 'zip-1', status: 'preparing', url: '' },
      { status: 201 },
    ),
  );
  const openShares = vi.fn();
  const user = userEvent.setup();
  render(
    <ShareDialog
      onClose={vi.fn()}
      openShares={openShares}
      target={{ id: 'folder-1', name: 'Reports', kind: 'folder' }}
    />,
  );

  await user.type(screen.getByLabelText(/Password/), 'private');
  await user.click(screen.getByRole('button', { name: 'Create link' }));

  expect(apiRequest).toHaveBeenCalledWith(
    '/api/v1/folders/folder-1/shares',
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"password":"private"'),
    }),
  );
  expect(
    await screen.findByRole('dialog', { name: 'Preparing ZIP' }),
  ).toBeTruthy();
  expect(screen.queryByRole('textbox', { name: 'Link' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'View share links' }));
  expect(openShares).toHaveBeenCalledOnce();
});
