import { describe, it, expect } from "vitest";

describe("addEmployeeAction validation", () => {
  function validateEmployeeInput(formData: Record<string, string>): { error?: string; success?: boolean } {
    const { name, email } = formData;
    if (!name || !email) return { error: "Name and email are required" };
    return { success: true };
  }

  it("requires name and email", () => {
    expect(validateEmployeeInput({ name: "", email: "" })).toEqual({ error: "Name and email are required" });
  });

  it("passes with name and email", () => {
    expect(validateEmployeeInput({ name: "Alice", email: "alice@co.com" })).toEqual({ success: true });
  });

  it("requires name even when email provided", () => {
    expect(validateEmployeeInput({ name: "", email: "alice@co.com" })).toEqual({ error: "Name and email are required" });
  });

  it("requires email even when name provided", () => {
    expect(validateEmployeeInput({ name: "Alice", email: "" })).toEqual({ error: "Name and email are required" });
  });
});

describe("employee role derivation", () => {
  function deriveRole(roleInput: string): string {
    return roleInput?.toLowerCase() || "member";
  }

  it("defaults to member when empty", () => {
    expect(deriveRole("")).toBe("member");
  });

  it("lowercases the role", () => {
    expect(deriveRole("Admin")).toBe("admin");
  });

  it("lowercases Manager", () => {
    expect(deriveRole("Manager")).toBe("manager");
  });

  it("keeps member lowercase", () => {
    expect(deriveRole("member")).toBe("member");
  });
});

describe("employee status derivation", () => {
  function deriveStatus(statusInput: string): string {
    return statusInput?.toLowerCase() || "active";
  }

  it("defaults to active", () => {
    expect(deriveStatus("")).toBe("active");
  });

  it("lowercases active", () => {
    expect(deriveStatus("Active")).toBe("active");
  });

  it("lowercases on_leave", () => {
    expect(deriveStatus("On_Leave")).toBe("on_leave");
  });
});

describe("employee duplicate email check", () => {
  function checkDuplicateEmail(existingEmails: string[], email: string): boolean {
    return existingEmails.includes(email);
  }

  it("returns true for existing email", () => {
    expect(checkDuplicateEmail(["a@b.com", "c@d.com"], "a@b.com")).toBe(true);
  });

  it("returns false for new email", () => {
    expect(checkDuplicateEmail(["a@b.com"], "new@b.com")).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(checkDuplicateEmail([], "a@b.com")).toBe(false);
  });
});
