import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

/**
 * Shape of a task row as consumed by the task tables and the detailed view.
 * Mirrors the fields returned by the backend `/api/tasks` list endpoint.
 */
export interface TaskEnriched {
  _id: string;
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  creatorId: string;
  creatorName: string;
  orgId: string;
  teamId: string;
  teamName: string;
  dueDate: string | null;
  startDate: string | null;
  scheduledDate: string | null;
  project: string;
  selectedUserIds: string[];
  isSaved: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Enrich raw task docs with resolved assignee/creator/team names so the task
 * tables can render "Assigned To" and "Delegated By" immediately (the client
 * treats the SSR payload as fresh and does not refetch on mount).
 */
export async function enrichTasks<T extends Record<string, any>>(
  raw: T[],
): Promise<TaskEnriched[]> {
  if (!raw.length) return [];

  const userIds = new Set<string>();
  const teamIds = new Set<string>();
  for (const t of raw) {
    if (t.assigneeId) userIds.add(String(t.assigneeId));
    if (t.creatorId) userIds.add(String(t.creatorId));
    if (t.teamId) teamIds.add(String(t.teamId));
  }

  const [users, teams] = await Promise.all([
    userIds.size
      ? db
          .collection(collections.users)
          .find({ id: { $in: [...userIds] } })
          .toArray()
      : Promise.resolve([]),
    teamIds.size
      ? db
          .collection(collections.teams)
          .find({
            _id: {
              $in: [...teamIds].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)),
            },
          })
          .toArray()
      : Promise.resolve([]),
  ]);

  const userById = new Map<string, { name: string; image: string }>();
  for (const u of users) {
    const entry = { name: u.name || "", image: u.image || "" };
    if (u.id) userById.set(String(u.id), entry);
    userById.set(String(u._id), entry);
  }

  const teamById = new Map<string, string>();
  for (const t of teams) teamById.set(String(t._id), t.name || "");

  return raw.map((t) => {
    const assigneeId = t.assigneeId ? String(t.assigneeId) : "";
    const creatorId = t.creatorId ? String(t.creatorId) : "";
    const teamId = t.teamId ? String(t.teamId) : "";
    const assignee = assigneeId ? userById.get(assigneeId) : undefined;
    const creator = creatorId ? userById.get(creatorId) : undefined;

    return {
      _id: t._id?.toString() || "",
      id: t._id?.toString() || "",
      title: t.title || "",
      description: t.description || "",
      type: t.type || "individual",
      status: t.status || "",
      priority: t.priority || "medium",
      assigneeId,
      assigneeName: assignee?.name || "",
      assigneeAvatar: assignee?.image || "",
      creatorId,
      creatorName: creator?.name || "",
      orgId: t.orgId ? String(t.orgId) : "",
      teamId,
      teamName: teamId ? teamById.get(teamId) || "" : "",
      dueDate: t.dueDate || null,
      startDate: t.startDate || null,
      scheduledDate: t.scheduledDate || null,
      project: t.project || "",
      selectedUserIds: (t.selectedUserIds || []).map((s: unknown) => String(s)),
      isSaved: t.isSaved ?? false,
      isActive: t.isActive ?? true,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : "",
    };
  });
}
