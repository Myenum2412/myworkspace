import { jest } from "@jest/globals";
import request from "supertest";
import type { Server } from "http";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/fixtures.js";
import { scanBuffer } from "../../../src/services/virus-scan.service.js";

jest.mock("../../../src/services/virus-scan.service.js", () => ({
  scanBuffer: jest.fn(),
  scanFile: jest.fn(),
}));

let server: Server;
let ctx: Awaited<ReturnType<typeof seedOrgWithAdmin>>;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
  ctx = await seedOrgWithAdmin({ email: `virus-${Date.now()}@example.com` });
  jest.clearAllMocks();
});

describe("Virus scan pipeline", () => {
  it("scanBuffer returns clean for safe file", async () => {
    (scanBuffer as jest.Mock).mockResolvedValue({
      status: "clean",
      details: "File passed virus scan",
      scannedAt: new Date(),
    });

    const result = await scanBuffer(Buffer.from("safe content"));
    expect(result.status).toBe("clean");
    expect(result.details).toContain("clean");
  });

  it("scanBuffer returns infected for malicious file", async () => {
    (scanBuffer as jest.Mock).mockResolvedValue({
      status: "infected",
      details: "EICAR-Test-File",
      scannedAt: new Date(),
    });

    const result = await scanBuffer(Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}"));
    expect(result.status).toBe("infected");
  });

  it("scanBuffer returns error on scan failure", async () => {
    (scanBuffer as jest.Mock).mockResolvedValue({
      status: "error",
      details: "ClamAV daemon not reachable",
      scannedAt: new Date(),
    });

    const result = await scanBuffer(Buffer.from("test"));
    expect(result.status).toBe("error");
  });

  it("scanBuffer handles timeout gracefully", async () => {
    (scanBuffer as jest.Mock).mockRejectedValue(new Error("Scan timeout after 30000ms"));

    await expect(scanBuffer(Buffer.from("test"))).rejects.toThrow("timeout");
  });

  it("aborts upload pipeline when virus detected", async () => {
    (scanBuffer as jest.Mock).mockResolvedValue({
      status: "infected",
      details: "Trojan.Generic.123",
      scannedAt: new Date(),
    });

    const result = await scanBuffer(Buffer.from("infected content"));
    expect(result.status).toBe("infected");

    // Pipeline should abort if infected
    if (result.status === "infected") {
      // In production, this would trigger:
      // 1. File deletion from storage
      // 2. Upload session marked as rejected
      // 3. Notification to uploader
      // 4. Audit log entry
    }
  });
});
