import { create } from "zustand";
import type { UploadFile, UploadStats, UploadOptions, SocketUploadEvent, NetworkQuality } from "./types";
import { networkDetector } from "./network-detector";

interface UploadState {
  uploads: Map<string, UploadFile>;
  activeUploads: string[];
  completedUploads: string[];
  failedUploads: string[];
  stats: UploadStats;
  folderStructure: Map<string, { name: string; files: string[] }>;
  networkQuality: NetworkQuality;
  isOnline: boolean;

  addUpload: (file: UploadFile) => void;
  updateUpload: (id: string, update: Partial<UploadFile>) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
  retryUpload: (id: string) => void;
  retryAllFailed: () => void;

  setNetworkQuality: (quality: NetworkQuality) => void;
  setIsOnline: (online: boolean) => void;

  handleSocketEvent: (event: string, data: SocketUploadEvent) => void;

  recalculateStats: () => void;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  uploads: new Map(),
  activeUploads: [],
  completedUploads: [],
  failedUploads: [],
  stats: {
    totalUploads: 0,
    activeUploads: 0,
    completedUploads: 0,
    failedUploads: 0,
    totalBytes: 0,
    uploadedBytes: 0,
    averageSpeed: 0,
  },
  folderStructure: new Map(),
  networkQuality: "unknown",
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine !== false,

  addUpload: (file) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      newUploads.set(file.id, file);
      const newActive = [...state.activeUploads, file.id];
      const newStats = calculateStats(newUploads, newActive);
      return { uploads: newUploads, activeUploads: newActive, stats: newStats };
    });
  },

  updateUpload: (id, update) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      const existing = newUploads.get(id);
      if (!existing) return state;

      const updated = { ...existing, ...update };
      newUploads.set(id, updated);

      let newActive = state.activeUploads;
      let newCompleted = state.completedUploads;
      let newFailed = state.failedUploads;

      if (update.status === "completed" && !state.completedUploads.includes(id)) {
        newCompleted = [...state.completedUploads, id];
        newActive = state.activeUploads.filter((a) => a !== id);
      }
      if (update.status === "failed" && !state.failedUploads.includes(id)) {
        newFailed = [...state.failedUploads, id];
        newActive = state.activeUploads.filter((a) => a !== id);
      }
      if (update.status === "cancelled") {
        newActive = state.activeUploads.filter((a) => a !== id);
        newUploads.delete(id);
      }

      const newStats = calculateStats(newUploads, newActive);
      return {
        uploads: newUploads,
        activeUploads: newActive,
        completedUploads: newCompleted,
        failedUploads: newFailed,
        stats: newStats,
      };
    });
  },

  removeUpload: (id) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      newUploads.delete(id);
      return {
        uploads: newUploads,
        activeUploads: state.activeUploads.filter((a) => a !== id),
        completedUploads: state.completedUploads.filter((c) => c !== id),
        failedUploads: state.failedUploads.filter((f) => f !== id),
      };
    });
  },

  clearCompleted: () => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      for (const id of state.completedUploads) {
        newUploads.delete(id);
      }
      return {
        uploads: newUploads,
        completedUploads: [],
        stats: calculateStats(newUploads, state.activeUploads),
      };
    });
  },

  retryUpload: (id) => {
    const state = get();
    const file = state.uploads.get(id);
    if (!file) return;

    const updated: UploadFile = { ...file, status: "pending", progress: 0, error: undefined, retryCount: 0 };
    state.updateUpload(id, updated);
  },

  retryAllFailed: () => {
    const state = get();
    for (const id of state.failedUploads) {
      state.retryUpload(id);
    }
  },

  setNetworkQuality: (quality) => set({ networkQuality: quality }),
  setIsOnline: (online) => set({ isOnline: online }),

  handleSocketEvent: (event, data) => {
    const state = get();
    switch (event) {
      case "upload:started":
        break;
      case "upload:pending_approval": {
        for (const [id, file] of state.uploads) {
          if (file.tusId === data.tusId || file.name === data.fileName) {
            state.updateUpload(id, { status: "pending_approval", progress: 100, tusId: data.tusId });
            break;
          }
        }
        break;
      }
      case "upload:approved": {
        for (const [id, file] of state.uploads) {
          if (file.tusId === data.tusId || file.name === data.fileName || id === data.uploadId) {
            state.updateUpload(id, { status: "completed", progress: 100, fileId: data.fileId });
            break;
          }
        }
        break;
      }
      case "upload:rejected": {
        for (const [id, file] of state.uploads) {
          if (file.tusId === data.tusId || file.name === data.fileName || id === data.uploadId) {
            state.updateUpload(id, { status: "failed", error: data.reason || "Upload rejected by approver" });
            break;
          }
        }
        break;
      }
      case "upload:completed": {
        if (data.fileId) {
          for (const [id, file] of state.uploads) {
            if (file.tusId === data.tusId || file.name === data.fileName) {
              state.updateUpload(id, { status: "completed", progress: 100, fileId: data.fileId });
              break;
            }
          }
        }
        break;
      }
      case "upload:failed": {
        if (data.tusId) {
          for (const [id, file] of state.uploads) {
            if (file.tusId === data.tusId) {
              state.updateUpload(id, {
                status: "failed",
                error: data.error || "Upload failed on server",
              });
              break;
            }
          }
        }
        break;
      }
    }
  },

  recalculateStats: () => {
    const state = get();
    const newStats = calculateStats(state.uploads, state.activeUploads);
    set({ stats: newStats });
  },
}));

function calculateStats(
  uploads: Map<string, UploadFile>,
  activeUploads: string[],
): UploadStats {
  let totalBytes = 0;
  let uploadedBytes = 0;
  let speedSum = 0;
  let speedCount = 0;
  let completed = 0;
  let failed = 0;
  let active = activeUploads.length;

  for (const [, file] of uploads) {
    totalBytes += file.size;
    uploadedBytes += Math.round((file.size * file.progress) / 100);
    if (file.status === "completed") completed++;
    if (file.status === "failed") failed++;
    if (file.speed > 0) {
      speedSum += file.speed;
      speedCount++;
    }
  }

  return {
    totalUploads: uploads.size,
    activeUploads: active,
    completedUploads: completed,
    failedUploads: failed,
    totalBytes,
    uploadedBytes,
    averageSpeed: speedCount > 0 ? speedSum / speedCount : 0,
  };
}
