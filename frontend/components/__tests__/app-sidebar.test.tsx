import { describe, it, expect } from "vitest";
import { defaultNavData } from "@/components/app-sidebar";

describe("AppSidebar nav data", () => {
  it("has correct number of top-level sections", () => {
    expect(defaultNavData.navMain.length).toBe(8);
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


});
