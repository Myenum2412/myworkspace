import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  try {
    const user = await db.collection(collections.users).findOne({ id: session.user.id }) as any;
    let org: any = null;
    if (orgId) {
      const oid = ObjectId.isValid(orgId) ? new ObjectId(orgId) : null;
      org = await db.collection(collections.organizations).findOne(oid ? { _id: oid } : { id: orgId }) as any;
    }
    return NextResponse.json({
      data: {
        user: user ? {
          id: user.id || user._id?.toString() || "", name: user.name || "", email: user.email || "",
          phone: user.phone || "", department: user.department || "", company: user.company || "",
          address: user.address || "", city: user.city || "", state: user.state || "",
          country: user.country || "", zipCode: user.zipCode || "",
          linkedin: user.linkedin || "", github: user.github || "", twitter: user.twitter || "",
          website: user.website || "", status: user.status || "offline", role: user.role || "staffs",
          image: user.image || "", bannerUrl: user.bannerUrl || "",
          joiningDate: user.joiningDate || "",
          createdAt: user.createdAt || new Date().toISOString(),
        } : null,
        org: org ? {
          id: org.id || org._id?.toString() || "", name: org.name || "", domain: org.domain || "",
          businessType: org.businessType || "", industry: org.industry || "",
          gstNumber: org.gstNumber || "", panNumber: org.panNumber || "", cinNumber: org.cinNumber || "",
          companyEmail: org.companyEmail || "", mobileNumber: org.mobileNumber || "",
          alternateMobileNumber: org.alternateMobileNumber || "", website: org.website || "",
          addressLine1: org.addressLine1 || "", addressLine2: org.addressLine2 || "",
          city: org.city || "", state: org.state || "", pincode: org.pincode || "",
          country: org.country || "India", logoUrl: org.logoUrl || "",
          authorizedPersonName: org.authorizedPersonName || "", designation: org.designation || "",
          authorizedPersonEmail: org.authorizedPersonEmail || "", authorizedPersonMobile: org.authorizedPersonMobile || "",
          numberOfEmployees: org.numberOfEmployees || 0, companyDescription: org.companyDescription || "",
          plan: org.plan || "free", createdAt: org.createdAt || new Date().toISOString(),
          tradeName: org.tradeName || "", yearEstablished: org.yearEstablished || "",
          companySize: org.companySize || "", registrationNumber: org.registrationNumber || "",
          registrationAuthority: org.registrationAuthority || "", taxIdentificationNumber: org.taxIdentificationNumber || "",
          registrationDate: org.registrationDate || "", businessStatus: org.businessStatus || "Active",
          supportEmail: org.supportEmail || "", supportPhone: org.supportPhone || "",
          facebook: org.facebook || "", instagram: org.instagram || "", twitterHandle: org.twitterHandle || "",
          youtube: org.youtube || "", primaryBusinessActivity: org.primaryBusinessActivity || "",
          secondaryBusinessActivity: org.secondaryBusinessActivity || "", operatingCountries: org.operatingCountries || "",
          timeZone: org.timeZone || "", preferredCurrency: org.preferredCurrency || "",
          emailVerified: org.emailVerified || false, phoneVerified: org.phoneVerified || false,
          websiteVerified: org.websiteVerified || false, businessVerified: org.businessVerified || false,
          addressVerified: org.addressVerified || false, documentsVerified: org.documentsVerified || false,
        } : null,
      },
      orgId: orgId || "",
    });
  } catch { return NextResponse.json({ data: null, orgId: "" }); }
}
