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
import { FileReceiver } from "../transfer/receiver";
import { createTransferId, parseTransferMessage } from "../transfer/protocol";

const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

if (!turnUrl || !turnUsername || !turnCredential) {
  throw new Error("WebRTC TURN configuration is not configured.");
}

const iceServers = [
  {
    urls: turnUrl,
    username: turnUsername,
    credential: turnCredential,
  },
];

const ShareCard = () => {
  const userDetails = useSocket();

  const [partnerId, setpartnerId] = useState("");
  const [isLoading, setisLoading] = useState(false);
  const [isCopied, setisCopied] = useState(false);
  const [currentConnection, setcurrentConnection] = useState(false);

  const peerRef = useRef<any>();
  const receiverRef = useRef<FileReceiver>();

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
          peer.write(message);
        },
      },
      {
        onStart: (transfer) => {
          setfileReceiving(true);
          setfileDownloadProgress(0);
          setfileNameState(transfer.fileName);
          setdownloadFile(undefined);
        },

        onProgress: (_transferId, progress) => {
          setfileReceiving(true);
          setfileDownloadProgress(progress);
        },

        onComplete: (_transferId, file) => {
          setdownloadFile(file);
          setfileDownloadProgress(100);
          setfileReceiving(false);
          toast.success("File received successfully");
        },

        onCancel: (_transferId, reason) => {
          setfileReceiving(false);

          if (reason) {
            toast.error(reason);
          }
        },

        onError: (error) => {
          setfileReceiving(false);
          toast.error(error.message || "File transfer failed.");
        },
      }
    );
  };

  const resetConnectionState = () => {
    setpartnerId("");
    setcurrentConnection(false);
    setfileUpload(undefined);
    setfileSending(false);
    setfileReceiving(false);
    setfileUploadProgress(0);
    setfileDownloadProgress(0);
    setterminateCall(false);

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
        setisLoading(false);
        return;
      }

      peer.signal(data.signalData);

      setisLoading(false);
      setcurrentConnection(true);
      setterminateCall(true);

      toast.success(`Successful connection with ${partnerId}`);

      userDetails.setpeerState(peer);
    };

    const handleSignalError = (message: string) => {
      setisLoading(false);
      toast.error(message || "Signaling failed.");
    };

    const handleServerError = (message: string) => {
      setisLoading(false);
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
  }, [searchParams, userDetails.socket, userDetails.setpeerState, partnerId]);

  const handlePeerData = (data: any) => {
    try {
      let payload: string;

      if (typeof data === "string") {
        payload = data;
      } else if (data instanceof Uint8Array) {
        payload = new TextDecoder().decode(data);
      } else if (data instanceof ArrayBuffer) {
        payload = new TextDecoder().decode(new Uint8Array(data));
      } else {
        payload = String(data);
      }

      const rawMessage = JSON.parse(payload);

      if (rawMessage?.type === "messages") {
        return;
      }

      const transferTypes = new Set([
        "transfer-start",
        "transfer-chunk",
        "transfer-ack",
        "transfer-complete",
        "transfer-cancel",
        "transfer-error",
      ]);

      if (!transferTypes.has(rawMessage?.type)) {
        console.warn(
          "[WebRTC] Ignoring unknown data message:",
          rawMessage
        );
        return;
      }

      const message = parseTransferMessage(payload);

      console.log("[WebRTC] Transfer message:", message.type);

      receiverRef.current?.handleMessage(message);
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Invalid transfer message.");

      console.error("[WebRTC] Transfer data error:", normalizedError);

      toast.error(normalizedError.message);
    }
  };

  const registerPeerLifecycle = (peer: any) => {
    peer.on("data", handlePeerData);

    peer.on("close", () => {
      resetConnectionState();
    });

    peer.on("error", (err: any) => {
      console.error("WebRTC peer error:", err);

      setisLoading(false);
      setcurrentConnection(false);
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
      setcurrentConnection(true);
      setterminateCall(true);
      setisLoading(false);
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
      setcurrentConnection(true);
      setacceptCaller(false);
      setterminateCall(true);
      setisLoading(false);

      userDetails.setpeerState(peer);

      toast.success(`Successful connection with ${partnerId}`);
    });

    peer.signal(signalingData.signalData);
  };

  const handleConnectionMaking = () => {
    const normalizedPartnerId = partnerId.trim();

    setpartnerId(normalizedPartnerId);

    if (!normalizedPartnerId || normalizedPartnerId.length !== 10) {
      setisLoading(false);
      toast.error("Invalid token entered.");
      return;
    }

    if (normalizedPartnerId === userDetails.userId) {
      setisLoading(false);
      toast.error("You cannot connect to your own token.");
      return;
    }

    setisLoading(true);

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

  const handleWebRTCUpload = async () => {
    const peer = peerRef.current;
    const file = fileUpload?.[0];

    if (!peer) {
      toast.error("No peer connection available.");
      return;
    }

    if (!file) {
      toast.error("Please select a file first.");
      return;
    }

    if (!peer.connected) {
      toast.error("Peer connection is not ready.");
      return;
    }

    const transferId = createTransferId();

    setfileSending(true);
    setfileUploadProgress(0);

    try {
      await sendFile({
        channel: {
          send: (message: string) => {
            peer.write(message);
          },
        },
        file,
        transferId,

        onProgress: (progress) => {
          setfileUploadProgress(progress);
        },

        onComplete: () => {
          setfileUploadProgress(100);
          setfileSending(false);
          toast.success("File sent successfully");
        },

        onError: (error) => {
          setfileSending(false);
          toast.error(error.message || "File transfer failed.");
        },
      });
    } catch {
      setfileSending(false);
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
            {currentConnection ? "Connected" : "Waiting"}
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
