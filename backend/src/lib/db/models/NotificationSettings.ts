import { Schema, model, Document } from "mongoose";
import { NOTIFICATION_TYPES, NOTIFICATION_CATEGORIES, NOTIFICATION_FREQUENCIES, NotificationType, NotificationCategory, NotificationFrequency } from "./Notification.js";

export interface INotificationChannelSetting {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
  webhook: boolean;
}

export interface INotificationTypeSetting {
  type: NotificationType;
  channels: INotificationChannelSetting;
  enabled: boolean;
  priority?: "critical" | "high" | "medium" | "low";
}

export interface IMutedNotification {
  type: NotificationType;
  mutedUntil?: Date;
  mutedForever: boolean;
}

export interface ISnoozeSchedule {
  start: string;
  end: string;
  timezone: string;
  daysOfWeek: number[];
}

export interface INotificationSettings extends Document {
  userId: string;
  orgId: string;
  typeSettings: INotificationTypeSetting[];
  categorySettings: Record<NotificationCategory, INotificationChannelSetting>;
  frequency: NotificationFrequency;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  doNotDisturb: boolean;
  dndUntil?: Date;
  snoozeSchedules: ISnoozeSchedule[];
  mutedNotifications: IMutedNotification[];
  desktopEnabled: boolean;
  soundEnabled: boolean;
  emailDigestTime: string;
  emailDigestTimezone: string;
  language: string;
  criticalNotificationsAlwaysOn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_CHANNELS: INotificationChannelSetting = {
  inApp: true,
  email: false,
  push: true,
  sms: false,
  webhook: false,
};

const NotificationChannelSettingSchema = new Schema<INotificationChannelSetting>(
  {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    webhook: { type: Boolean, default: false },
  },
  { _id: false }
);

const NotificationTypeSettingSchema = new Schema<INotificationTypeSetting>(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    channels: { type: NotificationChannelSettingSchema, default: () => ({ ...DEFAULT_CHANNELS }) },
    enabled: { type: Boolean, default: true },
    priority: { type: String, enum: ["critical", "high", "medium", "low"] },
  },
  { _id: false }
);

const MutedNotificationSchema = new Schema<IMutedNotification>(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    mutedUntil: Date,
    mutedForever: { type: Boolean, default: false },
  },
  { _id: false }
);

const SnoozeScheduleSchema = new Schema<ISnoozeSchedule>(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
    timezone: { type: String, default: "UTC" },
    daysOfWeek: { type: [Number], default: [1, 2, 3, 4, 5] },
  },
  { _id: false }
);

const defaultCategorySettings: Record<string, INotificationChannelSetting> = {};
for (const cat of [...NOTIFICATION_CATEGORIES]) {
  defaultCategorySettings[cat] = { ...DEFAULT_CHANNELS, email: cat === "auth" || cat === "security" || cat === "billing" };
}

const notificationSettingsSchema = new Schema<INotificationSettings>(
  {
    userId: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    typeSettings: { type: [NotificationTypeSettingSchema], default: [] },
    categorySettings: {
      type: Schema.Types.Mixed,
      default: defaultCategorySettings,
    },
    frequency: {
      type: String,
      enum: NOTIFICATION_FREQUENCIES,
      default: "instant",
    },
    quietHoursEnabled: { type: Boolean, default: false },
    quietHoursStart: { type: String, default: "22:00" },
    quietHoursEnd: { type: String, default: "08:00" },
    quietHoursTimezone: { type: String, default: "UTC" },
    doNotDisturb: { type: Boolean, default: false },
    dndUntil: Date,
    snoozeSchedules: { type: [SnoozeScheduleSchema], default: [] },
    mutedNotifications: { type: [MutedNotificationSchema], default: [] },
    desktopEnabled: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    emailDigestTime: { type: String, default: "08:00" },
    emailDigestTimezone: { type: String, default: "UTC" },
    language: { type: String, default: "en" },
    criticalNotificationsAlwaysOn: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export { DEFAULT_CHANNELS, defaultCategorySettings };

export const NotificationSettings = model<INotificationSettings>("NotificationSettings", notificationSettingsSchema);
