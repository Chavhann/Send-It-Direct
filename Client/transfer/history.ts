export type TransferHistoryStatus = "in-progress" | "completed" | "failed" | "cancelled";
export type TransferDirection = "sent" | "received";

export type TransferHistoryEntry = {
  id: string;
  direction: TransferDirection;
  fileName: string;
  fileSize: number;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  status: TransferHistoryStatus;
  error?: string;
};

export const TRANSFER_HISTORY_STORAGE_KEY = "send-it-direct-transfer-history-v1";
const MAX_HISTORY_ENTRIES = 100;

export function loadTransferHistory(): TransferHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(TRANSFER_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is TransferHistoryEntry =>
      item !== null &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      (item.direction === "sent" || item.direction === "received") &&
      typeof item.fileName === "string" &&
      typeof item.fileSize === "number" &&
      typeof item.startedAt === "number" &&
      ["in-progress", "completed", "failed", "cancelled"].includes(item.status)
    ).slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

export function upsertTransferHistory(
  entries: TransferHistoryEntry[],
  entry: TransferHistoryEntry
): TransferHistoryEntry[] {
  const next = [entry, ...entries.filter((item) => item.id !== entry.id)];
  return next
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_HISTORY_ENTRIES);
}