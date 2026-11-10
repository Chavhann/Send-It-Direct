"use client";

import React from "react";
import Link from "next/link";
import { FolderOpen, Home, Wifi } from "lucide-react";
import ThemeButton from "./ThemeButton";
import { useSocket } from "./SP";

const Navbar = () => {
  const { socketId } = useSocket();
  const isConnected = Boolean(socketId);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
              <FolderOpen size={20} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight sm:text-lg">
                SEND IT DIRECT
              </p>
              <p className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
                Peer-to-peer sharing
              </p>
            </div>
          </Link>

          <div className="hidden h-7 w-px bg-border sm:block" />

          <div
            className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:flex ${
              isConnected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-muted/30 text-muted-foreground"
            }`}
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
            <ThemeButton />

            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Home size={15} />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/40 sm:hidden">
            <Wifi
              size={15}
              className={isConnected ? "text-emerald-500" : "text-muted-foreground"}
            />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;