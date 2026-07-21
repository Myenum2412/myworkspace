import { createNotification } from "../../services/notification.service.js";

export const notifyCommunication = {
  async newComment(userId: string, orgId: string, commentAuthor: string, context: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "new_comment", category: "messages",
      title: "New Comment",
      message: `${commentAuthor} commented on ${context}`,
      link,
      actions: [{ label: "View Comment", action: "view", url: link, primary: true }],
      metadata: { commentAuthor, context },
    });
  },

  async mention(userId: string, orgId: string, mentionedByName: string, context: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "mention", category: "messages", priority: "high",
      title: `You were mentioned by ${mentionedByName}`,
      message: context,
      link,
      actions: [{ label: "View", action: "view", url: link, primary: true }],
      metadata: { mentionedByName, context },
    });
  },

  async replyReceived(userId: string, orgId: string, replierName: string, context: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "reply_received", category: "messages",
      title: "Reply Received",
      message: `${replierName} replied to your ${context}`,
      link,
      actions: [{ label: "View Reply", action: "view", url: link, primary: true }],
      metadata: { replierName, context },
    });
  },

  async chatMessage(userId: string, orgId: string, fromName: string, messagePreview: string, conversationId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "chat_message", category: "messages",
      title: `Message from ${fromName}`,
      message: messagePreview,
      link: `/chat?conversation=${conversationId}`,
      actions: [{ label: "Reply", action: "reply", url: `/chat?conversation=${conversationId}`, primary: true }],
      metadata: { conversationId, fromName },
    });
  },

  async teamAnnouncement(userId: string, orgId: string, announcedBy: string, title: string, message: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "team_announcement", category: "messages", priority: "high",
      title: `Announcement: ${title}`,
      message: `${announcedBy}: ${message}`,
      link,
      actions: [{ label: "View Details", action: "view", url: link, primary: true }],
      metadata: { announcedBy, announcementTitle: title },
    });
  },

  async broadcastMessage(userId: string, orgId: string, title: string, message: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "broadcast_message", category: "messages", priority: "high",
      title,
      message,
      link,
      actions: [{ label: "View Details", action: "view", url: link, primary: true }],
    });
  },

  async meetingScheduled(userId: string, orgId: string, scheduledBy: string, meetingTitle: string, startTime: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "meeting_scheduled", category: "messages",
      title: "Meeting Scheduled",
      message: `${scheduledBy} scheduled "${meetingTitle}" at ${startTime}`,
      link: link || "/calendar",
      actions: [
        { label: "Add to Calendar", action: "view", url: link || "/calendar", primary: true },
      ],
      metadata: { meetingTitle, startTime, scheduledBy },
    });
  },

  async meetingReminder(userId: string, orgId: string, meetingTitle: string, startTime: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "meeting_reminder", category: "messages",
      title: "Meeting Reminder",
      message: `"${meetingTitle}" starts at ${startTime}`,
      link: link || "/calendar",
      actions: [{ label: "Join Meeting", action: "view", url: link || "/calendar", primary: true }],
      metadata: { meetingTitle, startTime },
    });
  },

  async meetingCancelled(userId: string, orgId: string, cancelledBy: string, meetingTitle: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "meeting_cancelled", category: "messages",
      title: "Meeting Cancelled",
      message: `${cancelledBy} cancelled "${meetingTitle}"`,
      link: "/calendar",
      metadata: { meetingTitle, cancelledBy },
    });
  },

  async calendarInvitation(userId: string, orgId: string, invitedBy: string, eventTitle: string, eventDate: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "calendar_invitation", category: "messages",
      title: "Calendar Invitation",
      message: `${invitedBy} invited you to "${eventTitle}" on ${eventDate}`,
      link: link || "/calendar",
      actions: [
        { label: "Accept", action: "accept", url: link || "/calendar" },
        { label: "Decline", action: "decline", url: link || "/calendar" },
        { label: "View Details", action: "view", url: link || "/calendar", primary: true },
      ],
      metadata: { eventTitle, eventDate, invitedBy },
    });
  },
};
