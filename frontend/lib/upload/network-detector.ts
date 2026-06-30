import type { NetworkQuality } from "./types";

export interface NetworkInfo {
  isOnline: boolean;
  quality: NetworkQuality;
  downlink: number;
  rtt: number;
  type: string;
}

class NetworkDetector {
  private listeners: Set<(info: NetworkInfo) => void> = new Set();
  private currentInfo: NetworkInfo = {
    isOnline: true,
    quality: "unknown",
    downlink: 0,
    rtt: 0,
    type: "unknown",
  };

  constructor() {
    if (typeof navigator !== "undefined") {
      this.updateFromConnection();
      if ("connection" in navigator) {
        const conn = (navigator as any).connection;
        conn.addEventListener("change", () => this.updateFromConnection());
      }
      window.addEventListener("online", () => this.updateOnlineStatus(true));
      window.addEventListener("offline", () => this.updateOnlineStatus(false));
    }
  }

  private updateFromConnection() {
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const conn = (navigator as any).connection;
      this.currentInfo = {
        isOnline: navigator.onLine !== false,
        quality: this.calculateQuality(conn.downlink, conn.rtt),
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0,
        type: conn.type || "unknown",
      };
    }
    this.notify();
  }

  private updateOnlineStatus(isOnline: boolean) {
    this.currentInfo.isOnline = isOnline;
    if (!isOnline) {
      this.currentInfo.quality = "poor";
    }
    this.notify();
  }

  private calculateQuality(downlink: number, rtt: number): NetworkQuality {
    if (downlink >= 10 && rtt < 50) return "excellent";
    if (downlink >= 5 && rtt < 100) return "good";
    if (downlink >= 1 && rtt < 200) return "fair";
    return "poor";
  }

  subscribe(listener: (info: NetworkInfo) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentInfo);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentInfo));
  }

  getCurrent(): NetworkInfo {
    return { ...this.currentInfo };
  }

  getChunkSizeForNetwork(): number {
    const quality = this.currentInfo.quality;
    switch (quality) {
      case "excellent": return 50 * 1024 * 1024;
      case "good": return 20 * 1024 * 1024;
      case "fair": return 5 * 1024 * 1024;
      case "poor": return 1 * 1024 * 1024;
      default: return 10 * 1024 * 1024;
    }
  }

  getParallelUploadsForNetwork(): number {
    const quality = this.currentInfo.quality;
    switch (quality) {
      case "excellent": return 6;
      case "good": return 4;
      case "fair": return 2;
      case "poor": return 1;
      default: return 3;
    }
  }
}

export const networkDetector = new NetworkDetector();
