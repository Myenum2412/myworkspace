import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { ObjectId } from "mongodb";
import EmployeesPageClient from "./page-client";

export const metadata = { title: "Employees Overview" };

type EmployeeInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string;
  designation: string;
  employmentType: string;
  phone: string;
  branchName: string;
  joiningDate: string;
  avatar: string;
  displayId?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  location?: string;
  shift?: string;
  sourceOfHire?: string;
  currentExperience?: string;
  totalExperience?: string;
  alternateEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  workExperience?: Array<{ id: string; company?: string; title?: string; from?: string; to?: string; description?: string; relevant?: boolean }>;
  educationDetails?: Array<{ id: string; institute?: string; degree?: string; specialization?: string; completionDate?: string }>;
  dependentDetails?: Array<{ id: string; name?: string; relationship?: string; dob?: string }>;
};

function toUserQuery(userIds: string[]) {
  const objectIds: ObjectId[] = [];
  for (const id of userIds) {
    try { objectIds.push(new ObjectId(id)); } catch { /* not an ObjectId */ }
  }
  if (objectIds.length > 0 && objectIds.length === userIds.length) {
    return { _id: { $in: objectIds } };
  }
  if (objectIds.length > 0) {
    return { $or: [{ id: { $in: userIds } }, { _id: { $in: objectIds } }] };
  }
  return { id: { $in: userIds } };
}

function userDocToId(u: Record<string, unknown>): string {
  return (u.id as string) || (u._id as ObjectId)?.toString() || "";
}

export default async function EmployeesPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  let employees: EmployeeInfo[] = [];

  if (session?.user?.id) {
    try {
      const sessionUserIdStr = session.user.id;
      let sessionUserObjId: ObjectId | undefined;
      try { sessionUserObjId = new ObjectId(sessionUserIdStr); } catch {}
      
      const userQuery = sessionUserObjId 
        ? { $or: [{ _id: sessionUserObjId }, { id: sessionUserIdStr }] }
        : { id: sessionUserIdStr };
        
      const currentUserDoc = await db.collection(collections.users).findOne(userQuery);
      
      const possibleUserIds = [sessionUserIdStr];
      if (currentUserDoc) {
        if (currentUserDoc.id) possibleUserIds.push(currentUserDoc.id as string);
        if (currentUserDoc._id) possibleUserIds.push((currentUserDoc._id as ObjectId).toString());
      }

      let orgMember = await db.collection(collections.orgMembers).findOne({ userId: { $in: possibleUserIds } }) as Record<string, unknown> | null;
      if (!orgMember) {
        const org = await db.collection(collections.organizations).findOne({ ownerId: { $in: possibleUserIds } }) as Record<string, unknown> | null;
        if (org) {
          const orgId = (org.id as string) || (org._id as ObjectId).toString();
          const mainUserId = (currentUserDoc?.id as string) || sessionUserIdStr;
          await db.collection(collections.orgMembers).insertOne({
            id: uuid(),
            orgId,
            userId: mainUserId,
            role: "admin",
            joinedAt: new Date(),
          });
          orgMember = await db.collection(collections.orgMembers).findOne({ userId: mainUserId }) as Record<string, unknown> | null;
        }
      }

      const allOrgMembers: Record<string, unknown>[] = [];

      if (orgMember) {
        const orgId = (orgMember.orgId as string) || (orgMember._id as ObjectId)?.toString();
        if (orgId) {
          const members = await (await db.collection(collections.orgMembers).find({ orgId })).toArray();
          allOrgMembers.push(...members);
        }
      }

      const hasCurrentUser = allOrgMembers.some((m) => possibleUserIds.includes(m.userId as string));
      if (!hasCurrentUser) {
        const mainUserId = (currentUserDoc?.id as string) || sessionUserIdStr;
        allOrgMembers.push({ userId: mainUserId, role: "admin" });
      }

      const userIds = [...new Set(allOrgMembers.map((m) => m.userId as string).filter(Boolean))];

      if (userIds.length > 0) {
        const query = toUserQuery(userIds);
        const users = await (await db.collection(collections.users).find(query).toArray());

        const userMap = new Map<string, Record<string, unknown>>();
        for (const u of users) {
          if (u.id) userMap.set(u.id as string, u);
          if (u._id) userMap.set((u._id as ObjectId).toString(), u);
        }

        const allFileIds = users.flatMap((u) => (u.files as string[]) || []);
        let fileMap = new Map<string, Record<string, unknown>>();
        if (allFileIds.length > 0) {
          const fileDocs = await (await db.collection(collections.fileAttachments).find({ id: { $in: allFileIds } })).toArray();
          fileMap = new Map(fileDocs.map((f) => [f.id as string, f]));
        }

        employees = allOrgMembers
          .filter((m) => userMap.has(m.userId as string))
          .map((m) => {
            const u = userMap.get(m.userId as string)!;
            const userFiles = (u.files as string[]) || [];
            return {
              id: userDocToId(u) || (m.userId as string) || "",
              name: (u.name as string) || "Unknown",
              email: (u.email as string) || "",
              role: (m.role as string) || (u.role as string) || "member",
              status: (u.status as string) || "offline",
              department: (u.department as string) || "",
              designation: (u.designation as string) || "",
              employmentType: (u.employmentType as string) || "",
              phone: (u.phone as string) || "",
              branchName: (u.branchName as string) || "",
              joiningDate: u.joiningDate ? new Date(u.joiningDate as string | number).toISOString() : "",
              avatar: (u.image as string) || (u.avatar as string) || "",
              files: userFiles.map((fid: string) => {
                const file = fileMap.get(fid);
                return file ? { id: file.id as string, name: file.originalName as string, size: file.size as number, mimeType: file.mimeType as string } : { id: fid, name: fid, size: 0 };
              }),
            };
          });
      }
    } catch (err) {
      console.error("[EmployeesPage] Error fetching employees:", err);
      employees = [];
    }
  }

  return <EmployeesPageClient employees={employees} user={user} />;
}
