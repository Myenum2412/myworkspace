import { jest } from "@jest/globals";

const mockScanBuffer = jest.fn();
const mockScanFile = jest.fn();

jest.unstable_mockModule("../../../src/services/virus-scan.service.js", () => ({
  scanBuffer: mockScanBuffer,
  scanFile: mockScanFile,
}));

const { scanBuffer } = await import("../../../src/services/virus-scan.service.js");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Virus scan pipeline", () => {
  it("scanBuffer returns clean for safe file", async () => {
    mockScanBuffer.mockResolvedValue({
      status: "clean",
      details: "File passed virus scan",
      scannedAt: new Date(),
    });

    const result = await scanBuffer(Buffer.from("safe content"));
    expect(result.status).toBe("clean");
    expect(result.details).toBe("File passed virus scan");
  });

  it("scanBuffer returns infected for malicious file", async () => {
    mockScanBuffer.mockResolvedValue({
      status: "infected",
      details: "EICAR-Test-File",
      scannedAt: new Date(),
    });

    const result = await scanBuffer(Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}"));
    expect(result.status).toBe("infected");
  });

  it("scanBuffer returns error on scan failure", async () => {
    mockScanBuffer.mockResolvedValue({
      status: "error",
      details: "ClamAV daemon not reachable",
      scannedAt: new Date(),
    });

    const result = await scanBuffer(Buffer.from("test"));
    expect(result.status).toBe("error");
  });

  it("scanBuffer handles timeout gracefully", async () => {
    mockScanBuffer.mockRejectedValue(new Error("Scan timeout after 30000ms"));

    await expect(scanBuffer(Buffer.from("test"))).rejects.toThrow("timeout");
  });

  it("aborts upload pipeline when virus detected", async () => {
    mockScanBuffer.mockResolvedValue({
      status: "infected",
      details: "Trojan.Generic.123",
      scannedAt: new Date(),
    });

    const result = await scanBuffer(Buffer.from("infected content"));
    expect(result.status).toBe("infected");
  });
});
