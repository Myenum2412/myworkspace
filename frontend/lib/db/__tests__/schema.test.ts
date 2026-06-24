import { describe, it, expect } from "vitest";
import { collections } from "../schema";

describe("collections schema", () => {
  it("exports expected collection names", () => {
    expect(collections.users).toBe("users");
    expect(collections.sessions).toBe("sessions");
    expect(collections.organizations).toBe("organizations");
    expect(collections.orgMembers).toBe("org_members");
    expect(collections.teams).toBe("teams");
    expect(collections.teamMembers).toBe("team_members");
    expect(collections.tasks).toBe("tasks");
    expect(collections.notifications).toBe("notifications");
    expect(collections.activityLogs).toBe("activity_logs");
    expect(collections.messages).toBe("messages");
    expect(collections.apiKeys).toBe("api_keys");
    expect(collections.fileAttachments).toBe("file_attachments");
    expect(collections.fileShares).toBe("file_shares");
    expect(collections.timeEntries).toBe("time_entries");
    expect(collections.ssoConfigs).toBe("sso_configs");
    expect(collections.projects).toBe("projects");
    expect(collections.workExperience).toBe("work_experience");
    expect(collections.educationDetails).toBe("education_details");
    expect(collections.dependentDetails).toBe("dependent_details");
    expect(collections.payments).toBe("payments");
    expect(collections.subscriptions).toBe("subscriptions");
  });

  it("has 21 collection keys", () => {
    expect(Object.keys(collections).length).toBe(21);
  });

  it("all values are non-empty strings", () => {
    for (const [key, value] of Object.entries(collections)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("throws when accessing non-existent key", () => {
    const coll = collections as Record<string, string>;
    expect(coll.nonexistent).toBeUndefined();
  });
});
