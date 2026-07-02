/**
 * Unit tests for upload-security.ts — magic-byte validation & MIME categorisation.
 */
import { describe, it, expect } from "@jest/globals";
import { categoriseMime, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES, ALLOWED_ARCHIVE_TYPES } from "../../../src/lib/upload-security.js";

describe("categoriseMime()", () => {
  it("returns 'image' for known image types", () => {
    for (const mime of ALLOWED_IMAGE_TYPES) {
      expect(categoriseMime(mime)).toBe("image");
    }
  });

  it("returns 'document' for known document types", () => {
    for (const mime of ALLOWED_DOCUMENT_TYPES) {
      expect(categoriseMime(mime)).toBe("document");
    }
  });

  it("returns 'archive' for known archive types", () => {
    for (const mime of ALLOWED_ARCHIVE_TYPES) {
      expect(categoriseMime(mime)).toBe("archive");
    }
  });

  it("returns 'other' for unrecognised MIME types", () => {
    expect(categoriseMime("application/x-unknown")).toBe("other");
    expect(categoriseMime("text/calendar")).toBe("other");
  });

  it("returns 'other' for empty string", () => {
    expect(categoriseMime("")).toBe("other");
  });
});

describe("allowed type sets", () => {
  it("image types include common web formats", () => {
    expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/gif");
  });

  it("document types include PDF and Office formats", () => {
    expect(ALLOWED_DOCUMENT_TYPES).toContain("application/pdf");
    expect(ALLOWED_DOCUMENT_TYPES).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(ALLOWED_DOCUMENT_TYPES).toContain("text/plain");
  });

  it("archive types include zip and gzip", () => {
    expect(ALLOWED_ARCHIVE_TYPES).toContain("application/zip");
    expect(ALLOWED_ARCHIVE_TYPES).toContain("application/gzip");
  });
});
