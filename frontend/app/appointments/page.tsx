import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";
import Appointments from "./appointments";
import type { Doctor } from "@/components/appointments/appointment-types";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);

  const doctorDocs = await db
    .collection(collections.doctors)
    .find({ orgId })
    .sort({ doctorName: 1 })
    .toArray() as unknown as Record<string, unknown>[];

  const doctors: Doctor[] = doctorDocs.map((d) => ({
    id: d.id as string,
    orgId: d.orgId as string,
    doctorName: d.doctorName as string,
    specialization: d.specialization as string,
    department: d.department as string,
    consultationFee: d.consultationFee as number,
    phone: d.phone as string,
    email: d.email as string,
    status: d.status as "active" | "inactive",
    createdAt: d.createdAt as string,
    updatedAt: d.updatedAt as string,
  }));

  return <Appointments initialDoctors={doctors} />;
}
