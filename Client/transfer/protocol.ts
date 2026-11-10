import { nanoid } from "nanoid";
import {
  TransferAckMessage,
  TransferCancelMessage,
  TransferCompleteMessage,
  TransferErrorMessage,
  TransferFinishedMessage,
  TransferId,
  TransferMessage,
  TransferReadyMessage,
  TransferStartMessage,
} from "./types";

export const FILE_CHUNK_SIZE = 32 * 1024;
export const TRANSFER_WINDOW_SIZE = 64;

const CHUNK_FRAME_TYPE = 0x01;
const TRANSFER_ID_LENGTH = 12;
const CHUNK_HEADER_SIZE = 1 + TRANSFER_ID_LENGTH + 4;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function createTransferId(): TransferId {
  return nanoid(TRANSFER_ID_LENGTH);
}

export function createTransferStart(
  transferId: TransferId,
  file: File
): TransferStartMessage {
  return {
    type: "transfer-start",
    transferId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || "application/octet-stream",
    totalChunks: Math.ceil(file.size / FILE_CHUNK_SIZE),
    chunkSize: FILE_CHUNK_SIZE,
  };
}

export function createTransferReady(
  transferId: TransferId
): TransferReadyMessage {
  return {
    type: "transfer-ready",
    transferId,
  };
}

export function createTransferAck(
  transferId: TransferId,
  sequence: number
): TransferAckMessage {
  return {
    type: "transfer-ack",
    transferId,
    sequence,
  };
}

export function createTransferComplete(
  transferId: TransferId,
  totalChunks: number
): TransferCompleteMessage {
  return {
    type: "transfer-complete",
    transferId,
    totalChunks,
  };
}

export function createTransferFinished(
  transferId: TransferId,
  fileSize: number
): TransferFinishedMessage {
  return {
    type: "transfer-finished",
    transferId,
    fileSize,
  };
}

export function createTransferCancel(
  transferId: TransferId,
  reason?: string
): TransferCancelMessage {
  return {
    type: "transfer-cancel",
    transferId,
    reason,
  };
}

export function createTransferError(
  code: string,
  message: string,
  transferId?: TransferId
): TransferErrorMessage {
  return {
    type: "transfer-error",
    transferId,
    code,
    message,
  };
}

export function serializeTransferMessage(
  message: TransferMessage
): string {
  return JSON.stringify(message);
}

export function parseTransferMessage(
  payload: string
): TransferMessage {
  const message: unknown = JSON.parse(payload);

  if (!message || typeof message !== "object") {
    throw new Error("Invalid transfer message.");
  }

  if (!("type" in message)) {
    throw new Error("Transfer message is missing its type.");
  }

  return message as TransferMessage;
}

export function createTransferChunkFrame(
  transferId: TransferId,
  sequence: number,
  data: Uint8Array
): Uint8Array {
  if (transferId.length !== TRANSFER_ID_LENGTH) {
    throw new Error("Invalid transfer ID length.");
  }

  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new Error("Invalid chunk sequence.");
  }

  const transferIdBytes = textEncoder.encode(transferId);

  if (transferIdBytes.length !== TRANSFER_ID_LENGTH) {
    throw new Error("Transfer ID must contain ASCII characters only.");
  }

  const frame = new Uint8Array(
    CHUNK_HEADER_SIZE + data.byteLength
  );

  frame[0] = CHUNK_FRAME_TYPE;
  frame.set(transferIdBytes, 1);

  new DataView(frame.buffer).setUint32(
    1 + TRANSFER_ID_LENGTH,
    sequence,
    false
  );

  frame.set(data, CHUNK_HEADER_SIZE);

  return frame;
}

export function isTransferChunkFrame(
  data: unknown
): data is ArrayBuffer | ArrayBufferView {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data).byteLength >= CHUNK_HEADER_SIZE &&
      new Uint8Array(data)[0] === CHUNK_FRAME_TYPE;
  }

  if (ArrayBuffer.isView(data)) {
    const bytes = new Uint8Array(
      data.buffer,
      data.byteOffset,
      data.byteLength
    );

    return bytes.byteLength >= CHUNK_HEADER_SIZE &&
      bytes[0] === CHUNK_FRAME_TYPE;
  }

  return false;
}

export function parseTransferChunkFrame(
  data: ArrayBuffer | ArrayBufferView
): {
  transferId: TransferId;
  sequence: number;
  data: Uint8Array;
} {
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(
          data.buffer,
          data.byteOffset,
          data.byteLength
        );

  if (bytes.byteLength < CHUNK_HEADER_SIZE) {
    throw new Error("Transfer chunk frame is too small.");
  }

  if (bytes[0] !== CHUNK_FRAME_TYPE) {
    throw new Error("Invalid transfer chunk frame.");
  }

  const transferId = textDecoder.decode(
    bytes.subarray(1, 1 + TRANSFER_ID_LENGTH)
  );

  if (transferId.length !== TRANSFER_ID_LENGTH) {
    throw new Error("Invalid transfer ID in chunk frame.");
  }

  const sequence = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  ).getUint32(1 + TRANSFER_ID_LENGTH, false);

  return {
    transferId,
    sequence,
    data: bytes.subarray(CHUNK_HEADER_SIZE),
  };
}
