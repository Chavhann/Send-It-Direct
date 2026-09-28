"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, CopyIcon } from "lucide-react";
import { useSocket } from "./SP";
import toast from "react-hot-toast";
import { TailSpin } from "react-loader-spinner";
import Peer from "simple-peer";
import FileUpload from "./FU";
import FileUploadBtn from "./FUButton";
import FileDownload from "./FD";
import ShareLink from "./ShareLink";
import { useSearchParams } from "next/navigation";
import { Dots_v3 } from "@/components/ui/dots";
import { EyeCatchingButton_v1 } from "@/components/ui/shimmerButton";

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
  const fileInputRef = useRef<any>();

  const [downloadFile, setdownloadFile] = useState<any>();
  const [fileUploadProgress, setfileUploadProgress] =
    useState<number>(0);
  const [fileDownloadProgress, setfileDownloadProgress] =
    useState<number>(0);

  const [fileNameState, setfileNameState] = useState<any>();
  const [fileSending, setfileSending] = useState(false);
  const [fileReceiving, setfileReceiving] = useState(false);

  const searchParams = useSearchParams();

  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setuserId(userDetails.userId);
  }, [userDetails.userId]);

  function CopyToClipboard(value: any) {
    setisCopied(true);
    toast.success("Copied");

    navigator.clipboard.writeText(value);

    setTimeout(() => {
      setisCopied(false);
    }, 3000);
  }

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
  }, [searchParams, userDetails.socket, userDetails.setpeerState]);

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

      // Chat messages are handled by Chat.tsx.
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

      console.log(
        "[WebRTC] Transfer message:",
        message.type
      );

      receiverRef.current?.handleMessage(message);
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Invalid transfer message.");

      console.error(
        "[WebRTC] Transfer data error:",
        normalizedError
      );

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
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: any) => {
    const files = e.target.files;

    if (!files || files.length === 0) {
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
    <>
      <Card className="sm:max-w-[450px] max-w-[95%] z-10">
        <CardHeader>
          <CardTitle>Send It Direct</CardTitle>
          <CardDescription>
            Connect to the same network for P2P to work.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-1">
          <form>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col gap-y-1">
                <Label htmlFor="name">My Token</Label>

                <div className="flex flex-row justify-left items-center space-x-2">
                  <div className="flex border rounded-md px-3 py-2 text-sm h-10 w-full bg-muted">
                    {showContent ? (
                      userId ? (
                        userId
                      ) : (
                        <Dots_v3 />
                      )
                    ) : (
                      <Dots_v3 />
                    )}
                  </div>

                  <Button
                    type="button"
                    className="p-4"
                    onClick={() => CopyToClipboard(userDetails?.userId)}
                    disabled={userId ? false : true}
                  >
                    {isCopied ? (
                      <Check size={15} color="green" />
                    ) : (
                      <CopyIcon size={15} />
                    )}
                  </Button>

                  <ShareLink userCode={userId} />
                </div>
              </div>

              <div className="flex flex-col gap-y-1">
                <Label htmlFor="name">Peer's Token</Label>

                <div className="flex flex-row justify-left items-center space-x-2">
                  <Input
                    id="name"
                    placeholder="Input Peer's Token"
                    onChange={(e) => setpartnerId(e.target.value)}
                    disabled={terminateCall}
                    value={partnerId}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center justify-center p-4 w-[160px]"
                    onClick={handleConnectionMaking}
                    disabled={terminateCall}
                  >
                    {isLoading ? (
                      <>
                        <div className="scale-0 hidden dark:flex dark:scale-100">
                          <TailSpin
                            color="white"
                            height={18}
                            width={18}
                          />
                        </div>

                        <div className="scale-100 flex dark:scale-0 dark:hidden">
                          <TailSpin
                            color="black"
                            height={18}
                            width={18}
                          />
                        </div>
                      </>
                    ) : (
                      <p>Connect</p>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-y-1">
                <Label htmlFor="name">Connection Status</Label>

                <div className="flex flex-row justify-left items-center space-x-2">
                  <div className="border rounded-lg px-3 py-2 text-sm h-10 w-full ease-in-out duration-500 transition-all select-none">
                    {currentConnection
                      ? `Connected to ${partnerId}`
                      : "No connection"}
                  </div>

                  {terminateCall ? (
                    <Button
                      variant="destructive"
                      type="button"
                      onClick={() => {
                        peerRef.current?.destroy();
                      }}
                    >
                      Terminate
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col border rounded-lg px-3 py-2 text-sm w-full ease-in-out duration-500 transition-all gap-y-2">
                <div>
                  <Label className="font-semibold text-[16px]">
                    Upload a file
                  </Label>
                </div>

                <div>
                  <FileUploadBtn
                    inputRef={fileInputRef}
                    uploadBtn={handleFileUploadBtn}
                    handleFileChange={handleFileChange}
                  />
                </div>

                {fileUpload ? (
                  <FileUpload
                    fileName={fileUpload[0]?.name}
                    fileProgress={fileUploadProgress}
                    handleClick={handleWebRTCUpload}
                    showProgress={fileSending}
                  />
                ) : null}
              </div>

              {downloadFile ? (
                <FileDownload
                  fileName={fileNameState}
                  fileReceivingStatus={fileReceiving}
                  fileProgress={fileDownloadProgress}
                  fileRawData={downloadFile}
                />
              ) : null}
            </div>
          </form>
        </CardContent>

        {acceptCaller ? (
          <CardFooter className="flex justify-center">
            <div>
              <EyeCatchingButton_v1 onClick={acceptUser}>
                Click here to connect to {signalingData.from}
              </EyeCatchingButton_v1>
            </div>
          </CardFooter>
        ) : null}
      </Card>
    </>
  );
};

export default ShareCard;
