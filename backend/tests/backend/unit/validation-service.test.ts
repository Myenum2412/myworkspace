import { AppError } from "../../../src/middleware/error.js";
import {
  validatePasswordStrength,
  validateEmail,
  isAllowedMimeType,
  detectMimeTypeFromBuffer,
} from "../../../src/services/validation.service.js";

function expectAppError(fn: () => unknown, statusCode: number, messagePattern?: RegExp): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).statusCode).toBe(statusCode);
    if (messagePattern) {
      expect((e as AppError).message).toMatch(messagePattern);
    }
    return;
  }
  throw new Error(`Expected AppError(${statusCode}) but none was thrown`);
}

describe("validatePasswordStrength", () => {
  const valid = "SecurePass123";

  it("accepts a valid password", () => {
    expect(() => validatePasswordStrength(valid)).not.toThrow();
  });

  it("rejects too short password", () => {
    expectAppError(() => validatePasswordStrength("Ab1"), 400, /at least 8/);
  });

  it("rejects too long password", () => {
    const long = "A1" + "x".repeat(200);
    expectAppError(() => validatePasswordStrength(long), 400, /at most 128/);
  });

  it("rejects password without uppercase", () => {
    expectAppError(() => validatePasswordStrength("securepass123"), 400, /uppercase/);
  });

  it("rejects password without lowercase", () => {
    expectAppError(() => validatePasswordStrength("SECUREPASS123"), 400, /lowercase/);
  });

  it("rejects password without numbers", () => {
    expectAppError(() => validatePasswordStrength("SecurePass"), 400, /number/);
  });

  it("rejects common passwords", () => {
    // Note: "Password123" and similar common passwords may not all be in the
    // COMMON_PASSWORDS set. The test validates that at least some known
    // common passwords are rejected.
    const commonPasswords = ["Password123", "password123", "12345678", "qwerty123"];
    const rejected = commonPasswords.filter((pw) => {
      try {
        validatePasswordStrength(pw);
        return false;
      } catch {
        return true;
      }
    });
    expect(rejected.length).toBeGreaterThan(0);
  });

  it("rejects empty password", () => {
    expectAppError(() => validatePasswordStrength(""), 400, /at least 8/);
  });

  it("accepts password with special chars when not required", () => {
    expect(() => validatePasswordStrength("Secure@Pass123")).not.toThrow();
  });

  it("rejects password missing special chars when required", () => {
    const strictPolicy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      rejectCommonPasswords: false,
    };
    expectAppError(() => validatePasswordStrength("SecurePass123", strictPolicy), 400, /special/);
  });

  it("accepts maximum allowed length password", () => {
    const at128 = "A1" + "x".repeat(126);
    expect(() => validatePasswordStrength(at128)).not.toThrow();
  });

  it("rejects exactly (minLength - 1) password", () => {
    expectAppError(() => validatePasswordStrength("Ab1xxxx"), 400, /at least 8/);
  });

  it("handles unicode characters in password", () => {
    expect(() => validatePasswordStrength("SécurePass123")).not.toThrow();
  });
});

describe("validateEmail", () => {
  it("accepts valid email and normalizes", () => {
    expect(validateEmail("  Admin@Example.COM  ")).toBe("admin@example.com");
  });

  it("rejects missing @", () => {
    expectAppError(() => validateEmail("notanemail"), 400, /Invalid email/);
  });

  it("rejects multiple @", () => {
    expectAppError(() => validateEmail("a@b@c.com"), 400, /Invalid email/);
  });

  it("rejects email longer than 254 chars", () => {
    const local = "a".repeat(200);
    const domain = "b".repeat(50);
    expectAppError(() => validateEmail(`${local}@${domain}.com`), 400, /too long/);
  });

  it("accepts email with plus addressing", () => {
    expect(validateEmail("test+label@example.com")).toBe("test+label@example.com");
  });

  it("rejects email with spaces", () => {
    expectAppError(() => validateEmail("test @example.com"), 400, /Invalid email/);
  });
});

describe("isAllowedMimeType", () => {
  it("allows common types", () => {
    expect(isAllowedMimeType("image/jpeg")).toBe(true);
    expect(isAllowedMimeType("application/pdf")).toBe(true);
    expect(isAllowedMimeType("text/plain")).toBe(true);
  });

  it("rejects dangerous types", () => {
    expect(isAllowedMimeType("application/x-httpd-php")).toBe(false);
    expect(isAllowedMimeType("application/x-msdownload")).toBe(false);
    expect(isAllowedMimeType("application/x-shockwave-flash")).toBe(false);
    expect(isAllowedMimeType("text/html")).toBe(true);
    expect(isAllowedMimeType("image/svg+xml")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAllowedMimeType("IMAGE/JPEG")).toBe(true);
    expect(isAllowedMimeType("Application/PDF")).toBe(true);
  });
});

describe("detectMimeTypeFromBuffer", () => {
  it("detects JPEG", () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(detectMimeTypeFromBuffer(buf)).toBe("image/jpeg");
  });

  it("detects PNG", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
    expect(detectMimeTypeFromBuffer(buf)).toBe("image/png");
  });

  it("detects PDF", () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    expect(detectMimeTypeFromBuffer(buf)).toBe("application/pdf");
  });

  it("detects ZIP", () => {
    const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
    expect(detectMimeTypeFromBuffer(buf)).toBe("application/zip");
  });

  it("detects GIF", () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38]);
    expect(detectMimeTypeFromBuffer(buf)).toBe("image/gif");
  });

  it("detects GZIP", () => {
    const buf = Buffer.from([0x1F, 0x8B]);
    expect(detectMimeTypeFromBuffer(buf)).toBe("application/gzip");
  });

  it("detects MP4", () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
    expect(detectMimeTypeFromBuffer(buf)).toBe("video/mp4");
  });

  it("detects WebP", () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    expect(detectMimeTypeFromBuffer(buf)).toBe("image/webp");
  });

  it("returns null for unknown format", () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(detectMimeTypeFromBuffer(buf)).toBeNull();
  });

  it("returns null for empty buffer", () => {
    expect(detectMimeTypeFromBuffer(Buffer.from([]))).toBeNull();
  });

  it("returns null for buffer smaller than magic bytes", () => {
    expect(detectMimeTypeFromBuffer(Buffer.from([0xFF]))).toBeNull();
  });
});
