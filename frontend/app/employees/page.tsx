import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
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
      let orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
      if (!orgMember) {
        const org = await db.collection(collections.organizations).findOne({ ownerId: session.user.id });
        if (org) {
          await db.collection(collections.orgMembers).insertOne({
            id: uuid(),
            orgId: org.id || org._id.toString(),
            userId: session.user.id,
            role: "admin",
            joinedAt: new Date(),
          });
          orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
        }
      }
      if (orgMember) {
        const orgMembersCursor = await db.collection(collections.orgMembers).find({ orgId: orgMember.orgId });
        const allOrgMembers = await orgMembersCursor.toArray();
        const visibleMembers = allOrgMembers.filter((m: Record<string, unknown>) => m.userId !== session.user.id);
        const userIds = visibleMembers.map((m: Record<string, unknown>) => m.userId);
        const usersCursor = await db.collection(collections.users).find({ id: { $in: userIds } });
        const users = await usersCursor.toArray();
        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

        const allFileIds = users.flatMap((u: Record<string, unknown>) => (u.files as string[]) || []);
        let fileMap = new Map<string, Record<string, unknown>>();
        if (allFileIds.length > 0) {
          const fileDocs = await db.collection(collections.fileAttachments).find({ id: { $in: allFileIds } }).toArray();
          fileMap = new Map(fileDocs.map((f: Record<string, unknown>) => [f.id as string, f]));
        }

        employees = visibleMembers.map((m: Record<string, unknown>) => {
          const u = userMap.get(m.userId as string) as Record<string, unknown> || {};
          const userFiles = (u.files as string[]) || [];
          return {
            id: (m.userId as string) || (u.id as string) || "",
            name: (u.name as string) || "Unknown",
            email: (u.email as string) || "",
            role: (m.role as string) || "member",
            status: (u.status as string) || "offline",
            department: (u.department as string) || "",
            designation: (u.designation as string) || "",
            employmentType: (u.employmentType as string) || "",
            phone: (u.phone as string) || "",
            branchName: (u.branchName as string) || "",
            joiningDate: u.joiningDate ? (u.joiningDate as Date).toISOString() : "",
            avatar: (u.image as string) || "",
            files: userFiles.map((fid: string) => {
              const file = fileMap.get(fid);
              return file ? { id: file.id as string, name: file.originalName as string, size: file.size as number, mimeType: file.mimeType as string } : { id: fid, name: fid, size: 0 };
            }),
          };
        });
      }
    } catch {
      employees = [];
    }
  }

  return <EmployeesPageClient employees={employees} user={user} />;
}
