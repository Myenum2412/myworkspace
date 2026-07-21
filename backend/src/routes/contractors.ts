import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { Contractor, type IEmergencyContact } from "../lib/db/models/Contractor.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import { requireString, requireEnum } from "../lib/validate.js";
import { processEvent } from "../services/notification-engine.service.js";

const router = Router();

router.use(authenticate);

router.get("/", cacheEnhanced({ ttl: 30, varyByOrg: true, tags: ["contractors"] }), async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembership(req.user!.userId);
  const contractors = await Contractor.find({ orgId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: contractors });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembership(req.user!.userId);
  const contractor = await Contractor.findOne({ orgId, id: req.params.id }).lean();
  if (!contractor) throw new AppError(404, "Contractor not found");
  res.json({ success: true, data: contractor });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can create contractors");
  const orgId = await requireOrgMembership(req.user!.userId);
  const fullName = requireString(req.body.fullName, "fullName", { min: 1, max: 300 });
  const mobileNumber = requireString(req.body.mobileNumber, "mobileNumber", { min: 1, max: 50 });
  const emailAddress = requireString(req.body.emailAddress, "emailAddress", { min: 1, max: 300 });
  const country = requireString(req.body.country, "country", { min: 1, max: 200 });
  const city = requireString(req.body.city, "city", { min: 1, max: 200 });
  const contractorType = requireEnum(req.body.contractorType, ["Individual", "Company", "Subcontractor"] as const, "contractorType");
  const mainTrade = requireEnum(req.body.mainTrade, [
    "Civil", "Electrical", "Plumbing", "Carpentry", "Painting",
    "Mason", "Steel", "HVAC", "Roofing", "Flooring", "Other",
  ] as const, "mainTrade");
  const yearsOfExperience = req.body.yearsOfExperience;
  const numberOfWorkers = req.body.numberOfWorkers;
  const insuranceAvailable = requireEnum(req.body.insuranceAvailable, ["Yes", "No"] as const, "insuranceAvailable");
  const availableFrom = requireString(req.body.availableFrom, "availableFrom", { min: 1, max: 100 });
  const preferredWorkArea = requireString(req.body.preferredWorkArea, "preferredWorkArea", { min: 1, max: 500 });
  const willingToTravel = requireEnum(req.body.willingToTravel, ["Yes", "No"] as const, "willingToTravel");
  const accountHolderName = requireString(req.body.accountHolderName, "accountHolderName", { min: 1, max: 300 });
  const bankName = requireString(req.body.bankName, "bankName", { min: 1, max: 300 });
  const accountNumber = requireString(req.body.accountNumber, "accountNumber", { min: 1, max: 100 });
  const currency = requireString(req.body.currency, "currency", { min: 1, max: 50 });
  const governmentId = requireString(req.body.governmentId, "governmentId", { min: 1, max: 500 });

  const emergencyContacts: IEmergencyContact[] = req.body.emergencyContacts;
  if (!Array.isArray(emergencyContacts) || emergencyContacts.length === 0) {
    throw new AppError(400, "At least one emergency contact is required");
  }
  for (const c of emergencyContacts) {
    if (!c.name || !c.phoneNumber) {
      throw new AppError(400, "Each emergency contact must have a name and phone number");
    }
  }

  const contractor = new Contractor({
    id: uuid(),
    orgId,
    fullName,
    companyName: req.body.companyName || undefined,
    mobileNumber,
    emailAddress,
    country,
    city,
    address: req.body.address || undefined,
    contractorType,
    mainTrade,
    otherTrade: req.body.otherTrade || undefined,
    yearsOfExperience,
    numberOfWorkers,
    licenseNumber: req.body.licenseNumber || undefined,
    licenseExpiry: req.body.licenseExpiry || undefined,
    insuranceAvailable,
    availableFrom,
    preferredWorkArea,
    willingToTravel,
    accountHolderName,
    bankName,
    accountNumber,
    swiftBic: req.body.swiftBic || undefined,
    currency,
    governmentId,
    governmentIdFile: req.body.governmentIdFile || undefined,
    tradeLicense: req.body.tradeLicense || undefined,
    insuranceCertificate: req.body.insuranceCertificate || undefined,
    emergencyContacts,
    declarationConfirmed: req.body.declarationConfirmed === true,
    termsAccepted: req.body.termsAccepted === true,
    status: "Active",
  });

  await contractor.save();
  processEvent({ type: "employee_onboarded", category: "hr", userId: req.user!.userId, orgId, createdBy: req.user!.userId, title: "Employee onboarded" }).catch(() => {});
  res.status(201).json({ success: true, data: contractor.toObject() });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can update contractors");
  const orgId = await requireOrgMembership(req.user!.userId);
  const existing = await Contractor.findOne({ orgId, id: req.params.id });
  if (!existing) throw new AppError(404, "Contractor not found");

  const allowedFields = [
    "fullName", "companyName", "mobileNumber", "emailAddress", "country", "city", "address",
    "contractorType", "mainTrade", "otherTrade", "yearsOfExperience", "numberOfWorkers",
    "licenseNumber", "licenseExpiry", "insuranceAvailable",
    "availableFrom", "preferredWorkArea", "willingToTravel",
    "accountHolderName", "bankName", "accountNumber", "swiftBic", "currency",
    "governmentId", "governmentIdFile", "tradeLicense", "insuranceCertificate",
    "emergencyContacts",
    "declarationConfirmed", "termsAccepted", "status",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (existing as unknown as Record<string, unknown>)[field] = req.body[field];
    }
  }

  await existing.save();
  processEvent({ type: "profile_updated", category: "hr", userId: req.user!.userId, orgId, createdBy: req.user!.userId, title: "Contractor updated" }).catch(() => {});
  res.json({ success: true, data: existing.toObject() });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can delete contractors");
  const orgId = await requireOrgMembership(req.user!.userId);
  const result = await Contractor.deleteOne({ orgId, id: req.params.id });
  if (result.deletedCount === 0) throw new AppError(404, "Contractor not found");
  processEvent({ type: "employee_terminated", category: "hr", userId: req.user!.userId, orgId, createdBy: req.user!.userId, title: "Employee terminated" }).catch(() => {});
  res.json({ success: true, message: "Contractor deleted" });
});

export default router;
