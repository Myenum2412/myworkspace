import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindOne = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    collection: () => ({
      findOne: mockFindOne,
    }),
  },
}));

const mockCollections = {
  orgMembers: "org_members",
};

vi.mock("@/lib/db/schema", () => ({
  collections: mockCollections,
}));

beforeEach(() => {
  mockFindOne.mockReset();
});

describe("getUserOrgId", () => {
  it("returns orgId when membership found", async () => {
    mockFindOne.mockResolvedValue({ orgId: "org-123", userId: "user-1" });
    const { getUserOrgId } = await import("@/lib/org");
    const result = await getUserOrgId("user-1");
    expect(result).toBe("org-123");
    expect(mockFindOne).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("returns null when no membership found", async () => {
    mockFindOne.mockResolvedValue(null);
    const { getUserOrgId } = await import("@/lib/org");
    const result = await getUserOrgId("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when membership has no orgId", async () => {
    mockFindOne.mockResolvedValue({ userId: "user-1" });
    const { getUserOrgId } = await import("@/lib/org");
    const result = await getUserOrgId("user-1");
    expect(result).toBeNull();
  });

  it("handles database errors gracefully", async () => {
    mockFindOne.mockRejectedValue(new Error("DB error"));
    const { getUserOrgId } = await import("@/lib/org");
    await expect(getUserOrgId("user-1")).rejects.toThrow("DB error");
  });
});
