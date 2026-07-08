import { Schema, model, Document } from "mongoose";
import { NOTIFICATION_TYPES, NotificationType } from "./Notification.js";

export interface INotificationSetting {
  type: NotificationType;
  enabled: boolean;
  push: boolean;
  email: boolean;
  inApp: boolean;
}

export interface INotificationSettings extends Document {
  userId: string;
  orgId: string;
  settings: INotificationSetting[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  desktopEnabled: boolean;
  soundEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSettingSchema = new Schema<INotificationSetting>(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    enabled: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  { _id: false }
);

const notificationSettingsSchema = new Schema<INotificationSettings>({
  userId: { type: String, required: true, unique: true },
  orgId: { type: String, required: true },
  settings: [NotificationSettingSchema],
  quietHoursEnabled: { type: Boolean, default: false },
  quietHoursStart: { type: String, default: "22:00" },
  quietHoursEnd: { type: String, default: "08:00" },
  desktopEnabled: { type: Boolean, default: true },
  soundEnabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const NotificationSettings = model<INotificationSettings>("NotificationSettings", notificationSettingsSchema);
