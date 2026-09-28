"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, SendHorizonal, Wifi } from "lucide-react";
import { useSocket } from "./SP";

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const Socket = useSocket();

  const isConnected = Boolean(Socket.peerState);

  const handleSendMessage = () => {
    const text = newMessage.trim();

    if (!text) {
      return;
    }

    if (!Socket.peerState) {
      return;
    }

    const newMessages = [
      ...messages,
      {
        text,
        sender: "me",
      },
    ];

    setMessages(newMessages);
    setNewMessage("");

    const messageData = {
      type: "messages",
      text,
      sender: "other",
    };

    Socket.peerState.send(JSON.stringify(messageData));
  };

  useEffect(() => {
    const peer = Socket.peerState;

    if (!peer) {
      return;
    }

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

        const receivedMessage = JSON.parse(payload);

        if (
          receivedMessage?.type === "messages" &&
          receivedMessage?.text
        ) {
          setMessages((prevMessages) => [
            ...prevMessages,
            receivedMessage,
          ]);
        }
      } catch {
        // File-transfer messages are handled by ShareCard.
      }
    };

    peer.on("data", handlePeerData);

    return () => {
      peer.removeListener?.("data", handlePeerData);
    };
  }, [Socket.peerState]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.key === "k" &&
        (e.metaKey || e.ctrlKey) &&
        inputRef.current
      ) {
        e.preventDefault();
        inputRef.current.focus();
      }

      if (
        e.key === "Enter" &&
        document.activeElement === inputRef.current
      ) {
        e.preventDefault();
        btnRef.current?.click();
      }
    };

    document.addEventListener("keydown", down);

    return () => {
      document.removeEventListener("keydown", down);
    };
  }, []);

  return (
    <div className="flex min-h-[560px] w-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-xl backdrop-blur-sm">
      <div className="border-b border-border/60 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
              <MessageCircle size={22} />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Live Chat
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time messaging with your peer
              </p>
            </div>
          </div>

          <div
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isConnected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? "bg-emerald-500"
                  : "bg-muted-foreground"
              }`}
            />
            {isConnected ? "Connected" : "Waiting"}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-muted/10">
          {messages.length > 0 ? (
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.text}-${index}`}
                  className={`flex ${
                    message.sender === "me"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-5 shadow-sm ${
                      message.sender === "me"
                        ? "rounded-br-md bg-blue-500 text-white"
                        : "rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                  isConnected
                    ? "bg-violet-500/10 text-violet-500"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <MessageCircle size={25} />
              </div>

              <p className="text-sm font-semibold">
                {isConnected
                  ? "Start a conversation"
                  : "Waiting for a peer"}
              </p>

              <p className="mt-2 max-w-[260px] text-xs leading-5 text-muted-foreground">
                {isConnected
                  ? "Messages are sent directly through your WebRTC connection."
                  : "Connect to a peer to start real-time messaging."}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={!isConnected}
              placeholder={
                isConnected
                  ? "Write a message..."
                  : "Connect to a peer first..."
              }
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              ref={btnRef}
              type="button"
              onClick={handleSendMessage}
              disabled={!isConnected || !newMessage.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              aria-label="Send message"
            >
              <SendHorizonal size={17} />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Wifi size={12} />
              <span>
                {isConnected
                  ? "Peer-to-peer connection active"
                  : "No peer connection"}
              </span>
            </div>

            <span>Ctrl + K to focus</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
