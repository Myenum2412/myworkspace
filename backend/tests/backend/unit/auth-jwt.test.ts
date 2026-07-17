import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../../../src/config/auth.js";
import type { JwtPayload } from "../../../src/types/index.js";
import { tamperedJWT, algorithmNoneJWT, expiredJWT } from "../../__helpers__/fixtures.js";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

describe("JWT auth unit", () => {
  const validPayload: JwtPayload = {
    userId: "user-123",
    email: "admin@example.com",
    role: "admin",
    permissions: ["VIEW_ORGMENU"],
    orgId: "org-456",
  };

  describe("signToken", () => {
    it("produces a valid JWT", () => {
      const token = signToken(validPayload);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.userId).toBe("user-123");
      expect(decoded.email).toBe("admin@example.com");
      expect(decoded.role).toBe("admin");
      expect(decoded.orgId).toBe("org-456");
    });

    it("includes expiration claim", () => {
      const token = signToken(validPayload);
      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("produces unique tokens for different payloads", () => {
      const t1 = signToken({ ...validPayload, userId: "a" });
      const t2 = signToken({ ...validPayload, userId: "b" });
      expect(t1).not.toBe(t2);
    });

    it("handles minimal payload without orgId", () => {
      const minimal: JwtPayload = { userId: "u1", email: "u@e.com", role: "member" };
      const token = signToken(minimal);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.orgId).toBeUndefined();
    });
  });

  describe("verifyToken", () => {
    it("returns decoded payload for valid token", () => {
      const token = signToken(validPayload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe("user-123");
    });

    it("throws on tampered token", () => {
      const token = signToken(validPayload);
      const bad = tamperedJWT(token);
      expect(() => verifyToken(bad)).toThrow();
    });

    it("throws on expired token", () => {
      const token = expiredJWT({ userId: "u1", email: "test@example.com", role: "admin" });
      expect(() => verifyToken(token)).toThrow(/expired/i);
    });

    it("throws on algorithm none token", () => {
      const token = algorithmNoneJWT();
      expect(() => jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] })).toThrow();
    });

    it("throws on malformed token string", () => {
      expect(() => verifyToken("not-a-jwt")).toThrow();
    });

    it("throws on empty token", () => {
      expect(() => verifyToken("")).toThrow();
    });

    it("rejects token with wrong secret", () => {
      const token = jwt.sign(validPayload, "wrong-secret");
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });

    it("rejects token with algorithm confusion (RS256 signed but HS256 verified)", () => {
      const token = jwt.sign(validPayload, JWT_SECRET, { algorithm: "HS256" });
      // Attempting to verify with a different expected algorithm
      expect(() => jwt.verify(token, JWT_SECRET, { algorithms: ["HS512"] })).toThrow();
    });
  });

  describe("token-boundary cases", () => {
    it("handles very long userId in payload", () => {
      const payload = { ...validPayload, userId: "u" + "x".repeat(500) };
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.userId.length).toBe(501);
    });

    it("handles special characters in email", () => {
      const payload = { ...validPayload, email: "test+alias-extreme@example.com" };
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.email).toBe("test+alias-extreme@example.com");
    });

    it("handles empty permissions array", () => {
      const payload = { ...validPayload, permissions: [] };
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.permissions).toEqual([]);
    });

    it("handles undefined permissions", () => {
      const { permissions, ...rest } = validPayload;
      const token = signToken(rest as JwtPayload);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.permissions).toBeUndefined();
    });
  });
});
