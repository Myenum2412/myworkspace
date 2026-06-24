import { describe, it, expect } from "vitest";
import { defaultOrgNavData } from "@/components/org-sidebar";
import { defaultNavData } from "@/components/app-sidebar";
import { defaultStaffNavData } from "@/components/staff-sidebar";

describe("Context Navigation - Cross-Context Links", () => {

  describe("AppSidebar - No cross-context links in default nav data", () => {
    it("defaultNavData contains no /orgmenu links", () => {
      const allUrls: string[] = [];
      for (const section of defaultNavData.navMain) {
        allUrls.push(section.url);
        for (const item of section.items || []) {
          allUrls.push(item.url);
        }
      }
      const orgmenuLinks = allUrls.filter((u) => u.startsWith("/orgmenu"));
      expect(orgmenuLinks).toHaveLength(0);
    });

    it("defaultNavData contains no /staffs links", () => {
      const allUrls: string[] = [];
      for (const section of defaultNavData.navMain) {
        allUrls.push(section.url);
        for (const item of section.items || []) {
          allUrls.push(item.url);
        }
      }
      const staffLinks = allUrls.filter((u) => u.startsWith("/staffs"));
      expect(staffLinks).toHaveLength(0);
    });
  });

  describe("OrgSidebar - No workspace links in default org nav data", () => {
    it("defaultOrgNavData contains only /orgmenu links", () => {
      for (const section of defaultOrgNavData) {
        expect(section.url.startsWith("/orgmenu")).toBe(true);
        for (const item of section.items || []) {
          expect(item.url.startsWith("/orgmenu")).toBe(true);
        }
      }
    });
  });

  describe("StaffSidebar - Stays within staff context", () => {
    it("defaultStaffNavData contains only staff and workspace links", () => {
      const allUrls: string[] = [];
      for (const section of defaultStaffNavData) {
        allUrls.push(section.url);
        for (const item of section.items || []) {
          allUrls.push(item.url);
        }
      }

      for (const url of allUrls) {
        const isStaffRoute = url.startsWith("/staffs");
        const isWorkspaceRoute = [
          "/alltasks", "/mytasks", "/teamtasks", "/upcomingtasks",
          "/files",
        ].some((r) => url.startsWith(r));

        expect(isStaffRoute || isWorkspaceRoute, `URL ${url} is neither staff nor valid workspace route`).toBe(true);
      }
    });

    it("defaultStaffNavData contains no /orgmenu links", () => {
      const allUrls: string[] = [];
      for (const section of defaultStaffNavData) {
        allUrls.push(section.url);
        for (const item of section.items || []) {
          allUrls.push(item.url);
        }
      }
      const orgmenuLinks = allUrls.filter((u) => u.startsWith("/orgmenu"));
      expect(orgmenuLinks).toHaveLength(0);
    });
  });
});
