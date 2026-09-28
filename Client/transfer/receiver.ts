import {
  createTransferAck,
  createTransferError,
  createTransferFinished,
  createTransferReady,
  serializeTransferMessage,
} from "./protocol";
import type {
  TransferId,
  TransferMessage,
  TransferStartMessage,
} from "./types";

type DataChannelLike = {
  send: (data: string) => void;
};

type WritableFileStreamLike = {
  write: (data: Uint8Array) => Promise<void>;
  close: () => Promise<void>;
  abort?: (reason?: unknown) => Promise<void>;
};

export type IncomingTransfer = {
  transferId: TransferId;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
  receivedBytes: number;
  receivedChunks: number;
  ready: boolean;
  completed: boolean;
};

type ActiveTransfer = IncomingTransfer & {
  writable: WritableFileStreamLike | null;
  expectedSequence: number;
};

type ReceiverCallbacks = {
  onStart?: (transfer: IncomingTransfer) => void;
  onReady?: (transferId: TransferId) => void;
  onProgress?: (
    transferId: TransferId,
    progress: number,
    receivedBytes: number
  ) => void;
  onComplete?: (transfer: IncomingTransfer) => void;
  onCancel?: (
    transferId: TransferId,
    reason?: string
  ) => void;
  onError?: (error: Error) => void;
};

export class FileReceiver {
  private channel: DataChannelLike;
  private transfers = new Map<
    TransferId,
    ActiveTransfer
  >();
  private callbacks: ReceiverCallbacks;

  private processing = Promise.resolve();

  constructor(
    channel: DataChannelLike,
    callbacks: ReceiverCallbacks = {}
  ) {
    this.channel = channel;
    this.callbacks = callbacks;
  }

  handleMessage(message: TransferMessage): Promise<void> {
    this.processing = this.processing
      .then(async () => {
        await this.processMessage(message);
      })
      .catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error(
                "Failed to process transfer message."
              );

        this.callbacks.onError?.(
          normalizedError
        );
      });

    return this.processing;
  }

  handleChunkFrame(
    transferId: TransferId,
    sequence: number,
    data: Uint8Array
  ): Promise<void> {
    this.processing = this.processing
      .then(async () => {
        await this.processChunk(
          transferId,
          sequence,
          data
        );
      })
      .catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error(
                "Failed to process transfer chunk."
              );

        this.sendTransferError(
          transferId,
          "CHUNK_WRITE_FAILED",
          normalizedError.message
        );

        this.callbacks.onError?.(
          normalizedError
        );
      });

    return this.processing;
  }

  async prepareTransfer(
    transferId: TransferId,
    writable: WritableFileStreamLike
  ): Promise<void> {
    const transfer =
      this.transfers.get(transferId);

    if (!transfer) {
      throw new Error(
        `Unknown transfer: ${transferId}`
      );
    }

    if (transfer.ready) {
      throw new Error(
        "Transfer is already prepared."
      );
    }

    transfer.writable = writable;
    transfer.ready = true;

    this.channel.send(
      serializeTransferMessage(
        createTransferReady(transferId)
      )
    );

    this.callbacks.onReady?.(transferId);

    if (transfer.totalChunks === 0) {
      await this.finishTransfer(transfer);
    }
  }

  dispose(): void {
    this.transfers.forEach((transfer) => {
      void this.abortTransfer(
        transfer,
        "Connection closed."
      );
    });

    this.transfers.clear();
  }

  cancelTransfer(
    transferId: TransferId,
    reason = "Transfer cancelled."
  ): void {
    const transfer =
      this.transfers.get(transferId);

    if (!transfer) {
      return;
    }

    this.transfers.delete(transferId);

    void this.abortTransfer(
      transfer,
      reason
    );

    this.channel.send(
      serializeTransferMessage({
        type: "transfer-cancel",
        transferId,
        reason,
      })
    );

    this.callbacks.onCancel?.(
      transferId,
      reason
    );
  }

  private async processMessage(
    message: TransferMessage
  ): Promise<void> {
    switch (message.type) {
      case "transfer-start":
        this.handleStart(message);
        return;

      case "transfer-complete":
        await this.handleComplete(
          message.transferId,
          message.totalChunks
        );
        return;

      case "transfer-cancel":
        this.handleCancel(
          message.transferId,
          message.reason
        );
        return;

      case "transfer-ack":
        return;

      case "transfer-ready":
        return;

      case "transfer-finished":
        return;

      case "transfer-error":
        this.handleError(message.message);
        return;

      default:
        throw new Error(
          "Unsupported transfer message."
        );
    }
  }

  private handleStart(
    message: TransferStartMessage
  ): void {
    if (
      !Number.isFinite(message.fileSize) ||
      message.fileSize < 0
    ) {
      throw new Error(
        "Invalid file size."
      );
    }

    if (
      !Number.isSafeInteger(
        message.totalChunks
      ) ||
      message.totalChunks < 0
    ) {
      throw new Error(
        "Invalid chunk count."
      );
    }

    if (
      !Number.isSafeInteger(
        message.chunkSize
      ) ||
      message.chunkSize <= 0
    ) {
      throw new Error(
        "Invalid chunk size."
      );
    }

    if (
      this.transfers.has(
        message.transferId
      )
    ) {
      throw new Error(
        `Transfer ${message.transferId} already exists.`
      );
    }

    const transfer: ActiveTransfer = {
      transferId: message.transferId,
      fileName: message.fileName,
      fileSize: message.fileSize,
      fileType:
        message.fileType ||
        "application/octet-stream",
      totalChunks: message.totalChunks,
      chunkSize: message.chunkSize,
      receivedBytes: 0,
      receivedChunks: 0,
      ready: false,
      completed: false,
      writable: null,
      expectedSequence: 0,
    };

    this.transfers.set(
      message.transferId,
      transfer
    );

    this.callbacks.onStart?.(transfer);
  }

  private async processChunk(
    transferId: TransferId,
    sequence: number,
    data: Uint8Array
  ): Promise<void> {
    const transfer =
      this.transfers.get(transferId);

    if (!transfer) {
      throw new Error(
        `Unknown transfer: ${transferId}`
      );
    }

    if (!transfer.ready) {
      throw new Error(
        "Receiver has not selected a save location."
      );
    }

    if (!transfer.writable) {
      throw new Error(
        "File writer is not available."
      );
    }

    if (
      sequence < 0 ||
      sequence >= transfer.totalChunks
    ) {
      throw new Error(
        `Invalid chunk sequence: ${sequence}`
      );
    }

    if (
      sequence !== transfer.expectedSequence
    ) {
      throw new Error(
        `Unexpected chunk sequence. Expected ${transfer.expectedSequence}, received ${sequence}.`
      );
    }

    if (
      data.byteLength > transfer.chunkSize
    ) {
      throw new Error(
        `Chunk ${sequence} exceeds the declared chunk size.`
      );
    }

    if (
      transfer.receivedBytes +
        data.byteLength >
      transfer.fileSize
    ) {
      throw new Error(
        `Transfer ${transferId} exceeds the declared file size.`
      );
    }

    await transfer.writable.write(data);

    transfer.receivedBytes +=
      data.byteLength;

    transfer.receivedChunks += 1;
    transfer.expectedSequence += 1;

    const progress =
      transfer.totalChunks === 0
        ? 100
        : Math.floor(
            (transfer.receivedChunks /
              transfer.totalChunks) *
              100
          );

    this.callbacks.onProgress?.(
      transfer.transferId,
      progress,
      transfer.receivedBytes
    );

    this.channel.send(
      serializeTransferMessage(
        createTransferAck(
          transfer.transferId,
          sequence
        )
      )
    );
  }

  private async handleComplete(
    transferId: TransferId,
    totalChunks: number
  ): Promise<void> {
    const transfer =
      this.transfers.get(transferId);

    if (!transfer) {
      throw new Error(
        `Unknown transfer: ${transferId}`
      );
    }

    if (!transfer.ready) {
      throw new Error(
        "Transfer completed before the receiver was ready."
      );
    }

    if (totalChunks !== transfer.totalChunks) {
      throw new Error(
        "Transfer completion metadata does not match."
      );
    }

    if (
      transfer.receivedChunks !==
      transfer.totalChunks
    ) {
      throw new Error(
        `Transfer incomplete: received ${transfer.receivedChunks} of ${transfer.totalChunks} chunks.`
      );
    }

    if (
      transfer.receivedBytes !==
      transfer.fileSize
    ) {
      throw new Error(
        `Transfer size mismatch: received ${transfer.receivedBytes} of ${transfer.fileSize} bytes.`
      );
    }

    await this.finishTransfer(transfer);
  }

  private async finishTransfer(
    transfer: ActiveTransfer
  ): Promise<void> {
    if (transfer.completed) {
      return;
    }

    if (!transfer.writable) {
      throw new Error(
        "File writer is not available."
      );
    }

    await transfer.writable.close();

    transfer.completed = true;

    this.transfers.delete(
      transfer.transferId
    );

    this.callbacks.onProgress?.(
      transfer.transferId,
      100,
      transfer.fileSize
    );

    this.callbacks.onComplete?.(
      transfer
    );

    this.channel.send(
      serializeTransferMessage(
        createTransferFinished(
          transfer.transferId,
          transfer.fileSize
        )
      )
    );
  }

  private handleCancel(
    transferId: TransferId,
    reason?: string
  ): void {
    const transfer =
      this.transfers.get(transferId);

    if (!transfer) {
      return;
    }

    this.transfers.delete(transferId);

    void this.abortTransfer(
      transfer,
      reason || "Transfer cancelled."
    );

    this.callbacks.onCancel?.(
      transferId,
      reason
    );
  }

  private async abortTransfer(
    transfer: ActiveTransfer,
    reason: string
  ): Promise<void> {
    try {
      if (transfer.writable?.abort) {
        await transfer.writable.abort(
          new Error(reason)
        );
      }
    } catch {
      // Ignore cleanup errors.
    }
  }

  private handleError(
    message: string
  ): void {
    this.callbacks.onError?.(
      new Error(message)
    );
  }

  private sendTransferError(
    transferId: TransferId,
    code: string,
    message: string
  ): void {
    try {
      this.channel.send(
        serializeTransferMessage(
          createTransferError(
            code,
            message,
            transferId
          )
        )
      );
    } catch {
      // The peer may already be disconnected.
    }
  }
}
