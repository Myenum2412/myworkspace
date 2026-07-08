"use client"
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  FileIcon,
  FolderIcon,
  ImageIcon,
  FileTextIcon,
  ArchiveIcon,
  DownloadIcon,
  Trash2Icon,
  UploadIcon,
  SearchIcon,
  Building2Icon,
  ChevronLeftIcon,
  UserIcon,
  BarChart3Icon,
  FilesIcon,
  FolderOpenIcon,
} from "lucide-react";

type FileCategory = "profile" | "report" | "general";

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string;
  uploaderEmail: string;
  storagePath: string;
  description: string;
  category: FileCategory;
}

interface MemberFolder {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  createdAt: string;
  hasWorkspace: boolean;
  orgId: string;
  orgName: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-4 text-muted-foreground" />;
  if (mimeType.includes("pdf")) return <FileTextIcon className="size-4 text-muted-foreground" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return <ArchiveIcon className="size-4 text-muted-foreground" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileTextIcon className="size-4 text-muted-foreground" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileTextIcon className="size-4 text-muted-foreground" />;
  return <FileIcon className="size-4 text-muted-foreground" />;
}

function DeleteFileButton({ file, onDeleted }: { file: FileItem; onDeleted: () => void }) {
  async function handleDelete() {
    if (!confirm(`Delete "${file.originalName}"?`)) return;
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) onDeleted();
    } catch { /* ignore */ }
  }

  return (
    <Button
      onClick={handleDelete}
      variant="ghost"
      size="icon"
      className="size-7 text-black hover:text-gray-600 hover:bg-blue-50"
    >
      <Trash2Icon className="size-3.5" />
    </Button>
  );
}

interface AdminFileManagerProps {
  files: FileItem[];
  members: MemberFolder[];
}

export function AdminFileManager({ files: allFiles, members }: AdminFileManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [fileList, setFileList] = useState<FileItem[]>(allFiles);
  const [activeCategory, setActiveCategory] = useState<"all" | FileCategory>("all");

  const selectedMember = useMemo(
    () => members.find((m) => m.userId === selectedUserId) || null,
    [members, selectedUserId],
  );

  const categoryFiles = useMemo(
    () => activeCategory === "all"
      ? fileList
      : fileList.filter((f) => f.category === activeCategory),
    [fileList, activeCategory],
  );

  const memberFiles = useMemo(
    () => selectedMember
      ? categoryFiles.filter((f) => f.uploaderEmail === selectedMember.email)
      : [],
    [categoryFiles, selectedMember],
  );

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return memberFiles;
    const q = search.toLowerCase();
    return memberFiles.filter(
      (f) =>
        f.originalName.toLowerCase().includes(q) ||
        f.uploaderName.toLowerCase().includes(q),
    );
  }, [memberFiles, search]);

  function handleFileDeleted() {
    setFileList((prev) => prev.filter((f) => f.id !== previewFile?.id));
    setPreviewFile(null);
  }

  if (!selectedUserId) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderIcon className="size-6" />
              File Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              {fileList.length} files across {members.length} members
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{fileList.length} files</Badge>
            <Button onClick={() => window.location.href = "/upload"}>
              <UploadIcon className="mr-2 size-4" />
              Upload File
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "profile", "report", "general"] as const).map((cat) => {
            const count = cat === "all"
              ? fileList.length
              : fileList.filter((f) => f.category === cat).length;
            const icon = cat === "all" ? <FolderOpenIcon className="size-3.5" />
              : cat === "profile" ? <UserIcon className="size-3.5" />
              : cat === "report" ? <BarChart3Icon className="size-3.5" />
              : <FilesIcon className="size-3.5" />;
            const label = cat === "all" ? "All Files"
              : cat === "profile" ? "Profile"
              : cat === "report" ? "Report"
              : "General";
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedUserId(null); setSearch(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {icon}
                {label}
                <span className={`text-xs ml-0.5 ${activeCategory === cat ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex">
          <div className="flex-1" />
          <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              className="pl-9 h-9 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1" />
        </div>

        {members.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <FolderIcon className="size-16 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No members found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {members
              .filter((m) => !search.trim() || m.name.toLowerCase().includes(search.toLowerCase()) || m.orgName.toLowerCase().includes(search.toLowerCase()))
              .map((m) => {
                const userFileCount = categoryFiles.filter((f) => f.uploaderEmail === m.email).length;
                return (
                  <button
                    key={m.userId}
                    onClick={() => setSelectedUserId(m.userId)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 transition-all group cursor-pointer text-center"
                  >
                    <div className="size-20 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <FolderIcon className="size-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 w-full">
                      <span className="text-sm font-semibold truncate">{m.name}</span>
                      <span className="text-xs text-muted-foreground truncate flex items-center justify-center gap-1">
                        <Building2Icon className="size-3 shrink-0" />
                        {m.orgName}
                      </span>
                      <span className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {userFileCount} file{userFileCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedUserId(null);
              setSearch("");
            }}
          >
            <ChevronLeftIcon className="size-4 mr-1" />
            Back
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => { setSelectedUserId(null); setSearch(""); }} className="cursor-pointer">
                  All Folders
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">
                  {selectedMember?.name || "Member"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filteredFiles.length} files</Badge>
          <Button onClick={() => window.location.href = "/upload"}>
            <UploadIcon className="mr-2 size-4" />
            Upload File
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {(["all", "profile", "report", "general"] as const).map((cat) => {
            const icon = cat === "all" ? <FolderOpenIcon className="size-3.5" />
              : cat === "profile" ? <UserIcon className="size-3.5" />
              : cat === "report" ? <BarChart3Icon className="size-3.5" />
              : <FilesIcon className="size-3.5" />;
            const label = cat === "all" ? "All"
              : cat === "profile" ? "Profile"
              : cat === "report" ? "Report"
              : "General";
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-9 h-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1" />
      </div>

      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FolderIcon className="size-16 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">
              {selectedMember?.name || "This member"} has no files yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="table-premium w-full text-sm text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#f3f4f6] text-gray-900 border-b">
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Name</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Type</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Size</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Uploaded</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFiles.map((f) => (
                <tr
                  key={f.id}
                  className="bg-white group hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setPreviewFile(f)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {getFileIcon(f.mimeType)}
                      <span className="font-medium text-sm">{f.originalName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {f.mimeType.split("/").pop()?.toUpperCase() || "FILE"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatSize(f.size)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => window.open(`/api/files/${f.id}?download=true`, "_blank")}
                      >
                        <DownloadIcon className="size-3.5" />
                      </Button>
                      <DeleteFileButton file={f} onDeleted={() => {
                        setFileList((prev) => prev.filter((x) => x.id !== f.id));
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!previewFile} onOpenChange={(o) => { if (!o) setPreviewFile(null); }}>
        <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
          {previewFile && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  {getFileIcon(previewFile.mimeType)}
                  {previewFile.originalName}
                </DialogTitle>
                <DialogDescription>
                  {formatSize(previewFile.size)}
                  {" · "}
                  Uploaded {new Date(previewFile.createdAt).toLocaleDateString()} by {previewFile.uploaderName}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
                {/^(image|text|video|audio)\//.test(previewFile.mimeType) || previewFile.mimeType.includes("pdf") || previewFile.mimeType === "application/json" || previewFile.mimeType === "application/xml" ? (
                  <iframe
                    src={`/api/files/${previewFile.id}`}
                    className="w-full h-full border rounded-md"
                    title={previewFile.originalName}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <FileIcon className="size-12" />
                    <p className="text-sm">Preview not available for this file type</p>
                    <Button variant="outline" onClick={() => window.open(`/api/files/${previewFile.id}?download=true`, "_blank")}>
                      <DownloadIcon className="mr-2 size-4" />
                      Download to view
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
