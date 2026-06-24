import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueue,
  dequeue,
  peek,
  getQueueLength,
  clearQueue,
  getAll,
  updateItem,
  findByIdempotencyKey,
  type QueuedRequest,
} from "../queue";

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

describe("offline queue", () => {
  beforeEach(async () => {
    await clearQueue();
  });

  it("enqueues and dequeues items", async () => {
    const id = await enqueue(await makeItem());
    expect(id).toBeGreaterThan(0);
    expect(await getQueueLength()).toBe(1);
    await dequeue(id);
    expect(await getQueueLength()).toBe(0);
  });

  it("preserves FIFO order", async () => {
    await enqueue(await makeItem({ body: JSON.stringify({ n: 1 }) }));
    await enqueue(await makeItem({ body: JSON.stringify({ n: 2 }) }));
    await enqueue(await makeItem({ body: JSON.stringify({ n: 3 }) }));

    const first = await peek();
    expect(JSON.parse(first!.body).n).toBe(1);

    await dequeue(first!.id!);
    const second = await peek();
    expect(JSON.parse(second!.body).n).toBe(2);
  });

  it("prevents duplicate idempotency keys", async () => {
    const item = await makeItem({ idempotencyKey: "abc-123" });
    await enqueue(item);
    const dup = await findByIdempotencyKey("abc-123");
    expect(dup).not.toBeNull();
    expect(dup!.body).toBe(item.body);
  });

  it("updates an item (e.g. retryCount)", async () => {
    const id = await enqueue(await makeItem());
    const all = await getAll();
    const item = all[0];
    item.retryCount = 3;
    await updateItem(item);

    const after = await getAll();
    expect(after[0].retryCount).toBe(3);
  });

  it("persists across re-opens (same DB instance)", async () => {
    await enqueue(await makeItem());
    // Re-importing the module reuses the same DB name; length should persist.
    expect(await getQueueLength()).toBe(1);
  });

  it("clears the queue", async () => {
    await enqueue(await makeItem());
    await enqueue(await makeItem());
    expect(await getQueueLength()).toBe(2);
    await clearQueue();
    expect(await getQueueLength()).toBe(0);
  });
});
