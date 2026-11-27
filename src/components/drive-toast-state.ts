import { createContext, useContext } from 'react';

export type DriveToast = {
  title: string;
  message: string;
} & (
  | { kind: 'progress'; completed: number; total: number; cancel?: () => void }
  | { kind: 'success' | 'error' }
);

type ToastChannel = 'upload' | 'delete';

export type ShowDriveToast = (channel: ToastChannel, toast: DriveToast) => void;

export const DriveToastContext = createContext<ShowDriveToast | null>(null);

export function useDriveToast(): ShowDriveToast {
  const show = useContext(DriveToastContext);
  if (!show) throw new Error('Drive toast provider is missing.');
  return show;
}
