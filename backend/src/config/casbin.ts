import path from "path";
import { newEnforcer, Enforcer } from "casbin";
import { logger } from "../lib/logger/index.js";

let enforcer: Enforcer | null = null;

// Use process.cwd() to find config files relative to project root
// This works in both ESM and CJS contexts (including Jest)
const _dirname = path.join(process.cwd(), "src", "config");

export type PermissionEffect = "allow" | "deny";

export interface PermissionCheck {
  allowed: boolean;
  role: string;
  effect?: PermissionEffect;
}

export function buildFileResource(params: {
  orgId?: string;
  projectId?: string;
  clientId?: string;
  workspaceId?: string;
  fileId?: string;
  scope?: string;
}): string {
  const { orgId, projectId, clientId, scope } = params;
  if (scope) return scope;
  if (clientId) return `:client_file`;
  if (projectId) return `:project_file`;
  if (orgId) return `:org_file`;
  return `*:file`;
}

export function buildFolderResource(params: {
  orgId?: string;
  projectId?: string;
  clientId?: string;
  scope?: string;
}): string {
  const { orgId, projectId, clientId, scope } = params;
  if (scope) return scope;
  if (clientId) return `:client_folder`;
  if (projectId) return `:project_folder`;
  if (orgId) return `:org_folder`;
  return `*:folder`;
}

export async function getEnforcer(): Promise<Enforcer> {
  if (enforcer) return enforcer;
  const modelPath = path.join(_dirname, "rbac-model.conf");

  const policyPath = path.join(_dirname, "casbin-policies.csv");

  const useMongoAdapter = process.env.CASINB_MONGO_ADAPTER === "1" && process.env.NODE_ENV !== "test";

  if (useMongoAdapter) {
    try {
      const { MongooseAdapter } = await import("casbin-mongoose-adapter");
      const adapter = await MongooseAdapter.newAdapter(
        process.env.MONGODB_URI || "",
      );
      enforcer = await newEnforcer(modelPath, adapter);
      enforcer.enableLog(false);
      return enforcer;
    } catch (err: any) {
      logger.warn({ err: err.message }, "Casbin MongoDB adapter failed, falling back to file policies");
    }
  }

  enforcer = await newEnforcer(modelPath, policyPath);
  enforcer.enableLog(false);
  return enforcer;
}

export async function checkPermission(
  sub: string,
  obj: string,
  act: string,
): Promise<PermissionCheck> {
  const e = await getEnforcer();
  const roles = await e.getRolesForUser(sub);
  const allRoles = [sub, ...roles];

  for (const role of allRoles) {
    const allowed = await e.enforce(role, obj, act);
    if (allowed) {
      return { allowed: true, role };
    }
  }

  return { allowed: false, role: sub };
}

export async function enforce(
  sub: string,
  obj: string,
  act: string,
): Promise<boolean> {
  const result = await checkPermission(sub, obj, act);
  return result.allowed;
}

export async function addPolicy(
  sub: string,
  obj: string,
  act: string,
  eft: PermissionEffect = "allow",
): Promise<boolean> {
  const e = await getEnforcer();
  return await e.addPolicy(sub, obj, act, eft);
}

export async function removePolicy(
  sub: string,
  obj: string,
  act: string,
): Promise<boolean> {
  const e = await getEnforcer();
  return await e.removePolicy(sub, obj, act);
}

export async function addRoleForUser(
  user: string,
  role: string,
): Promise<boolean> {
  const e = await getEnforcer();
  return await e.addRoleForUser(user, role);
}

export async function getRolesForUser(user: string): Promise<string[]> {
  const e = await getEnforcer();
  return await e.getRolesForUser(user);
}

export async function getUsersForRole(role: string): Promise<string[]> {
  const e = await getEnforcer();
  return await e.getUsersForRole(role);
}

export async function getPermissionsForUser(
  user: string,
): Promise<string[][]> {
  const e = await getEnforcer();
  return await e.getPermissionsForUser(user);
}

export async function loadPolicy(): Promise<void> {
  const e = await getEnforcer();
  await e.loadPolicy();
}

export async function resetEnforcer(): Promise<void> {
  enforcer = null;
}
