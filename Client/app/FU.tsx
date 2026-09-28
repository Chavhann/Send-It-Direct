import React from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { truncateString } from "./f";

function formatTransferDuration(milliseconds: number): string {
  const totalSeconds = milliseconds / 1000;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  return `${minutes}m ${seconds}s`;
}

type fileUploadProps = {
  fileName: string;
  fileProgress: number;
  handleClick: any;
  showProgress: boolean;
  transferComplete?: boolean;
  transferDuration?: number;
};

const FileUpload = ({
  fileName,
  fileProgress,
  handleClick,
  showProgress,
  transferComplete = false,
  transferDuration,
}: fileUploadProps) => {
  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 truncate font-medium text-sm">
          {truncateString(fileName)}
        </div>

        {transferComplete ? (
          <div className="flex shrink-0 items-center gap-2 text-sm text-emerald-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 font-semibold text-white">
              ✓
            </span>
            <span>
              Sent
              {transferDuration !== undefined
                ? ` · ${formatTransferDuration(transferDuration)}`
                : ""}
            </span>
          </div>
        ) : null}

        <div className="flex shrink-0">
          <Button
            type="button"
            className="h-9 rounded-xl px-3 transition-all hover:-translate-y-0.5"
            onClick={() => {
              handleClick();
            }}
          >
            <Upload size={15} />
          </Button>
        </div>
      </div>

      {showProgress ? (
        <div>
          <Progress value={fileProgress} className="h-1.5" />
        </div>
      ) : null}
    </div>
  );
};

export default FileUpload;