import { nanoid } from "nanoid";
import {
  TransferAckMessage,
  TransferCancelMessage,
  TransferChunkMessage,
  TransferCompleteMessage,
  TransferErrorMessage,
  TransferId,
  TransferMessage,
  TransferStartMessage,
} from "./types";

export const FILE_CHUNK_SIZE = 16 * 1024;

export function createTransferId(): TransferId {
  return nanoid(12);
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

export function createTransferChunk(
  transferId: TransferId,
  sequence: number,
  data: Uint8Array
): TransferChunkMessage {
  return {
    type: "transfer-chunk",
    transferId,
    sequence,
    data: Array.from(data),
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
