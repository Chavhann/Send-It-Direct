"use client";

import React from "react";
import ShareCard from "./ShareCard";
import Chat from "./Chat";
import { ShootingStars } from "@/components/ui/shootingStars";
import { StarsBackground } from "@/components/ui/starsBg";

const Share = () => {
  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      <ShootingStars />
      <StarsBackground />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Secure peer workspace
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Send It Direct
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Connect with a peer, transfer files directly, and communicate in
            real time from one workspace.
          </p>
        </header>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
          <section className="min-w-0">
            <ShareCard />
          </section>

          <aside className="min-w-0">
            <Chat />
          </aside>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Your connection is coordinated through the signaling server while
          peer data is transferred through the established WebRTC connection.
        </div>
      </div>
    </main>
  );
};

export default Share;