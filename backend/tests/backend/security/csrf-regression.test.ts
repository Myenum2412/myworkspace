import { jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import { csrfProtection } from "../../../src/lib/csrf.js";

function makeReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: "GET",
    path: "/api/tasks",
    headers: {},
    cookies: {},
    ...overrides,
  };
}

function makeRes() {
  const res: any = {
    _status: 200,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
    cookie() {
      return this;
    },
  };
  return res;
}

describe("CSRF protection regression", () => {
  describe("Bearer-token authentication", () => {
    it("allows unsafe methods without a CSRF header/token (regression: previously 403)", () => {
      const req = makeReq({
        method: "POST",
        path: "/api/tasks",
        headers: { authorization: "Bearer abc.def.ghi" },
      });
      const res = makeRes();
      const next = jest.fn();
      csrfProtection()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
      expect(res._status).toBe(200);
    });

    it("allows unsafe methods for Bearer requests even when a stale csrf cookie exists", () => {
      const req = makeReq({
        method: "POST",
        path: "/api/tasks",
        headers: { authorization: "Bearer abc.def.ghi" },
        cookies: { "csrf-token": "sometoken" },
      });
      const res = makeRes();
      const next = jest.fn();
      csrfProtection()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Cookie-based authentication", () => {
    it("rejects unsafe methods when no CSRF header is sent", () => {
      const req = makeReq({ method: "POST", path: "/api/tasks" });
      const res = makeRes();
      const next = jest.fn();
      csrfProtection()(req as Request, res as Response, next as NextFunction);
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(403);
      expect(res._body?.error).toBe("CSRF token missing");
    });

    it("rejects unsafe methods when the header does not match the cookie", () => {
      const req = makeReq({
        method: "POST",
        path: "/api/tasks",
        cookies: { "csrf-token": "a".repeat(64) },
        headers: { "x-csrf-token": "b".repeat(64) },
      });
      const res = makeRes();
      const next = jest.fn();
      csrfProtection()(req as Request, res as Response, next as NextFunction);
      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(403);
      expect(res._body?.error).toBe("CSRF token mismatch");
    });

    it("allows unsafe methods when the header matches the cookie", () => {
      const token = "c".repeat(64);
      const req = makeReq({
        method: "POST",
        path: "/api/tasks",
        cookies: { "csrf-token": token },
        headers: { "x-csrf-token": token },
      });
      const res = makeRes();
      const next = jest.fn();
      csrfProtection()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Safe methods and exempt paths", () => {
    it("allows GET without any token", () => {
      const req = makeReq({ method: "GET", path: "/api/tasks" });
      const res = makeRes();
      const next = jest.fn();
      csrfProtection()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });

    it("allows unsafe methods on exempt auth paths", () => {
      const req = makeReq({ method: "POST", path: "/api/auth/login" });
      const res = makeRes();
      const next = jest.fn();
      csrfProtection()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });

    it("allows unsafe methods on /api/accounts paths", () => {
      const req = makeReq({ method: "POST", path: "/api/accounts/staffs" });
      const res = makeRes();
      const next = jest.fn();
      csrfProtection()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
  });
});
