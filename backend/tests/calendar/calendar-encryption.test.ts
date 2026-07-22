import { encryptToken, decryptToken, isTokenEncrypted } from "../../src/lib/security/token-encryption";

// Mock environment variable
process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("Token Encryption", () => {
  describe("encryptToken", () => {
    it("should encrypt a token", () => {
      const plaintext = "test-access-token-12345";
      const encrypted = encryptToken(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(isTokenEncrypted(encrypted)).toBe(true);
    });

    it("should produce different ciphertext for same plaintext (random IV)", () => {
      const plaintext = "test-access-token-12345";
      const encrypted1 = encryptToken(plaintext);
      const encrypted2 = encryptToken(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe("decryptToken", () => {
    it("should decrypt an encrypted token", () => {
      const plaintext = "test-access-token-12345";
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle empty string", () => {
      const plaintext = "";
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle long tokens", () => {
      const plaintext = "a".repeat(1000);
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw on invalid format", () => {
      expect(() => decryptToken("invalid")).toThrow("Invalid encrypted token format");
    });

    it("should throw on corrupted data", () => {
      const encrypted = encryptToken("test");
      const parts = encrypted.split(":");
      parts[3] = "corrupted"; // Corrupt the encrypted data
      const corrupted = parts.join(":");

      expect(() => decryptToken(corrupted)).toThrow();
    });
  });

  describe("isTokenEncrypted", () => {
    it("should return true for encrypted tokens", () => {
      const encrypted = encryptToken("test");
      expect(isTokenEncrypted(encrypted)).toBe(true);
    });

    it("should return false for plain text", () => {
      expect(isTokenEncrypted("plain-text-token")).toBe(false);
    });

    it("should return false for partial hex", () => {
      expect(isTokenEncrypted("abc:def:ghi:jkl")).toBe(false);
    });

    it("should return false for wrong number of parts", () => {
      expect(isTokenEncrypted("abc:def:ghi")).toBe(false);
      expect(isTokenEncrypted("abc:def:ghi:jkl:mno")).toBe(false);
    });
  });
});
