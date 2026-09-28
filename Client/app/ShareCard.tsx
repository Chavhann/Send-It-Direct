"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  FileUp,
  Link2,
  Loader2,
  LockKeyhole,
  Send,
  ShieldCheck,
  Unplug,
  UploadCloud,
  Wifi,
} from "lucide-react";
import { useSocket } from "./SP";
import toast from "react-hot-toast";
import Peer from "simple-peer";
import FileDownload from "./FD";
import FileUpload from "./FU";
import ShareLink from "./ShareLink";
import { useSearchParams } from "next/navigation";

import { sendFile } from "../transfer/sender";
import {
  FileReceiver,
} from "../transfer/receiver";
import type {
  IncomingTransfer,
} from "../transfer/receiver";
import {
  createTransferId,
  isTransferChunkFrame,
  parseTransferChunkFrame,
  parseTransferMessage,
} from "../transfer/protocol";
import type {
  TransferId,
} from "../transfer/types";

const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

if (!turnUrl || !turnUsername || !turnCredential) {
  throw new Error("WebRTC TURN configuration is not configured.");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const iceServers = [
  {
    urls: turnUrl,
    username: turnUsername,
    credential: turnCredential,
  },
];

type PendingTransfer = {
  readyPromise: Promise<void>;
  resolveReady: () => void;
  rejectReady: (error: Error) => void;
  acknowledged: Set<number>;
  ackWaiters: Map<
    number,
    {
      resolve: () => void;
      reject: (error: Error) => void;
    }
  >;
  finishedPromise: Promise<void>;
  resolveFinished: () => void;
  rejectFinished: (error: Error) => void;
};

const createPendingTransfer = (): PendingTransfer => {
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;

  const readyPromise = new Promise<void>(
    (resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    }
  );

  let resolveFinished!: () => void;
  let rejectFinished!: (error: Error) => void;

  const finishedPromise = new Promise<void>(
    (resolve, reject) => {
      resolveFinished = resolve;
      rejectFinished = reject;
    }
  );

  return {
    readyPromise,
    resolveReady,
    rejectReady,
    acknowledged: new Set<number>(),
    ackWaiters: new Map(),
    finishedPromise,
    resolveFinished,
    rejectFinished,
  };
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      promise,
      timeout,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const ShareCard = () => {
  const userDetails = useSocket();

  const [partnerId, setpartnerId] = useState("");
  type ConnectionState = "waiting" | "connecting" | "connected" | "error";
  const [connectionState, setConnectionState] = useState<ConnectionState>("waiting");
  const [isCopied, setisCopied] = useState(false);
  const currentConnection = connectionState === "connected";
  const isLoading = connectionState === "connecting";

  const peerRef = useRef<any>();
  const receiverRef = useRef<FileReceiver>();
  const pendingTransfersRef = useRef(
    new Map<TransferId, PendingTransfer>()
  );
  const transferStartedAtRef =
    useRef<number | null>(null);

  const [incomingTransfer, setIncomingTransfer] =
    useState<IncomingTransfer>();
  const [fileTransferDuration, setFileTransferDuration] =
    useState<number>();
  const [fileTransferComplete, setFileTransferComplete] =
    useState(false);

  const [userId, setuserId] = useState<any>();
  const [signalingData, setsignalingData] = useState<any>();
  const [acceptCaller, setacceptCaller] = useState(false);
  const [terminateCall, setterminateCall] = useState(false);

  const [fileUpload, setfileUpload] = useState<any>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloadFile, setdownloadFile] = useState<any>();
  const [fileUploadProgress, setfileUploadProgress] = useState<number>(0);
  const [fileDownloadProgress, setfileDownloadProgress] = useState<number>(0);

  const [fileNameState, setfileNameState] = useState<any>();
  const [fileSending, setfileSending] = useState(false);
  const [fileReceiving, setfileReceiving] = useState(false);

  const searchParams = useSearchParams();

  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setuserId(userDetails.userId);
  }, [userDetails.userId]);

  const copyToClipboard = async (value: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setisCopied(true);
      toast.success("Token copied");

      setTimeout(() => {
        setisCopied(false);
      }, 2000);
    } catch {
      toast.error("Could not copy token");
    }
  };

  const createReceiver = (peer: any) => {
    receiverRef.current = new FileReceiver(
      {
        send: (message: string) => {
          if (!peer.connected) {
            throw new Error(
              "Peer connection is no longer available."
            );
          }

          peer.send(message);
        },
      },
      {
        onStart: (transfer) => {
          setIncomingTransfer(transfer);
          setfileReceiving(true);
          setfileDownloadProgress(0);
          setfileNameState(transfer.fileName);
          setdownloadFile(undefined);
        },

        onProgress: (
          _transferId,
          progress
        ) => {
          setfileReceiving(true);
          setfileDownloadProgress(progress);
        },

        onComplete: (transfer) => {
          setIncomingTransfer(undefined);
          setfileDownloadProgress(100);
          setfileReceiving(false);
          toast.success(
            `File received successfully: ${transfer.fileName}`
          );
        },

        onCancel: (_transferId, reason) => {
          setIncomingTransfer(undefined);
          setfileReceiving(false);

          if (reason) {
            toast.error(reason);
          }
        },

        onError: (error) => {
          setfileReceiving(false);
          toast.error(
            error.message ||
              "File transfer failed."
          );
        },
      }
    );
  };

  const resetConnectionState = () => {
    setpartnerId("");
    setConnectionState("waiting");
    setfileUpload(undefined);
    setfileSending(false);
    setfileReceiving(false);
    setfileUploadProgress(0);
    setfileDownloadProgress(0);
    setterminateCall(false);
    receiverRef.current?.dispose();
    receiverRef.current = undefined;
    userDetails.setpeerState(undefined);
  };

  useEffect(() => {
    const handleSignaling = (data: any) => {
      setacceptCaller(true);
      setsignalingData(data);
      setpartnerId(data.from);
    };

    const handleCallAccepted = (data: any) => {
      const peer = peerRef.current;

      if (!peer) {
        toast.error("Connection could not be completed.");
        setConnectionState("waiting");
        return;
      }

      peer.signal(data.signalData);

      setConnectionState("connecting");
      setterminateCall(true);

      userDetails.setpeerState(peer);
    };

    const handleSignalError = (message: string) => {
      setConnectionState("error");
      toast.error(message || "Signaling failed.");
    };

    const handleServerError = (message: string) => {
      setConnectionState("error");
      toast.error(message || "Server error.");
    };

    const sharedCode = searchParams.get("code");

    if (sharedCode) {
      setpartnerId(String(sharedCode));
    }

    userDetails.socket.on("signaling", handleSignaling);
    userDetails.socket.on("callAccepted", handleCallAccepted);
    userDetails.socket.on("signal-error", handleSignalError);
    userDetails.socket.on("server-error", handleServerError);

    return () => {
      userDetails.socket.off("signaling", handleSignaling);
      userDetails.socket.off("callAccepted", handleCallAccepted);
      userDetails.socket.off("signal-error", handleSignalError);
      userDetails.socket.off("server-error", handleServerError);

      peerRef.current?.destroy();

      peerRef.current = undefined;
      receiverRef.current = undefined;
    };
  }, [searchParams, userDetails.socket, userDetails.setpeerState]);

  const handlePeerData = (data: any) => {
    try {
      if (
        isTransferChunkFrame(data)
      ) {
        const frame =
          parseTransferChunkFrame(data);

        void receiverRef.current?.handleChunkFrame(
          frame.transferId,
          frame.sequence,
          frame.data
        );

        return;
      }

      let payload: string;

      if (typeof data === "string") {
        payload = data;
      } else if (data instanceof Uint8Array) {
        payload = new TextDecoder().decode(data);
      } else if (data instanceof ArrayBuffer) {
        payload = new TextDecoder().decode(
          new Uint8Array(data)
        );
      } else {
        payload = String(data);
      }

      const rawMessage = JSON.parse(payload);

      if (rawMessage?.type === "messages") {
        return;
      }

      const message =
        parseTransferMessage(payload);

      const transferId =
        "transferId" in message
          ? message.transferId
          : undefined;

      if (
        message.type ===
        "transfer-ready"
      ) {
        const pending =
          transferId
            ? pendingTransfersRef.current.get(
                transferId
              )
            : undefined;

        pending?.resolveReady();
        return;
      }

      if (
        message.type ===
        "transfer-ack"
      ) {
        const pending =
          pendingTransfersRef.current.get(
            message.transferId
          );

        if (!pending) {
          return;
        }

        const waiter =
          pending.ackWaiters.get(
            message.sequence
          );

        if (waiter) {
          pending.ackWaiters.delete(
            message.sequence
          );
          waiter.resolve();
        } else {
          pending.acknowledged.add(
            message.sequence
          );
        }

        return;
      }

      if (
        message.type ===
        "transfer-finished"
      ) {
        const pending =
          pendingTransfersRef.current.get(
            message.transferId
          );

        pending?.resolveFinished();
        return;
      }

      if (
        message.type ===
        "transfer-error"
      ) {
        const error =
          new Error(message.message);

        if (message.transferId) {
          const pending =
            pendingTransfersRef.current.get(
              message.transferId
            );

          if (pending) {
            pending.rejectReady(error);
            pending.rejectFinished(error);

            pending.ackWaiters.forEach(
              (waiter) => {
                waiter.reject(error);
              }
            );
          }
        }

        toast.error(message.message);
        return;
      }

      if (
        message.type ===
        "transfer-cancel"
      ) {
        if (message.transferId) {
          const pending =
            pendingTransfersRef.current.get(
              message.transferId
            );

          const error = new Error(
            message.reason ||
              "Transfer cancelled."
          );

          pending?.rejectReady(error);
          pending?.rejectFinished(error);

          if (pending) {
            pending.ackWaiters.forEach(
              (waiter) => {
                waiter.reject(error);
              }
            );
          }
        }

        void receiverRef.current?.handleMessage(
          message
        );

        return;
      }

      void receiverRef.current?.handleMessage(
        message
      );
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(
              "Invalid transfer message."
            );

      console.error(
        "[WebRTC] Transfer data error:",
        normalizedError
      );

      toast.error(
        normalizedError.message
      );
    }
  };

  const registerPeerLifecycle = (peer: any) => {
    peer.on("data", handlePeerData);

    peer.on("close", () => {
      resetConnectionState();
    });

    peer.on("error", (err: any) => {
      console.error("WebRTC peer error:", err);

      setConnectionState("error");
      setterminateCall(false);
      setfileSending(false);
      setfileReceiving(false);

      toast.error("Peer connection error.");
    });
  };

  const callUser = () => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: { iceServers },
    });

    peerRef.current = peer;
    createReceiver(peer);
    registerPeerLifecycle(peer);

    peer.on("signal", (data) => {
      userDetails.socket.emit("send-signal", {
        signalData: data,
        to: partnerId,
      });
    });

    peer.on("connect", () => {
      setConnectionState("connected");
      setterminateCall(true);
      userDetails.setpeerState(peer);
    });
  };

  const acceptUser = () => {
    if (!signalingData?.signalData) {
      toast.error("No signaling data available.");
      return;
    }

    const peer = new Peer({
      initiator: false,
      trickle: false,
      config: { iceServers },
    });

    peerRef.current = peer;
    createReceiver(peer);
    registerPeerLifecycle(peer);

    peer.on("signal", (data) => {
      userDetails.socket.emit("accept-signal", {
        signalData: data,
        to: signalingData.from,
      });
    });

    peer.on("connect", () => {
      setConnectionState("connected");
      setacceptCaller(false);
      setterminateCall(true);

      userDetails.setpeerState(peer);

      toast.success("Peer connection established.");
    });

    peer.signal(signalingData.signalData);
  };

  const handleConnectionMaking = () => {
    const normalizedPartnerId = partnerId.trim();

    setpartnerId(normalizedPartnerId);

    if (!normalizedPartnerId || normalizedPartnerId.length !== 10) {
      setConnectionState("waiting");
      toast.error("Invalid token entered.");
      return;
    }

    if (normalizedPartnerId === userDetails.userId) {
      setConnectionState("waiting");
      toast.error("You cannot connect to your own token.");
      return;
    }

    setConnectionState("connecting");

    callUser();
  };

  const handleFileUploadBtn = () => {
    if (!currentConnection) {
      toast.error("Connect to a peer before selecting a file.");
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) {
      return;
    }

    if (!currentConnection) {
      toast.error("Connect to a peer before selecting a file.");
      return;
    }

    setfileUpload(files);
    setfileUploadProgress(0);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const files = e.dataTransfer.files;

    if (!files || files.length === 0) {
      return;
    }

    if (!currentConnection) {
      toast.error("Connect to a peer before selecting a file.");
      return;
    }

    setfileUpload(files);
    setfileUploadProgress(0);
  };

  const handleIncomingSave = async () => {
    const transfer = incomingTransfer;

    if (!transfer) {
      return;
    }

    const picker = (
      window as Window & {
        showSaveFilePicker?: (
          options?: unknown
        ) => Promise<{
          createWritable: () => Promise<{
            write: (data: Uint8Array) => Promise<void>;
            close: () => Promise<void>;
            abort?: (reason?: unknown) => Promise<void>;
          }>;
        }>;
      }
    ).showSaveFilePicker;

    if (!picker) {
      toast.error(
        "Your browser does not support direct file saving. Use the latest Chrome or Edge."
      );
      return;
    }

    try {
      const handle = await picker({
        suggestedName: transfer.fileName,
      });

      const writable = await handle.createWritable();

      await receiverRef.current?.prepareTransfer(
        transfer.transferId,
        writable
      );

      setfileReceiving(true);
      toast.success("Save location selected. Transfer starting.");
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Could not prepare the save location.");

      if (
        normalizedError.name !== "AbortError"
      ) {
        toast.error(normalizedError.message);
      }
    }
  };

  const handleWebRTCUpload = async () => {
    const peer = peerRef.current;
    const file = fileUpload?.[0];

    if (!peer) {
      toast.error(
        "No peer connection available."
      );
      return;
    }

    if (!file) {
      toast.error(
        "Please select a file first."
      );
      return;
    }

    if (!peer.connected) {
      toast.error(
        "Peer connection is not ready."
      );
      return;
    }

    const transferId =
      createTransferId();

    const pending =
      createPendingTransfer();

    pendingTransfersRef.current.set(
      transferId,
      pending
    );

    setfileSending(true);
    setfileUploadProgress(0);
    setFileTransferComplete(false);
    setFileTransferDuration(undefined);
    transferStartedAtRef.current = null;

    try {
      await sendFile({
        channel: {
          send: (
            data: string | Uint8Array
          ) => {
            if (!peer.connected) {
              throw new Error(
                "Peer connection is no longer available."
              );
            }

            peer.send(data);
          },
        },

        file,
        transferId,

        waitForReady: async () => {
          await withTimeout(
            pending.readyPromise,
            5 * 60 * 1000,
            "Waiting for receiver save location timed out."
          );

          transferStartedAtRef.current =
            Date.now();
        },

        waitForAck: async (sequence) => {
          if (
            pending.acknowledged.has(
              sequence
            )
          ) {
            pending.acknowledged.delete(
              sequence
            );
            return;
          }

          await withTimeout(
            new Promise<void>(
              (resolve, reject) => {
                pending.ackWaiters.set(
                  sequence,
                  {
                    resolve,
                    reject,
                  }
                );
              }
            ),
            60 * 1000,
            `Timed out waiting for chunk ${sequence} acknowledgement.`
          );
        },

        waitForFinished: async () => {
          await withTimeout(
            pending.finishedPromise,
            120 * 1000,
            "Timed out waiting for receiver confirmation."
          );
        },

        onProgress: (progress) => {
          setfileUploadProgress(
            progress
          );
        },

        onComplete: () => {
          const startedAt =
            transferStartedAtRef.current;

          const duration =
            startedAt === null
              ? 0
              : Date.now() - startedAt;

          setfileUploadProgress(100);
          setfileSending(false);
          setFileTransferComplete(true);
          setFileTransferDuration(
            duration
          );

          toast.success(
            "File sent successfully"
          );
        },

        onError: (error) => {
          setfileSending(false);
          toast.error(
            error.message ||
              "File transfer failed."
          );
        },
      });
    } catch (error) {
      setfileSending(false);

      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      pendingTransfersRef.current.delete(
        transferId
      );
      transferStartedAtRef.current =
        null;
    }
  };

  return (
    <div className="w-full rounded-3xl border border-border/70 bg-card/80 p-5 shadow-xl backdrop-blur-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <UploadCloud size={23} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  File Transfer
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send files directly to your peer
                </p>
              </div>
            </div>
          </div>

          <div
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              currentConnection
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                currentConnection ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            {connectionState === "connected" ? "Connected" : connectionState === "connecting" ? "Connecting" : connectionState === "error" ? "Connection error" : "Waiting"}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Link2 size={16} className="text-blue-500" />
            Connection
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Your token
              </p>
              <div className="flex gap-2">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-border bg-background px-3 text-sm font-medium">
                  {showContent && userId ? userId : "Generating token..."}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(userDetails?.userId)}
                  disabled={!userId}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy token"
                >
                  {isCopied ? (
                    <Check size={16} className="text-emerald-500" />
                  ) : (
                    <Clipboard size={16} />
                  )}
                </button>
                <ShareLink userCode={userId} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Peer token
              </p>
              <div className="flex gap-2">
                <input
                  value={partnerId}
                  onChange={(e) => setpartnerId(e.target.value)}
                  disabled={terminateCall}
                  placeholder="Enter peer token"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleConnectionMaking}
                  disabled={terminateCall || isLoading}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Wifi size={16} />
                  )}
                  {isLoading ? "Connecting" : "Connect"}
                </button>
              </div>
            </div>
          </div>

          {currentConnection ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck size={16} className="shrink-0 text-emerald-500" />
                <span className="truncate text-xs text-emerald-600 dark:text-emerald-400">
                  Peer-to-peer connection established with {partnerId}
                </span>
              </div>

              {terminateCall ? (
                <button
                  type="button"
                  onClick={() => peerRef.current?.destroy()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <Unplug size={13} />
                  Disconnect
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={handleFileUploadBtn}
        className={`group flex min-h-[245px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
          currentConnection
            ? "border-blue-500/30 bg-blue-500/[0.025] hover:border-blue-500/60 hover:bg-blue-500/[0.05]"
            : "cursor-not-allowed border-border bg-muted/10"
        }`}
      >
        <div
          className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform ${
            currentConnection
              ? "bg-blue-500/10 text-blue-500 group-hover:scale-105"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <FileUp size={28} />
        </div>

        <h3 className="text-base font-semibold">Drop files here</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to select files
        </p>

        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole size={13} />
          Files are sent directly to your peer using WebRTC. No cloud storage.
        </div>
      </div>

      {incomingTransfer ? (
        <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Incoming file
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {incomingTransfer.fileName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatFileSize(incomingTransfer.fileSize)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleIncomingSave}
              disabled={incomingTransfer.ready}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {incomingTransfer.ready
                ? "Ready"
                : "Choose save location"}
            </button>
          </div>

          {incomingTransfer.ready ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Receiving
                </span>
                <span className="font-semibold text-blue-500">
                  {fileDownloadProgress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${fileDownloadProgress}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Choose where the received file should be saved.
            </p>
          )}
        </div>
      ) : null}

      {fileUpload ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4"
        >
          <FileUpload
            fileName={fileUpload[0]?.name}
            fileProgress={fileUploadProgress}
            handleClick={handleWebRTCUpload}
            showProgress={fileSending}
            transferComplete={fileTransferComplete}
            transferDuration={fileTransferDuration}
          />
        </div>
      ) : null}

      {downloadFile ? (
        <div className="mt-4">
          <FileDownload
            fileName={fileNameState}
            fileReceivingStatus={fileReceiving}
            fileProgress={fileDownloadProgress}
            fileRawData={downloadFile}
          />
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5">
        <div>
          <p className="text-sm font-semibold">Transfer Progress</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fileSending
              ? "Sending file to peer..."
              : fileReceiving
                ? "Receiving file from peer..."
                : fileUpload
                  ? "File ready to send"
                  : "0 active transfers"}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            fileSending || fileReceiving
              ? "bg-blue-500/10 text-blue-500"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {fileSending || fileReceiving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </div>
      </div>

      {acceptCaller ? (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div>
            <p className="text-sm font-semibold">Incoming connection</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {signalingData?.from} wants to connect with you.
            </p>
          </div>

          <button
            type="button"
            onClick={acceptUser}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-600"
          >
            <Wifi size={15} />
            Accept
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ShareCard;
