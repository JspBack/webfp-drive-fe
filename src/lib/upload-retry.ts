export type UploadOptions = {
  signal?: AbortSignal;
  onFileUploaded?: () => void;
  onFileFailed?: (file: File, cause: unknown) => void;
  onRetry?: (seconds: number) => void;
};

export async function retryRateLimited(
  request: () => Promise<Response>,
  { signal, onRetry }: UploadOptions,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    signal?.throwIfAborted();
    const response = await request();
    if (response.status !== 429 || attempt >= 3) return response;
    const header = response.headers.get('Retry-After');
    const value = header === null ? Number.NaN : Number(header);
    const seconds = Number.isFinite(value)
      ? value
      : header
        ? (Date.parse(header) - Date.now()) / 1000
        : Number.NaN;
    const delay = Number.isFinite(seconds)
      ? Math.max(1, Math.ceil(seconds))
      : 60;
    if (delay > 120) return response;
    onRetry?.(delay);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, delay * 1000);
      function abort() {
        clearTimeout(timer);
        reject(signal?.reason);
      }
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
    });
  }
}
