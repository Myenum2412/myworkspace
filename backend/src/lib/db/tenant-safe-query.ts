import { Model, Query, Aggregate, Document, PipelineStage } from "mongoose";
import { logger } from "../logger/index.js";
import { recordAuditLog } from "../../services/audit.service.js";

/**
 * Tenant-Safe Query Wrapper
 * Enforces organization isolation on all MongoDB operations.
 * Every query must include orgId to prevent cross-tenant data access.
 */

export interface TenantContext {
  orgId: string;
  userId: string;
  role?: string;
}

export interface TenantQueryOptions {
  /** Allow queries without orgId (e.g., platform admin operations) */
  allowGlobal?: boolean;
  /** Skip orgId validation for system operations */
  skipValidation?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Validate that a filter includes orgId.
 */
function validateOrgScope(
  filter: Record<string, any>,
  context: TenantContext,
  options: TenantQueryOptions = {},
): void {
  if (options.skipValidation || options.allowGlobal) {
    return;
  }

  if (!filter.orgId && filter.orgId !== 0) {
    logger.error({
      orgId: context.orgId,
      userId: context.userId,
      filter,
    }, "Tenant isolation violation: query missing orgId");

    throw new Error(
      options.errorMessage || "Query must include orgId for tenant isolation"
    );
  }

  // Verify the orgId matches the context
  if (filter.orgId && filter.orgId !== context.orgId) {
    logger.error({
      requestedOrgId: filter.orgId,
      contextOrgId: context.orgId,
      userId: context.userId,
      filter,
    }, "Tenant isolation violation: orgId mismatch");

    // Audit log for cross-tenant access attempt
    recordAuditLog({
      orgId: context.orgId,
      userId: context.userId,
      action: "tenant.isolation.violation",
      entityType: "security",
      description: `Cross-tenant access attempt: requested orgId ${filter.orgId}, context orgId ${context.orgId}`,
      success: false,
      riskScore: 80,
      riskFactors: ["tenant_escape", "cross_tenant_access"],
      metadata: {
        requestedOrgId: filter.orgId,
        contextOrgId: context.orgId,
        filter,
      },
      tags: ["security", "tenant-isolation"],
    });

    throw new Error(
      options.errorMessage || "Access denied: organization mismatch"
    );
  }
}

/**
 * Tenant-safe find operation.
 */
export function tenantFind<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any> = {},
  options: TenantQueryOptions = {},
): Query<T[], T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);
  return model.find(orgFilter);
}

/**
 * Tenant-safe findOne operation.
 */
export function tenantFindOne<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any> = {},
  options: TenantQueryOptions = {},
): Query<T | null, T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);
  return model.findOne(orgFilter);
}

/**
 * Tenant-safe findById operation.
 */
export function tenantFindById<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  id: string,
  options: TenantQueryOptions = {},
): Query<T | null, T> {
  // First find the document, then validate orgId
  return model.findById(id).then(doc => {
    if (!doc) return null;

    const docOrgId = (doc as any).orgId;
    if (!options.allowGlobal && docOrgId && docOrgId !== context.orgId) {
      logger.error({
        documentOrgId: docOrgId,
        contextOrgId: context.orgId,
        userId: context.userId,
        documentId: id,
      }, "Tenant isolation violation: document belongs to different org");

      recordAuditLog({
        orgId: context.orgId,
        userId: context.userId,
        action: "tenant.isolation.violation",
        entityType: "security",
        entityId: id,
        description: `Cross-tenant document access attempt: document belongs to org ${docOrgId}, context org ${context.orgId}`,
        success: false,
        riskScore: 80,
        riskFactors: ["tenant_escape", "cross_tenant_access"],
        metadata: {
          documentOrgId: docOrgId,
          contextOrgId: context.orgId,
          documentId: id,
        },
        tags: ["security", "tenant-isolation"],
      });

      throw new Error("Access denied: document belongs to another organization");
    }

    return doc;
  }) as any;
}

/**
 * Tenant-safe create operation.
 */
export async function tenantCreate<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  data: Record<string, any>,
  options: TenantQueryOptions = {},
): Promise<T> {
  // Ensure orgId is set
  if (!options.allowGlobal && !data.orgId) {
    data.orgId = context.orgId;
  }

  // Validate orgId matches context
  if (!options.allowGlobal && data.orgId !== context.orgId) {
    throw new Error("Cannot create document in another organization");
  }

  return model.create(data);
}

/**
 * Tenant-safe updateOne operation.
 */
export function tenantUpdateOne<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any>,
  update: Record<string, any>,
  options: TenantQueryOptions = {},
): Query<any, T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);

  // Prevent changing orgId
  if (update.$set?.orgId || update.orgId) {
    throw new Error("Cannot change document organization");
  }

  return model.updateOne(orgFilter, update);
}

/**
 * Tenant-safe updateMany operation.
 */
export function tenantUpdateMany<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any>,
  update: Record<string, any>,
  options: TenantQueryOptions = {},
): Query<any, T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);

  // Prevent changing orgId
  if (update.$set?.orgId || update.orgId) {
    throw new Error("Cannot change document organization");
  }

  return model.updateMany(orgFilter, update);
}

/**
 * Tenant-safe deleteOne operation.
 */
export function tenantDeleteOne<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any> = {},
  options: TenantQueryOptions = {},
): Query<any, T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);
  return model.deleteOne(orgFilter);
}

/**
 * Tenant-safe deleteMany operation.
 */
export function tenantDeleteMany<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any> = {},
  options: TenantQueryOptions = {},
): Query<any, T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);
  return model.deleteMany(orgFilter);
}

/**
 * Tenant-safe countDocuments operation.
 */
export function tenantCountDocuments<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any> = {},
  options: TenantQueryOptions = {},
): Query<number, T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);
  return model.countDocuments(orgFilter);
}

/**
 * Tenant-safe aggregate operation.
 * Automatically adds $match with orgId as the first stage.
 */
export function tenantAggregate<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  pipeline: PipelineStage[] = [],
  options: TenantQueryOptions = {},
): Aggregate<any[]> {
  if (options.allowGlobal) {
    return model.aggregate(pipeline);
  }

  // Ensure first stage is $match with orgId
  const firstStage = pipeline[0] as any;
  if (!firstStage || !firstStage.$match || !firstStage.$match.orgId) {
    pipeline.unshift({ $match: { orgId: context.orgId } } as PipelineStage);
  } else {
    // Validate existing $match has correct orgId
    if (firstStage.$match.orgId !== context.orgId) {
      throw new Error("Access denied: organization mismatch in aggregation");
    }
  }

  return model.aggregate(pipeline);
}

/**
 * Tenant-safe findOneAndUpdate operation.
 */
export function tenantFindOneAndUpdate<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any>,
  update: Record<string, any>,
  options: TenantQueryOptions = {},
): Query<T | null, T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);

  // Prevent changing orgId
  if (update.$set?.orgId || update.orgId) {
    throw new Error("Cannot change document organization");
  }

  return model.findOneAndUpdate(orgFilter, update, { new: true });
}

/**
 * Tenant-safe findOneAndDelete operation.
 */
export function tenantFindOneAndDelete<T extends Document>(
  model: Model<T>,
  context: TenantContext,
  filter: Record<string, any> = {},
  options: TenantQueryOptions = {},
): Query<T | null, T> {
  const orgFilter = { ...filter, orgId: context.orgId };
  validateOrgScope(orgFilter, context, options);
  return model.findOneAndDelete(orgFilter);
}
