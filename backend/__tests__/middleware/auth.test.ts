import { describe, it, expect } from "@jest/globals";
import express from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../../src/middleware/auth.js";
import type { AuthRequest } from "../../src/types/index.js";

function createReq(headers: Record<string, string> = {}): AuthRequest {
  return { headers, get: (name: string) => headers[name.toLowerCase()] || null } as any;
}
function createRes() {
  const state: { statusCode?: number; body?: any } = {};
  return {
    status: (code: number) => {
      state.statusCode = code;
      return { json: (body: any) => { state.body = body; } };
    },
    json: (body: any) => { state.body = body; },
    _state: state,
  } as any;
}

describe("authenticate middleware", () => {
  it("passes with valid Bearer token", () => {
    const token = jwt.sign({ userId: "u1", email: "a@b.com", role: "admin" }, "myworkspace-dev-secret-change-in-production");
    const req = createReq({ authorization: `Bearer ${token}` });
    const res = createRes();
    const next = () => {};

    authenticate(req, res, next);

    expect(req.user?.userId).toBe("u1");
    expect(req.user?.email).toBe("a@b.com");
  });

  it("rejects missing auth header", () => {
    const req = createReq({});
    const res = createRes();
    let called = false;
    const next = () => { called = true; };

    authenticate(req, res, next);

    expect(called).toBe(false);
    expect(res._state.statusCode).toBe(401);
    expect(res._state.body?.error).toBe("Authentication required");
  });

  it("rejects invalid token", () => {
    const req = createReq({ authorization: "Bearer bad-token" });
    const res = createRes();
    let called = false;
    const next = () => { called = true; };

    authenticate(req, res, next);

    expect(called).toBe(false);
    expect(res._state.statusCode).toBe(401);
  });
});
