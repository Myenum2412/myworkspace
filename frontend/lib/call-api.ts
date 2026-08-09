import type { CallSummary } from "@/lib/use-realtime";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface ApiChatReply {
  id: string;
  userId: string;
  name: string;
  text: string;
  type: string;
  createdAt: string;
}

export interface CreateCallInput {
  channelId?: string;
  type: "dm" | "group" | "channel";
  name?: string;
  media?: "video" | "audio";
  invitees?: string[];
  scheduledAt?: string;
}

export async function apiCreateCall(
  input: CreateCallInput,
): Promise<{ success: boolean; data: CallSummary }> {
  return request("/api/calls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function apiGetCalls(
  scope: "active" | "scheduled" | "history" | "all" = "all",
): Promise<{ success: boolean; data: CallSummary[] }> {
  return request(`/api/calls?scope=${scope}`);
}

export async function apiGetCall(callId: string): Promise<{ success: boolean; data: CallSummary }> {
  return request(`/api/calls/${callId}`);
}

export async function apiCallAction(
  callId: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<{ success: boolean; data?: CallSummary }> {
  return request(`/api/calls/${callId}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

export async function apiJoin(callId: string) {
  return apiCallAction(callId, "join");
}
export async function apiLeave(callId: string) {
  return apiCallAction(callId, "leave");
}
export async function apiEnd(callId: string) {
  return apiCallAction(callId, "end");
}
export async function apiCancel(callId: string) {
  return apiCallAction(callId, "cancel");
}
export async function apiHandRaise(callId: string) {
  return apiCallAction(callId, "hand-raise");
}
export async function apiSendChat(
  callId: string,
  text: string,
): Promise<{ success: boolean; data: ApiChatReply }> {
  return request(`/api/calls/${callId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
export async function apiSelfState(
  callId: string,
  patch: { audio?: boolean; video?: boolean; screen?: boolean; muted?: boolean },
) {
  return apiCallAction(callId, "state", patch);
}
export async function apiModerate(
  callId: string,
  action: "muteAll" | "mute" | "record",
  targetUserId?: string,
) {
  return apiCallAction(callId, "moderate", { action, targetUserId });
}

export async function apiReschedule(callId: string, scheduledAt: string, name?: string) {
  return request(`/api/calls/${callId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledAt, name }),
  });
}
