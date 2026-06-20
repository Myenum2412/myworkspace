import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/config";

export async function POST(request: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { empId, firstName, lastName, email, password, avatar, department, phone, roleName, branchName, employmentType, status, sourceOfHire, workExperience, educationDetails, dependentDetails, currentExperience, totalExperience } = body;

  if (!firstName || !email) {
    return NextResponse.json({ error: "First name and email are required" }, { status: 400 });
  }

  const existing = await db.collection(collections.users).find({ email }).toArray();
  if (existing.length > 0) {
    return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
  }

  const orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!orgMember) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const userId = uuid();
  const defaultPassword = password || Math.random().toString(36).slice(-8) + "A1!";
  const hashedPassword = await hash(defaultPassword, 12);

  const name = [firstName, lastName].filter(Boolean).join(" ");

  await db.collection(collections.users).insertOne({
    id: userId,
    name,
    email,
    password: hashedPassword,
    avatar: avatar || "",
    role: roleName?.toLowerCase() || "member",
    department: department || null,
    branchName: branchName || null,
    employmentType: employmentType || null,
    status: status?.toLowerCase() === "inactive" ? "inactive" : "active",
    sourceOfHire: sourceOfHire || null,
    phone: phone || null,
    currentExperience: currentExperience || null,
    totalExperience: totalExperience || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId: orgMember.orgId,
    userId,
    role: roleName?.toLowerCase() || "member",
  });

  if (workExperience?.length) {
    await db.collection(collections.workExperience).insertMany(
      workExperience.map((exp: any) => ({
        id: uuid(),
        userId,
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
        name: dep.name || "",
        relationship: dep.relationship || "",
        dob: dep.dob || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
  }

  const employee = await db.collection(collections.users).findOne({ id: userId });
  return NextResponse.json(employee, { status: 201 });
}
