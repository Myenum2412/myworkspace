import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg, validateOrgMembership } from "@/lib/org";
import { getNextSequence } from "@/lib/db/counter";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await ensureUserOrg(session.user.id);

    const orgMembers = await (await db.collection(collections.orgMembers).find({ orgId })).toArray();
    const userIds = orgMembers.map((m: any) => m.userId);
    const users = await (await db.collection(collections.users).find(
      { id: { $in: userIds } },
      { projection: { password: 0 } }
    ).sort({ createdAt: -1 })).toArray();

    const result = users.map((u: Record<string, unknown>) => {
      const member = orgMembers.find((m: any) => m.userId === u.id);
      return {
        ...u,
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

    const orgId = await ensureUserOrg(session.user.id);

    const body = await request.json();
    const { empId, firstName, lastName, nickname, email, password, avatar, department, designation, location, phone, roleName, branchName, shift, employmentType, status, sourceOfHire, joiningDate, currentExperience, totalExperience, alternateEmail, address, city, state, country, zipCode, linkedin, github, twitter, website, workExperience, educationDetails, dependentDetails, files } = body;

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

    const name = [firstName, lastName].filter(Boolean).join(" ");

    await db.collection(collections.users).insertOne({
      id: userId,
      userNumber,
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
      linkedin: linkedin || null,
      github: github || null,
      twitter: twitter || null,
      website: website || null,
      currentExperience: currentExperience || null,
      totalExperience: totalExperience || null,
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

    const { sendWelcomeEmail } = await import("@/lib/mail");
    sendWelcomeEmail(email, name).catch((err) => {
      console.error("[employees] Welcome email failed:", err?.message || err);
    });

    const employee = await db.collection(collections.users).findOne({ id: userId });
    return NextResponse.json(employee, { status: 201 });
  } catch (err: any) {
    console.error("Create employee error:", err);
    const message = err?.message || "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
