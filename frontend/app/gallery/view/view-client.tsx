"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DownloadIcon,
  HeartIcon,
  SearchIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
} from "lucide-react";

interface GalleryImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  createdAt: string;
}

export function GalleryViewClient({
  galleryName,
  personName,
  images: initialImages,
  sessionExpiresAt,
}: {
  galleryName: string;
  personName: string;
  images: GalleryImage[];
  sessionExpiresAt: string;
}) {
  const [images] = useState<GalleryImage[]>(initialImages);
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const perPage = 20;

  const filtered = search
    ? images.filter((img) => img.filename.toLowerCase().includes(search.toLowerCase()))
    : images;

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const expiresDate = new Date(sessionExpiresAt);
  const expiresInMinutes = Math.max(0, Math.floor((expiresDate.getTime() - Date.now()) / 60000));

  function openLightbox(img: GalleryImage) {
    const idx = filtered.findIndex((i) => i.id === img.id);
    setLightboxIndex(idx);
    setLightbox(img.url);
  }

  function closeLightbox() {
    setLightbox(null);
  }

  function prevImage() {
    const newIdx = lightboxIndex > 0 ? lightboxIndex - 1 : filtered.length - 1;
    setLightboxIndex(newIdx);
    setLightbox(filtered[newIdx]?.url || null);
  }

  function nextImage() {
    const newIdx = lightboxIndex < filtered.length - 1 ? lightboxIndex + 1 : 0;
    setLightboxIndex(newIdx);
    setLightbox(filtered[newIdx]?.url || null);
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function downloadImage(url: string, filename: string) {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{galleryName}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><UserIcon className="size-3" /> {personName}</span>
              <span className="flex items-center gap-1"><ClockIcon className="size-3" /> Session expires in {expiresInMinutes}m</span>
              <span>{filtered.length} photos</span>
            </div>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              className="flex h-9 w-48 rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm"
              placeholder="Search photos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <SearchIcon className="size-12 mb-3" />
            <p className="text-sm">No photos found{search ? " matching your search" : ""}.</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {paginated.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                  onClick={() => openLightbox(img)}
                >
                  <img src={img.url} alt={img.filename} className="size-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="size-7 rounded-full bg-white/80 flex items-center justify-center hover:bg-white"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(img.id); }}
                      >
                        <HeartIcon className={`size-3 ${favorites.has(img.id) ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                      </button>
                      <button
                        className="size-7 rounded-full bg-white/80 flex items-center justify-center hover:bg-white"
                        onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.filename); }}
                      >
                        <DownloadIcon className="size-3 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={closeLightbox}>
            <XIcon className="size-8" />
          </button>
          <button className="absolute left-4 text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
            <ChevronLeftIcon className="size-8" />
          </button>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-4 text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
            <ChevronRightIcon className="size-8" />
          </button>
          <div className="absolute bottom-4 text-white/60 text-sm">
            {lightboxIndex + 1} / {filtered.length}
          </div>
        </div>
      )}
    </div>
  );
}
