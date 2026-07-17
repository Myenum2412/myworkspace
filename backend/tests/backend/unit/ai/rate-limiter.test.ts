import { RateLimiter } from "../../../../src/services/ai/rate-limiter.service.js";
import { connectTestDb, resetDb } from "../../../__helpers__/db.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeAll(async () => await connectTestDb());
  beforeEach(async () => {
    await resetDb();
    limiter = new RateLimiter();
  });

  afterEach(() => {
    limiter.destroy();
  });

  it("allows requests within limit", async () => {
    await expect(limiter.check("org-1", "user-1")).resolves.toBeUndefined();
  });

  it("returns remaining requests count", () => {
    const info = limiter.getRemainingRequests("org-1", "user-1");
    expect(info.remaining).toBeGreaterThan(0);
    expect(info.resetAt).toBeGreaterThan(Date.now());
  });

  it("resets for a specific user", () => {
    limiter.resetForUser("org-1", "user-1");
    const info = limiter.getRemainingRequests("org-1", "user-1");
    expect(info.remaining).toBe(100);
  });
});
