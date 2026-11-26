const pendingKey = 'webfp-oauth-pending';

function isToken(value: string | undefined): value is string {
  return value?.length === 64 && /^[0-9a-f]+$/.test(value);
}

export function beginOAuth(url: string) {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  sessionStorage.setItem(pendingKey, nonce);
  const target = new URL(url, window.location.origin);
  target.searchParams.set('browser_nonce', nonce);
  window.location.assign(target.href);
}

function singleParam(params: URLSearchParams, name: string) {
  const values = params.getAll(name);
  return values.length === 1 ? values[0] : undefined;
}

export function consumeOAuthSession(params: URLSearchParams) {
  const pending = sessionStorage.getItem(pendingKey);
  sessionStorage.removeItem(pendingKey);

  const nonce = singleParam(params, 'browser_nonce');
  const token = singleParam(params, 'token');
  const refreshToken = singleParam(params, 'refresh_token');
  if (
    !pending ||
    nonce !== pending ||
    !isToken(token) ||
    !isToken(refreshToken) ||
    params.has('error')
  ) {
    return null;
  }

  return { token, refreshToken };
}
