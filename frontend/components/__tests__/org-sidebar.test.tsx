import { describe, it, expect } from "vitest";
import { defaultOrgNavData } from "@/components/org-sidebar";

describe("OrgSidebar nav data", () => {
  it("all sections have required fields", () => {
    for (const section of defaultOrgNavData) {
      expect(section.title).toBeTruthy();
      expect(section.url).toBeTruthy();
      expect(section.icon).toBeTruthy();
    }
  });

  it("all sub-items have title and url", () => {
    for (const section of defaultOrgNavData) {
      for (const item of section.items || []) {
        expect(item.title).toBeTruthy();
        expect(item.url).toBeTruthy();
      }
    }
  });

  it("all route URLs start with /orgmenu", () => {
    for (const section of defaultOrgNavData) {
      expect(section.url).toMatch(/^\/orgmenu/);
      for (const item of section.items || []) {
        expect(item.url).toMatch(/^\/orgmenu/);
      }
    }
  });

  it("does NOT contain workspace cross-context links", () => {
    const allUrls: string[] = [];
    for (const section of defaultOrgNavData) {
      allUrls.push(section.url);
      for (const item of section.items || []) {
        allUrls.push(item.url);
      }
    }
    const workspaceLinks = allUrls.filter((url) => !url.startsWith("/orgmenu"));
    expect(workspaceLinks).toHaveLength(0);
  });
});
