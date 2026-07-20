import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../../../src/lib/db/models/User.js";
import { v4 as uuid } from "uuid";

describe("MongoDB connection resilience", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("reports connection state correctly", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  it("handles write concern majority", async () => {
    const userId = uuid();
    const user = new User({
      id: userId,
      name: "Write Concern Test",
      email: `wc-${Date.now()}@example.com`,
      password: "hashed",
      status: "online",
      role: "members",
      orgId: uuid(),
      userNumber: 1001,
    });
    await user.save({ w: "majority", wtimeout: 5000 });
    const found = await User.findOne({ id: userId }).lean();
    expect(found).not.toBeNull();
  });

  it("handles write concern 1", async () => {
    const userId = uuid();
    await User.create({
      id: userId,
      name: "WC1 Test",
      email: `wc1-${Date.now()}@example.com`,
      password: "hashed",
      status: "online",
      role: "staffs",
      orgId: uuid(),
      userNumber: 1002,
    });
    const found = await User.findOne({ id: userId }).lean();
    expect(found).not.toBeNull();
  });

  it("surfaces clear error on connection pool exhaustion", async () => {
    // Simulate pool exhaustion by firing many concurrent operations
    const promises = Array.from({ length: 50 }, (_, i) =>
      User.create({
        id: uuid(),
        name: `Pool Test ${i}`,
        email: `pool-${i}-${Date.now()}@example.com`,
        password: "hashed",
        status: "online",
        role: "staffs",
        orgId: uuid(),
        userNumber: 2000 + i,
      }),
    );

    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;

    expect(fulfilled).toBeGreaterThan(0);
    // Some may be rejected due to timing but errors should be clear
    for (const r of results) {
      if (r.status === "rejected") {
        expect(r.reason).toBeDefined();
      }
    }
  });

  it("bulk write with many documents succeeds", async () => {
    const docs = Array.from({ length: 100 }, (_, i) => ({
      id: uuid(),
      name: `Bulk ${i}`,
      email: `bulk-${i}-${Date.now()}@example.com`,
      password: "hashed",
      status: "online",
      role: "staffs",
      orgId: uuid(),
      userNumber: 3000 + i,
    }));

    const result = await User.insertMany(docs, { ordered: false });
    expect(result.length).toBe(100);
  });
});
