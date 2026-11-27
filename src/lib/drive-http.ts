import { apiRequest, clearAPISession } from './api';

export async function request(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await apiRequest(path, init);
  if (response.status === 401) {
    clearAPISession();
    window.location.assign('/auth/sign-in');
    throw new Error('Your session has expired. Please sign in again.');
  }
  return response;
}

export async function expect(
  response: Response,
  fallback: string,
): Promise<Response> {
  if (!response.ok) {
    let message = fallback;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep the fallback message when the body is not JSON
    }
    throw new Error(message);
  }
  return response;
}

export async function readBatchResults<T>(
  response: Response,
  count: number,
): Promise<T[]> {
  const results: unknown = await response.json();
  if (!Array.isArray(results) || results.length !== count) {
    throw new Error('Invalid batch response.');
  }
  return results as T[];
}
