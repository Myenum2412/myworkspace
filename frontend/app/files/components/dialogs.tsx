"use client";

import { useState, useEffect } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { useFileMutations, useFolderTree } from "@/hooks/file-system/use-file-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderPlusIcon,
  FolderInputIcon,
  CopyIcon,
  FolderIcon,
  ChevronRightIcon,
} from "lucide-react";

export function CreateFolderDialog() {
  const { isCreatingFolder, setIsCreatingFolder, currentFolderId, orgId } = useFileSystemStore();
  const { createFolderMutation } = useFileMutations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => { if (!isCreatingFolder) { setName(""); setDescription(""); } }, [isCreatingFolder]);

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await createFolderMutation.mutateAsync({
        name: name.trim(),
        parentId: currentFolderId,
      });
      setIsCreatingFolder(false);
    } catch (e) { console.error(e); }
  }

  return (
    <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlusIcon className="size-4" /> Create Folder
          </DialogTitle>
          <DialogDescription>Enter a name for the new folder</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Folder Name</Label>
            <Input
              placeholder="e.g., Documents, Reports, Projects"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description (optional)</Label>
            <Input
              placeholder="Brief description of this folder"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createFolderMutation.isPending}>
            {createFolderMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenameDialog() {
  const { renameTarget, setRenameTarget } = useFileSystemStore();
  const { renameFileMutation, renameFolderMutation } = useFileMutations();
  const [name, setName] = useState("");

  useEffect(() => {
    if (renameTarget) setName(renameTarget.name);
  }, [renameTarget]);

  async function handleRename() {
    if (!renameTarget || !name.trim()) return;
    try {
      if (renameTarget.type === "file") {
        await renameFileMutation.mutateAsync({ id: renameTarget.id, name: name.trim() });
      } else {
        await renameFolderMutation.mutateAsync({ id: renameTarget.id, name: name.trim() });
      }
      setRenameTarget(null);
    } catch (e) { console.error(e); }
  }

  return (
    <Dialog open={!!renameTarget} onOpenChange={(o) => { if (!o) setRenameTarget(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>
            {renameTarget?.type === "file" ? "Rename this file" : "Rename this folder"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-xs text-muted-foreground">New Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
          <Button onClick={handleRename} disabled={!name.trim()}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoveDialog() {
  const { moveTarget, setMoveTarget, orgId } = useFileSystemStore();
  const { moveFileMutation, moveFolderMutation } = useFileMutations();
  const { data: tree } = useFolderTree();
  const [targetFolderId, setTargetFolderId] = useState<string>("root");

  function renderTree(nodes: typeof tree, depth = 0): React.ReactNode[] {
    if (!nodes) return [];
    return nodes.flatMap((node) => [
      <SelectItem key={node.id} value={node.id}>
        {"\u00A0".repeat(depth * 2)}{node.name}
      </SelectItem>,
      ...(node.children ? renderTree(node.children, depth + 1) : []),
    ]);
  }

  async function handleMove() {
    if (!moveTarget) return;
    try {
      const targetId = targetFolderId === "root" ? null : targetFolderId;
      if (moveTarget.type === "file") {
        await moveFileMutation.mutateAsync({ ids: [moveTarget.id], targetFolderId: targetId || "" });
      } else {
        await moveFolderMutation.mutateAsync({ id: moveTarget.id, parentId: targetId });
      }
      setMoveTarget(null);
    } catch (e) { console.error(e); }
  }

  return (
    <Dialog open={!!moveTarget} onOpenChange={(o) => { if (!o) setMoveTarget(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInputIcon className="size-4" /> Move to Folder
          </DialogTitle>
          <DialogDescription>Select a destination folder</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Select value={targetFolderId} onValueChange={setTargetFolderId}>
            <SelectTrigger>
              <SelectValue placeholder="Select folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">
                <FolderIcon className="size-3.5 inline mr-2" /> Root
              </SelectItem>
              {renderTree(tree)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMoveTarget(null)}>Cancel</Button>
          <Button onClick={handleMove}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
