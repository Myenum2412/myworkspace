"use client";

import { create } from "zustand";

export type InitStatus = "idle" | "initializing" | "ready";

interface AppInitState {
  status: InitStatus;
  progress: string;
  startInit: () => void;
  completeInit: () => void;
  setProgress: (msg: string) => void;
  reset: () => void;
}

export const useAppInitStore = create<AppInitState>((set) => ({
  status: "idle",
  progress: "",
  startInit: () => set({ status: "initializing", progress: "Loading your workspace..." }),
  completeInit: () => set({ status: "ready", progress: "" }),
  setProgress: (msg) => set({ progress: msg }),
  reset: () => set({ status: "idle", progress: "" }),
}));
