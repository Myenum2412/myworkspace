import { Schema, model, Document } from "mongoose";

export interface ISettings extends Document {
  orgId: string;
  general: {
    orgName: string;
    orgSlug: string;
    timezone: string;
    language: string;
    monthlyProjectLimit: number;
  };
  team: {
    defaultTeamRole: string;
    allowSelfAssign: boolean;
    maxTeamSize: number;
    autoAssignLead: boolean;
    showTeamAsAssignee: boolean;
  };
  notifications: {
    taskAssigned: boolean;
    taskStatusChange: boolean;
    taskComments: boolean;
    dueDateReminders: boolean;
    memberJoinLeave: boolean;
    teamMentions: boolean;
    projectUpdates: boolean;
    securityAlerts: boolean;
    billingUpdates: boolean;
    featureAnnouncements: boolean;
  };
  aiSoul: string;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    orgId: { type: String, required: true, unique: true },
    general: {
      orgName: { type: String, default: "My WorkSpace" },
      orgSlug: { type: String, default: "myworkspace" },
      timezone: { type: String, default: "UTC" },
      language: { type: String, default: "en" },
      monthlyProjectLimit: { type: Number, default: 10 },
    },
    team: {
      defaultTeamRole: { type: String, default: "member" },
      allowSelfAssign: { type: Boolean, default: true },
      maxTeamSize: { type: Number, default: 20 },
      autoAssignLead: { type: Boolean, default: false },
      showTeamAsAssignee: { type: Boolean, default: false },
    },
    notifications: {
      taskAssigned: { type: Boolean, default: true },
      taskStatusChange: { type: Boolean, default: true },
      taskComments: { type: Boolean, default: false },
      dueDateReminders: { type: Boolean, default: true },
      memberJoinLeave: { type: Boolean, default: true },
      teamMentions: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: false },
      securityAlerts: { type: Boolean, default: true },
      billingUpdates: { type: Boolean, default: true },
      featureAnnouncements: { type: Boolean, default: false },
    },
    aiSoul: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Settings = model<ISettings>("Settings", settingsSchema);
