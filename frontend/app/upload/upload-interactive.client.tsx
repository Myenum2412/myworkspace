"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import FileUpload06 from "@/components/file-upload-06";

type Project = {
  id: string;
  name: string;
};

export default function UploadInteractive({ projects, user }: { projects: Project[]; user: { name?: string; email?: string; image?: string } }) {
  const router = useRouter();

  const handleUpload = useCallback(async (file: File, projectId: string, onProgress: (pct: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) {
      formData.append("projectId", projectId);
    }

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    return new Promise<void>((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error("Upload failed"));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));

      xhr.open("POST", "/api/files/upload");
      xhr.send(formData);
    });
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Upload File</h1>
      <FileUpload06
        projects={projects}
        onUpload={handleUpload}
        maxSizeMB={50}
      />
    </main>
  );
}
