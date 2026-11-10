"use client";

import { nanoid } from "nanoid";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";

type SocketContextValue = {
  socket: Socket;
  userId: string;
  socketId: string | undefined;
  peerState: any;
  setpeerState: React.Dispatch<React.SetStateAction<any>>;
};

const SocketContext = createContext<SocketContextValue | undefined>(
  undefined
);

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside the SP provider");
  }

  return context;
};

export const SP = ({ children }: { children: React.ReactNode }) => {
  const socket = useMemo(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;

    if (!serverUrl) {
      throw new Error(
        "NEXT_PUBLIC_SOCKET_SERVER_URL is not configured"
      );
    }

    return io(serverUrl, {
      autoConnect: false,
      transports: ["polling", "websocket"],
      upgrade: true,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }, []);

  const [peerState, setpeerState] = useState<any>();
  const [socketId, setSocketId] = useState<string>();
  const userId = useMemo(() => nanoid(10), []);

  useEffect(() => {
    const handleConnect = () => {
      console.log("[Socket] Connected:", socket.id);

      setSocketId(socket.id);

      socket.emit("details", {
        uniqueId: userId,
      });

      console.log("[Socket] Registration sent:", userId);
    };

    const handleRegistered = (data: {
      uniqueId: string;
    }) => {
      console.log(
        "[Socket] Registered successfully:",
        data.uniqueId
      );
    };

    const handleConnectError = (error: Error) => {
      console.error(
        "[Socket] Connection error:",
        error.message
      );
    };

    const handleDisconnect = (reason: string) => {
      console.warn(
        "[Socket] Disconnected:",
        reason
      );

      setSocketId(undefined);
    };

    const handleServerError = (message: string) => {
      console.error(
        "[Socket] Server error:",
        message
      );
    };

    socket.on("connect", handleConnect);
    socket.on("registered", handleRegistered);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("server-error", handleServerError);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("registered", handleRegistered);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("server-error", handleServerError);

      socket.disconnect();
    };
  }, [socket, userId]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        userId,
        socketId,
        peerState,
        setpeerState,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
