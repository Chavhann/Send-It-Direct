import React from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { truncateString } from "./f";

type fileUploadProps = {
  fileName: string;
  fileProgress: number;
  handleClick: any;
  showProgress: boolean;
};

const FileUpload = ({
  fileName,
  fileProgress,
  handleClick,
  showProgress,
}: fileUploadProps) => {
  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="min-w-0 flex-1 truncate font-medium text-sm">
          {truncateString(fileName)}
        </div>
        <div className="flex">
          <Button
            type="button"
            
            className="h-9 shrink-0 rounded-xl px-3 transition-all hover:-translate-y-0.5"
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
