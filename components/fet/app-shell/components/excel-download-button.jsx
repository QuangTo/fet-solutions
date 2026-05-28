"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExcelDownloadButton({ className, disabled, onDownload }) {
  const [isDownloading, setIsDownloading] = useState(false);

  return (
    <Button
      className={cn("h-9 w-full px-3", className)}
      disabled={disabled || isDownloading}
      onClick={() => {
        setIsDownloading(true);
        onDownload?.();
        window.setTimeout(() => setIsDownloading(false), 450);
      }}
      type="button"
    >
      {isDownloading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Tải Excel
    </Button>
  );
}
