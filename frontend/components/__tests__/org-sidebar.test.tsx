import { describe, it, expect } from "vitest";
import { defaultOrgNavData as defaultStaffNavData } from "@/components/org-sidebar";

describe("OrgSidebar nav data", () => {
  it("all sections have required fields", () => {
    for (const section of defaultStaffNavData) {
      expect(section.title).toBeTruthy();
      expect(section.url).toBeTruthy();
      expect(section.icon).toBeTruthy();
    }
  });

  it("all sub-items have title and url", () => {
    for (const section of defaultStaffNavData) {
      for (const item of section.items || []) {
        expect(item.title).toBeTruthy();
        expect(item.url).toBeTruthy();
      }
    }
  });

  it("all route URLs start with /orgmenu", () => {
    for (const section of defaultStaffNavData) {
      expect(section.url).toMatch(/^\/orgmenu/);
      for (const item of section.items || []) {
        expect(item.url).toMatch(/^\/orgmenu/);
      }
    }
  });
});
