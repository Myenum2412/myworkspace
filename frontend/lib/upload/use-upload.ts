"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUploadStore } from "./upload-store";
import { createUpload, resumePendingSessions } from "./tus-client";
import { networkDetector } from "./network-detector";
import { clearCompletedSessions } from "./idb-sessions";
import type { UploadOptions, UploadFile, UploadStats, NetworkQuality } from "./types";

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

    for (const file of fileArray) {
      const id = await uploadFile(file);
      uploadIds.push(id);
    }

    return uploadIds;
  }, [uploadFile]);

  const uploadFolder = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const uploadIds: string[] = [];

    for (const file of fileArray) {
      if (file.webkitRelativePath) {
        const path = file.webkitRelativePath;
        const folderName = path.split("/")[0];
        const uploadId = await uploadFile(file);
        uploadIds.push(uploadId);
      } else {
        const uploadId = await uploadFile(file);
        uploadIds.push(uploadId);
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
    const file = store.uploads.get(uploadId);
    if (!file) return;
    uploadFile(file.file);
  }, [store, uploadFile]);

  const clearCompleted = useCallback(() => {
    store.clearCompleted();
    clearCompletedSessions();
  }, [store]);

  return {
    uploads: Array.from(store.uploads.values()) as UploadFile[],
    activeUploads: store.activeUploads.map((id) => store.uploads.get(id)).filter(Boolean) as UploadFile[],
    completedUploads: store.completedUploads.map((id) => store.uploads.get(id)).filter(Boolean) as UploadFile[],
    failedUploads: store.failedUploads.map((id) => store.uploads.get(id)).filter(Boolean) as UploadFile[],
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
