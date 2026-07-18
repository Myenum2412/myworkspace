import { create } from "zustand";
import type { BootstrapData } from "@/lib/api/bootstrap";

interface BootstrapState {
  data: BootstrapData | null;
  isLoading: boolean;
  isHydrated: boolean;
  error: Error | null;
  setData: (data: BootstrapData) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

export const useBootstrapStore = create<BootstrapState>((set) => ({
  data: null,
  isLoading: false,
  isHydrated: false,
  error: null,
  setData: (data) => set({ data, isHydrated: true, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setHydrated: (isHydrated) => set({ isHydrated }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set({ data: null, isLoading: false, isHydrated: false, error: null }),
}));
