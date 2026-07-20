"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUploadStore } from "./upload-store";
import { createUpload, resumePendingSessions } from "./tus-client";
import { networkDetector } from "./network-detector";
import { clearCompletedSessions } from "./idb-sessions";
import type { UploadOptions, UploadFile, UploadStats, NetworkQuality } from "./types";

const USER_STORAGE_LIMIT = 1024 * 1024 * 1024; // 1 GB

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

async function checkStorageLimit(orgId: string, fileSize: number): Promise<{ allowed: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/files/storage-stats?orgId=${orgId}`, { credentials: "include" });
    if (!res.ok) return { allowed: true }; // Fail open if API unavailable
    const data = await res.json();
    const used = data.data?.usedStorage || 0;
    const available = Math.max(0, USER_STORAGE_LIMIT - used);

    if (fileSize > available) {
      return {
        allowed: false,
        error: `Storage limit exceeded. You only have ${formatBytes(available)} of available storage. Please delete existing files or upgrade your storage plan before uploading.`,
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true }; // Fail open on network error
  }
}

export function useUpload(options: UploadOptions) {
  const store = useUploadStore();
  const activeControllers = useRef<Map<string, { pause: () => void; resume: () => void; cancel: () => void }>>(new Map());

  useEffect(() => {
    const unsub = networkDetector.subscribe((info) => {
      store.setNetworkQuality(info.quality);
      store.setIsOnline(info.isOnline);
    });
    return unsub;
  }, [store]);

  useEffect(() => {
    resumePendingSessions(options, (update) => {
      if (update.id) store.updateUpload(update.id, update);
    });
  }, [options, store]);

  const uploadFile = useCallback(async (file: File) => {
    // Check storage limit before starting upload
    if (options.orgId) {
      const check = await checkStorageLimit(options.orgId, file.size);
      if (!check.allowed) {
        const errorId = `storage-blocked-${Date.now()}`;
        store.addUpload({
          id: errorId,
          file,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          progress: 0,
          status: "failed",
          error: check.error,
          speed: 0,
          eta: 0,
          retryCount: 0,
          chunkSize: 0,
          parallelUploads: 0,
        } as UploadFile);
        throw new Error(check.error);
      }
    }

    const result = await createUpload(
      file,
      options,
      (update) => {
        if (update.id) store.updateUpload(update.id, update);
      },
      (result) => {
        if (result.success) {
          store.recalculateStats();
        }
      },
    );

    store.addUpload(result.file);
    activeControllers.current.set(result.uploadId, {
      pause: result.pause,
      resume: result.resume,
      cancel: result.cancel,
    });

    result.start();
    return result.uploadId;
  }, [options, store]);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const uploadIds: string[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      try {
        const id = await uploadFile(file);
        uploadIds.push(id);
      } catch (err) {
        if (err instanceof Error) {
          errors.push(`${file.name}: ${err.message}`);
        }
      }
    }

    if (errors.length > 0) {
      // Show aggregated error
      const msg = errors.length === 1 ? errors[0] : `${errors.length} files could not be uploaded. ${errors[0]}`;
      // Import toast dynamically to avoid SSR issues
      import("sonner").then(({ toast }) => toast.error(msg));
    }

    return uploadIds;
  }, [uploadFile]);

  const uploadFolder = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const uploadIds: string[] = [];

    for (const file of fileArray) {
      try {
        const id = await uploadFile(file);
        uploadIds.push(id);
      } catch {
        // Error already shown by uploadFile
      }
    }

    return uploadIds;
  }, [uploadFile]);

  const pauseUpload = useCallback((uploadId: string) => {
    activeControllers.current.get(uploadId)?.pause();
    store.updateUpload(uploadId, { status: "paused" });
  }, [store]);

  const resumeUpload = useCallback((uploadId: string) => {
    activeControllers.current.get(uploadId)?.resume();
    store.updateUpload(uploadId, { status: "uploading" });
  }, [store]);

  const cancelUpload = useCallback((uploadId: string) => {
    activeControllers.current.get(uploadId)?.cancel();
    store.removeUpload(uploadId);
  }, [store]);

  const retryUpload = useCallback((uploadId: string) => {
    const file = store.uploads[uploadId];
    if (!file) return;
    uploadFile(file.file);
  }, [store, uploadFile]);

  const clearCompleted = useCallback(() => {
    store.clearCompleted();
    clearCompletedSessions();
  }, [store]);

  return {
    uploads: Object.values(store.uploads) as UploadFile[],
    activeUploads: store.activeUploads.map((id) => store.uploads[id]).filter(Boolean) as UploadFile[],
    completedUploads: store.completedUploads.map((id) => store.uploads[id]).filter(Boolean) as UploadFile[],
    failedUploads: store.failedUploads.map((id) => store.uploads[id]).filter(Boolean) as UploadFile[],
    stats: store.stats,
    networkQuality: store.networkQuality,
    isOnline: store.isOnline,
    uploadFile,
    uploadFiles,
    uploadFolder,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    handleSocketEvent: store.handleSocketEvent,
  };
}
