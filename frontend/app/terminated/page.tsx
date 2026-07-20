import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";
import TerminatedInteractive from "./terminated-interactive";
import type { TerminatedEmployee } from "../employees/columns";

export const dynamic = "force-dynamic";

export default async function TerminatedPage() {
  const session = await auth();
  if (!session?.user?.id) return <TerminatedInteractive terminated={[]} />;

  let terminated: TerminatedEmployee[] = [];

  try {
    const orgId = await getUserOrgId(session.user.id, session.user.email);
    if (!orgId) return <TerminatedInteractive terminated={[]} />;

    const orgMembers = await db.collection(collections.orgMembers).find({ orgId }).toArray() as unknown as { userId: string }[];
    const userIds = [...new Set(orgMembers.map((m) => m.userId).filter(Boolean))];

    if (userIds.length === 0) return <TerminatedInteractive terminated={[]} />;

    const objectIds: ObjectId[] = [];
    for (const id of userIds) {
      try { objectIds.push(new ObjectId(id)); } catch { /* not an ObjectId */ }
    }

    const userQuery = objectIds.length > 0
      ? { $or: [{ id: { $in: userIds } }, { _id: { $in: objectIds } }], status: "terminated" }
      : { id: { $in: userIds }, status: "terminated" };

    const users = await db.collection(collections.users).find(userQuery).toArray() as unknown as Record<string, unknown>[];

    terminated = users.map((u) => ({
      id: (u.id as string) || (u._id as ObjectId)?.toString() || "",
      name: (u.name as string) || "Unknown",
      email: (u.email as string) || "",
      role: (u.role as string) || "staffs",
      status: "terminated",
      department: (u.department as string) || "",
      designation: (u.designation as string) || "",
      employmentType: (u.employmentType as string) || "",
      phone: (u.phone as string) || "",
      branchName: (u.branchName as string) || "",
      joiningDate: u.joiningDate ? new Date(u.joiningDate as string | number).toISOString() : "",
      avatar: (u.image as string) || (u.avatar as string) || "",
      displayId: (u.displayId as string) || "",
      firstName: (u.firstName as string) || "",
      lastName: (u.lastName as string) || "",
      nickname: (u.nickname as string) || "",
      location: (u.location as string) || "",
      shift: (u.shift as string) || "",
      sourceOfHire: (u.sourceOfHire as string) || "",
      currentExperience: (u.currentExperience as string) || "",
      totalExperience: (u.totalExperience as string) || "",
      alternateEmail: (u.alternateEmail as string) || "",
      address: (u.address as string) || "",
      city: (u.city as string) || "",
      state: (u.state as string) || "",
      country: (u.country as string) || "",
      zipCode: (u.zipCode as string) || "",
      linkedin: (u.linkedin as string) || "",
      github: (u.github as string) || "",
      twitter: (u.twitter as string) || "",
      website: (u.website as string) || "",
      terminateReason: (u.terminateReason as string) || "",
      terminateDate: (u.terminateDate as string) || "",
    }));
  } catch {
    terminated = [];
  }

  return <TerminatedInteractive terminated={terminated} />;
}
