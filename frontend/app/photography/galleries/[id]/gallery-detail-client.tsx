"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeftIcon,
  PlusIcon,
  QrCodeIcon,
  CopyIcon,
  Trash2Icon,
  ImageIcon,
  Loader2Icon,
  CheckCircle2Icon,
} from "lucide-react";

interface Gallery {
  id: string;
  name: string;
  description?: string;
  orgId: string;
  createdAt: string;
}

interface Image {
  id: string;
  galleryId: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  createdAt: string;
}

interface Token {
  id: string;
  galleryId: string;
  token: string;
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

export function GalleryDetailClient({
  gallery,
  images: initialImages,
  tokens: initialTokens,
}: {
  gallery: Gallery;
  images: Image[];
  tokens: Token[];
}) {
  const router = useRouter();
  const [images, setImages] = useState<Image[]>(initialImages);
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [uploading, setUploading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("galleryId", gallery.id);
      const res = await fetch("/api/gallery/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (data.image) {
        setImages((prev) => [data.image, ...prev]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateToken() {
    setGeneratingToken(true);
    try {
      const res = await fetch("/api/photography/galleries/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryId: gallery.id }),
      });
      const data = await res.json();
      if (data.token) {
        setTokens((prev) => [data.token, ...prev]);
        setSelectedToken(data.token.token);
      }
    } finally {
      setGeneratingToken(false);
    }
  }

  function showQr(token: string) {
    const appUrl = window.location.origin;
    const qrData = `${appUrl}/gallery/access/${token}`;
    const url = `${QR_API}?size=300x300&data=${encodeURIComponent(qrData)}`;
    setSelectedToken(token);
    setQrImageUrl(url);
  }

  async function copyToken(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/gallery/access/${token}`);
  }

  async function handleDeleteImage(imageId: string) {
    const res = await fetch(`/api/gallery/upload-image?id=${imageId}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/photography")}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{gallery.name}</h1>
          {gallery.description && (
            <p className="text-sm text-muted-foreground">{gallery.description}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="images">
        <TabsList>
          <TabsTrigger value="images"><ImageIcon className="size-4 mr-1" /> Images</TabsTrigger>
          <TabsTrigger value="qr"><QrCodeIcon className="size-4 mr-1" /> QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="image-upload" className="cursor-pointer">
              <div className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {uploading ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <PlusIcon className="size-4 mr-1" />}
                {uploading ? "Uploading..." : "Upload Image"}
              </div>
              <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </Label>
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-square rounded-lg border overflow-hidden bg-muted">
                <img src={img.url} alt={img.filename} className="size-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button size="icon" variant="ghost" className="size-7 text-white" onClick={() => handleDeleteImage(img.id)}>
                    <Trash2Icon className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
            {images.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImageIcon className="size-12 mb-3" />
                <p className="text-sm">No images uploaded yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <Button onClick={handleGenerateToken} disabled={generatingToken}>
            {generatingToken ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <QrCodeIcon className="size-4 mr-1" />}
            {generatingToken ? "Generating..." : "Generate Access Token"}
          </Button>

          {qrImageUrl && selectedToken && (
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>Scan to access the gallery</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <img src={qrImageUrl} alt="QR Code" className="rounded-lg border" width={300} height={300} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyToken(selectedToken)}>
                    <CopyIcon className="size-3 mr-1" /> Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{t.token.slice(0, 16)}...</code>
                  <span className={t.active ? "text-green-600" : "text-muted-foreground"}>
                    {t.active ? "Active" : "Expired"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => showQr(t.token)}>
                    <QrCodeIcon className="size-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copyToken(t.token)}>
                    <CopyIcon className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
            {tokens.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No tokens generated yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
