import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { saveAs } from "file-saver";
import { Progress } from "@/components/ui/progress";
import { truncateString } from "./f";

type fileDownloadProps = {
  fileReceivingStatus: boolean;
  fileName: string;
  fileProgress: number;
  fileRawData: any;
};

const FileDownload = ({
  fileName,
  fileProgress,
  fileReceivingStatus,
  fileRawData,
}: fileDownloadProps) => {
  const handleFileDownload = (fileRawData: any, tempFile: any) => {
    const blob = fileRawData;
    saveAs(blob, tempFile);
  };
  return (
    <>
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm">
        <div>
          <Label className="text-base font-semibold tracking-tight">Download</Label>
        </div>
        <div className="flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-3 text-sm">
          <div className="flex justify-between items-center">
            <div className="flex">
              {fileReceivingStatus ? "Receiving..." : truncateString(fileName)}
            </div>
            <div className="flex">
              <Button
                type="button"
                // variant="outline"
                className="h-9 shrink-0 rounded-xl px-3 transition-all hover:-translate-y-0.5"
                onClick={() => handleFileDownload(fileRawData, fileName)}
              >
                <Download size={15} />
              </Button>
            </div>
          </div>

          {fileReceivingStatus ? (
            <div>
              <Progress value={fileProgress} className="h-1.5" />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default FileDownload;
