import { createNotification } from "../../services/notification.service.js";

export async function notifyMultiUser(
  userIds: string[],
  orgId: string,
  creatorId: string,
  type: any,
  title: string,
  message: string,
  options?: {
    link?: string;
    category?: any;
    priority?: any;
    actions?: any[];
    metadata?: Record<string, unknown>;
    correlationId?: string;
  }
): Promise<any[]> {
  const results = [];
  for (const userId of userIds) {
    try {
      const result = await createNotification({
        userId,
        orgId,
        createdBy: creatorId,
        type,
        category: options?.category || "system",
        priority: options?.priority || "medium",
        title,
        message,
        link: options?.link,
        actions: options?.actions,
        metadata: options?.metadata,
        correlationId: options?.correlationId,
      });
      if (result) results.push(result);
    } catch (err) {
      // Individual failures shouldn't block the rest
    }
  }
  return results;
}
