import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";
import { v4 as uuid } from "uuid";

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;
  const email = session.user.email;
  console.log(`[profile GET] userId=${userId} email=${email} role=${role}`);

  try {
    let user = null;
    if (email) {
      user = await db.collection(collections.users).findOne({ email });
    }
    
    if (!user) {
      user = await db.collection(collections.users).findOne({ id: userId });
    }
    if (!user) {
      try {
        if (ObjectId.isValid(userId)) {
          user = await db.collection(collections.users).findOne({ _id: new ObjectId(userId) } as never);
        }
      } catch {}
    }
    if (!user) {
      user = await db.collection(collections.users).findOne({ _id: userId } as never);
    }
    if (!user) {
      console.warn(`[profile GET] user not found for email=${email} userId=${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log(`[profile GET] user found: email=${user.email} name=${user.name}`);

    const dbUserId = (user.id || user._id).toString();

    // Super admin sees all orgs; others see their own org
    let orgId: string | null = null;
    let org: Record<string, unknown> | null = null;
    let memberCount = 0;

    if (role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN") {
      const firstOrg = await db.collection(collections.organizations).findOne({});
      if (firstOrg) {
        orgId = (firstOrg.id || firstOrg._id) as string;
        org = firstOrg;
      }
      memberCount = await db.collection(collections.orgMembers).countDocuments({});
    } else {
      orgId = await getUserOrgId(session.user.id, session.user.email);
      console.log(`[profile GET] resolved orgId=${orgId} via session userId/email`);

      // Auto-create org if user has none
      if (!orgId) {
        const userName = user.name || user.email?.split("@")[0] || "User";
        const newOrgId = uuid();
        await db.collection(collections.organizations).insertOne({
          id: newOrgId,
          name: `${userName}'s Organization`,
          slug: userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${dbUserId.slice(0, 8)}`,
          plan: "free",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await db.collection(collections.orgMembers).insertOne({
          id: uuid(),
          orgId: newOrgId,
          userId: dbUserId,
          role: "admin",
          joinedAt: new Date(),
        });
        orgId = newOrgId;
        console.log(`[profile GET] auto-created org=${newOrgId} for dbUserId=${dbUserId}`);
      }

      if (orgId) {
        org = await db.collection(collections.organizations).findOne({ id: orgId });
        if (!org) {
          org = await db.collection(collections.organizations).findOne({ _id: orgId } as never);
        }
        memberCount = await db.collection(collections.orgMembers).countDocuments({ orgId });
      }
    }

    if (!org) {
      console.warn(`[profile GET] no org resolved for userId=${userId}`);
    }

    return NextResponse.json({
      data: {
        user: {
          id: user.id || user._id,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          department: user.department || "",
          company: user.company || "",
          address: user.address || "",
          city: user.city || "",
          state: user.state || "",
          country: user.country || "",
          zipCode: user.zipCode || "",
          status: user.status || "offline",
          role: user.role || "member",
          image: user.image || "",
          bannerUrl: user.bannerUrl || "",
          createdAt: user.createdAt || new Date().toISOString(),
        },
        org: org ? {
          id: org.id || org._id,
          name: org.name || "",
          domain: org.domain || "",
          businessType: org.businessType || "",
          industry: org.industry || "",
          gstNumber: org.gstNumber || "",
          panNumber: org.panNumber || "",
          cinNumber: org.cinNumber || "",
          companyEmail: org.companyEmail || "",
          mobileNumber: org.mobileNumber || "",
          alternateMobileNumber: org.alternateMobileNumber || "",
          website: org.website || "",
          addressLine1: org.addressLine1 || "",
          addressLine2: org.addressLine2 || "",
          city: org.city || "",
          state: org.state || "",
          pincode: org.pincode || "",
          country: org.country || "India",
          logoUrl: org.logoUrl || "",
          authorizedPersonName: org.authorizedPersonName || "",
          designation: org.designation || "",
          authorizedPersonEmail: org.authorizedPersonEmail || "",
          authorizedPersonMobile: org.authorizedPersonMobile || "",
          numberOfEmployees: org.numberOfEmployees || 0,
          companyDescription: org.companyDescription || "",
          plan: org.plan || "free",
          createdAt: org.createdAt || new Date().toISOString(),
        } : null,
        memberCount,
      },
    });
  } catch (e) {
    console.error("[profile GET] Failed:", e);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;
  console.log(`[profile PATCH] userId=${userId} role=${role}`);

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name, email, phone, department, company,
    address, city, state, country, zipCode,
    companyName, companyDomain,
    businessType, industry, gstNumber, panNumber, cinNumber,
    companyEmail, mobileNumber, alternateMobileNumber, orgWebsite,
    addressLine1, addressLine2, orgCity, orgState, pincode, orgCountry,
    authorizedPersonName, designation, authorizedPersonEmail, authorizedPersonMobile,
    numberOfEmployees, companyDescription,
    secondaryPhone, nickname, displayId, firstName, lastName,
    location: userLocation, employmentType, branchName, shift,
    sourceOfHire, joiningDate, currentExperience, totalExperience,
    empDesignation, workExperience, educationDetails, dependentDetails,
    offerLetter,
  } = body;

  // Required-field validation
  const validationErrors: string[] = [];
  if (name !== undefined && !name.trim()) validationErrors.push("Name is required");
  if (email !== undefined && !email.trim()) validationErrors.push("Email is required");
  if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    validationErrors.push("Invalid email format");
  }
  if (companyEmail !== undefined && companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
    validationErrors.push("Invalid company email format");
  }
  if (numberOfEmployees !== undefined && numberOfEmployees !== "" && numberOfEmployees !== null) {
    const n = Number(numberOfEmployees);
    if (isNaN(n) || n < 0) validationErrors.push("Number of employees must be a non-negative number");
  }
  if (validationErrors.length > 0) {
    console.warn(`[profile PATCH] validation failed: ${validationErrors.join("; ")}`);
    return NextResponse.json({ error: validationErrors.join("; ") }, { status: 400 });
  }

  try {
    // Update user fields
    const userFields = { name, email, phone, department, company, address, city, state, country, zipCode, secondaryPhone: secondaryPhone || "", nickname, displayId, firstName, lastName, location: userLocation || "", employmentType, branchName, shift, sourceOfHire, joiningDate, currentExperience, totalExperience, designation: empDesignation || "", workExperience, educationDetails, dependentDetails, offerLetter };
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(userFields)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      const sessionEmail = session.user.email;
      let userQuery: { $or?: Record<string, unknown>[], email?: string } = {};
      
      if (sessionEmail) {
        userQuery = { email: sessionEmail };
      } else {
        userQuery = { $or: [{ id: userId }] };
        if (ObjectId.isValid(userId)) {
          userQuery.$or!.push({ _id: new ObjectId(userId) });
        } else {
          userQuery.$or!.push({ _id: userId });
        }
      }
      
      const userRes = await db.collection(collections.users).updateOne(userQuery as never, { $set: updates });
      console.log(`[profile PATCH] user update matched=${userRes.matchedCount} modified=${userRes.modifiedCount}`);
    }

    // Resolve orgId for update
    let orgId: string | null = null;
    if (role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN") {
      const firstOrg = await db.collection(collections.organizations).findOne({});
      if (firstOrg) orgId = (firstOrg.id || firstOrg._id) as string;
    } else {
      orgId = await getUserOrgId(userId, session.user.email);
      console.log(`[profile PATCH] resolved orgId=${orgId}`);
    }

    if (orgId) {
      // Resolve the MongoDB _id for the org. Both `id` (string uuid) and `_id` are used.
      let dbOrg = await db.collection(collections.organizations).findOne({ id: orgId });
      let orgDocId: string | null = null;
      if (dbOrg) {
        orgDocId = (dbOrg as Record<string, unknown>)._id as string;
      } else {
        dbOrg = await db.collection(collections.organizations).findOne({ _id: orgId } as never);
        if (dbOrg) orgDocId = orgId;
      }

      if (dbOrg && orgDocId) {
        const orgUpdates: Record<string, unknown> = { updatedAt: new Date() };
        const orgFieldMap: Record<string, unknown> = {
          name: companyName,
          domain: companyDomain,
          businessType, industry, gstNumber, panNumber, cinNumber,
          companyEmail, mobileNumber, alternateMobileNumber,
          website: orgWebsite,
          addressLine1, addressLine2,
          city: orgCity, state: orgState, pincode,
          country: orgCountry,
          authorizedPersonName, designation, authorizedPersonEmail, authorizedPersonMobile,
          numberOfEmployees: numberOfEmployees !== undefined && numberOfEmployees !== "" ? Number(numberOfEmployees) : undefined,
          companyDescription,
        };
        for (const [key, val] of Object.entries(orgFieldMap)) {
          if (val !== undefined) orgUpdates[key] = val;
        }
        if (Object.keys(orgUpdates).length > 1) {
          const orgRes = await db.collection(collections.organizations).updateOne({ _id: orgDocId } as never, { $set: orgUpdates });
          console.log(`[profile PATCH] org update matched=${orgRes.matchedCount} modified=${orgRes.modifiedCount}`);
        }
      } else {
        console.warn(`[profile PATCH] org doc not found for orgId=${orgId}`);
      }
    }

    // Fetch updated user
    const updatedUser = await db.collection(collections.users).findOne({ email: session.user.email });
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found after update" }, { status: 500 });
    }

    // Fetch updated org (orgId was resolved during the update above)
    let updatedOrg: Record<string, unknown> | null = null;
    let updatedMemberCount = 0;
    if (orgId) {
      updatedOrg = await db.collection(collections.organizations).findOne({ id: orgId });
      if (!updatedOrg) {
        try { updatedOrg = await db.collection(collections.organizations).findOne({ _id: new ObjectId(orgId) } as never); } catch {}
      }
      if (updatedOrg) {
        updatedMemberCount = await db.collection(collections.orgMembers).countDocuments({ orgId });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id || updatedUser._id,
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        department: updatedUser.department || "",
        company: updatedUser.company || "",
        address: updatedUser.address || "",
        city: updatedUser.city || "",
        state: updatedUser.state || "",
        country: updatedUser.country || "",
        zipCode: updatedUser.zipCode || "",
        status: updatedUser.status || "offline",
        role: updatedUser.role || "member",
        image: updatedUser.image || "",
        bannerUrl: updatedUser.bannerUrl || "",
        createdAt: updatedUser.createdAt || new Date().toISOString(),
      },
      org: updatedOrg ? {
        id: updatedOrg.id || updatedOrg._id,
        name: updatedOrg.name || "",
        domain: updatedOrg.domain || "",
        businessType: updatedOrg.businessType || "",
        industry: updatedOrg.industry || "",
        gstNumber: updatedOrg.gstNumber || "",
        panNumber: updatedOrg.panNumber || "",
        cinNumber: updatedOrg.cinNumber || "",
        companyEmail: updatedOrg.companyEmail || "",
        mobileNumber: updatedOrg.mobileNumber || "",
        alternateMobileNumber: updatedOrg.alternateMobileNumber || "",
        website: updatedOrg.website || "",
        addressLine1: updatedOrg.addressLine1 || "",
        addressLine2: updatedOrg.addressLine2 || "",
        city: updatedOrg.city || "",
        state: updatedOrg.state || "",
        pincode: updatedOrg.pincode || "",
        country: updatedOrg.country || "India",
        logoUrl: updatedOrg.logoUrl || "",
        authorizedPersonName: updatedOrg.authorizedPersonName || "",
        designation: updatedOrg.designation || "",
        authorizedPersonEmail: updatedOrg.authorizedPersonEmail || "",
        authorizedPersonMobile: updatedOrg.authorizedPersonMobile || "",
        numberOfEmployees: updatedOrg.numberOfEmployees || 0,
        companyDescription: updatedOrg.companyDescription || "",
        plan: updatedOrg.plan || "free",
        createdAt: updatedOrg.createdAt || new Date().toISOString(),
      } : null,
      memberCount: updatedMemberCount,
    });
  } catch (e) {
    console.error("[profile PATCH] Failed:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
