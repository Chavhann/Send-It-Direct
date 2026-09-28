import {
  createTransferAck,
  createTransferError,
  serializeTransferMessage,
} from "./protocol";

import type {
  TransferChunkMessage,
  TransferId,
  TransferMessage,
  TransferStartMessage,
} from "./types";

type DataChannelLike = {
  send: (data: string) => void;
};

type IncomingTransfer = {
  transferId: TransferId;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
  chunks: Map<number, Uint8Array>;
  receivedBytes: number;
};

type ReceiverCallbacks = {
  onStart?: (transfer: IncomingTransfer) => void;
  onProgress?: (transferId: TransferId, progress: number) => void;
  onComplete?: (
    transferId: TransferId,
    file: File
  ) => void;
  onCancel?: (transferId: TransferId, reason?: string) => void;
  onError?: (error: Error) => void;
};

export class FileReceiver {
  private channel: DataChannelLike;
  private transfers = new Map<TransferId, IncomingTransfer>();
  private callbacks: ReceiverCallbacks;

  constructor(
    channel: DataChannelLike,
    callbacks: ReceiverCallbacks = {}
  ) {
    this.channel = channel;
    this.callbacks = callbacks;
  }

  handleMessage(message: TransferMessage): void {
    try {
      switch (message.type) {
        case "transfer-start":
          this.handleStart(message);
          break;

        case "transfer-chunk":
          this.handleChunk(message);
          break;

        case "transfer-complete":
          this.handleComplete(
            message.transferId,
            message.totalChunks
          );
          break;

        case "transfer-cancel":
          this.handleCancel(
            message.transferId,
            message.reason
          );
          break;

        case "transfer-ack":
          // ACKs are primarily consumed by the sender.
          break;

        case "transfer-error":
          this.handleError(
            message.message
          );
          break;

        default:
          throw new Error("Unsupported transfer message.");
      }
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Failed to process transfer message.");

      this.callbacks.onError?.(normalizedError);
    }
  }

  cancelTransfer(
    transferId: TransferId,
    reason = "Transfer cancelled."
  ): void {
    if (!this.transfers.has(transferId)) {
      return;
    }

    this.transfers.delete(transferId);

    this.channel.send(
      serializeTransferMessage({
        type: "transfer-cancel",
        transferId,
        reason,
      })
    );

    this.callbacks.onCancel?.(transferId, reason);
  }

  private handleStart(message: TransferStartMessage): void {
    if (message.fileSize < 0) {
      throw new Error("Invalid file size.");
    }

    if (message.totalChunks < 0) {
      throw new Error("Invalid chunk count.");
    }

    if (this.transfers.has(message.transferId)) {
      throw new Error(
        `Transfer ${message.transferId} already exists.`
      );
    }

    const transfer: IncomingTransfer = {
      transferId: message.transferId,
      fileName: message.fileName,
      fileSize: message.fileSize,
      fileType: message.fileType,
      totalChunks: message.totalChunks,
      chunkSize: message.chunkSize,
      chunks: new Map(),
      receivedBytes: 0,
    };

    this.transfers.set(message.transferId, transfer);

    this.callbacks.onStart?.(transfer);

    if (message.totalChunks === 0) {
      this.completeEmptyTransfer(transfer);
    }
  }

  private handleChunk(message: TransferChunkMessage): void {
    const transfer = this.transfers.get(message.transferId);

    if (!transfer) {
      throw new Error(
        `Unknown transfer: ${message.transferId}`
      );
    }

    if (
      message.sequence < 0 ||
      message.sequence >= transfer.totalChunks
    ) {
      throw new Error(
        `Invalid chunk sequence: ${message.sequence}`
      );
    }

    if (transfer.chunks.has(message.sequence)) {
      this.sendAck(
        message.transferId,
        message.sequence
      );
      return;
    }

    const chunk = new Uint8Array(message.data);

    transfer.chunks.set(message.sequence, chunk);
    transfer.receivedBytes += chunk.byteLength;

    const progress =
      transfer.totalChunks === 0
        ? 100
        : Math.floor(
            (transfer.chunks.size / transfer.totalChunks) *
              100
          );

    this.callbacks.onProgress?.(
      transfer.transferId,
      progress
    );

    this.sendAck(
      message.transferId,
      message.sequence
    );
  }

  private handleComplete(
    transferId: TransferId,
    totalChunks: number
  ): void {
    const transfer = this.transfers.get(transferId);

    if (!transfer) {
      throw new Error(`Unknown transfer: ${transferId}`);
    }

    if (totalChunks !== transfer.totalChunks) {
      throw new Error(
        "Transfer completion metadata does not match."
      );
    }

    if (transfer.chunks.size !== transfer.totalChunks) {
      throw new Error(
        `Transfer incomplete: received ${transfer.chunks.size} of ${transfer.totalChunks} chunks.`
      );
    }

    const orderedChunks: Uint8Array[] = [];

    for (
      let sequence = 0;
      sequence < transfer.totalChunks;
      sequence++
    ) {
      const chunk = transfer.chunks.get(sequence);

      if (!chunk) {
        throw new Error(
          `Missing chunk ${sequence}.`
        );
      }

      orderedChunks.push(chunk);
    }

    const blob = new Blob(orderedChunks, {
      type: transfer.fileType || "application/octet-stream",
    });

    const file = new File(
      [blob],
      transfer.fileName,
      {
        type:
          transfer.fileType ||
          "application/octet-stream",
      }
    );

    this.transfers.delete(transferId);

    this.callbacks.onProgress?.(
      transferId,
      100
    );

    this.callbacks.onComplete?.(
      transferId,
      file
    );
  }

  private completeEmptyTransfer(
    transfer: IncomingTransfer
  ): void {
    const blob = new Blob([], {
      type: transfer.fileType || "application/octet-stream",
    });

    const file = new File(
      [blob],
      transfer.fileName,
      {
        type:
          transfer.fileType ||
          "application/octet-stream",
      }
    );

    this.transfers.delete(
      transfer.transferId
    );

    this.callbacks.onComplete?.(
      transfer.transferId,
      file
    );
  }

  private handleCancel(
    transferId: TransferId,
    reason?: string
  ): void {
    this.transfers.delete(transferId);

    this.callbacks.onCancel?.(
      transferId,
      reason
    );
  }

  private handleError(message: string): void {
    this.callbacks.onError?.(
      new Error(message)
    );
  }

  private sendAck(
    transferId: TransferId,
    sequence: number
  ): void {
    const ack = createTransferAck(
      transferId,
      sequence
    );

    this.channel.send(
      serializeTransferMessage(ack)
    );
  }
}
