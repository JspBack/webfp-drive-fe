import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, saveSession } from './api';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('authenticated requests', () => {
  it('refreshes an expired session and retries with the new access token', async () => {
    saveSession('expired', 'old-refresh');
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({ token: 'fresh', refresh_token: 'new-refresh' }),
      )
      .mockResolvedValueOnce(Response.json({ id: 'file-1' }));

    const response = await apiRequest('/api/v1/files', {
      headers: { Accept: 'application/json' },
    });

    expect(await response.json()).toEqual({ id: 'file-1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [[, original], [refreshURL, refresh], [, retry]] =
      fetchMock.mock.calls;
    expect(new Headers(original?.headers).get('Authorization')).toBe(
      'Bearer expired',
    );
    expect(refreshURL).toEqual(
      expect.stringMatching(/\/api\/v1\/auth\/refresh$/),
    );
    expect(refresh?.method).toBe('POST');
    expect(refresh?.body).toBe(
      JSON.stringify({ refresh_token: 'old-refresh' }),
    );
    expect(new Headers(retry?.headers).get('Authorization')).toBe(
      'Bearer fresh',
    );
    expect(new Headers(retry?.headers).get('Accept')).toBe('application/json');
    expect(sessionStorage.getItem('webfp-refresh-token')).toBe('new-refresh');
  });

  it('clears invalid credentials and returns the original 401 without retrying', async () => {
    saveSession('expired', 'expired-refresh');
    const unauthorized = new Response(null, { status: 401 });
    fetchMock
      .mockResolvedValueOnce(unauthorized)
      .mockResolvedValueOnce(
        Response.json({ error: 'Expired' }, { status: 401 }),
      );

    expect(await apiRequest('/api/v1/files')).toBe(unauthorized);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem('webfp-api-token')).toBeNull();
    expect(sessionStorage.getItem('webfp-refresh-token')).toBeNull();
  });
});
