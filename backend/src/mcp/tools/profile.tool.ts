import { Organization } from "../../lib/db/models/Organization.js";
import { User } from "../../lib/db/models/User.js";
import { Settings } from "../../lib/db/models/Settings.js";
import { toolRegistry } from "./registry.js";

toolRegistry.register({
  name: "profile.get",
  description: "Read-only access to company and user profile information. Returns organization details, contact info, branding, business hours, social links, and user profile data.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const orgId = ctx.org.id;

    const [org, user, settings] = await Promise.all([
      Organization.findOne({ id: orgId }).lean(),
      User.findOne({ id: ctx.user.userId }).lean(),
      Settings.findOne({ orgId }).lean(),
    ]);

    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.companyDescription || "",
        logo: org.logo || "",
        industry: org.industry || "",
        businessType: org.businessType || "",
        companyEmail: org.companyEmail || "",
        mobileNumber: org.mobileNumber || "",
        alternateMobileNumber: org.alternateMobileNumber || "",
        website: org.website || "",
        address: {
          line1: org.addressLine1 || "",
          line2: org.addressLine2 || "",
          city: org.city || "",
          state: org.state || "",
          pincode: org.pincode || "",
          country: org.country || "",
        },
        gstNumber: org.gstNumber || "",
        panNumber: org.panNumber || "",
        cinNumber: org.cinNumber || "",
        authorizedPerson: {
          name: org.authorizedPersonName || "",
          designation: org.designation || "",
          email: org.authorizedPersonEmail || "",
          mobile: org.authorizedPersonMobile || "",
        },
        numberOfEmployees: org.numberOfEmployees || 0,
        plan: org.plan || "free",
        socialLinks: {
          domain: org.domain || "",
          website: org.website || "",
        },
      },
      user: {
        id: user?.id || "",
        name: user?.name || "",
        email: user?.email || "",
        role: ctx.user.role,
        phone: user?.phone || "",
        secondaryPhone: user?.secondaryPhone || "",
        image: user?.image || "",
        department: user?.department || "",
        company: user?.company || "",
        address: user?.address || "",
        city: user?.city || "",
        state: user?.state || "",
        country: user?.country || "",
        linkedin: user?.linkedin || "",
        github: user?.github || "",
        twitter: user?.twitter || "",
      },
      settings: {
        timezone: settings?.general?.timezone || "UTC",
        language: settings?.general?.language || "en",
        businessHours: {
          start: 9,
          end: 18,
        },
        currency: "INR",
      },
    };
  },
});

toolRegistry.register({
  name: "profile.list",
  description: "List all companies/organizations the user has access to (admin only).",
  requiredRole: ["admin", "manager"],
  handler: async (_params: Record<string, unknown>, ctx) => {
    const org = await Organization.findOne({ id: ctx.org.id })
      .select("id name slug industry companyEmail city state country")
      .lean();

    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      organizations: [org],
      total: 1,
    };
  },
});
