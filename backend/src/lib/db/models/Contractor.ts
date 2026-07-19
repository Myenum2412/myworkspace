import { Schema, model, Document } from "mongoose";

export interface IEmergencyContact {
  name: string;
  phoneNumber: string;
  email?: string;
}

export interface IContractor extends Document {
  id: string;
  orgId: string;
  fullName: string;
  companyName?: string;
  mobileNumber: string;
  emailAddress: string;
  country: string;
  city: string;
  address?: string;
  contractorType: "Individual" | "Company" | "Subcontractor";
  mainTrade: "Civil" | "Electrical" | "Plumbing" | "Carpentry" | "Painting" | "Mason" | "Steel" | "HVAC" | "Roofing" | "Flooring" | "Other";
  otherTrade?: string;
  yearsOfExperience: string;
  numberOfWorkers: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  insuranceAvailable: "Yes" | "No";
  availableFrom: string;
  preferredWorkArea: string;
  willingToTravel: "Yes" | "No";
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  swiftBic?: string;
  currency: string;
  governmentId: string;
  governmentIdFile?: string;
  tradeLicense?: string;
  insuranceCertificate?: string;
  emergencyContacts: IEmergencyContact[];
  declarationConfirmed: boolean;
  termsAccepted: boolean;
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: String,
  },
  { _id: false }
);

const contractorSchema = new Schema<IContractor>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    companyName: String,
    mobileNumber: { type: String, required: true },
    emailAddress: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    address: String,
    contractorType: {
      type: String,
      required: true,
      enum: ["Individual", "Company", "Subcontractor"],
    },
    mainTrade: {
      type: String,
      required: true,
      enum: [
        "Civil", "Electrical", "Plumbing", "Carpentry", "Painting",
        "Mason", "Steel", "HVAC", "Roofing", "Flooring", "Other",
      ],
    },
    otherTrade: String,
    yearsOfExperience: { type: String, required: true },
    numberOfWorkers: { type: String, required: true },
    licenseNumber: String,
    licenseExpiry: String,
    insuranceAvailable: {
      type: String,
      required: true,
      enum: ["Yes", "No"],
    },
    availableFrom: { type: String, required: true },
    preferredWorkArea: { type: String, required: true },
    willingToTravel: {
      type: String,
      required: true,
      enum: ["Yes", "No"],
    },
    accountHolderName: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    swiftBic: String,
    currency: { type: String, required: true },
    governmentId: { type: String, required: true },
    governmentIdFile: String,
    tradeLicense: String,
    insuranceCertificate: String,
    emergencyContacts: {
      type: [emergencyContactSchema],
      required: true,
      validate: {
        validator: (v: IEmergencyContact[]) => v.length > 0,
        message: "At least one emergency contact is required",
      },
    },
    declarationConfirmed: { type: Boolean, required: true },
    termsAccepted: { type: Boolean, required: true },
    status: { type: String, default: "Active", enum: ["Active", "Inactive"] },
  },
  { timestamps: true }
);

export const Contractor = model<IContractor>("Contractor", contractorSchema);
