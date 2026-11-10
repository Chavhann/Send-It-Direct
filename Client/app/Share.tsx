"use client";

import React from "react";
import ShareCard from "./ShareCard";
import Chat from "./Chat";
import { SiteFooter } from "./Footer";
import { ShieldCheck, Wifi } from "lucide-react";

const Share = () => {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-xs font-semibold text-blue-500">
                <Wifi size={13} />
                Peer workspace
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Peer{" "}
                <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Workspace
                </span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Direct, secure file sharing with real-time chat.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <ShieldCheck size={19} className="text-emerald-500" />
              </div>

              <div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Peer connection ready
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Connect a peer to start sharing
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="min-w-0">
            <ShareCard />
          </section>

          <aside className="min-w-0">
            <Chat />
          </aside>
        </div>

        <section className="mt-6 rounded-2xl border border-border/60 bg-card/50 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">
                Direct connection architecture
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Signaling coordinates the connection. File data and chat
                messages travel through the established WebRTC peer connection.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              WebRTC
              <span className="text-border">•</span>
              No cloud storage
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
};

export default Share;
