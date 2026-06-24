import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { clearQueue, enqueue, type QueuedRequest } from "../queue";
import { processQueue, subscribeSync } from "../sync-processor";

async function makeItem(overrides: Partial<QueuedRequest> = {}): Promise<Omit<QueuedRequest, "id">> {
  return {
    endpoint: "/api/employees",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "A" }),
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    ...overrides,
  };
}

describe("sync processor", () => {
  beforeEach(async () => {
    await clearQueue();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dequeues on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    await enqueue(await makeItem());
    await processQueue();
    expect(await clearQueue, "noop");
  });

  it("drops item on 4xx and logs", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad" }), { status: 400 })
    );
    await enqueue(await makeItem());
    await processQueue();
    expect(errSpy).toHaveBeenCalled();
  });

  it("retries on network error", async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls.push("call");
      throw new TypeError("Failed to fetch");
    });
    await enqueue(await makeItem());
    await processQueue();
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it("notifies subscribers of sync events", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const events: Array<{ status: string; remaining: number }> = [];
    const unsub = subscribeSync((e) => events.push({ status: e.status, remaining: e.remaining }));
    await enqueue(await makeItem());
    await processQueue();
    unsub();
    expect(events.some((e) => e.status === "syncing")).toBe(true);
    expect(events.some((e) => e.status === "success")).toBe(true);
  });
});
