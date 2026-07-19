"use client";

import { useState } from "react";
import {
  DownloadIcon,
  FileTextIcon,
  TableIcon,
  PresentationIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFileExtension } from "@/lib/file-system/types";

interface OfficeViewerProps {
  src: string;
  fileName: string;
  mimeType: string;
}

export function OfficeViewer({ src, fileName, mimeType }: OfficeViewerProps) {
  const ext = getFileExtension(fileName);
  const isWord = /doc|dot/i.test(ext);
  const isExcel = /xls|csv/i.test(ext);
  const isPowerPoint = /ppt/i.test(ext);

  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
    typeof window !== "undefined" ? `${window.location.origin}${src}` : src,
  )}&embedded=true`;

  const [useGoogleViewer, setUseGoogleViewer] = useState(true);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0 gap-1">
        <div className="flex items-center gap-2">
          {isWord && <FileTextIcon className="size-4 text-blue-500" />}
          {isExcel && <TableIcon className="size-4 text-green-500" />}
          {isPowerPoint && <PresentationIcon className="size-4 text-orange-500" />}
          <span className="text-xs font-medium text-muted-foreground uppercase">{ext}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setUseGoogleViewer(!useGoogleViewer)}>
            <ExternalLinkIcon className="size-3 mr-1" />
            {useGoogleViewer ? "Raw" : "Google Docs"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(src, "_blank")}>
            <DownloadIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-muted/5">
        {useGoogleViewer ? (
          <iframe
            src={googleViewerUrl}
            className="w-full h-full border-0"
            title={fileName}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <iframe
            src={src}
            className="w-full h-full border-0"
            title={fileName}
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>

      <div className="px-4 py-2 border-t shrink-0 flex items-center justify-between bg-muted/10">
        <span className="text-xs text-muted-foreground">
          {isWord && "Word Document"} {isExcel && "Spreadsheet"} {isPowerPoint && "Presentation"}
          {" "}&mdash; Read-only preview
        </span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(src, "_blank")}>
          <DownloadIcon className="size-3 mr-1" /> Download
        </Button>
      </div>
    </div>
  );
}
