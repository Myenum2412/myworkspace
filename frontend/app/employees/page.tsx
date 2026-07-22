import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { ObjectId } from "mongodb";
import EmployeesClient from "./employees-client";
import type { TerminatedEmployee } from "./columns";

export const metadata = { title: "Employees" };
export const dynamic = "force-dynamic";

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
  let teams: any[] = [];
  let members: any[] = [];
  let orgIdForTeams: string | undefined;
  let terminated: TerminatedEmployee[] = [];
  let attendanceData: Array<{ name: string; displayId: string; email: string; department: string; designation: string; checkIn: string | null; checkOut: string | null; status: string }> = [];
  let reportEmployees: Record<string, unknown>[] = [];

  if (session?.user?.id) {
    try {
      const sessionUserIdStr = session.user.id;
      let sessionUserObjId: ObjectId | undefined;
      try { sessionUserObjId = new ObjectId(sessionUserIdStr); } catch {}

      let currentUserDoc = await db.collection(collections.users).findOne(
        sessionUserObjId
          ? { $or: [{ _id: sessionUserObjId }, { id: sessionUserIdStr }] }
          : { id: sessionUserIdStr }
      );

      if (!currentUserDoc && session?.user?.email) {
        currentUserDoc = await db.collection(collections.users).findOne({ email: session.user.email });
      }

      const possibleUserIds: string[] = [];
      if (currentUserDoc) {
        if (currentUserDoc.id) possibleUserIds.push(currentUserDoc.id as string);
        if (currentUserDoc._id) possibleUserIds.push((currentUserDoc._id as ObjectId).toString());
      }
      possibleUserIds.push(sessionUserIdStr);
      const uniqueIds = [...new Set(possibleUserIds)];

      let orgId: string | null = session.user.orgId || null;

      if (!orgId) {
        const userOrgMembers = await (await db.collection(collections.orgMembers).find({ userId: { $in: uniqueIds } }).toArray()) as Record<string, unknown>[];
        if (userOrgMembers.length === 0) {
          const org = await db.collection(collections.organizations).findOne({ ownerId: { $in: uniqueIds } }) as Record<string, unknown> | null;
          if (org) {
            orgId = (org.id as string) || (org._id as ObjectId).toString();
            const mainUserId = (currentUserDoc?.id as string) || sessionUserIdStr;
            await db.collection(collections.orgMembers).insertOne({
              id: uuid(),
              orgId,
              userId: mainUserId,
              role: "members",
              joinedAt: new Date(),
            });
          }
        } else if (userOrgMembers.length === 1) {
          orgId = String(userOrgMembers[0].orgId);
        } else {
          const orgIds = [...new Set(userOrgMembers.map(m => String(m.orgId)))];
          const counts = await (await db.collection(collections.orgMembers).aggregate([
            { $match: { orgId: { $in: orgIds } } },
            { $group: { _id: "$orgId", count: { $sum: 1 } } },
          ]).toArray()) as { _id: string; count: number }[];
          const countMap = new Map(counts.map(c => [c._id, c.count]));
          orgIds.sort((a, b) => (countMap.get(b) || 0) - (countMap.get(a) || 0));
          orgId = orgIds[0];
        }
      }

      if (!orgId) {
        return (
          <EmployeesClient
            employees={[]}
            user={user}
            teams={[]}
            members={[]}
            orgId={undefined}
            terminated={[]}
            attendanceData={[]}
            reportEmployees={[]}
          />
        );
      }

      orgIdForTeams = orgId;

      const allOrgMembers: Record<string, unknown>[] = [];

      if (orgId) {
        const membersFromDb = await (await db.collection(collections.orgMembers).find({ orgId })).toArray();
        allOrgMembers.push(...membersFromDb);
      }

      const hasCurrentUser = allOrgMembers.some((m) => uniqueIds.includes(m.userId as string));
      if (!hasCurrentUser) {
        const mainUserId = (currentUserDoc?.id as string) || sessionUserIdStr;
        allOrgMembers.push({ userId: mainUserId, role: "members" });
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

        const allUserIds = allOrgMembers.map((m) => m.userId as string).filter(Boolean);

        const [workExDocs, eduDocs, depDocs, teamResults] = await Promise.all([
          db.collection(collections.workExperience).find({ userId: { $in: allUserIds } }).toArray() as Promise<Record<string, unknown>[]>,
          db.collection(collections.educationDetails).find({ userId: { $in: allUserIds } }).toArray() as Promise<Record<string, unknown>[]>,
          db.collection(collections.dependentDetails).find({ userId: { $in: allUserIds } }).toArray() as Promise<Record<string, unknown>[]>,
          db.collection(collections.teams).aggregate([
            { $match: { orgId } },
            {
              $lookup: {
                from: collections.teamMembers,
                let: { teamObjId: "$_id" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$teamId", { $toString: "$$teamObjId" }] } } },
                ],
                as: "members",
              },
            },
            {
              $addFields: {
                leadIds: {
                  $filter: {
                    input: "$members",
                    as: "m",
                    cond: { $eq: ["$m.role", "team_lead"] },
                  },
                },
              },
            },
            {
              $lookup: {
                from: "users",
                let: { leadUserIds: "$leadIds.userId" },
                pipeline: [
                  { $match: { $expr: { $in: ["$id", "$$leadUserIds"] } } },
                  { $project: { name: 1, email: 1, image: 1 } },
                ],
                as: "leadUsers",
              },
            },
            {
              $addFields: {
                memberCount: { $size: "$members" },
                leadUser: { $arrayElemAt: ["$leadUsers", 0] },
                id: "$_id",
              },
            },
            {
              $project: {
                _id: 0,
                id: 1,
                name: 1,
                description: 1,
                memberCount: 1,
                leadName: "$leadUser.name",
                leadAvatar: "$leadUser.image",
                leadId: "$leadUser._id",
                createdAt: 1,
              },
            },
            { $sort: { createdAt: -1 } },
          ]).toArray(),
        ]);

        const workExMap = new Map<string, Record<string, unknown>[]>();
        for (const w of workExDocs) {
          const uid = w.userId as string;
          if (!workExMap.has(uid)) workExMap.set(uid, []);
          workExMap.get(uid)!.push(w);
        }
        const eduMap = new Map<string, Record<string, unknown>[]>();
        for (const e of eduDocs) {
          const uid = e.userId as string;
          if (!eduMap.has(uid)) eduMap.set(uid, []);
          eduMap.get(uid)!.push(e);
        }
        const depMap = new Map<string, Record<string, unknown>[]>();
        for (const d of depDocs) {
          const uid = d.userId as string;
          if (!depMap.has(uid)) depMap.set(uid, []);
          depMap.get(uid)!.push(d);
        }

        employees = allOrgMembers
          .filter((m) => userMap.has(m.userId as string))
          .map((m) => {
            const u = userMap.get(m.userId as string)!;
            const uid = m.userId as string;
            const userFiles = (u.files as string[]) || [];
            return {
              id: userDocToId(u) || uid || "",
              displayId: (u.displayId as string) || "",
              name: (u.name as string) || "Unknown",
              email: (u.email as string) || "",
              role: (m.role as string) || (u.role as string) || "staffs",
              status: (u.status as string) || "offline",
              department: (u.department as string) || "",
              designation: (u.designation as string) || "",
              employmentType: (u.employmentType as string) || "",
              phone: (u.phone as string) || "",
              branchName: (u.branchName as string) || "",
              joiningDate: u.joiningDate ? new Date(u.joiningDate as string | number).toISOString() : "",
              avatar: (u.image as string) || (u.avatar as string) || "",
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
              workExperience: (workExMap.get(uid) || []).map((w) => ({
                id: (w.id as string) || "",
                company: (w.company as string) || "",
                title: (w.title as string) || "",
                from: (w.from as string) || "",
                to: (w.to as string) || "",
                description: (w.description as string) || "",
                relevant: !!w.relevant,
              })),
              educationDetails: (eduMap.get(uid) || []).map((e) => ({
                id: (e.id as string) || "",
                institute: (e.institute as string) || "",
                degree: (e.degree as string) || "",
                specialization: (e.specialization as string) || "",
                completionDate: (e.completionDate as string) || "",
              })),
              dependentDetails: (depMap.get(uid) || []).map((d) => ({
                id: (d.id as string) || "",
                name: (d.name as string) || "",
                relationship: (d.relationship as string) || "",
                dob: (d.dob as string) || "",
              })),
              files: userFiles.map((fid: string) => {
                const file = fileMap.get(fid);
                return file ? { id: file.id as string, name: file.originalName as string, size: file.size as number, mimeType: file.mimeType as string } : { id: fid, name: fid, size: 0 };
              }),
            };
          });

        teams = (teamResults as unknown as Record<string, unknown>[]).map((t) => ({
          id: String(t.id || t._id || ""),
          name: (t.name as string) || "",
          description: (t.description as string) || "",
          memberCount: (t.memberCount as number) || 0,
          leadName: (t.leadName as string) || "",
          leadAvatar: (t.leadAvatar as string) || "",
          leadId: t.leadId ? String(t.leadId) : undefined,
          createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
        }));

        const [memberDocsNextAuth, memberDocsMongoose] = await Promise.all([
          db.collection(collections.orgMembers).find({ orgId }).toArray(),
          db.collection("orgmembers").find({ orgId }).toArray(),
        ]);
        const memberDocs = [...memberDocsNextAuth, ...memberDocsMongoose] as unknown as Record<string, unknown>[];
        const memberIds = [...new Set(memberDocs.map((m) => m.userId as string).filter(Boolean))];
        const memberUserDocs = await db.collection(collections.users).find({ id: { $in: memberIds } }).toArray() as unknown as Record<string, unknown>[];
        const memberUserMap = new Map(
          memberUserDocs.map((u) => [
            u.id as string,
            {
              name: (u.name as string) || "",
              email: (u.email as string) || "",
              avatar: (u.image as string) || "",
              status: (u.status as string) || "",
              department: (u.department as string) || "",
              designation: (u.designation as string) || "",
            },
          ])
        );
        members = memberDocs.map((m) => {
          const userId = m.userId as string;
          const u = memberUserMap.get(userId);
          return {
            userId,
            name: u?.name || (m.name as string) || "",
            email: u?.email || (m.email as string) || "",
            avatar: u?.avatar || "",
            role: (m.role as string) || "staffs",
            designation: u?.designation || (m.designation as string) || "",
            department: u?.department || (m.department as string) || "",
          };
        });

        terminated = users
          .filter((u) => (u.status as string) === "terminated")
          .map((u) => ({
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

        attendanceData = allOrgMembers.map((m) => {
          const userId = m.userId as string;
          const userDoc = userMap.get(userId);
          const createdAt = userDoc?.createdAt;
          const checkInTime = createdAt ? new Date(createdAt as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null;
          return {
            name: (userDoc?.name as string) || "Unknown",
            displayId: (userDoc?.displayId as string) || "\u2014",
            email: (userDoc?.email as string) || "\u2014",
            department: (userDoc?.department as string) || "\u2014",
            designation: (userDoc?.designation as string) || "\u2014",
            checkIn: checkInTime,
            checkOut: null,
            status: (userDoc?.status as string) === "break" ? "late" : (userDoc?.status as string) === "offline" ? "absent" : "present",
          };
        });

        reportEmployees = users.map((u: Record<string, unknown>) => ({
          ...u,
          _id: u._id ? String(u._id) : undefined,
        }));
      }
    } catch (err) {
      employees = [];
    }
  }

  return (
    <EmployeesClient
      employees={employees}
      user={user}
      teams={teams}
      members={members}
      orgId={orgIdForTeams}
      terminated={terminated}
      attendanceData={attendanceData}
      reportEmployees={reportEmployees}
    />
  );
}
