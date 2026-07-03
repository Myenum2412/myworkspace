"use client";

import { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  PencilIcon, InfoIcon, Trash2Icon, FileTextIcon, DownloadIcon,
  CopyIcon, Share2Icon, LockIcon, UnlockIcon,
} from "lucide-react";

interface BaseProps {
  onRename?: () => void;
  onDelete?: () => void;
}

interface FileMenuProps extends BaseProps {
  type: "file";
  isLocked?: boolean;
  onPreview?: () => void;
  onDownload?: () => void;
  onDuplicate?: () => void;
  onShare?: () => void;
  onToggleLock?: () => void;
}

interface FolderMenuProps extends BaseProps {
  type: "folder";
  onProperties?: () => void;
}

type FileContextMenuProps = FileMenuProps | FolderMenuProps;

export function FileContextMenu(props: FileContextMenuProps) {
  if (props.type === "file") {
    return (
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onPreview?.(); }}>
          <FileTextIcon className="mr-2 size-4" /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onDownload?.(); }}>
          <DownloadIcon className="mr-2 size-4" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onRename?.(); }}>
          <PencilIcon className="mr-2 size-4" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onDuplicate?.(); }}>
          <CopyIcon className="mr-2 size-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onShare?.(); }}>
          <Share2Icon className="mr-2 size-4" /> Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onToggleLock?.(); }}>
          {props.isLocked ? <><UnlockIcon className="mr-2 size-4" /> Unlock</> : <><LockIcon className="mr-2 size-4" /> Lock</>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onDelete?.(); }} className="text-destructive">
          <Trash2Icon className="mr-2 size-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  }

  return (
    <DropdownMenuContent align="end" className="w-36">
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onRename?.(); }}>
        <PencilIcon className="mr-2 size-4" /> Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onProperties?.(); }}>
        <InfoIcon className="mr-2 size-4" /> Properties
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); props.onDelete?.(); }} className="text-destructive">
        <Trash2Icon className="mr-2 size-4" /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
