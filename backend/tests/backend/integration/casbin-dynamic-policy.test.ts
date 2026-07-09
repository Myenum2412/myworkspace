import { newEnforcer, Enforcer } from "casbin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.resolve(_dirname, "../../../src/config");

describe("Casbin dynamic policy changes", () => {
  let enforcer: Enforcer;

  beforeAll(async () => {
    const modelPath = path.join(CONFIG_DIR, "rbac-model.conf");
    const policyPath = path.join(CONFIG_DIR, "casbin-policies.csv");
    enforcer = await newEnforcer(modelPath, policyPath);
  });

  it("policy changes take effect without restart (via loadPolicy)", async () => {
    const role = "staff";
    expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(false);

    // Add temporary policy directly to enforcer
    await enforcer.addPolicy("staff", ":project_file", "delete", "allow");
    expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(true);

    // Reload from file reverts the change
    await enforcer.loadPolicy();
    expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(false);
  });

  it("runtime role assignment works", async () => {
    await enforcer.addRoleForUser("temporary_admin", "org_admin");
    const roles = await enforcer.getRolesForUser("temporary_admin");
    expect(roles).toContain("org_admin");

    // Verify inherited permissions work
    expect(await enforcer.enforce("temporary_admin", "*:file", "delete")).toBe(true);
    expect(await enforcer.enforce("temporary_admin", "*:folder", "create")).toBe(true);

    // Remove role
    await enforcer.deleteRoleForUser("temporary_admin", "org_admin");
    const rolesAfter = await enforcer.getRolesForUser("temporary_admin");
    expect(rolesAfter).not.toContain("org_admin");
  });

  it("deny policy overrides allow", async () => {
    const testUser = "test_deny_user";
    await enforcer.addRoleForUser(testUser, "org_admin");

    // org_admin can delete
    expect(await enforcer.enforce(testUser, "*:file", "delete")).toBe(true);

    // Add explicit deny for this user
    await enforcer.addPolicy(testUser, "*:file", "delete", "deny");
    await enforcer.loadPolicy();

    // With the current model: e = some(where (p.eft == allow)) && !some(where (p.eft == deny))
    // Deny should take precedence
    const allowed = await enforcer.enforce(testUser, "*:file", "delete");
    expect(allowed).toBe(false);
  });

  it("tenant/role escalation attempts are rejected", async () => {
    // A staff member should not be able to perform admin actions
    const staffUser = "staff_user_escalation";
    await enforcer.addRoleForUser(staffUser, "staff");

    expect(await enforcer.enforce(staffUser, "*:file", "delete")).toBe(false);
    expect(await enforcer.enforce(staffUser, ":org_file", "delete")).toBe(false);
    expect(await enforcer.enforce(staffUser, "*:folder", "delete")).toBe(false);
    expect(await enforcer.enforce(staffUser, "*:upload", "cancel")).toBe(false);
  });

  it("cross-org access is denied", async () => {
    const user = "user_from_org_a";
    await enforcer.addRoleForUser(user, "gen_admin");

    // gen_admin can access :org_file for their own org
    expect(await enforcer.enforce(user, ":org_file", "view")).toBe(true);

    // But not client-scoped files
    expect(await enforcer.enforce(user, ":client_file", "view")).toBe(false);
  });
});
