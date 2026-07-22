import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";

export interface ICalendarAttendee {
  email: string;
  name: string | null;
  status: "needsAction" | "declined" | "tentative" | "accepted";
  organizer: boolean;
}

export interface ICalendarOrganizer {
  email: string;
  name: string | null;
}

export interface ICalendarConferenceData {
  type: string;
  uri: string;
}

export interface ICalendarReminder {
  method: "email" | "popup";
  minutes: number;
}

export interface ICalendarEvent extends Document {
  id: string;
  userId: string;
  orgId: string;
  connectionId: string;
  externalId: string;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  timezone: string;
  status: "confirmed" | "tentative" | "cancelled";
  visibility: "default" | "public" | "private";
  recurrence: string[] | null;
  attendees: ICalendarAttendee[];
  organizer: ICalendarOrganizer;
  conferenceData: ICalendarConferenceData | null;
  reminders: ICalendarReminder[];
  color: string | null;
  etag: string;
  version: number;
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

const calendarEventSchema = new Schema<ICalendarEvent>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    userId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    connectionId: { type: String, required: true, index: true },
    externalId: { type: String, required: true },
    calendarId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    timezone: { type: String, default: "UTC" },
    status: {
      type: String,
      enum: ["confirmed", "tentative", "cancelled"],
      default: "confirmed",
    },
    visibility: {
      type: String,
      enum: ["default", "public", "private"],
      default: "default",
    },
    recurrence: { type: [String] },
    attendees: [
      {
        email: { type: String, required: true },
        name: { type: String },
        status: {
          type: String,
          enum: ["needsAction", "declined", "tentative", "accepted"],
          default: "needsAction",
        },
        organizer: { type: Boolean, default: false },
      },
    ],
    organizer: {
      email: { type: String, required: true },
      name: { type: String },
    },
    conferenceData: {
      type: {
        type: String,
        required: true,
      },
      uri: { type: String, required: true },
    },
    reminders: [
      {
        method: { type: String, enum: ["email", "popup"], required: true },
        minutes: { type: Number, required: true },
      },
    ],
    color: { type: String },
    etag: { type: String, required: true },
    version: { type: Number, default: 1 },
    lastModified: { type: Date, required: true },
  },
  { timestamps: true }
);

calendarEventSchema.index({ userId: 1, calendarId: 1 });
calendarEventSchema.index({ userId: 1, externalId: 1 }, { unique: true });
calendarEventSchema.index({ connectionId: 1 });
calendarEventSchema.index({ start: 1, end: 1 });
calendarEventSchema.index({ orgId: 1, userId: 1, start: 1 });

export const CalendarEvent = model<ICalendarEvent>(
  "CalendarEvent",
  calendarEventSchema
);
