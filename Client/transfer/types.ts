export type TransferId = string;

export type TransferStartMessage = {
  type: "transfer-start";
  transferId: TransferId;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
};

export type TransferReadyMessage = {
  type: "transfer-ready";
  transferId: TransferId;
};

export type TransferAckMessage = {
  type: "transfer-ack";
  transferId: TransferId;
  sequence: number;
};

export type TransferCompleteMessage = {
  type: "transfer-complete";
  transferId: TransferId;
  totalChunks: number;
};

export type TransferFinishedMessage = {
  type: "transfer-finished";
  transferId: TransferId;
  fileSize: number;
};

export type TransferCancelMessage = {
  type: "transfer-cancel";
  transferId: TransferId;
  reason?: string;
};

export type TransferErrorMessage = {
  type: "transfer-error";
  transferId?: TransferId;
  code: string;
  message: string;
};

export type TransferMessage =
  | TransferStartMessage
  | TransferReadyMessage
  | TransferAckMessage
  | TransferCompleteMessage
  | TransferFinishedMessage
  | TransferCancelMessage
  | TransferErrorMessage;
