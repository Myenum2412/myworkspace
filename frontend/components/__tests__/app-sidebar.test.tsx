import { describe, it, expect } from "vitest";
import { defaultNavData } from "@/components/app-sidebar";
import { WORKSPACE_ROUTES } from "@/lib/app-context";

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

  it("does NOT contain orgmenu cross-context links", () => {
    const allUrls: string[] = [];
    for (const section of defaultNavData.navMain) {
      allUrls.push(section.url);
      for (const item of section.items || []) {
        allUrls.push(item.url);
      }
    }
    const orgmenuLinks = allUrls.filter((url) => url.startsWith("/orgmenu"));
    expect(orgmenuLinks).toHaveLength(0);
  });

  it("all URLs belong to workspace context", () => {
    const allUrls: string[] = [];
    for (const section of defaultNavData.navMain) {
      allUrls.push(section.url);
      for (const item of section.items || []) {
        allUrls.push(item.url);
      }
    }
    for (const url of allUrls) {
      const belongsToWorkspace = WORKSPACE_ROUTES.some((r) => url.startsWith(r));
      expect(belongsToWorkspace, `URL ${url} is not a workspace route`).toBe(true);
    }
  });
});
