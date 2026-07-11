"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusIcon, QrCodeIcon, EyeIcon, Trash2Icon } from "lucide-react";

interface Gallery {
  _id: string;
  id: string;
  name: string;
  description?: string;
  orgId: string;
  createdAt: string;
  imageCount?: number;
  tokenCount?: number;
}

export function PhotographyPageClient({ orgId, galleries: initialGalleries }: { orgId: string; galleries: Gallery[] }) {
  const router = useRouter();
  const [galleries, setGalleries] = useState<Gallery[]>(initialGalleries);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/photography/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (data.gallery) {
        setGalleries((prev) => [data.gallery, ...prev]);
        setName("");
        setDescription("");
        setShowCreate(false);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this gallery and all its data?")) return;
    const res = await fetch(`/api/photography/galleries?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setGalleries((prev) => prev.filter((g) => g.id !== id));
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Photography</h1>
          <p className="text-sm text-muted-foreground">Manage QR-based face gallery access</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <PlusIcon className="size-4 mr-1" />
          Create Gallery
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Gallery</CardTitle>
            <CardDescription>Create a new QR gallery for face-based access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 max-w-md">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder=""
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder=""
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating ? "Creating..." : "Create"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {galleries.map((gallery) => (
          <Card key={gallery.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{gallery.name}</CardTitle>
              {gallery.description && (
                <CardDescription className="text-xs">{gallery.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span>{gallery.imageCount ?? 0} images</span>
                <span>{gallery.tokenCount ?? 0} tokens</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/photography/galleries/${gallery.id}`)}>
                  <EyeIcon className="size-3 mr-1" /> Manage
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/photography/galleries/${gallery.id}?tab=qr`)}>
                  <QrCodeIcon className="size-3 mr-1" /> QR
                </Button>
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => handleDelete(gallery.id)}>
                  <Trash2Icon className="size-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {galleries.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <QrCodeIcon className="size-12 mb-3" />
            <p className="text-sm">No galleries yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </main>
  );
}
