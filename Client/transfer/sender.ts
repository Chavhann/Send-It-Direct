import {
  createTransferChunkFrame,
  createTransferComplete,
  createTransferStart,
  serializeTransferMessage,
  FILE_CHUNK_SIZE,
  TRANSFER_WINDOW_SIZE,
} from "./protocol";
import type { TransferId } from "./types";

type DataChannelLike = {
  send: (data: string | Uint8Array) => void;
  readyState?: string;
};

type SendFileOptions = {
  channel: DataChannelLike;
  file: File;
  transferId: TransferId;
  waitForReady: () => Promise<void>;
  waitForAck: (sequence: number) => Promise<void>;
  waitForFinished: () => Promise<void>;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
};

export async function sendFile({
  channel,
  file,
  transferId,
  waitForReady,
  waitForAck,
  waitForFinished,
  onProgress,
  onComplete,
  onError,
}: SendFileOptions): Promise<void> {
  try {
    assertChannelOpen(channel);

    const startMessage = createTransferStart(
      transferId,
      file
    );

    channel.send(
      serializeTransferMessage(startMessage)
    );

    await waitForReady();

    assertChannelOpen(channel);

    const totalChunks = Math.ceil(
      file.size / FILE_CHUNK_SIZE
    );

    let nextSequence = 0;

    while (nextSequence < totalChunks) {
      const windowEnd = Math.min(
        nextSequence + TRANSFER_WINDOW_SIZE,
        totalChunks
      );

      for (
        let sequence = nextSequence;
        sequence < windowEnd;
        sequence++
      ) {
        const start =
          sequence * FILE_CHUNK_SIZE;

        const end = Math.min(
          start + FILE_CHUNK_SIZE,
          file.size
        );

        const buffer = await file
          .slice(start, end)
          .arrayBuffer();

        assertChannelOpen(channel);

        const chunk = new Uint8Array(buffer);

        channel.send(
          createTransferChunkFrame(
            transferId,
            sequence,
            chunk
          )
        );

        const progress = Math.floor(
          ((sequence + 1) / totalChunks) * 100
        );

        onProgress?.(progress);
      }

      await waitForAck(windowEnd - 1);

      nextSequence = windowEnd;
    }

    assertChannelOpen(channel);

    channel.send(
      serializeTransferMessage(
        createTransferComplete(
          transferId,
          totalChunks
        )
      )
    );

    await waitForFinished();

    onProgress?.(100);
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

function assertChannelOpen(
  channel: DataChannelLike
): void {
  if (
    channel.readyState &&
    channel.readyState !== "open"
  ) {
    throw new Error(
      "Data channel is no longer open."
    );
  }
}
