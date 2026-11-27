import { afterEach, expect, it, vi } from 'vitest';
import { retryRateLimited } from './upload-retry';

afterEach(() => vi.useRealTimers());

it('honors Retry-After before resending a rejected upload', async () => {
  vi.useFakeTimers();
  const success = new Response(null, { status: 201 });
  const request = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { 'Retry-After': '2' } }),
    )
    .mockResolvedValueOnce(success);
  const onRetry = vi.fn();

  const response = retryRateLimited(request, { onRetry });
  await vi.advanceTimersByTimeAsync(1999);
  expect(onRetry).toHaveBeenCalledWith(2);
  expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await expect(response).resolves.toBe(success);
  expect(request).toHaveBeenCalledTimes(2);
});

it('stops waiting and sends no more requests when canceled', async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const request = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 429 }));
  const response = retryRateLimited(request, { signal: controller.signal });
  const rejection = expect(response).rejects.toMatchObject({
    name: 'AbortError',
  });
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await rejection;
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledTimes(1);
});
