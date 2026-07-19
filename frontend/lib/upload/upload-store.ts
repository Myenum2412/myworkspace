import { create } from "zustand";
import type { UploadFile, UploadStats, UploadOptions, SocketUploadEvent, NetworkQuality } from "./types";
import { networkDetector } from "./network-detector";

interface UploadState {
  uploads: Record<string, UploadFile>;
  activeUploads: string[];
  completedUploads: string[];
  failedUploads: string[];
  stats: UploadStats;
  folderStructure: Record<string, { name: string; files: string[] }>;
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

function recalc(uploads: Record<string, UploadFile>, activeUploads: string[]): UploadStats {
  let totalBytes = 0;
  let uploadedBytes = 0;
  let speedSum = 0;
  let speedCount = 0;
  let completed = 0;
  let failed = 0;

  for (const file of Object.values(uploads)) {
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
    totalUploads: Object.keys(uploads).length,
    activeUploads: activeUploads.length,
    completedUploads: completed,
    failedUploads: failed,
    totalBytes,
    uploadedBytes,
    averageSpeed: speedCount > 0 ? speedSum / speedCount : 0,
  };
}

export const useUploadStore = create<UploadState>((set, get) => ({
  uploads: {},
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
  folderStructure: {},
  networkQuality: "unknown",
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine !== false,

  addUpload: (file) => {
    set((state) => {
      const newActive = [...state.activeUploads, file.id];
      return {
        uploads: { ...state.uploads, [file.id]: file },
        activeUploads: newActive,
        stats: recalc({ ...state.uploads, [file.id]: file }, newActive),
      };
    });
  },

  updateUpload: (id, update) => {
    set((state) => {
      const existing = state.uploads[id];
      if (!existing) return state;

      const updated = { ...existing, ...update } as UploadFile;
      const newUploads = { ...state.uploads, [id]: updated };

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
        delete newUploads[id];
      }

      return {
        uploads: newUploads,
        activeUploads: newActive,
        completedUploads: newCompleted,
        failedUploads: newFailed,
        stats: recalc(newUploads, newActive),
      };
    });
  },

  removeUpload: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.uploads;
      return {
        uploads: rest,
        activeUploads: state.activeUploads.filter((a) => a !== id),
        completedUploads: state.completedUploads.filter((c) => c !== id),
        failedUploads: state.failedUploads.filter((f) => f !== id),
      };
    });
  },

  clearCompleted: () => {
    set((state) => {
      const rest: Record<string, UploadFile> = {};
      for (const [key, val] of Object.entries(state.uploads)) {
        if (!state.completedUploads.includes(key)) {
          rest[key] = val;
        }
      }
      return {
        uploads: rest,
        completedUploads: [],
        stats: recalc(rest, state.activeUploads),
      };
    });
  },

  retryUpload: (id) => {
    const state = get();
    const file = state.uploads[id];
    if (!file) return;
    state.updateUpload(id, { status: "pending", progress: 0, error: undefined, retryCount: 0 });
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
        for (const [id, file] of Object.entries(state.uploads)) {
          if (file.tusId === data.tusId || file.name === data.fileName) {
            state.updateUpload(id, { status: "pending_approval", progress: 100, tusId: data.tusId });
            break;
          }
        }
        break;
      }
      case "upload:approved": {
        for (const [id, file] of Object.entries(state.uploads)) {
          if (file.tusId === data.tusId || file.name === data.fileName || id === data.uploadId) {
            state.updateUpload(id, { status: "completed", progress: 100, fileId: data.fileId });
            break;
          }
        }
        break;
      }
      case "upload:rejected": {
        for (const [id, file] of Object.entries(state.uploads)) {
          if (file.tusId === data.tusId || file.name === data.fileName || id === data.uploadId) {
            state.updateUpload(id, { status: "failed", error: data.reason || "Upload rejected by approver" });
            break;
          }
        }
        break;
      }
      case "upload:completed": {
        if (data.fileId) {
          for (const [id, file] of Object.entries(state.uploads)) {
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
          for (const [id, file] of Object.entries(state.uploads)) {
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
    set({ stats: recalc(state.uploads, state.activeUploads) });
  },
}));
