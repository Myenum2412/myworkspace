import { type Document, model, Schema } from "mongoose";

export type CallStatus = "scheduled" | "active" | "ended" | "cancelled" | "missed";

export type CallSource = "dm" | "group" | "channel";

export interface ICallParticipant {
  userId: string;
  name: string;
  avatar?: string;
  joinedAt: Date;
  audio: boolean;
  video: boolean;
  screen: boolean;
  handRaised: boolean;
}

export interface ICallMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  type: "text" | "file" | "system";
  file?: { name: string; url: string; size: number };
  createdAt: Date;
}

export interface ICallLog {
  id: string;
  userId: string;
  name: string;
  action: string;
  at: Date;
}

export interface ICall extends Document {
  id: string;
  orgId: string;
  channelId?: string;
  name: string;
  type: CallSource;
  media?: "video" | "audio";
  status: CallStatus;
  initiatorId: string;
  participants: ICallParticipant[];
  invitees: string[];
  maxParticipants: number;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  recording: boolean;
  recorderUserId?: string;
  mutedAll: boolean;
  messages: ICallMessage[];
  logs: ICallLog[];
  createdAt: Date;
  updatedAt: Date;
}

const callParticipantSchema = new Schema<ICallParticipant>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    joinedAt: { type: Date, default: Date.now },
    audio: { type: Boolean, default: true },
    video: { type: Boolean, default: true },
    screen: { type: Boolean, default: false },
    handRaised: { type: Boolean, default: false },
  },
  { _id: false },
);

const callMessageSchema = new Schema<ICallMessage>(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    text: { type: String, default: "" },
    type: { type: String, enum: ["text", "file", "system"], default: "text" },
    file: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const callLogSchema = new Schema<ICallLog>(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    action: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const callSchema = new Schema<ICall>(
  {
    id: { type: String, required: true, unique: true, index: true },
    orgId: { type: String, required: true, index: true },
    channelId: { type: String },
    name: { type: String, default: "" },
    type: { type: String, enum: ["dm", "group", "channel"], default: "channel" },
    media: { type: String, enum: ["video", "audio"], default: "video" },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended", "cancelled", "missed"],
      default: "scheduled",
      index: true,
    },
    initiatorId: { type: String, required: true },
    participants: { type: [callParticipantSchema], default: [] },
    invitees: { type: [String], default: [] },
    maxParticipants: { type: Number, default: 10 },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    recording: { type: Boolean, default: false },
    recorderUserId: { type: String },
    mutedAll: { type: Boolean, default: false },
    messages: { type: [callMessageSchema], default: [] },
    logs: { type: [callLogSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

callSchema.index({ orgId: 1, status: 1, updatedAt: -1 });

export const Call = model<ICall>("Call", callSchema);
