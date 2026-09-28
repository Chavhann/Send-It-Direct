import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { File } from "lucide-react";

type fileUploadBtn = {
  inputRef: any;
  handleFileChange: any;
  uploadBtn: any;
};
const FileUploadBtn = ({
  inputRef,
  handleFileChange,
  uploadBtn,
}: fileUploadBtn) => {
  return (
    <>
      <Input
        type="file"
        style={{ display: "none" }}
        ref={inputRef}
        onChange={(e) => handleFileChange(e)}
      />
      <Button
        type="button"
        onClick={uploadBtn}
        className="h-10 w-full gap-x-2 rounded-xl px-4 transition-all hover:-translate-y-0.5 sm:w-auto"
      >
        <File size={15} />
        Select File
      </Button>
    </>
  );
};

export default FileUploadBtn;
