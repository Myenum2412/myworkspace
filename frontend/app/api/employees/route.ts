import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId, ensureUserOrg } from "@/lib/org";
import { ObjectId } from "mongodb";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { isAdminRole } from "@/lib/rbac";
import { getNextSequence, getNextEmployeeDisplayId } from "@/lib/db/counter";
import { sendEmailDirect, buildEmployeeOnboardedHtml } from "@/lib/email";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ employees: [], teams: [], teamMembers: [] });

  try {
    const user = { name: session.user.name || "User", email: session.user.email || "", avatar: session.user.image || "" };
    const allOrgMembers = await db.collection(collections.orgMembers).find({ orgId }).toArray() as any[];
    const userIds = [...new Set(allOrgMembers.map((m) => m.userId).filter(Boolean))];

    let employees: any[] = [];
    if (userIds.length > 0) {
      const objectIds = userIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter((id): id is ObjectId => id !== null);
      const query = objectIds.length > 0
        ? { $or: [{ id: { $in: userIds } }, { _id: { $in: objectIds } }] }
        : { id: { $in: userIds } };
      const users = await db.collection(collections.users).find(query).toArray();
      const userMap = new Map(users.map((u: any) => [u.id || u._id?.toString(), u]));

      employees = allOrgMembers
        .filter((m) => userMap.has(m.userId))
        .map((m) => {
          const u = userMap.get(m.userId)!;
          return {
            id: u.id || u._id?.toString() || "", name: u.name || "Unknown", email: u.email || "",
            role: m.role || u.role || "staffs", status: u.status || "offline", department: u.department || "",
            designation: u.designation || "", employmentType: u.employmentType || "", phone: u.phone || "",
            branchName: u.branchName || "", joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString() : "",
            avatar: u.image || u.avatar || "",
            displayId: u.displayId || "", firstName: u.firstName || "", lastName: u.lastName || "",
            nickname: u.nickname || "", location: u.location || "", shift: u.shift || "",
            sourceOfHire: u.sourceOfHire || "", currentExperience: u.currentExperience || "",
            totalExperience: u.totalExperience || "", alternateEmail: u.alternateEmail || "",
            address: u.address || "", city: u.city || "", state: u.state || "", country: u.country || "",
            zipCode: u.zipCode || "", linkedin: u.linkedin || "", github: u.github || "",
            twitter: u.twitter || "", website: u.website || "", company: u.company || "",
          };
        });
    }

    const [teamDocs, orgMemberDocs] = await Promise.all([
      db.collection(collections.teams).aggregate([
        { $match: { orgId } },
        { $addFields: { _teamIdStr: { $toString: "$_id" } } },
        { $lookup: { from: collections.teamMembers, let: { teamIdStr: "$_teamIdStr" }, pipeline: [{ $match: { $expr: { $eq: ["$teamId", "$$teamIdStr"] } } }], as: "members" } },
        { $addFields: { memberCount: { $size: "$members" }, memberIds: "$members.userId" } },
        { $addFields: { id: "$_teamIdStr" } },
        { $project: { _id: 0, _teamIdStr: 0 } },
        { $sort: { createdAt: -1 } },
      ]).toArray(),
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
    ]);

    const allTeamMemberIds = (teamDocs as any[]).flatMap((t) => t.memberIds || []).filter(Boolean);
    const uniqueMemberIds = [...new Set(allTeamMemberIds)];
    const allOrgUserIds = [...new Set(allOrgMembers.map((m: any) => m.userId).filter(Boolean))];
    const allUserIdsToFetch = [...new Set([...uniqueMemberIds, ...allOrgUserIds])];
    let memberUserMap = new Map<string, any>();
    if (allUserIdsToFetch.length > 0) {
      const memberUserDocs = await db.collection(collections.users).find({ id: { $in: allUserIdsToFetch } }).toArray();
      for (const u of memberUserDocs) { if (u.id) memberUserMap.set(u.id, u); }
    }

    const teams = (teamDocs as any[]).map((t) => {
      const memberList = (t.members || []).map((m: { userId: string; role: string }) => ({
        userId: m.userId, name: memberUserMap.get(m.userId)?.name || "Unknown",
        email: memberUserMap.get(m.userId)?.email || "", avatar: memberUserMap.get(m.userId)?.image || "",
        role: m.role || "team_staff",
      }));
      const lead = memberList.find((m: { role: string }) => m.role === "team_lead");
      return {
        id: String(t.id || ""), name: t.name || "", description: t.description || "", memberCount: t.memberCount || 0,
        leadName: lead?.name || "",
        leadAvatar: lead?.avatar || "",
        members: memberList,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
      };
    });

    const teamMembers = (orgMemberDocs as any[]).map((m) => {
      const u = memberUserMap.get(m.userId) || {};
      return { userId: m.userId, name: u.name || "", email: u.email || "", avatar: u.image || "", role: m.role || "staffs", department: u.department || "", designation: u.designation || "" };
    });

    return NextResponse.json({ employees, user, teams, teamMembers, orgId });
  } catch { return NextResponse.json({ employees: [], teams: [], teamMembers: [] }); }
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

    const orgId = await ensureUserOrg(session.user.id, session.user.email);
    const body = await request.json();

    const { email, firstName, lastName, password } = body;
    if (!email || !firstName) {
      return NextResponse.json({ error: "First name and email are required" }, { status: 400 });
    }

    // Check if email already exists in users
    const existingUser = await db.collection(collections.users).findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const existingClient = await db.collection(collections.clientUsers || "client_users").findOne({ email });
    if (existingClient) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const userId = uuid();
    const plainPassword = password || Math.random().toString(36).slice(-8) + "A1!";
    const hashedPassword = await hash(plainPassword, 12);
    const userNumber = await getNextSequence("userNumber");
    const displayId = await getNextEmployeeDisplayId(orgId);

    const name = [firstName || "", lastName || ""].filter(Boolean).join(" ") || email.split("@")[0] || "Employee";

    const allowedFields = [
      "firstName", "lastName", "nickname", "email", "avatar",
      "department", "designation", "location", "phone",
      "role", "branchName", "shift", "employmentType", "status",
      "sourceOfHire", "joiningDate", "currentExperience", "totalExperience",
      "alternateEmail", "address", "city", "state", "country", "zipCode",
      "offerLetter", "linkedin", "github", "twitter", "website",
    ];

    const newEmployee: Record<string, any> = {
      id: userId,
      userNumber,
      displayId,
      name,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        newEmployee[field] = body[field] || null;
      }
    }

    // Ensure role matches body
    newEmployee.role = body.role || body.roleName || "staffs";
    newEmployee.status = (body.status || "active").toLowerCase();

    // Insert user into users collection
    await db.collection(collections.users).insertOne(newEmployee);

    // Insert into orgMembers
    await db.collection(collections.orgMembers).insertOne({
      id: uuid(),
      orgId,
      userId,
      role: newEmployee.role,
      joinedAt: new Date(),
    });

    const now = new Date();
    // Handle workExperience, educationDetails, dependentDetails
    if (Array.isArray(body.workExperience) && body.workExperience.length > 0) {
      await db.collection(collections.workExperience).insertMany(
        body.workExperience.map((exp: any) => ({
          id: exp.id || uuid(),
          userId,
          orgId,
          company: exp.company || "",
          title: exp.title || "",
          roles: exp.roles || "",
          from: exp.from || null,
          to: exp.to || null,
          description: exp.description || "",
          relevant: exp.relevant || false,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    if (Array.isArray(body.educationDetails) && body.educationDetails.length > 0) {
      await db.collection(collections.educationDetails).insertMany(
        body.educationDetails.map((edu: any) => ({
          id: edu.id || uuid(),
          userId,
          orgId,
          institute: edu.institute || "",
          degree: edu.degree || "",
          specialization: edu.specialization || "",
          completionDate: edu.completionDate || null,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    if (Array.isArray(body.dependentDetails) && body.dependentDetails.length > 0) {
      await db.collection(collections.dependentDetails).insertMany(
        body.dependentDetails.map((dep: any) => ({
          id: dep.id || uuid(),
          userId,
          orgId,
          name: dep.name || "",
          relationship: dep.relationship || "",
          dob: dep.dob || null,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    // Insert welcome notification
    await db.collection(collections.notifications).insertOne({
      id: uuid(),
      userId,
      orgId,
      createdBy: session.user.id,
      type: "system",
      title: "Welcome to MyWorkspace!",
      message: "Your account has been created. You're now part of the organization.",
      link: "/employees",
      read: false,
      createdAt: now,
    });

    // Notify other admins/members
    const adminMembers = await db.collection(collections.orgMembers).find({
      orgId,
      role: { $in: ["org_admin", "members"] }
    }).toArray();
    const adminIds = [...new Set(adminMembers.map((m: any) => m.userId))].filter((id: string) => id !== userId);
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

    // Send credentials email
    const workspaceName = "MyWorkspace";
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;
    const htmlBody = buildEmployeeOnboardedHtml(firstName, email, workspaceName, loginUrl, plainPassword);
    const subject = `Welcome to ${workspaceName} - Your Account is Ready`;
    const emailResult = await sendEmailDirect(email, subject, htmlBody);

    const createdUser = await db.collection(collections.users).findOne(
      { id: userId },
      { projection: { password: 0 } }
    );

    return NextResponse.json({
      ...createdUser,
      emailStatus: emailResult.emailStatus,
      emailError: emailResult.error,
    });

  } catch (err: any) {
    console.error("[API POST /api/employees] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create employee" }, { status: 500 });
  }
}

