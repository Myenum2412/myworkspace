export interface NtfyConfig {
  provider: "ntfy";
  enabled: boolean;
  baseUrl: string;
}

export interface NtfyTopic {
  enabled: boolean;
  baseUrl: string;
  topic: string;
  subscribeUrl: string;
}

export async function getPushConfig(): Promise<NtfyConfig | null> {
  try {
    const res = await fetch("/api/notifications/push/config", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      return data.data || null;
    }
  } catch {}
  return null;
}

export async function getPushTopic(): Promise<NtfyTopic | null> {
  try {
    const res = await fetch("/api/notifications/push/topic", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      return data.data || null;
    }
  } catch {}
  return null;
}

// ntfy publish is done server-side; the browser-side subscription simply resolves
// the user's private topic so the UI can render/verify a subscribe link.
export async function subscribeToPush(): Promise<NtfyTopic | null> {
  return getPushTopic();
}

export async function unsubscribeFromPush() {
  return null;
}
