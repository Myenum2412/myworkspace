import { FileProcessor } from "../../../../src/services/ai/file-processor.service.js";

describe("AI File Upload Integration", () => {
  let processor: FileProcessor;

  beforeEach(() => {
    processor = new FileProcessor();
  });

  it("validates various file types", () => {
    const validFiles = ["document.pdf", "report.docx", "data.xlsx", "list.csv", "photo.png", "image.jpg", "picture.jpeg", "graphic.gif", "icon.webp", "notes.txt"];
    const invalidFiles = ["script.exe", "archive.zip", "audio.mp3", "video.mp4", "font.ttf"];

    validFiles.forEach(f => expect(processor.isFileSupported(f)).toBe(true));
    invalidFiles.forEach(f => expect(processor.isFileSupported(f)).toBe(false));
  });

  it("rejects files with unsupported extensions during processing", async () => {
    await expect(processor.processFiles([
      { name: "malware.exe", type: "application/x-msdownload", size: 1000 },
    ])).rejects.toThrow("Unsupported file type");
  });

  it("rejects oversized files", async () => {
    const oversized = 100 * 1024 * 1024;
    await expect(processor.processFiles([
      { name: "large.pdf", type: "application/pdf", size: oversized },
    ])).rejects.toThrow("File too large");
  });

  it("processes empty file list gracefully", async () => {
    const result = await processor.processFiles([]);
    expect(result).toEqual([]);
  });
});
