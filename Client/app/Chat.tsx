import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizonal } from "lucide-react";
import { useSocket } from "./SP";

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState<any>("");
  const inputRef = useRef<any>();
  const btnRef = useRef<any>();
  const Socket = useSocket();

  const handleSendMessage = () => {
    if (newMessage.trim() !== "") {
      const newMessages = [...messages, { text: newMessage, sender: "me" }];
      setMessages(newMessages);
      setNewMessage("");

      const peer = Socket.peerState;
      if (peer) {
        const messageData = {
          type: "messages",
          text: newMessage,
          sender: "other",
        };
        peer.send(JSON.stringify(messageData));
      }
    }
  };

  useEffect(() => {
    const peer = Socket.peerState;

    if (peer) {
      peer.on("data", (data: any) => {
        const receivedMessage = JSON.parse(data);
        if (receivedMessage.text) {
          setMessages((prevMessages) => [...prevMessages, receivedMessage]);
        }
      });
    }
  }, [Socket.peerState]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current.focus();
      } else if (e.key === "Enter") {
        btnRef.current.click();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      {Socket.peerState ? (
        <div className="flex w-full justify-center">
          <div className="flex min-h-[460px] w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-3 shadow-xl backdrop-blur-sm sm:min-w-[400px]">
            {}
            <div className="flex-1 w-full overflow-y-auto rounded-xl border border-border/50 bg-muted/10 p-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.sender === "me" ? "justify-end" : "justify-start"
                  } mb-[2px]`}
                >
                  <div
                    className={`flex max-w-[85%] flex-wrap rounded-2xl px-3.5 py-2 text-sm leading-5 shadow-sm sm:max-w-[75%] ${
                      message.sender === "me"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-700  text-white"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            {}
            <div className="mt-3 flex w-full items-center gap-2 border-t border-border/60 pt-3">
              <div className="flex min-w-0 flex-1">
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  ref={inputRef}
                  placeholder="Write a message..."
                />
              </div>
              <div className="">
                <Button
                  className="p-3"
                  onClick={handleSendMessage}
                  ref={btnRef}
                >
                  <SendHorizonal size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Chat;
