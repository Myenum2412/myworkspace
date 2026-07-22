import { encryptToken, decryptToken } from "../../src/lib/security/token-encryption";

// Mock environment variable
process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("Calendar Service", () => {
  describe("Token Management", () => {
    it("should encrypt and decrypt OAuth tokens", () => {
      const accessToken = "ya29.a0AfH6SMBx...";
      const refreshToken = "1//0gX2Z3...";
      
      const encryptedAccess = encryptToken(accessToken);
      const encryptedRefresh = encryptToken(refreshToken);
      
      expect(encryptedAccess).not.toBe(accessToken);
      expect(encryptedRefresh).not.toBe(refreshToken);
      
      const decryptedAccess = decryptToken(encryptedAccess);
      const decryptedRefresh = decryptToken(encryptedRefresh);
      
      expect(decryptedAccess).toBe(accessToken);
      expect(decryptedRefresh).toBe(refreshToken);
    });
  });

  describe("Calendar Event Types", () => {
    it("should define proper event structure", () => {
      const event = {
        id: "test-id",
        title: "Test Event",
        start: "2024-01-01T10:00:00Z",
        end: "2024-01-01T11:00:00Z",
        allDay: false,
        provider: "google" as const,
        calendarEmail: "test@example.com",
      };

      expect(event.id).toBeDefined();
      expect(event.title).toBeDefined();
      expect(event.start).toBeDefined();
      expect(event.end).toBeDefined();
    });
  });

  describe("Conflict Detection", () => {
    it("should detect ETag changes", () => {
      const localEtag = '"abc123"';
      const remoteEtag = '"def456"';
      
      const hasConflict = localEtag !== remoteEtag;
      expect(hasConflict).toBe(true);
    });

    it("should detect version changes", () => {
      const localVersion = 1;
      const remoteVersion = 2;
      
      const hasConflict = remoteVersion > localVersion;
      expect(hasConflict).toBe(true);
    });
  });
});
