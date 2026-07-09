import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg, validateOrgMembership } from "@/lib/org";
import { getNextSequence, getNextEmployeeDisplayId } from "@/lib/db/counter";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Block employee users from listing all employees
    const role = session.user.role?.toLowerCase() || "";
    const isWorkspaceAdmin = ["workspace", "admin", "manager", "org_menu_admin", "super_admin"].includes(role);
    if (!isWorkspaceAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = await ensureUserOrg(session.user.id, session.user.email);

    // Query BOTH org membership collections (NextAuth org_members AND Mongoose orgmembers)
    const [fromNextAuth, fromMongoose] = await Promise.all([
      (await db.collection(collections.orgMembers).find({ orgId })).toArray(),
      (await db.collection("orgmembers").find({ orgId })).toArray(),
    ]);
    const allOrgMembers = [...fromNextAuth, ...fromMongoose];
    // Deduplicate by userId
    const seenUserIds = new Set<string>();
    const orgMembers = allOrgMembers.filter((m: any) => {
      const uid = m.userId as string;
      if (!uid || seenUserIds.has(uid)) return false;
      seenUserIds.add(uid);
      return true;
    });
    const userIds = (orgMembers as unknown as { userId: string }[]).map((m) => m.userId);
    // Build ObjectId array for matching _id (some orgmember userIds are ObjectId hex strings)
    const { ObjectId } = await import("mongodb");
    const objectIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const users = await (await db.collection(collections.users).find(
      { $or: [{ id: { $in: userIds } }, ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : [])] },
      { projection: { password: 0 } }
    ).sort({ createdAt: -1 })).toArray();

    const result = users.map((u: Record<string, unknown>) => {
      const uIdStr = u.id as string;
      const uObjIdStr = u._id ? String(u._id) : "";
      const member = orgMembers.find((m: any) => m.userId === uIdStr || m.userId === uObjIdStr);
      return {
        ...u,
        _id: uObjIdStr,
        id: uIdStr || uObjIdStr,
        orgRole: member?.role || "member",
      };
    });

    return NextResponse.json({ data: result });
  } catch (err: any) {
    console.error("[API GET /api/employees] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let session;
    try {
      session = await auth();
    } catch {
      return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
    }
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Block employee users from creating employees
    const role = session.user.role?.toLowerCase() || "";
    const isWorkspaceAdmin = ["workspace", "admin", "manager", "org_menu_admin", "super_admin"].includes(role);
    if (!isWorkspaceAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = await ensureUserOrg(session.user.id, session.user.email);

    const body = await request.json();
    const { firstName, lastName, nickname, email, password, avatar, department, designation, location, phone, roleName, branchName, shift, employmentType, status, sourceOfHire, joiningDate, currentExperience, totalExperience, alternateEmail, address, city, state, country, zipCode, offerLetter, workExperience, educationDetails, dependentDetails, files } = body;

    if (!firstName || !email) {
      return NextResponse.json({ error: "First name and email are required" }, { status: 400 });
    }

    const existing = await db.collection(collections.users).findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const userId = uuid();
    const defaultPassword = password || Math.random().toString(36).slice(-8) + "A1!";
    const hashedPassword = await hash(defaultPassword, 12);
    const userNumber = await getNextSequence("userNumber");
    const displayId = await getNextEmployeeDisplayId(orgId);

    const name = [firstName, lastName].filter(Boolean).join(" ");

    await db.collection(collections.users).insertOne({
      id: userId,
      userNumber,
      displayId,
      name,
      nickname: nickname || null,
      email,
      password: hashedPassword,
      avatar: avatar || "",
      role: roleName?.toLowerCase() || "member",
      department: department || null,
      designation: designation || null,
      location: location || null,
      branchName: branchName || null,
      shift: shift || null,
      employmentType: employmentType || null,
      status: status?.toLowerCase() === "inactive" ? "inactive" : "active",
      isActive: true,
      emailVerified: false,
      sourceOfHire: sourceOfHire || null,
      joiningDate: joiningDate || null,
      phone: phone || null,
      alternateEmail: alternateEmail || null,
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || null,
      zipCode: zipCode || null,
      currentExperience: currentExperience || null,
      totalExperience: totalExperience || null,
      offerLetter: offerLetter || null,
      files: files || [],
      orgId,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection(collections.orgMembers).insertOne({
      id: uuid(),
      orgId,
      userId,
      role: roleName?.toLowerCase() || "member",
    });

    if (workExperience?.length) {
      await db.collection(collections.workExperience).insertMany(
        workExperience.map((exp: any) => ({
          id: uuid(),
          userId,
          orgId,
          company: exp.company || "",
          title: exp.title || "",
          roles: exp.roles || "",
          from: exp.from || null,
          to: exp.to || null,
          description: exp.description || "",
          relevant: exp.relevant || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    if (educationDetails?.length) {
      await db.collection(collections.educationDetails).insertMany(
        educationDetails.map((edu: any) => ({
          id: uuid(),
          userId,
          orgId,
          institute: edu.institute || "",
          degree: edu.degree || "",
          specialization: edu.specialization || "",
          completionDate: edu.completionDate || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    if (dependentDetails?.length) {
      await db.collection(collections.dependentDetails).insertMany(
        dependentDetails.map((dep: any) => ({
          id: uuid(),
          userId,
          orgId,
          name: dep.name || "",
          relationship: dep.relationship || "",
          dob: dep.dob || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    const { sendEmployeeOnboarded } = await import("@/lib/mail");
    const workspaceName = "MyWorkspace";
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

    let emailStatus: "sent" | "failed" | "skipped" = "skipped";
    let emailError: string | undefined;
    try {
      const result = await sendEmployeeOnboarded(email, firstName || name, email, workspaceName, loginUrl, defaultPassword);
      emailStatus = result.emailStatus;
      emailError = result.error;
    } catch (err: any) {
      console.error("[employees] Onboarded email failed:", err?.message || err);
      emailStatus = "failed";
      emailError = err?.message || "Email delivery failed";
    }

    const notificationsCol = db.collection(collections.notifications);
    const now = new Date();
    const newUserNotif = {
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
    };
    await notificationsCol.insertOne(newUserNotif);

    const adminMembers = await (await db.collection(collections.orgMembers).find({ orgId, role: { $in: ["admin", "manager"] } })).toArray();
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
      await notificationsCol.insertMany(adminNotifs);
    }

    const employee = await db.collection(collections.users).findOne({ id: userId, projection: { password: 0 } });
    return NextResponse.json({
      ...employee,
      _id: employee?._id ? String(employee._id) : undefined,
      emailStatus,
      emailError,
      tempPassword: defaultPassword,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Create employee error:", err);
    const message = err?.message || "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
