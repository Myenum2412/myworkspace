import { describe, it, expect } from "vitest";

function getRedirectPath(role?: string): string {
  if (role === "ORG_MENU_ADMIN" || role === "SUPER_ADMIN") return "/orgmenu";
  return "/dashboard";
}

describe("auth utilities", () => {
  describe("getRedirectPath", () => {
    it("redirects ORG_MENU_ADMIN to /orgmenu", () => {
      expect(getRedirectPath("ORG_MENU_ADMIN")).toBe("/orgmenu");
    });

    it("redirects SUPER_ADMIN to /orgmenu", () => {
      expect(getRedirectPath("SUPER_ADMIN")).toBe("/orgmenu");
    });

    it("redirects other roles to /dashboard", () => {
      expect(getRedirectPath("admin")).toBe("/dashboard");
      expect(getRedirectPath("member")).toBe("/dashboard");
      expect(getRedirectPath(undefined)).toBe("/dashboard");
      expect(getRedirectPath("")).toBe("/dashboard");
      expect(getRedirectPath("manager")).toBe("/dashboard");
    });
  });
});

describe("password validation logic", () => {
  function validatePassword(password: string, confirm: string): string | null {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== confirm) return "Passwords do not match";
    return null;
  }

  it("accepts valid password", () => {
    expect(validatePassword("Password123", "Password123")).toBeNull();
  });

  it("rejects empty password", () => {
    expect(validatePassword("", "")).toBe("Password is required");
  });

  it("rejects short password", () => {
    expect(validatePassword("1234567", "1234567")).toBe("Password must be at least 8 characters");
  });

  it("rejects mismatched passwords", () => {
    expect(validatePassword("Password123", "Password456")).toBe("Passwords do not match");
  });
});

describe("signup form validation", () => {
  function validateSignup(formData: Record<string, string>): string | null {
    const { name, email, password, confirm } = formData;
    if (!name || !email || !password) return "Name, email, and password are required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== confirm) return "Passwords do not match";
    return null;
  }

  it("passes with all valid fields", () => {
    expect(validateSignup({ name: "Alice", email: "a@b.com", password: "12345678", confirm: "12345678" })).toBeNull();
  });

  it("rejects missing name", () => {
    expect(validateSignup({ name: "", email: "a@b.com", password: "12345678", confirm: "12345678" }))
      .toBe("Name, email, and password are required");
  });

  it("rejects missing email", () => {
    expect(validateSignup({ name: "Alice", email: "", password: "12345678", confirm: "12345678" }))
      .toBe("Name, email, and password are required");
  });

  it("rejects missing password", () => {
    expect(validateSignup({ name: "Alice", email: "a@b.com", password: "", confirm: "" }))
      .toBe("Name, email, and password are required");
  });

  it("rejects short password", () => {
    expect(validateSignup({ name: "Alice", email: "a@b.com", password: "short", confirm: "short" }))
      .toBe("Password must be at least 8 characters");
  });

  it("rejects mismatched passwords", () => {
    expect(validateSignup({ name: "Alice", email: "a@b.com", password: "12345678", confirm: "87654321" }))
      .toBe("Passwords do not match");
  });
});
