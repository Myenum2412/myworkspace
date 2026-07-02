/**
 * Unit tests for the input sanitizer middleware.
 */
import { describe, it, expect } from "@jest/globals";
import { sanitizeValue, deepSanitize, inputSanitizer } from "../../../src/middleware/sanitize.js";

describe("sanitizeValue()", () => {
  it("removes <script> tags from strings", () => {
    expect(sanitizeValue('hello <script>alert("xss")</script> world')).toBe("hello  world");
  });

  it("removes on* event handlers", () => {
    expect(sanitizeValue('<img src=x onerror=alert(1)>')).toBe("<img src=x >");
  });

  it("removes javascript: URIs", () => {
    expect(sanitizeValue('<a href="javascript:alert(1)">click</a>')).toBe('<a href="">click</a>');
  });

  it("removes data: URIs from script contexts", () => {
    expect(sanitizeValue('<embed src="data:text/html;base64,...">')).toBe('<embed src="">');
  });

  it("passes through safe strings unchanged", () => {
    expect(sanitizeValue("hello world")).toBe("hello world");
    expect(sanitizeValue("normal <b>html</b>")).toBe("normal <b>html</b>");
  });

  it("returns non-string values as-is", () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(null)).toBe(null);
    expect(sanitizeValue(undefined)).toBe(undefined);
  });
});

describe("deepSanitize()", () => {
  it("recursively sanitizes nested objects", () => {
    const input = {
      name: '<script>alert(1)</script>',
      nested: {
        desc: '<img src=x onerror=alert(1)>',
      },
      safe: "hello",
    };
    const result = deepSanitize(input);
    expect(result.name).toBe("");
    expect(result.nested.desc).toBe("<img src=x >");
    expect(result.safe).toBe("hello");
  });

  it("sanitizes all string values in an array", () => {
    const input = ['<script>a</script>', 'safe', '<a href="javascript:void">link</a>'];
    const result = deepSanitize(input);
    expect(result[0]).toBe("");
    expect(result[1]).toBe("safe");
    expect(result[2]).toBe('<a href="">link</a>');
  });
});

describe("inputSanitizer middleware", () => {
  it("is a function with arity 3 (req, res, next)", () => {
    expect(typeof inputSanitizer).toBe("function");
    expect(inputSanitizer.length).toBe(3);
  });
});
