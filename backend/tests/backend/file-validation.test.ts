import {
  validateFileExtension,
} from "../../src/services/validation.service.js";

describe("validateFileExtension", () => {
  it("returns true for valid extension matching mime type", () => {
    expect(validateFileExtension("report.pdf", "application/pdf")).toBe(true);
  });

  it("returns true for valid image extension matching mime type", () => {
    expect(validateFileExtension("photo.png", "image/png")).toBe(true);
  });

  it("returns true for valid jpeg extension matching mime type", () => {
    expect(validateFileExtension("image.jpg", "image/jpeg")).toBe(true);
  });

  it("returns false for mismatched extension and mime type", () => {
    expect(validateFileExtension("malicious.pdf", "image/png")).toBe(false);
  });

  it("returns false for png claimed as jpeg", () => {
    expect(validateFileExtension("fake.png", "image/jpeg")).toBe(false);
  });

  it("returns true for unknown extension (graceful fallback)", () => {
    expect(validateFileExtension("file.xyz", "application/octet-stream")).toBe(true);
  });

  it("returns true for file with no extension", () => {
    expect(validateFileExtension("README", "text/plain")).toBe(true);
  });

  it("returns false for docx claimed as zip", () => {
    expect(validateFileExtension("doc.docx", "application/zip")).toBe(false);
  });
});
