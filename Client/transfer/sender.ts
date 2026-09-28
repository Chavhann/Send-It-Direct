import {
  createTransferChunk,
  createTransferComplete,
  createTransferStart,
  serializeTransferMessage,
  FILE_CHUNK_SIZE,
} from "./protocol";
import type { TransferId } from "./types";

type DataChannelLike = {
  send: (data: string) => void;
  readyState?: string;
};

type SendFileOptions = {
  channel: DataChannelLike;
  file: File;
  transferId: TransferId;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
};

export async function sendFile({
  channel,
  file,
  transferId,
  onProgress,
  onComplete,
  onError,
}: SendFileOptions): Promise<void> {
  try {
    if (channel.readyState && channel.readyState !== "open") {
      throw new Error("Data channel is not open.");
    }

    const startMessage = createTransferStart(transferId, file);

    channel.send(serializeTransferMessage(startMessage));

    const totalChunks = Math.ceil(file.size / FILE_CHUNK_SIZE);

    for (let sequence = 0; sequence < totalChunks; sequence++) {
      const start = sequence * FILE_CHUNK_SIZE;
      const end = Math.min(start + FILE_CHUNK_SIZE, file.size);

      const buffer = await file.slice(start, end).arrayBuffer();
      const chunk = new Uint8Array(buffer);

      const chunkMessage = createTransferChunk(
        transferId,
        sequence,
        chunk
      );

      channel.send(serializeTransferMessage(chunkMessage));

      const progress = Math.floor(((sequence + 1) / totalChunks) * 100);

      onProgress?.(progress);

      await waitForChannelDrain(channel);
    }

    const completeMessage = createTransferComplete(
      transferId,
      totalChunks
    );

    channel.send(serializeTransferMessage(completeMessage));

    onComplete?.();
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error("File transfer failed.");

    onError?.(normalizedError);

    throw normalizedError;
  }
}

async function waitForChannelDrain(
  channel: DataChannelLike
): Promise<void> {
  const bufferedAmount = getBufferedAmount(channel);

  if (bufferedAmount < 512 * 1024) {
    return;
  }

  await new Promise<void>((resolve) => {
    const check = () => {
      if (getBufferedAmount(channel) < 256 * 1024) {
        resolve();
        return;
      }

      setTimeout(check, 10);
    };

    check();
  });
}

function getBufferedAmount(channel: DataChannelLike): number {
  const candidate = channel as DataChannelLike & {
    bufferedAmount?: number;
  };

  return typeof candidate.bufferedAmount === "number"
    ? candidate.bufferedAmount
    : 0;
}
