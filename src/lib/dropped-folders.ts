async function collectEntry(
  entry: FileSystemEntry,
  files: File[],
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    Object.defineProperty(file, 'webkitRelativePath', {
      value: entry.fullPath.slice(1),
    });
    files.push(file);
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (entries.length === 0) break;
      for (const child of entries) await collectEntry(child, files);
    }
  }
}

export function droppedFolders(
  items: DataTransferItemList,
): Promise<File[]> | null {
  const entries = Array.from(items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => !!entry?.isDirectory);
  if (!entries.length) return null;

  return (async () => {
    const files: File[] = [];
    for (const entry of entries) await collectEntry(entry, files);
    return files;
  })();
}
