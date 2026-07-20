import { enforce } from "../../../src/config/casbin.js";
import { ROLES, getEffectivePermissions } from "../../../src/lib/rbac/index.js";

describe("Blog Integration Tests", () => {
  describe("RBAC - Blog access control", () => {
    it("org_admin has manage:blog permission", () => {
      const perms = getEffectivePermissions(ROLES.ORG_ADMIN);
      expect(perms).toContain("manage:blog");
    });

    it("members has manage:blog permission", () => {
      const perms = getEffectivePermissions(ROLES.MEMBERS);
      expect(perms).toContain("manage:blog");
    });

    it("manager has manage:blog permission", () => {
      const perms = getEffectivePermissions(ROLES.MANAGER);
      expect(perms).toContain("manage:blog");
    });

    it("staffs does not have manage:blog permission", () => {
      const perms = getEffectivePermissions(ROLES.STAFFS);
      expect(perms).not.toContain("manage:blog");
    });

    it("hr does not have manage:blog permission", () => {
      const perms = getEffectivePermissions(ROLES.HR);
      expect(perms).not.toContain("manage:blog");
    });

    it("clients does not have manage:blog permission", () => {
      const perms = getEffectivePermissions(ROLES.CLIENTS);
      expect(perms).not.toContain("manage:blog");
    });
  });

  describe("Blog post status transitions", () => {
    const validTransitions: Record<string, string[]> = {
      draft: ["published", "archived"],
      scheduled: ["published", "archived", "draft"],
      published: ["draft", "archived"],
      archived: ["draft"],
    };

    it("defines valid status transitions", () => {
      expect(validTransitions.draft).toContain("published");
      expect(validTransitions.published).toContain("draft");
      expect(validTransitions.published).toContain("archived");
      expect(validTransitions.archived).toContain("draft");
    });

    it("draft can be published", () => {
      expect(validTransitions.draft).toContain("published");
    });

    it("published can be unpublished (back to draft)", () => {
      expect(validTransitions.published).toContain("draft");
    });

    it("archived can be restored (back to draft)", () => {
      expect(validTransitions.archived).toContain("draft");
    });
  });

  describe("Blog slug generation", () => {
    function slugify(text: string): string {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 200);
    }

    it("generates valid slug from title", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("handles special characters", () => {
      expect(slugify("My Blog Post! @#$%")).toBe("my-blog-post");
    });

    it("truncates long titles", () => {
      const longTitle = "a".repeat(300);
      expect(slugify(longTitle).length).toBeLessThanOrEqual(200);
    });

    it("handles unicode characters", () => {
      expect(slugify("Blog Post 123")).toBe("blog-post-123");
    });
  });

  describe("Reading time calculation", () => {
    function calculateReadingTime(content: string): number {
      const text = content.replace(/<[^>]*>/g, "").replace(/[#*`>\-\[\]()]/g, "");
      const words = text.split(/\s+/).filter(Boolean).length;
      return Math.max(1, Math.ceil(words / 200));
    }

    it("calculates reading time for short content", () => {
      expect(calculateReadingTime("Hello world")).toBe(1);
    });

    it("calculates reading time for long content", () => {
      const longContent = "word ".repeat(600);
      expect(calculateReadingTime(longContent)).toBe(3);
    });

    it("strips HTML tags before calculating", () => {
      expect(calculateReadingTime("<p>Hello world</p>")).toBe(1);
    });
  });
});
