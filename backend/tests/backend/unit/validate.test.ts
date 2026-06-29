import { AppError } from "../../../src/middleware/error.js";
import {
  requireString,
  requireEmail,
  requireEnum,
  optionalString,
  optionalArray,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../../../src/lib/validate.js";

function expectAppError(fn: () => unknown, fields: string[]): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).statusCode).toBe(400);
    for (const f of fields) {
      expect((e as AppError).fields).toHaveProperty(f);
    }
    return;
  }
  throw new Error("Expected AppError but none was thrown");
}

describe("requireString", () => {
  it("accepts a normal string", () => {
    expect(requireString("hello", "name")).toBe("hello");
  });
  it("trims surrounding whitespace", () => {
    expect(requireString("  hi  ", "x")).toBe("hi");
  });
  it("rejects non-strings", () => {
    expectAppError(() => requireString(123 as any, "x"), ["x"]);
  });
  it("rejects empty after trim", () => {
    expectAppError(() => requireString("   ", "x"), ["x"]);
  });
  it("rejects too short", () => {
    expectAppError(() => requireString("ab", "x", { min: 5 }), ["x"]);
  });
  it("rejects too long", () => {
    const long = "a".repeat(501);
    expectAppError(() => requireString(long, "x", { max: 500 }), ["x"]);
  });
});

describe("requireEmail", () => {
  it("accepts valid email and lowercases", () => {
    expect(requireEmail("  Admin@Example.COM  ")).toBe("admin@example.com");
  });
  it("rejects malformed email", () => {
    expectAppError(() => requireEmail("not-an-email"), ["email"]);
  });
  it("rejects too short", () => {
    expectAppError(() => requireEmail("a@b"), ["email"]);
  });
});

describe("requireEnum", () => {
  it("accepts allowed value", () => {
    expect(requireEnum("high", TASK_PRIORITIES, "priority")).toBe("high");
  });
  it("rejects value outside enum", () => {
    expectAppError(() => requireEnum("banana", TASK_PRIORITIES, "priority"), ["priority"]);
  });
  it("rejects non-string", () => {
    expectAppError(() => requireEnum(5 as any, TASK_STATUSES, "status"), ["status"]);
  });
});

describe("optionalString", () => {
  it("returns undefined for undefined/null", () => {
    expect(optionalString(undefined, "x")).toBeUndefined();
    expect(optionalString(null, "x")).toBeUndefined();
  });
  it("trims and returns a string", () => {
    expect(optionalString("  hi  ", "x")).toBe("hi");
  });
  it("rejects non-string when provided", () => {
    expectAppError(() => optionalString(7 as any, "x"), ["x"]);
  });
});

describe("optionalArray", () => {
  it("returns undefined for undefined/null", () => {
    expect(optionalArray(undefined, "x")).toBeUndefined();
  });
  it("accepts an array", () => {
    expect(optionalArray(["a", "b"], "x")).toEqual(["a", "b"]);
  });
  it("rejects non-array", () => {
    expectAppError(() => optionalArray("nope" as any, "x"), ["x"]);
  });
  it("rejects oversized array", () => {
    expectAppError(() => optionalArray(new Array(1001).fill("x"), "x", { max: 1000 }), ["x"]);
  });
});
