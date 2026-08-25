import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { collections } from "../lib/db/collections.js";
import { Call, type ICall } from "../lib/db/models/Call.js";
import { User } from "../lib/db/models/User.js";
import { logger } from "../lib/logger/index.js";
import { presenceRegistry } from "../lib/presence/index.js";
import { socketIOManager } from "../lib/socketio/index.js";

export type CallType = "dm" | "group" | "channel";

export interface CallActor {
  userId: string;
  orgId: string;
  name?: string;
  role?: string;
}

const MAX_PARTICIPANTS = 10;
const MODERATOR_ROLES = new Set(["org_admin", "manager", "team_leader", "members"]);

class CallError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isModeratorRole(role?: string): boolean {
  return MODERATOR_ROLES.has((role || "").toLowerCase());
}

async function assertCanJoin(actor: CallActor, call: ICall) {
  const allowed = await canParticipate(actor, call);
  if (!allowed) throw new CallError(403, "You are not invited to this call");
}

/** Resolve the display name for a user id (falls back to the userId). */
export async function resolveUserName(userId: string): Promise<string> {
  const user = await User.findOne({ id: userId }).select("name email").lean();
  return user?.name || user?.email?.split("@")[0] || userId;
}

function summary(call: ICall) {
  return {
    id: call.id,
    orgId: call.orgId,
    channelId: call.channelId,
    name: call.name,
    type: call.type,
    media: call.media || "video",
    status: call.status,
    initiatorId: call.initiatorId,
    participants: call.participants,
    invitees: call.invitees,
    maxParticipants: call.maxParticipants,
    scheduledAt: call.scheduledAt,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    recording: call.recording,
    mutedAll: call.mutedAll,
    messages: (call.messages || []).slice(-100),
    logs: call.logs,
    createdAt: call.createdAt,
  };
}

async function getCallById(callId: string): Promise<ICall> {
  const call = await Call.findOne({ id: callId });
  if (!call) throw new CallError(404, "Call not found");
  return call;
}

async function getChannel(channelId: string | undefined, orgId: string) {
  if (!channelId) return null;
  const db = mongoose.connection.db;
  if (!db) return null;
  return db.collection(collections.chatChannels).findOne({ id: channelId, orgId });
}

async function canParticipate(actor: CallActor, call: ICall): Promise<boolean> {
  if (call.orgId !== actor.orgId) throw new CallError(403, "Call belongs to another organization");
  if (call.participants.some((p) => p.userId === actor.userId)) return true;
  if (call.invitees.includes(actor.userId)) return true;
  if (call.initiatorId === actor.userId) return true;
  if (call.type === "dm") return false;
  const channel = await getChannel(call.channelId, actor.orgId);
  if (!channel) return false;
  return (channel.members || []).includes(actor.userId);
}

export async function createCall(params: {
  orgId: string;
  actor: CallActor;
  channelId?: string;
  type: CallType;
  name?: string;
  media?: "video" | "audio";
  invitees?: string[];
  scheduledAt?: string;
}): Promise<ICall> {
  const invitees = [...new Set([...(params.invitees ?? []), params.actor.userId])];
  if (invitees.length > MAX_PARTICIPANTS) {
    throw new CallError(400, `Calls support at most ${MAX_PARTICIPANTS} participants`);
  }
  const scheduled = Boolean(params.scheduledAt);
  const call = await Call.create({
    id: randomUUID(),
    orgId: params.orgId,
    channelId: params.channelId,
    name: params.name || "",
    type: params.type,
    media: params.media || "video",
    status: scheduled ? "scheduled" : "active",
    initiatorId: params.actor.userId,
    invitees,
    scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : undefined,
    startedAt: scheduled ? undefined : new Date(),
    participants: scheduled
      ? []
      : [
          {
            userId: params.actor.userId,
            name: params.actor.name || params.actor.userId,
            joinedAt: new Date(),
            audio: true,
            video: true,
            screen: false,
            handRaised: false,
          },
        ],
    maxParticipants: MAX_PARTICIPANTS,
    messages: [],
    logs: [
      {
        id: randomUUID(),
        userId: params.actor.userId,
        name: params.actor.name || params.actor.userId,
        action: "created",
        at: new Date(),
      },
    ],
  });

  if (call.status === "active") presenceRegistry.status(params.actor.userId, "in-call");

  for (const invitee of invitees) {
    if (invitee === params.actor.userId) continue;
    socketIOManager.emitToUser(invitee, "call:invite", {
      call: summary(call),
      by: { id: params.actor.userId, name: params.actor.name },
    });
  }

  socketIOManager.emitToOrg(params.orgId, "call:created", { call: summary(call) });
  logger.info({ callId: call.id, orgId: params.orgId }, "Call created");

  return call;
}

export async function getCall(callId: string): Promise<ICall> {
  return getCallById(callId);
}

export async function listCalls(params: {
  orgId: string;
  actorUserId: string;
  scope: "active" | "scheduled" | "history" | "all";
}): Promise<ICall[]> {
  const filter: Record<string, unknown> = { orgId: params.orgId };
  const _now = new Date();
  if (params.scope === "active") {
    filter.status = "active";
  } else if (params.scope === "scheduled") {
    filter.status = "scheduled";
  } else if (params.scope === "history") {
    filter.status = { $in: ["ended", "cancelled", "missed"] };
    filter.$or = [
      { "participants.userId": params.actorUserId },
      { invitees: params.actorUserId },
      { initiatorId: params.actorUserId },
    ];
  } else {
    filter.status = { $in: ["active", "scheduled"] };
  }
  const calls = await Call.find(filter)
    .sort({ updatedAt: -1 })
    .limit(params.scope === "history" ? 100 : 50)
    .lean();
  return calls as unknown as ICall[];
}

export async function joinCall(callId: string, actor: CallActor) {
  const call = await getCallById(callId);
  await assertCanJoin(actor, call);

  if (call.status === "ended" || call.status === "cancelled" || call.status === "missed") {
    throw new CallError(409, `Call has already ${call.status}`);
  }
  if (call.participants.length >= call.maxParticipants) {
    throw new CallError(409, "Call is full");
  }
  if (call.status === "scheduled") {
    const early = call.scheduledAt && call.scheduledAt.getTime() > Date.now() + 5 * 60_000;
    if (early) throw new CallError(409, "Call has not started yet");
    call.status = "active";
    call.startedAt = new Date();
  }

  if (!call.participants.some((p) => p.userId === actor.userId)) {
    call.participants.push({
      userId: actor.userId,
      name: actor.name || actor.userId,
      joinedAt: new Date(),
      audio: true,
      video: true,
      screen: false,
      handRaised: false,
    });
  }
  if (!call.invitees.includes(actor.userId)) call.invitees.push(actor.userId);
  call.logs.push({
    id: randomUUID(),
    userId: actor.userId,
    name: actor.name || actor.userId,
    action: "joined",
    at: new Date(),
  });
  await call.save();

  presenceRegistry.status(actor.userId, "in-call");
  socketIOManager.emitToOrg(call.orgId, "call:participant-joined", {
    callId: call.id,
    user: { id: actor.userId, name: actor.name },
    call: summary(call),
  });
  return summary(call);
}

export async function leaveCall(callId: string, actor: CallActor) {
  const call = await getCallById(callId);
  const member = call.participants.find((p) => p.userId === actor.userId);
  if (member) {
    call.participants = call.participants.filter((p) => p.userId !== actor.userId);
    call.logs.push({
      id: randomUUID(),
      userId: actor.userId,
      name: actor.name || actor.userId,
      action: "left",
      at: new Date(),
    });
    if (call.participants.length === 0 && call.status === "active") {
      call.status = "ended";
      call.endedAt = new Date();
    }
    await call.save();
  }

  if (call.status === "ended") {
    for (const p of call.logs) {
      if (p.action === "joined") presenceRegistry.status(p.userId, "online");
    }
    socketIOManager.emitToOrg(call.orgId, "call:ended", { callId: call.id, call: summary(call) });
  } else {
    presenceRegistry.status(actor.userId, "online");
  }
  socketIOManager.emitToOrg(call.orgId, "call:participant-left", {
    callId: call.id,
    userId: actor.userId,
    participants: call.participants,
    call: summary(call),
  });
  return summary(call);
}

export async function endCall(callId: string, actor: CallActor) {
  const call = await getCallById(callId);
  if (call.status === "ended") return summary(call);
  const isInitiator = call.initiatorId === actor.userId;
  const canModerate = isInitiator || isModeratorRole(actor.role);
  if (!canModerate) throw new CallError(403, "Only the initiator or a moderator can end this call");
  call.status = "ended";
  call.endedAt = new Date();
  call.logs.push({
    id: randomUUID(),
    userId: actor.userId,
    name: actor.name || actor.userId,
    action: "ended",
    at: new Date(),
  });
  await call.save();

  for (const p of call.participants) presenceRegistry.status(p.userId, "online");
  socketIOManager.emitToOrg(call.orgId, "call:ended", { callId: call.id, call: summary(call) });
  return summary(call);
}

export async function cancelCall(callId: string, actor: CallActor) {
  const call = await getCallById(callId);
  if (call.status !== "scheduled" && call.status !== "active") {
    throw new CallError(409, `Call already ${call.status}`);
  }
  const isInitiator = call.initiatorId === actor.userId;
  if (!isInitiator && !isModeratorRole(actor.role)) {
    throw new CallError(403, "Only the initiator or a moderator can cancel this call");
  }
  call.status = "cancelled";
  call.endedAt = new Date();
  call.logs.push({
    id: randomUUID(),
    userId: actor.userId,
    name: actor.name || actor.userId,
    action: "cancelled",
    at: new Date(),
  });
  await call.save();
  for (const p of call.participants) presenceRegistry.status(p.userId, "online");
  socketIOManager.emitToOrg(call.orgId, "call:cancelled", { callId: call.id, call: summary(call) });
  return summary(call);
}

export async function toggleHandRaise(callId: string, actor: CallActor) {
  const call = await getCallById(callId);
  await assertCanJoin(actor, call);
  const member = call.participants.find((p) => p.userId === actor.userId);
  if (!member) throw new CallError(403, "You are not in this call");
  member.handRaised = !member.handRaised;
  await call.save();
  socketIOManager.emitToOrg(call.orgId, "call:hand-raise", {
    callId: call.id,
    userId: actor.userId,
    handRaised: member.handRaised,
    call: summary(call),
  });
  return summary(call);
}

export async function updateSelfState(
  callId: string,
  actor: CallActor,
  patch: { audio?: boolean; video?: boolean; screen?: boolean; muted?: boolean },
) {
  const call = await getCallById(callId);
  const member = call.participants.find((p) => p.userId === actor.userId);
  if (!member) return summary(call);
  if (patch.audio !== undefined) member.audio = patch.audio;
  if (patch.video !== undefined) member.video = patch.video;
  if (patch.screen !== undefined) member.screen = patch.screen;
  if (patch.muted !== undefined) member.audio = !patch.muted;
  await call.save();
  socketIOManager.emitToOrg(call.orgId, "call:state", {
    callId: call.id,
    userId: actor.userId,
    audio: member.audio,
    video: member.video,
    screen: member.screen,
    call: summary(call),
  });
  return summary(call);
}

export async function moderatorControls(
  callId: string,
  actor: CallActor,
  action: "muteAll" | "mute" | "record",
  targetUserId?: string,
) {
  const call = await getCallById(callId);
  const canModerate = isModeratorRole(actor.role) || call.initiatorId === actor.userId;
  if (!canModerate) throw new CallError(403, "Moderator permissions required");

  if (action === "record") {
    call.recording = !call.recording;
    call.logs.push({
      id: randomUUID(),
      userId: actor.userId,
      name: actor.name || actor.userId,
      action: call.recording ? "started_recording" : "stopped_recording",
      at: new Date(),
    });
    await call.save();
    socketIOManager.emitToOrg(call.orgId, "call:recording", {
      callId: call.id,
      recording: call.recording,
      call: summary(call),
    });
    return summary(call);
  }

  if (action === "muteAll") {
    call.mutedAll = !call.mutedAll;
    await call.save();
    socketIOManager.emitToOrg(call.orgId, "call:muted-all", {
      callId: call.id,
      call: summary(call),
    });
    return summary(call);
  }

  if (action === "mute" && targetUserId) {
    const member = call.participants.find((p) => p.userId === targetUserId);
    if (member) {
      member.audio = false;
      await call.save();
      socketIOManager.emitToUser(targetUserId, "call:state", {
        callId: call.id,
        userId: targetUserId,
        audio: false,
        forced: true,
        call: summary(call),
      });
      socketIOManager.emitToOrg(call.orgId, "call:state", {
        callId: call.id,
        userId: targetUserId,
        audio: false,
        call: summary(call),
      });
    }
  }
  return summary(call);
}

export async function sendChat(callId: string, actor: CallActor, text: string) {
  const call = await getCallById(callId);
  if (call.status !== "active") throw new CallError(409, "Call is not live");
  const msg = {
    id: randomUUID(),
    userId: actor.userId,
    name: actor.name || actor.userId,
    text,
    type: "text" as const,
    createdAt: new Date(),
  };
  call.messages.push(msg);
  await call.save();
  socketIOManager.emitToOrg(call.orgId, "call:message", {
    callId: call.id,
    message: msg,
    call: summary(call),
  });
  return msg;
}

export async function rescheduleCall(callId: string, actor: CallActor, scheduledAt: string) {
  const call = await getCallById(callId);
  if (call.status !== "scheduled")
    throw new CallError(409, "Only scheduled calls can be rescheduled");
  if (!isModeratorRole(actor.role) && call.initiatorId !== actor.userId) {
    throw new CallError(403, "Only the initiator or a moderator can reschedule");
  }
  call.scheduledAt = new Date(scheduledAt);
  await call.save();
  socketIOManager.emitToOrg(call.orgId, "call:rescheduled", {
    callId: call.id,
    call: summary(call),
  });
  return summary(call);
}

export async function markMissedCalls() {
  const now = new Date();
  const calls = await Call.updateMany(
    {
      status: "scheduled",
      scheduledAt: { $gte: new Date(now.getTime() - 30 * 60_000), $lt: now },
    },
    { $set: { status: "missed" } },
  );
  return calls.modifiedCount;
}

export async function getCallHistory(orgId: string, actorUserId: string, limit = 50) {
  const calls = await Call.find({
    orgId,
    status: { $in: ["ended", "cancelled", "missed"] },
    $or: [
      { "participants.userId": actorUserId },
      { invitees: actorUserId },
      { initiatorId: actorUserId },
    ],
  })
    .sort({ endedAt: -1, updatedAt: -1 })
    .limit(limit)
    .lean();
  return calls as unknown as ICall[];
}
