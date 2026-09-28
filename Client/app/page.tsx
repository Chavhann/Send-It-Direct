"use client";

import Link from "next/link";
import { ArrowRight, Github, LockKeyhole, Radio, Zap } from "lucide-react";
import { SiteFooter } from "./Footer";
import { BackgroundBeams } from "@/components/ui/bgBeams";

const capabilities = [
  {
    icon: Radio,
    title: "Peer to Peer",
    description:
      "Files move directly between connected peers using WebRTC instead of a traditional file-storage backend.",
  },
  {
    icon: LockKeyhole,
    title: "No Cloud Storage",
    description:
      "Your shared files are transferred directly between devices without being uploaded to a central storage service.",
  },
  {
    icon: Zap,
    title: "Real-Time Transfer",
    description:
      "Connect with a peer and transfer files while tracking the progress of the active transfer.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      <BackgroundBeams className="hidden md:block" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-5 pb-12 pt-12 sm:px-8 lg:px-10 lg:pt-20">
        <section className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Direct peer-to-peer sharing
          </div>

          <h1 className="text-balance text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Send files.
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Directly.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
            Send It Direct lets you connect two devices and transfer files
            peer-to-peer using WebRTC, with no cloud storage in the middle.
          </p>

          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/share"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-background shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
            >
              Start sharing
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="https://github.com/Chavhann/Send-It-Direct"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-6 text-sm font-semibold backdrop-blur transition-colors hover:bg-muted sm:w-auto"
            >
              <Github size={17} />
              View on GitHub
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => {
            const Icon = capability.icon;

            return (
              <article
                key={capability.title}
                className="rounded-2xl border border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/50">
                  <Icon size={20} />
                </div>

                <h2 className="text-lg font-bold">{capability.title}</h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {capability.description}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mx-auto mt-16 max-w-3xl text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Connect a peer, choose a file, and let the direct connection do
            the work.
          </p>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
