import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      "linkedin", "github", "twitter", "website",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
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
