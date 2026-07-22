"use client";

import { useFavorites } from "@/hooks/file-system/use-favorites";
import { useFileSystemStore } from "@/lib/file-system/store";
import { getFileIcon } from "@/components/files/utils";
import { formatSize } from "@/lib/file-system/types";
import { StarIcon, FolderIcon } from "lucide-react";

export function FavoritesView() {
  const { favorites, toggleFavorite, isLoading } = useFavorites();
  const { setPreviewFile, setCurrentFolder } = useFileSystemStore();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <StarIcon className="size-12 text-muted-foreground/20" />
        <p className="text-sm font-medium">No favorites yet</p>
        <p className="text-xs">Star files and folders for quick access</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <StarIcon className="size-4" /> Favorites
        </h2>
        <p className="text-sm text-muted-foreground">{favorites.length} starred item{favorites.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {favorites.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col items-center gap-2 p-4 rounded-sm border bg-card cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
            onDoubleClick={() => {
              if (item.type === "folder") setCurrentFolder(item.id);
              else if (item.type === "file" && "mimeType" in item) setPreviewFile(item as any);
            }}
          >
            <div className="size-16 rounded-sm bg-muted flex items-center justify-center">
              {item.type === "folder" ? <FolderIcon className="size-8 text-primary/60" /> : getFileIcon((item as any).mimeType || "")}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="text-xs font-medium truncate">{item.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {item.type === "file" && "size" in item ? formatSize((item as any).size) : "Folder"}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id, item.type); }}
              className="absolute top-2 right-2 p-0.5"
            >
              <StarIcon className="size-3 fill-amber-400 text-amber-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
