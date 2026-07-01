import { AppError } from "../../../src/middleware/error.js";
import {
  validatePasswordStrength,
  validateFileMagicBytes,
  PasswordPolicy,
} from "../../../src/services/validation.service.js";

describe("validatePasswordStrength", () => {
  it("accepts a strong password with all requirements", () => {
    expect(() => validatePasswordStrength("StrongP1")).not.toThrow();
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(() => validatePasswordStrength("Ab1")).toThrow(AppError);
    expect(() => validatePasswordStrength("Ab1")).toThrow("at least 8 characters");
  });

  it("rejects a password longer than 128 characters", () => {
    const long = "A1b" + "x".repeat(130);
    expect(() => validatePasswordStrength(long)).toThrow(AppError);
    expect(() => validatePasswordStrength(long)).toThrow("at most 128 characters");
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(() => validatePasswordStrength("strongp1")).toThrow(AppError);
    expect(() => validatePasswordStrength("strongp1")).toThrow("uppercase");
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(() => validatePasswordStrength("STRONGP1")).toThrow(AppError);
    expect(() => validatePasswordStrength("STRONGP1")).toThrow("lowercase");
  });

  it("rejects a password missing a number", () => {
    expect(() => validatePasswordStrength("StrongAbc")).toThrow(AppError);
    expect(() => validatePasswordStrength("StrongAbc")).toThrow("number");
  });

  it("rejects a common password", () => {
    expect(() => validatePasswordStrength("Password123")).toThrow(AppError);
    expect(() => validatePasswordStrength("Password123")).toThrow("too common");
  });

  it("rejects a common password regardless of case", () => {
    expect(() => validatePasswordStrength("PASSWORD123")).toThrow(AppError);
  });

  it("rejects a password missing a special character when required", () => {
    const policy: PasswordPolicy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      rejectCommonPasswords: false,
    };
    expect(() => validatePasswordStrength("StrongPass1", policy)).toThrow(AppError);
    expect(() => validatePasswordStrength("StrongPass1", policy)).toThrow("special character");
  });

  it("accepts a password with a special character when required", () => {
    const policy: PasswordPolicy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      rejectCommonPasswords: false,
    };
    expect(() => validatePasswordStrength("StrongP@1", policy)).not.toThrow();
  });

  it("honours a custom minLength policy", () => {
    const policy: PasswordPolicy = {
      minLength: 12,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      rejectCommonPasswords: false,
    };
    expect(() => validatePasswordStrength("Short1A", policy)).toThrow("at least 12");
  });

  it("honours a custom maxLength policy", () => {
    const policy: PasswordPolicy = {
      minLength: 1,
      maxLength: 4,
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
      rejectCommonPasswords: false,
    };
    expect(() => validatePasswordStrength("toolong", policy)).toThrow("at most 4");
  });

  it("passes a strong password with all requirements met", () => {
    expect(() => validatePasswordStrength("CorrectH0rse!")).not.toThrow();
  });
});

describe("validateFileMagicBytes", () => {
  it("detects a JPEG image from magic bytes", () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const result = validateFileMagicBytes(buf, "image/jpeg");
    expect(result).toBe("image/jpeg");
  });

  it("detects a PNG image from magic bytes", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const result = validateFileMagicBytes(buf, "image/png");
    expect(result).toBe("image/png");
  });

  it("detects a PDF from magic bytes", () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]);
    const result = validateFileMagicBytes(buf, "application/pdf");
    expect(result).toBe("application/pdf");
  });

  it("detects a ZIP archive from magic bytes", () => {
    const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
    const result = validateFileMagicBytes(buf, "application/zip");
    expect(result).toBe("application/zip");
  });

  it("returns the detected type when declared category differs", () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const result = validateFileMagicBytes(png, "application/pdf");
    expect(result).toBe("image/png");
  });

  it("returns detected type when declared is application/octet-stream", () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const result = validateFileMagicBytes(png, "application/octet-stream");
    expect(result).toBe("image/png");
  });

  it("returns declared type for unrecognised binary buffer when not text", () => {
    const buf = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]);
    const result = validateFileMagicBytes(buf, "application/x-some-custom");
    expect(result).toBe("application/x-some-custom");
  });

  it("returns text/plain when buffer looks like text", () => {
    const text = Buffer.from("A".repeat(500));
    const result = validateFileMagicBytes(text, "application/x-some-custom");
    expect(result).toBe("text/plain");
  });

  it("returns octet-stream for unrecognised buffer declared as octet-stream", () => {
    const buf = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]);
    const result = validateFileMagicBytes(buf, "application/octet-stream");
    expect(result).toBe("application/octet-stream");
  });
});
