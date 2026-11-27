import { expect, request } from './drive-http';

export type DriveFile = {
  id: string;
  owner_id: string;
  folder_id?: string | null;
  filename: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DriveFolder = {
  id: string;
  owner_id: string;
  parent_id?: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ShareTarget = { kind: 'file' | 'folder'; id: string; name: string };
export type ShareStatus = 'preparing' | 'ready' | 'failed';

export type ShareLink = {
  status: ShareStatus;
  id: string;
  expires_at: string;
  url: string;
};

export type ShareListItem = {
  status: ShareStatus;
  id: string;
  file_id: string;
  filename: string;
  url: string;
  expires_at: string;
  max_downloads: number;
  download_count: number;
  has_password: boolean;
};

export type StorageUsage = {
  plan: 'free' | 'pro' | 'admin';
  used_bytes: number;
  limit_bytes: number;
  max_file_bytes: number;
  file_count: number;
};

function scoped(path: string, param: string, id?: string | null): string {
  return id ? `${path}?${param}=${encodeURIComponent(id)}` : path;
}

export async function listFolders(
  parentId?: string | null,
): Promise<DriveFolder[]> {
  const response = await expect(
    await request(scoped('/api/v1/folders', 'parent_id', parentId)),
    'Unable to load folders.',
  );
  return (await response.json()) as DriveFolder[];
}

export async function listFiles(
  folderId?: string | null,
): Promise<DriveFile[]> {
  const response = await expect(
    await request(scoped('/api/v1/files', 'folder_id', folderId)),
    'Unable to load files.',
  );
  return (await response.json()) as DriveFile[];
}

export async function getFolder(id: string): Promise<DriveFolder> {
  const response = await expect(
    await request(`/api/v1/folders/${id}`),
    'Unable to load that folder.',
  );
  return (await response.json()) as DriveFolder;
}

export async function moveFolder(
  id: string,
  parentId: string | null,
): Promise<void> {
  await expect(
    await request(`/api/v1/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: parentId }),
    }),
    'Unable to move the folder.',
  );
}

export async function moveFile(
  id: string,
  folderId: string | null,
): Promise<void> {
  await expect(
    await request(`/api/v1/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    }),
    'Unable to move the file.',
  );
}

export async function createShare(
  target: ShareTarget,
  options: { expiresAt: string; maxDownloads?: number; password?: string },
): Promise<ShareLink> {
  const body: Record<string, unknown> = { expires_at: options.expiresAt };
  if (options.maxDownloads !== undefined)
    body.max_downloads = options.maxDownloads;
  if (options.password) body.password = options.password;
  const response = await expect(
    await request(
      `/api/v1/${target.kind === 'folder' ? 'folders' : 'files'}/${target.id}/shares`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    ),
    'Unable to create the share link.',
  );
  return (await response.json()) as ShareLink;
}

export async function getStorageUsage(): Promise<StorageUsage> {
  const response = await expect(
    await request('/api/v1/users/me/usage'),
    'Unable to load storage usage.',
  );
  return (await response.json()) as StorageUsage;
}

export async function listShares(): Promise<ShareListItem[]> {
  const response = await expect(
    await request('/api/v1/shares'),
    'Unable to load your share links.',
  );
  return (await response.json()) as ShareListItem[];
}

export async function revokeShare(id: string): Promise<void> {
  await expect(
    await request(`/api/v1/shares/${id}`, { method: 'DELETE' }),
    'Unable to revoke that share link.',
  );
}

export async function downloadFile(file: DriveFile): Promise<void> {
  const response = await expect(
    await request(`/api/v1/files/${file.id}/download`),
    `Download of "${file.filename}" failed.`,
  );
  const objectURL = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectURL;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectURL), 1_000);
}

export async function walkCrumbs(folderId: string): Promise<DriveFolder[]> {
  const chain: DriveFolder[] = [];
  const seen = new Set<string>();
  let current: string | null = folderId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const folder = await getFolder(current);
    chain.unshift(folder);
    current = folder.parent_id ?? null;
  }
  return chain;
}
