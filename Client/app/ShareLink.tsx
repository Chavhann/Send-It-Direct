"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link2, Share } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";

const ShareLink = ({ userCode }: { userCode: string }) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  const shareUrl = `${appUrl}/share?code=${userCode}`;
  const { theme } = useTheme();

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied");
    } catch {
      toast.error("Could not copy the share link");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-3"
          disabled={!userCode}
          aria-label="Share connection link"
        >
          <Share size={17} />
          <span className="ml-2 hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Share your connection</DialogTitle>
          <DialogDescription>
            Let another device connect to you using this link or QR code.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col items-center gap-5">
          <div className="rounded-2xl border border-border bg-muted/30 p-4 shadow-sm">
            <div className="rounded-xl bg-background p-3">
              <QRCodeSVG
                value={shareUrl}
                size={176}
                bgColor={theme === "dark" ? "#000000" : "#ffffff"}
                fgColor={theme === "dark" ? "#ffffff" : "#000000"}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="w-full">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Shareable link
            </p>

            <div className="flex gap-2">
              <Input
                id="share-link"
                value={shareUrl}
                readOnly
                className="h-11 min-w-0"
              />

              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 px-3"
                onClick={handleCopyClick}
                aria-label="Copy share link"
              >
                <Link2 size={17} />
                <span className="ml-2 hidden sm:inline">Copy</span>
              </Button>
            </div>
          </div>

          <p className="text-center text-xs leading-5 text-muted-foreground">
            The link opens the Send It Direct sharing workspace with your
            connection token pre-filled.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLink;