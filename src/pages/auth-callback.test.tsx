// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { AuthCallback } from './auth-callback';

const nonce = 'a'.repeat(64);
const token = 'b'.repeat(64);
const refreshToken = 'c'.repeat(64);
const pendingKey = 'webfp-oauth-pending';
const accessKey = 'webfp-api-token';
const refreshKey = 'webfp-refresh-token';

function renderCallback(overrides: Record<string, string> = {}, extra = '') {
  const params = new URLSearchParams({
    browser_nonce: nonce,
    token,
    refresh_token: refreshToken,
    ...overrides,
  });
  window.history.replaceState(null, '', `/auth/callback#${params}${extra}`);
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route element={<AuthCallback />} path="/auth/callback" />
          <Route element={<h1>Drive home</h1>} path="/" />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

it('stores a matched OAuth session once and removes the callback fragment', async () => {
  sessionStorage.setItem(pendingKey, nonce);
  renderCallback();

  await screen.findByRole('heading', { name: 'Drive home' });
  expect(sessionStorage.getItem(accessKey)).toBe(token);
  expect(sessionStorage.getItem(refreshKey)).toBe(refreshToken);
  expect(sessionStorage.getItem(pendingKey)).toBeNull();
  expect(window.location.hash).toBe('');
});

it('rejects a well-formed URL when this tab has no pending sign-in', async () => {
  sessionStorage.setItem(accessKey, 'existing-token');
  renderCallback();

  await screen.findByRole('alert');
  expect(sessionStorage.getItem(accessKey)).toBe('existing-token');
  expect(sessionStorage.getItem(refreshKey)).toBeNull();
  expect(window.location.hash).toBe('');
});

it.each([
  { key: 'browser_nonce', value: 'd'.repeat(64) },
  { key: 'token', value: 'not-a-token' },
  { key: 'refresh_token', value: `${refreshToken}\n` },
])(
  'rejects mismatched or malformed callback values',
  async ({ key, value }) => {
    sessionStorage.setItem(pendingKey, nonce);
    renderCallback({ [key]: value });

    await screen.findByRole('alert');
    expect(sessionStorage.getItem(accessKey)).toBeNull();
    expect(sessionStorage.getItem(refreshKey)).toBeNull();
  },
);

it('rejects duplicate token parameters', async () => {
  sessionStorage.setItem(pendingKey, nonce);
  renderCallback({}, `&token=${token}`);

  await screen.findByRole('alert');
  expect(sessionStorage.getItem(accessKey)).toBeNull();
});
