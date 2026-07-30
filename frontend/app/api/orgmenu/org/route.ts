import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const users = await db.collection(collections.users).find({ role: { $ne: "clients" } }).toArray() as any[];

    const members = users.map((u) => ({
      userId: u.id || u._id?.toString() || "",
      role: u.role || "staffs",
      name: u.name || "Unknown",
      email: u.email || "",
      avatar: u.image || "",
      status: u.status || "offline",
      companyName: "",
      phone: u.phone || "",
      department: u.department || "",
      designation: u.designation || "",
      employmentType: u.employmentType || "",
      branchName: u.branchName || "",
      joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString() : "",
      registeredAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
    }));

    return NextResponse.json({ members });
  } catch { return NextResponse.json({ members: [] }); }
}
