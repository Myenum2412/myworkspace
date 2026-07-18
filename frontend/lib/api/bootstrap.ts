import { withRetry } from "./retry";
import { deduplicateRequest } from "./request-dedup";

export interface BootstrapUser {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  permissions: string[];
  status: string;
  lastLogin: string | null;
  createdAt: string | null;
}

export interface BootstrapOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo?: string;
  subscriptionStatus?: string;
  trialEnd: string | null;
  ownerId: string;
  onboardingCompleted: boolean;
}

export interface BootstrapNotification {
  unreadCount: number;
}

export interface BootstrapMember {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  status?: string;
  role: string;
}

export interface BootstrapSession {
  loginTime: string;
  logoutTime?: string;
  currentStatus?: string;
}

export interface BootstrapNavigation {
  role: string;
  orgId: string;
}

export interface BootstrapData {
  user: BootstrapUser;
  organization: BootstrapOrganization | null;
  orgId: string;
  notifications: BootstrapNotification;
  members: BootstrapMember[];
  recentSessions: BootstrapSession[];
  navigation: BootstrapNavigation;
}

let cachedBootstrap: BootstrapData | null = null;
let bootstrapPromise: Promise<BootstrapData> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60_000;

export async function fetchBootstrapData(force = false): Promise<BootstrapData> {
  const now = Date.now();
  if (!force && cachedBootstrap && (now - lastFetchTime) < CACHE_TTL) {
    return cachedBootstrap;
  }

  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = deduplicateRequest("bootstrap", async () => {
    const data = await withRetry(async (signal) => {
      const res = await fetch("/api/bootstrap", {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!res.ok) throw new Error(`Bootstrap failed: ${res.status}`);
      const json = await res.json();
      return json.data as BootstrapData;
    }, { maxRetries: 1, baseDelay: 300 });

    cachedBootstrap = data;
    lastFetchTime = Date.now();
    return data;
  });

  try {
    const result = await bootstrapPromise;
    return result;
  } finally {
    bootstrapPromise = null;
  }
}

export function getCachedBootstrap(): BootstrapData | null {
  if (cachedBootstrap && (Date.now() - lastFetchTime) < CACHE_TTL) {
    return cachedBootstrap;
  }
  return null;
}

export function invalidateBootstrapCache(): void {
  cachedBootstrap = null;
  lastFetchTime = 0;
}
