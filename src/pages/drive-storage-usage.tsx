import type { StorageUsage } from '../lib/drive';
import { formatBytes } from '../lib/format';

const storagePlanLabels = { free: 'Free', pro: 'Pro', admin: 'Admin' } as const;

export function DriveStorageUsage({
  usage,
  storageFull,
}: {
  usage: StorageUsage;
  storageFull: boolean;
}) {
  const usagePercent =
    usage.limit_bytes > 0
      ? Math.min(100, Math.round((usage.used_bytes / usage.limit_bytes) * 100))
      : 0;

  return (
    <div className="mt-4" data-testid="storage-usage">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span data-testid="storage-usage-text">
          {storagePlanLabels[usage.plan]} plan · {formatBytes(usage.used_bytes)}
          {usage.limit_bytes > 0
            ? ` of ${formatBytes(usage.limit_bytes)} used`
            : ' used (unlimited)'}
          {storageFull && (
            <span className="ml-2 font-semibold text-red-600">
              Storage full
            </span>
          )}
        </span>
        <span>
          {usage.file_count} {usage.file_count === 1 ? 'file' : 'files'}
        </span>
      </div>
      {usage.limit_bytes > 0 && (
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${storageFull ? 'bg-red-500' : 'bg-blue-600'}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
