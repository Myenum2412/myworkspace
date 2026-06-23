import { describe, it, expect } from "vitest";
import { defaultStaffNavData } from "@/components/staff-sidebar";

describe("StaffSidebar nav data", () => {
  it("has correct number of top-level sections", () => {
    expect(defaultStaffNavData.length).toBe(7);
  });

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

  it("all route URLs start with /", () => {
    const checkUrl = (url: string) => expect(url).toMatch(/^\//);
    for (const section of defaultStaffNavData) {
      checkUrl(section.url);
      for (const item of section.items || []) {
        checkUrl(item.url);
      }
    }
  });

  it("section titles match expected values", () => {
    const titles = defaultStaffNavData.map((s) => s.title);
    expect(titles).toContain("Overview");
    expect(titles).toContain("All Staffs");
    expect(titles).toContain("Schedule");
    expect(titles).toContain("Attendance");
    expect(titles).toContain("Tasks");
    expect(titles).toContain("Performance");
    expect(titles).toContain("Settings");
  });
});
