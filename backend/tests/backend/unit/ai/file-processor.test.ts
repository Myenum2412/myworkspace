import { FileProcessor } from "../../../../src/services/ai/file-processor.service.js";

describe("FileProcessor", () => {
  let processor: FileProcessor;

  beforeEach(() => {
    processor = new FileProcessor();
  });

  it("identifies supported file types", () => {
    expect(processor.isFileSupported("test.pdf")).toBe(true);
    expect(processor.isFileSupported("test.docx")).toBe(true);
    expect(processor.isFileSupported("test.xlsx")).toBe(true);
    expect(processor.isFileSupported("test.csv")).toBe(true);
    expect(processor.isFileSupported("test.png")).toBe(true);
    expect(processor.isFileSupported("test.jpg")).toBe(true);
  });

  it("rejects unsupported file types", () => {
    expect(processor.isFileSupported("test.exe")).toBe(false);
    expect(processor.isFileSupported("test.zip")).toBe(false);
    expect(processor.isFileSupported("test.mp3")).toBe(false);
  });

  it("returns list of supported types", () => {
    const types = processor.getSupportedTypes();
    expect(types).toContain("pdf");
    expect(types).toContain("docx");
    expect(types).toContain("csv");
    expect(types).toContain("png");
  });

  it("throws on unsupported file extension", async () => {
    await expect(async () => {
      await processor.processFiles([{ name: "test.exe", type: "application/x-msdownload", size: 1000 }]);
    }).rejects.toThrow("Unsupported file type");
  });

  it("throws on oversized files", async () => {
    await expect(async () => {
      await processor.processFiles([{ name: "test.pdf", type: "application/pdf", size: 100 * 1024 * 1024 }]);
    }).rejects.toThrow("File too large");
  });

  it("handles missing URLs gracefully", async () => {
    const results = await processor.processFiles([{ name: "test.txt", type: "text/plain", size: 100, url: "https://nonexistent.example/file.txt" }]);
    expect(results.length).toBe(1);
    expect(results[0]).toContain("Error reading");
  });

  it("returns empty array for empty file list", async () => {
    const results = await processor.processFiles([]);
    expect(results).toEqual([]);
  });
});
