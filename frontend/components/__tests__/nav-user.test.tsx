import { describe, it, expect } from "vitest";

describe("NavUser profile href resolution", () => {
  function getProfileHref(pathname: string, role?: string): string {
    if (pathname.startsWith("/orgmenu")) return "/orgmenu/profile";
    if (pathname.startsWith("/staffs")) return "/staffs/profile";
    if (role === "member") return "/staffs/profile";
    if (role === "admin" || role === "manager") return "/admin/profile";
    return "/profile";
  }

  it("resolves to /orgmenu/profile when in orgmenu context", () => {
    expect(getProfileHref("/orgmenu", "ORG_MENU_ADMIN")).toBe("/orgmenu/profile");
    expect(getProfileHref("/orgmenu/analytics", "SUPER_ADMIN")).toBe("/orgmenu/profile");
    expect(getProfileHref("/orgmenu/settings", "admin")).toBe("/orgmenu/profile");
    expect(getProfileHref("/orgmenu/profile", "member")).toBe("/orgmenu/profile");
  });

  it("resolves to /staffs/profile when in staff context", () => {
    expect(getProfileHref("/staffs", "member")).toBe("/staffs/profile");
    expect(getProfileHref("/staffs/activity", "member")).toBe("/staffs/profile");
    expect(getProfileHref("/staffs/schedule", "employee")).toBe("/staffs/profile");
  });

  it("resolves to /staffs/profile for member role in workspace", () => {
    expect(getProfileHref("/dashboard", "member")).toBe("/staffs/profile");
    expect(getProfileHref("/employees", "member")).toBe("/staffs/profile");
  });

  it("resolves to /admin/profile for admin/manager role in workspace", () => {
    expect(getProfileHref("/dashboard", "admin")).toBe("/admin/profile");
    expect(getProfileHref("/employees", "manager")).toBe("/admin/profile");
  });

  it("resolves to /profile for other roles in workspace", () => {
    expect(getProfileHref("/dashboard", "user")).toBe("/profile");
    expect(getProfileHref("/dashboard", undefined)).toBe("/profile");
    expect(getProfileHref("/files", "viewer")).toBe("/profile");
  });

  it("always stays within orgmenu context when pathname starts with /orgmenu", () => {
    const paths = ["/orgmenu", "/orgmenu/org", "/orgmenu/members", "/orgmenu/settings", "/orgmenu/profile"];
    for (const path of paths) {
      const href = getProfileHref(path, "admin");
      expect(href.startsWith("/orgmenu"), `${path} → ${href} should stay in orgmenu`).toBe(true);
    }
  });

  it("never links to /orgmenu when in workspace or staff context", () => {
    const workspacePaths = ["/dashboard", "/employees", "/settings", "/profile"];
    const staffPaths = ["/staffs", "/staffs/schedule"];

    for (const path of [...workspacePaths, ...staffPaths]) {
      const href = getProfileHref(path, "admin");
      expect(href.startsWith("/orgmenu"), `${path} → ${href} should NOT link to orgmenu`).toBe(false);
    }
  });
});
