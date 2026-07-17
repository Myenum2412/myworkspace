/**
 * Unit tests for the input sanitizer middleware.
 */
import { describe, it, expect } from "@jest/globals";
import { sanitiseValue, inputSanitizer } from "../../../src/middleware/sanitize.js";

describe("sanitiseValue()", () => {
  it("removes <script> tags from strings", () => {
    expect(sanitiseValue('hello <script>alert("xss")</script> world')).toBe('hello alert("xss") world');
  });

  it("removes on* event handlers", () => {
    expect(sanitiseValue('<img src=x onerror=alert(1)>')).toBe("<img src=x alert(1)>");
  });

  it("removes javascript: URIs", () => {
    expect(sanitiseValue('<a href="javascript:alert(1)">click</a>')).toBe('<a href="alert(1)">click</a>');
  });

  it("removes data: URIs from script contexts", () => {
    expect(sanitiseValue('<embed src="data:text/html;base64,...">')).toBe('src=";base64,...">');
  });

  it("passes through safe strings unchanged", () => {
    expect(sanitiseValue("hello world")).toBe("hello world");
    expect(sanitiseValue("normal <b>html</b>")).toBe("normal <b>html</b>");
  });

  it("returns non-string values as-is", () => {
    expect(sanitiseValue(42)).toBe(42);
    expect(sanitiseValue(null)).toBe(null);
    expect(sanitiseValue(undefined)).toBe(undefined);
  });
});

describe("sanitiseValue() recursive", () => {
  it("recursively sanitizes nested objects", () => {
    const input = {
      name: '<script>alert(1)</script>',
      nested: {
        desc: '<img src=x onerror=alert(1)>',
      },
      safe: "hello",
    };
    const result = sanitiseValue(input) as Record<string, unknown>;
    expect(result.name).toBe("alert(1)");
    expect((result.nested as Record<string, unknown>).desc).toBe("<img src=x alert(1)>");
    expect(result.safe).toBe("hello");
  });

  it("sanitizes all string values in an array", () => {
    const input = ['<script>a</script>', 'safe', '<a href="javascript:void">link</a>'];
    const result = sanitiseValue(input) as string[];
    expect(result[0]).toBe("a");
    expect(result[1]).toBe("safe");
    expect(result[2]).toBe('<a href="void">link</a>');
  });
});

describe("inputSanitizer middleware", () => {
  it("is a function with arity 3 (req, res, next)", () => {
    expect(typeof inputSanitizer).toBe("function");
    expect(inputSanitizer.length).toBe(3);
  });
});
