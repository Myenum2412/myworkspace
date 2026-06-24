import { Schema, model, Document } from "mongoose";

export type ClientWorkspaceModule = "dashboard" | "files" | "projects" | "reports" | "settings";

export interface IClientWorkspace extends Document {
  id: string;
  orgId: string;
  clientId: string;
  dashboardEnabled: boolean;
  fileManagementEnabled: boolean;
  modules: ClientWorkspaceModule[];
  defaultFolderIds: string[];
  permissions: {
    clientCanViewDashboard: boolean;
    clientCanViewFiles: boolean;
    clientCanUploadFiles: boolean;
    clientCanDeleteFiles: boolean;
  };
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientWorkspaceSchema = new Schema<IClientWorkspace>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, unique: true, index: true },
    dashboardEnabled: { type: Boolean, default: true },
    fileManagementEnabled: { type: Boolean, default: true },
    modules: {
      type: [String],
      enum: ["dashboard", "files", "projects", "reports", "settings"],
      default: ["dashboard", "files", "projects", "reports", "settings"],
    },
    defaultFolderIds: { type: [String], default: [] },
    permissions: {
      clientCanViewDashboard: { type: Boolean, default: true },
      clientCanViewFiles: { type: Boolean, default: true },
      clientCanUploadFiles: { type: Boolean, default: true },
      clientCanDeleteFiles: { type: Boolean, default: false },
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

clientWorkspaceSchema.index({ orgId: 1, clientId: 1 }, { unique: true });

export const ClientWorkspace = model<IClientWorkspace>("ClientWorkspace", clientWorkspaceSchema);
