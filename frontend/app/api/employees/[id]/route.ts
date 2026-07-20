import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";
import { isAdminRole } from "@/lib/rbac";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { ObjectId } = await import("mongodb");
    const orClauses: Record<string, unknown>[] = [{ id }];
    if (ObjectId.isValid(id)) {
      orClauses.push({ _id: new ObjectId(id) });
    }
    const user = await db.collection(collections.users).findOne(
      { $or: orClauses } as any,
      { projection: { password: 0 } }
    );
    if (!user) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const [workExperience, educationDetails, dependentDetails] = await Promise.all([
      db.collection(collections.workExperience).find({ userId: id }).toArray(),
      db.collection(collections.educationDetails).find({ userId: id }).toArray(),
      db.collection(collections.dependentDetails).find({ userId: id }).toArray(),
    ]);

    return NextResponse.json({
      data: {
        ...user,
        _id: user._id ? String(user._id) : undefined,
        workExperience,
        educationDetails,
        dependentDetails,
      },
    });
  } catch (err: any) {
    console.error("[API GET /api/employees/:id] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Block employee users from modifying employees
    if (!isAdminRole(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = await ensureUserOrg(session.user.id, session.user.email);
    const { id } = await params;

    const existing = await db.collection(collections.users).findOne({ id });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = [
      "firstName", "lastName", "nickname", "email", "avatar",
      "department", "designation", "location", "phone",
      "role", "branchName", "shift", "employmentType", "status",
      "sourceOfHire", "joiningDate", "currentExperience", "totalExperience",
      "alternateEmail", "address", "city", "state", "country", "zipCode",
      "offerLetter", "linkedin", "github", "twitter", "website",
      "terminateReason", "terminateDate",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    }

    if (body.password) {
      updateData.password = await hash(body.password, 12);
    }

    if (body.firstName || body.lastName) {
      updateData.name = [body.firstName || "", body.lastName || ""]
        .filter(Boolean).join(" ");
    }

    updateData.updatedAt = new Date();

    await db.collection(collections.users).updateOne(
      { id },
      { $set: updateData }
    );

    const now = new Date();
    if (Array.isArray(body.workExperience)) {
      await db.collection(collections.workExperience).deleteMany({ userId: id });
      if (body.workExperience.length > 0) {
        await db.collection(collections.workExperience).insertMany(
          body.workExperience.map((exp: any) => ({
            id: exp.id || uuid(),
            userId: id,
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
    }

    if (Array.isArray(body.educationDetails)) {
      await db.collection(collections.educationDetails).deleteMany({ userId: id });
      if (body.educationDetails.length > 0) {
        await db.collection(collections.educationDetails).insertMany(
          body.educationDetails.map((edu: any) => ({
            id: edu.id || uuid(),
            userId: id,
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
    }

    if (Array.isArray(body.dependentDetails)) {
      await db.collection(collections.dependentDetails).deleteMany({ userId: id });
      if (body.dependentDetails.length > 0) {
        await db.collection(collections.dependentDetails).insertMany(
          body.dependentDetails.map((dep: any) => ({
            id: dep.id || uuid(),
            userId: id,
            orgId,
            name: dep.name || "",
            relationship: dep.relationship || "",
            dob: dep.dob || null,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }
    }

    const updated = await db.collection(collections.users).findOne(
      { id },
      { projection: { password: 0 } }
    );

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[API PUT /api/employees/:id] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
