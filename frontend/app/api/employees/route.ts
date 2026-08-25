import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getNextEmployeeDisplayId } from "@/lib/db/counter";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { isAdminRole } from "@/lib/rbac";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ employees: [], teams: [], teamMembers: [] });

  try {
    const user = {
      name: session.user.name || "User",
      email: session.user.email || "",
      avatar: session.user.image || "",
    };
    const allOrgMembers = (await db
      .collection(collections.orgMembers)
      .find({ orgId })
      .toArray()) as any[];
    const userIds = [...new Set(allOrgMembers.map((m) => m.userId).filter(Boolean))];

    let employees: any[] = [];
    if (userIds.length > 0) {
      const objectIds = userIds
        .map((id) => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter((id): id is ObjectId => id !== null);
      const query =
        objectIds.length > 0
          ? { $or: [{ id: { $in: userIds } }, { _id: { $in: objectIds } }] }
          : { id: { $in: userIds } };
      const users = await db.collection(collections.users).find(query).toArray();

      // Backfill displayId for legacy users who predate the displayId feature
      const missingDisplayId = users.filter((u: any) => !u.displayId);
      if (missingDisplayId.length > 0) {
        const bulkOps = [];
        for (const u of missingDisplayId) {
          const newDisplayId = await getNextEmployeeDisplayId(orgId);
          bulkOps.push({
            updateOne: {
              filter: { _id: u._id },
              update: { $set: { displayId: newDisplayId, updatedAt: new Date() } },
            },
          });
          u.displayId = newDisplayId;
        }
        await db.collection(collections.users).bulkWrite(bulkOps);
      }

      const userMap = new Map(users.map((u: any) => [u.id || u._id?.toString(), u]));

      employees = allOrgMembers
        .filter((m) => userMap.has(m.userId))
        .map((m) => {
          const u = userMap.get(m.userId)!;
          return {
            id: u.id || u._id?.toString() || "",
            name: u.name || "Unknown",
            email: u.email || "",
            role: m.role || u.role || "staffs",
            status: u.status || "offline",
            department: u.department || "",
            designation: u.designation || "",
            employmentType: u.employmentType || "",
            phone: u.phone || "",
            branchName: u.branchName || "",
            joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString() : "",
            avatar: u.image || u.avatar || "",
            displayId: u.displayId || "",
            firstName: u.firstName || "",
            lastName: u.lastName || "",
            nickname: u.nickname || "",
            location: u.location || "",
            shift: u.shift || "",
            sourceOfHire: u.sourceOfHire || "",
            currentExperience: u.currentExperience || "",
            totalExperience: u.totalExperience || "",
            alternateEmail: u.alternateEmail || "",
            address: u.address || "",
            city: u.city || "",
            state: u.state || "",
            country: u.country || "",
            zipCode: u.zipCode || "",
            linkedin: u.linkedin || "",
            github: u.github || "",
            twitter: u.twitter || "",
            website: u.website || "",
            company: u.company || "",
          };
        });
    }

    const [teamDocs, orgMemberDocs] = await Promise.all([
      db
        .collection(collections.teams)
        .aggregate([
          { $match: { orgId } },
          { $addFields: { _teamIdStr: { $toString: "$_id" } } },
          {
            $lookup: {
              from: collections.teamMembers,
              let: { teamIdStr: "$_teamIdStr" },
              pipeline: [{ $match: { $expr: { $eq: ["$teamId", "$$teamIdStr"] } } }],
              as: "members",
            },
          },
          { $addFields: { memberCount: { $size: "$members" }, memberIds: "$members.userId" } },
          { $addFields: { id: "$_teamIdStr" } },
          { $project: { _id: 0, _teamIdStr: 0 } },
          { $sort: { createdAt: -1 } },
        ])
        .toArray(),
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
    ]);

    const allTeamMemberIds = (teamDocs as any[]).flatMap((t) => t.memberIds || []).filter(Boolean);
    const uniqueMemberIds = [...new Set(allTeamMemberIds)];
    const allOrgUserIds = [...new Set(allOrgMembers.map((m: any) => m.userId).filter(Boolean))];
    const allUserIdsToFetch = [...new Set([...uniqueMemberIds, ...allOrgUserIds])];
    const memberUserMap = new Map<string, any>();
    if (allUserIdsToFetch.length > 0) {
      const memberUserDocs = await db
        .collection(collections.users)
        .find({ id: { $in: allUserIdsToFetch } })
        .toArray();
      for (const u of memberUserDocs) {
        if (u.id) memberUserMap.set(u.id, u);
      }
    }

    const teams = (teamDocs as any[]).map((t) => {
      const memberList = (t.members || []).map((m: { userId: string; role: string }) => ({
        userId: m.userId,
        name: memberUserMap.get(m.userId)?.name || "Unknown",
        email: memberUserMap.get(m.userId)?.email || "",
        avatar: memberUserMap.get(m.userId)?.image || "",
        role: m.role || "team_staff",
      }));
      const lead = memberList.find((m: { role: string }) => m.role === "team_lead");
      return {
        id: String(t.id || ""),
        name: t.name || "",
        description: t.description || "",
        memberCount: t.memberCount || 0,
        leadName: lead?.name || "",
        leadAvatar: lead?.avatar || "",
        members: memberList,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
      };
    });

    const teamMembers = (orgMemberDocs as any[]).map((m) => {
      const u = memberUserMap.get(m.userId) || {};
      return {
        userId: m.userId,
        name: u.name || "",
        email: u.email || "",
        avatar: u.image || "",
        role: m.role || "staffs",
        department: u.department || "",
        designation: u.designation || "",
      };
    });

    return NextResponse.json({ employees, user, teams, teamMembers, orgId });
  } catch {
    return NextResponse.json({ employees: [], teams: [], teamMembers: [] });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toLowerCase() || "";
    if (!isAdminRole(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Account creation is authoritative in the backend. We proxy to
    // POST /api/accounts/staffs which derives orgId exclusively from the
    // authenticated session and rejects any orgId sent by the client.
    const csrfToken = request.headers.get("x-csrf-token") || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") || "",
    };
    if (csrfToken) headers["x-csrf-token"] = csrfToken;

    const backendRes = await fetch(`${API_URL}/api/accounts/staffs`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const backendBody = await backendRes
      .json()
      .catch(() => ({ error: "Invalid response from server" }));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: backendBody.error || backendBody.message || "Failed to create employee" },
        { status: backendRes.status === 409 ? 400 : backendRes.status },
      );
    }

    const account = backendBody.data || {};
    const email = (body.email as string) || "";
    const userId = account.user?.id || "";
    const name =
      account.user?.name ||
      [body.firstName || "", body.lastName || ""].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "Employee";

    const now = new Date();

    // Post-creation side effects (non-authoritative) run only after the
    // backend has committed the account.

    // Handle workExperience, educationDetails, dependentDetails
    if (Array.isArray(body.workExperience) && body.workExperience.length > 0 && userId) {
      await db.collection(collections.workExperience).insertMany(
        body.workExperience.map((exp: any) => ({
          id: exp.id || uuid(),
          userId,
          orgId: account.user?.orgId || session.user.orgId,
          company: exp.company || "",
          title: exp.title || "",
          roles: exp.roles || "",
          from: exp.from || null,
          to: exp.to || null,
          description: exp.description || "",
          relevant: exp.relevant || false,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    if (Array.isArray(body.educationDetails) && body.educationDetails.length > 0 && userId) {
      await db.collection(collections.educationDetails).insertMany(
        body.educationDetails.map((edu: any) => ({
          id: edu.id || uuid(),
          userId,
          orgId: account.user?.orgId || session.user.orgId,
          institute: edu.institute || "",
          degree: edu.degree || "",
          specialization: edu.specialization || "",
          completionDate: edu.completionDate || null,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    if (Array.isArray(body.dependentDetails) && body.dependentDetails.length > 0 && userId) {
      await db.collection(collections.dependentDetails).insertMany(
        body.dependentDetails.map((dep: any) => ({
          id: dep.id || uuid(),
          userId,
          orgId: account.user?.orgId || session.user.orgId,
          name: dep.name || "",
          relationship: dep.relationship || "",
          dob: dep.dob || null,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    // Welcome notification
    if (userId) {
      await db.collection(collections.notifications).insertOne({
        id: uuid(),
        userId,
        orgId: account.user?.orgId || session.user.orgId,
        createdBy: session.user.id,
        type: "system",
        title: "Welcome to MyWorkspace!",
        message: "Your account has been created. You're now part of the organization.",
        link: "/employees",
        read: false,
        createdAt: now,
      });

      // Notify other admins/members
      const orgId = account.user?.orgId || session.user.orgId;
      if (orgId) {
        const adminMembers = await db
          .collection(collections.orgMembers)
          .find({
            orgId,
            role: { $in: ["org_admin", "members"] },
          })
          .toArray();
        const adminIds = [...new Set(adminMembers.map((m: any) => m.userId))].filter(
          (id: string) => id !== userId,
        );
        if (adminIds.length > 0) {
          const adminNotifs = adminIds.map((adminId: string) => ({
            id: uuid(),
            userId: adminId,
            orgId,
            createdBy: session.user.id,
            type: "system",
            title: "New Employee Added",
            message: `${name} (${email}) has been added.`,
            link: "/employees",
            read: false,
            createdAt: now,
          }));
          await db.collection(collections.notifications).insertMany(adminNotifs);
        }
      }
    }

    const emailStatus = (account.emailStatus as string) || "skipped";
    const emailError = (account.emailError as string) || undefined;

    return NextResponse.json({
      ...account,
      id: userId,
      email,
      emailStatus,
      emailError,
    });
  } catch (err: any) {
    console.error("[API POST /api/employees] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create employee" },
      { status: 500 },
    );
  }
}
