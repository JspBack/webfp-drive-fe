import type { DragEvent } from 'react';

export type DragPayload = {
  kind: 'file' | 'folder';
  id: string;
};

export const DRAG_MIME = 'application/x-webfp-item';

export function parseDragPayload(raw: string): DragPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DragPayload>;
    if ((parsed.kind === 'file' || parsed.kind === 'folder') && parsed.id) {
      return { kind: parsed.kind, id: parsed.id };
    }
  } catch {
    return null;
  }
  return null;
}

export function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

export function isItemDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes(DRAG_MIME);
}
