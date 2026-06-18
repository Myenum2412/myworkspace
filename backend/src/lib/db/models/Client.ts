import { Schema, model, Document } from "mongoose";

export interface IClient extends Document {
  id: string;
  name: string;
  email: string;
  company: string;
  projects: number;
  status: string;
  clientType?: string;
  industry?: string;
  websiteUrl?: string;
  primaryContact?: string;
  designation?: string;
  mobileNumber?: string;
  alternatePhone?: string;
  whatsappNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  postalCode?: string;
  gstNumber?: string;
  panNumber?: string;
  companyRegNumber?: string;
  taxId?: string;
  projectName?: string;
  serviceRequired?: string;
  projectBudget?: string;
  expectedStartDate?: string;
  expectedEndDate?: string;
  billingContactName?: string;
  billingEmail?: string;
  paymentTerms?: string;
  currency?: string;
  creditLimit?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: string;
  upiId?: string;
  preferredContactMethod?: string;
  preferredTimeZone?: string;
  sourceOfLead?: string;
  notes?: string;
  assignedSalesPerson?: string;
  assignedProjectManager?: string;
  createdBy?: string;
  createdDate?: string;
  lastUpdatedDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, required: true },
    projects: { type: Number, default: 0 },
    status: { type: String, default: "" },
    clientType: String,
    industry: String,
    websiteUrl: String,
    primaryContact: String,
    designation: String,
    mobileNumber: String,
    alternatePhone: String,
    whatsappNumber: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    stateProvince: String,
    country: String,
    postalCode: String,
    gstNumber: String,
    panNumber: String,
    companyRegNumber: String,
    taxId: String,
    projectName: String,
    serviceRequired: String,
    projectBudget: String,
    expectedStartDate: String,
    expectedEndDate: String,
    billingContactName: String,
    billingEmail: String,
    paymentTerms: String,
    currency: String,
    creditLimit: String,
    bankName: String,
    accountHolderName: String,
    accountNumber: String,
    confirmAccountNumber: String,
    ifscCode: String,
    branchName: String,
    accountType: String,
    upiId: String,
    preferredContactMethod: String,
    preferredTimeZone: String,
    sourceOfLead: String,
    notes: String,
    assignedSalesPerson: String,
    assignedProjectManager: String,
    createdBy: String,
    createdDate: String,
    lastUpdatedDate: String,
  },
  { timestamps: true }
);

export const Client = model<IClient>("Client", clientSchema);
