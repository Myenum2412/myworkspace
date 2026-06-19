import { describe, it, expect } from "@jest/globals";
import { AppError, errorHandler } from "../../src/middleware/error.js";

function mockRes() {
  const state: any = {};
  const res = {
    status: (code: number) => {
      state.statusCode = code;
      return { json: (body: any) => { state.body = body; } };
    },
    _state: state,
  };
  return res;
}

describe("AppError", () => {
  it("creates error with status and message", () => {
    const err = new AppError(404, "Not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("AppError");
  });
});

describe("errorHandler", () => {
  it("handles AppError with correct status", () => {
    const err = new AppError(400, "Bad request");
    const res = mockRes() as any;
    errorHandler(err, {} as any, res, {} as any);
    expect(res._state.statusCode).toBe(400);
    expect(res._state.body).toEqual({ success: false, error: "Bad request" });
  });

  it("falls back to 500 for unknown errors", () => {
    const err = new Error("Unexpected");
    const res = mockRes() as any;
    errorHandler(err, {} as any, res, {} as any);
    expect(res._state.statusCode).toBe(500);
    expect(res._state.body).toEqual({ success: false, error: "Internal server error" });
  });
});
