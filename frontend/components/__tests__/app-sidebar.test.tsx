import { describe, it, expect } from "vitest";
import { defaultNavData } from "@/components/app-sidebar";

describe("AppSidebar nav data", () => {
  it("has correct number of top-level sections", () => {
    expect(defaultNavData.navMain.length).toBe(9);
  });

  it("all sections have required fields", () => {
    for (const section of defaultNavData.navMain) {
      expect(section.title).toBeTruthy();
      expect(section.url).toBeTruthy();
      expect(section.icon).toBeTruthy();
    }
  });

  it("all sub-items have title and url", () => {
    for (const section of defaultNavData.navMain) {
      for (const item of section.items || []) {
        expect(item.title).toBeTruthy();
        expect(item.url).toBeTruthy();
      }
    }
  });

  it("all route URLs start with /", () => {
    const checkUrl = (url: string) => expect(url).toMatch(/^\//);
    for (const section of defaultNavData.navMain) {
      checkUrl(section.url);
      for (const item of section.items || []) {
        checkUrl(item.url);
      }
    }
  });

  it("includes Staff section", () => {
    const staff = defaultNavData.navMain.find((s) => s.title === "Staff");
    expect(staff).toBeTruthy();
    expect(staff!.url).toBe("/staffs");
    expect(staff!.items?.length).toBe(5);
  });

  it("Staff section has expected sub-items", () => {
    const staff = defaultNavData.navMain.find((s) => s.title === "Staff")!;
    const subTitles = staff.items!.map((i) => i.title);
    expect(subTitles).toContain("Overview");
    expect(subTitles).toContain("Directory");
    expect(subTitles).toContain("Schedule");
    expect(subTitles).toContain("Attendance");
    expect(subTitles).toContain("Performance");
  });
});
