import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { useOfflineForm } from "../use-offline-form";
import { clearQueue } from "../queue";

describe("useOfflineForm", () => {
  beforeEach(async () => {
    await clearQueue();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns submit function and initial state", () => {
    const hook = renderHook(() =>
      useOfflineForm({ endpoint: "/api/employees", method: "POST" })
    );
    expect(typeof hook.result.current.submit).toBe("function");
    expect(hook.result.current.isPending).toBe(false);
    expect(hook.result.current.isOfflineQueued).toBe(false);
    expect(hook.result.current.lastSyncStatus).toBe("idle");
  });

  it("calls onSuccess on 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 200 })
    );
    const onSuccess = vi.fn();
    const hook = renderHook(() =>
      useOfflineForm({ endpoint: "/api/x", method: "POST", onSuccess })
    );
    await act(async () => {
      await hook.result.current.submit({ a: 1 });
    });
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
    expect(hook.result.current.lastSyncStatus).toBe("success");
  });

  it("queues on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    const onError = vi.fn();
    const hook = renderHook(() =>
      useOfflineForm({ endpoint: "/api/x", method: "POST", onError })
    );
    await act(async () => {
      await hook.result.current.submit({ a: 1 });
    });
    expect(onError).not.toHaveBeenCalled();
    expect(hook.result.current.isOfflineQueued).toBe(true);
  });

  it("calls onError on 4xx without queuing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad" }), { status: 400 })
    );
    const onError = vi.fn();
    const hook = renderHook(() =>
      useOfflineForm({ endpoint: "/api/x", method: "POST", onError })
    );
    await act(async () => {
      await hook.result.current.submit({ a: 1 });
    });
    expect(onError).toHaveBeenCalled();
    expect(hook.result.current.isOfflineQueued).toBe(false);
  });
});
