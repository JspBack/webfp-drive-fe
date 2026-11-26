import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearAPISession } from '../lib/api';
import {
  type DriveFile,
  type DriveFolder,
  getStorageUsage,
  listFiles,
  listFolders,
  type StorageUsage,
  walkCrumbs,
} from '../lib/drive';

import { messageOf } from '../lib/errors';

type User = {
  email: string;
  name: string;
};

export function useDriveData(folderId: string | undefined) {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [crumbs, setCrumbs] = useState<Record<string, DriveFolder[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!sessionStorage.getItem('webfp-api-token')) {
      navigate('/auth/sign-in', { replace: true });
      return;
    }
    void apiRequest('/api/v1/users/me')
      .then(async (response) => {
        if (response.status === 401) {
          clearAPISession();
          navigate('/auth/sign-in', { replace: true });
          return;
        }
        if (!response.ok) throw new Error('Unable to load your account.');
        setUser((await response.json()) as User);
      })
      .catch((cause: unknown) => {
        setError(messageOf(cause, 'Unable to load your account.'));
      });
  }, [navigate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: explicitly run after any drive ops.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      listFolders(folderId),
      listFiles(folderId),
      getStorageUsage(),
    ])
      .then(([folderList, fileList, storageUsage]) => {
        if (cancelled) return;
        setFolders(folderList);
        setFiles(fileList);
        setUsage(storageUsage);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(messageOf(cause, 'Unable to load this folder.'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folderId, reloadKey]);

  useEffect(() => {
    if (!folderId || crumbs[folderId]) return;
    let cancelled = false;
    void walkCrumbs(folderId)
      .then((chain) => {
        if (cancelled) return;
        setCrumbs((previous) =>
          previous[folderId] ? previous : { ...previous, [folderId]: chain },
        );
      })
      .catch(() => {
      });
    return () => {
      cancelled = true;
    };
  }, [folderId, crumbs]);

  async function signOut() {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      clearAPISession();
      navigate('/auth/sign-in', { replace: true });
    }
  }
  const chain = folderId ? (crumbs[folderId] ?? []) : [];
  const currentName =
    chain.length > 0
      ? chain[chain.length - 1].name
      : folderId
        ? 'Folder'
        : 'Home';

  return {
    user,
    folders,
    files,
    chain,
    currentName,
    loading,
    error,
    setError,
    usage,
    refresh,
    signOut,
  };
}
