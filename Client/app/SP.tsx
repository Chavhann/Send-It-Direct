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

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

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
      throw new Error("NEXT_PUBLIC_SOCKET_SERVER_URL is not configured");
    }

    return io(serverUrl, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }, []);

  const [peerState, setpeerState] = useState<any>();
  const [socketId, setSocketId] = useState<string>();
  const userId = useMemo(() => nanoid(10), []);

  useEffect(() => {
    const handleConnect = () => {
      setSocketId(socket.id);
      socket.emit("details", {
        uniqueId: userId,
      });
    };

    const handleDisconnect = () => {
      setSocketId(undefined);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
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
