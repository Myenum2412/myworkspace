"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HardDriveIcon,
  ImageIcon,
  FileTextIcon,
  VideoIcon,
  FileAudioIcon,
  FileIcon,
  Loader2Icon,
} from "lucide-react";

type MimeCategory = { _id: string; count: number; size: number };

const MIME_LABELS: Record<string, { label: string; icon: typeof ImageIcon }> = {
  image: { label: "Img", icon: ImageIcon },
  application: { label: "Doc", icon: FileTextIcon },
  video: { label: "Video", icon: VideoIcon },
  audio: { label: "Audio", icon: FileAudioIcon },
  text: { label: "Text", icon: FileTextIcon },
};

export function StorageUsage() {
  const [categories, setCategories] = useState<MimeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/files/stats", { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => setCategories(res?.data?.mimeBreakdown || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const top5 = categories.slice(0, 5);
  const otherCount = categories.slice(5).reduce((sum, c) => sum + c.count, 0);

  const items = [
    ...top5.map((c) => ({ id: c._id, count: c.count, label: MIME_LABELS[c._id]?.label || "Other", icon: MIME_LABELS[c._id]?.icon || FileIcon })),
    ...(otherCount > 0 ? [{ id: "other", count: otherCount, label: "Other", icon: FileIcon as typeof ImageIcon }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HardDriveIcon className="size-4" />
          Storage Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex gap-4">
            {["Img", "Doc", "Video", "Audio", "Other"].map((label) => (
              <div key={label} className="flex-1 flex items-center justify-end gap-2 rounded-lg border border-dashed p-4">
                <span className="text-2xl font-bold tabular-nums">0</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex-1 flex items-center justify-end gap-2 rounded-lg border p-4">
                <span className="text-2xl font-bold tabular-nums">{item.count}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
