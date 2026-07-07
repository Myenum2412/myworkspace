import { EmailData } from "./types.js";

function ts(): string {
  return new Date().toLocaleString();
}

export const buildApprovalRequested = (
  firstName: string,
  itemName: string,
  itemType: string,
  requestedBy: string,
  projectName: string,
  reason: string,
  approvalUrl: string
): EmailData => ({
  subject: `Approval Requested: ${itemName}`,
  previewText: `${requestedBy} is requesting approval for "${itemName}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "Approval Needed" },
  statusIndicator: { type: "warning", label: "Action Required" },
  intro: [`${requestedBy} has submitted an approval request for "${itemName}" that requires your review.`],
  details: [
    { label: "Item", value: itemName },
    { label: "Type", value: itemType },
    { label: "Project", value: projectName },
    { label: "Requested By", value: requestedBy },
    { label: "Reason", value: reason },
  ],
  button: { text: "Review Request", url: approvalUrl },
  warning: "Please review this request promptly to avoid blocking project progress.",
  supportEmail: "support@workspace.com",
});

export const buildApprovalApproved = (
  firstName: string,
  itemName: string,
  itemType: string,
  approvedBy: string,
  projectName: string,
  comments: string,
  approvalUrl: string
): EmailData => ({
  subject: `Approval Granted: ${itemName}`,
  previewText: `"${itemName}" has been approved by ${approvedBy}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "Approved" },
  statusIndicator: { type: "success", label: "Approved" },
  intro: [`Your request for "${itemName}" has been approved by ${approvedBy}.`],
  details: [
    { label: "Item", value: itemName },
    { label: "Type", value: itemType },
    { label: "Project", value: projectName },
    { label: "Approved By", value: approvedBy },
    ...(comments ? [{ label: "Comments", value: comments }] : []),
  ],
  button: { text: "View Details", url: approvalUrl },
  tip: "You can now proceed with the next steps for this approved item.",
  supportEmail: "support@workspace.com",
});

export const buildApprovalRejected = (
  firstName: string,
  itemName: string,
  itemType: string,
  rejectedBy: string,
  projectName: string,
  reason: string,
  feedback: string,
  approvalUrl: string
): EmailData => ({
  subject: `Approval Not Granted: ${itemName}`,
  previewText: `"${itemName}" was not approved by ${rejectedBy}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "Rejected" },
  statusIndicator: { type: "error", label: "Not Approved" },
  intro: [`Unfortunately, your request for "${itemName}" was not approved by ${rejectedBy}.`],
  details: [
    { label: "Item", value: itemName },
    { label: "Type", value: itemType },
    { label: "Project", value: projectName },
    { label: "Reason", value: reason },
    ...(feedback ? [{ label: "Feedback", value: feedback }] : []),
  ],
  button: { text: "View Details", url: approvalUrl },
  supportEmail: "support@workspace.com",
});

export const buildApprovalReminder = (
  firstName: string,
  itemName: string,
  itemType: string,
  requestedBy: string,
  daysPending: number,
  projectName: string,
  approvalUrl: string
): EmailData => ({
  subject: `Reminder: Approval Pending - ${itemName}`,
  previewText: `"${itemName}" has been pending your approval for ${daysPending} days`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "Reminder" },
  statusIndicator: { type: "warning", label: `${daysPending} days pending` },
  intro: [`This is a reminder that "${itemName}" submitted by ${requestedBy} is still awaiting your approval.`],
  details: [
    { label: "Item", value: itemName },
    { label: "Type", value: itemType },
    { label: "Project", value: projectName },
    { label: "Requested By", value: requestedBy },
    { label: "Days Pending", value: String(daysPending) },
  ],
  warning: "Long-pending approvals can delay project timelines. Please review at your earliest convenience.",
  button: { text: "Review Now", url: approvalUrl },
  supportEmail: "support@workspace.com",
});

export const buildDocumentApprovalRequested = (
  firstName: string,
  documentName: string,
  requestedBy: string,
  projectName: string,
  documentUrl: string,
  approvalUrl: string
): EmailData => ({
  subject: `Document Approval Requested: ${documentName}`,
  previewText: `${requestedBy} is requesting approval for document "${documentName}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "Document Approval" },
  statusIndicator: { type: "warning", label: "Document Review Needed" },
  intro: [`${requestedBy} has submitted "${documentName}" for document approval in ${projectName}.`],
  details: [
    { label: "Document", value: documentName },
    { label: "Project", value: projectName },
    { label: "Requested By", value: requestedBy },
  ],
  button: { text: "Review Document", url: approvalUrl },
  secondaryButton: { text: "View Document", url: documentUrl },
  supportEmail: "support@workspace.com",
});

export const buildDocumentApproved = (
  firstName: string,
  documentName: string,
  approvedBy: string,
  projectName: string,
  comments: string,
  documentUrl: string
): EmailData => ({
  subject: `Document Approved: ${documentName}`,
  previewText: `"${documentName}" has been approved by ${approvedBy}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "Document Approved" },
  statusIndicator: { type: "success", label: "Document Approved" },
  intro: [`The document "${documentName}" has been approved by ${approvedBy}.`],
  details: [
    { label: "Document", value: documentName },
    { label: "Project", value: projectName },
    { label: "Approved By", value: approvedBy },
    ...(comments ? [{ label: "Comments", value: comments }] : []),
  ],
  button: { text: "View Document", url: documentUrl },
  supportEmail: "support@workspace.com",
});

export const buildDocumentRejected = (
  firstName: string,
  documentName: string,
  rejectedBy: string,
  projectName: string,
  reason: string,
  feedback: string,
  documentUrl: string
): EmailData => ({
  subject: `Document Revision Needed: ${documentName}`,
  previewText: `"${documentName}" requires revisions`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "Document Rejected" },
  statusIndicator: { type: "error", label: "Revisions Required" },
  intro: [`The document "${documentName}" requires revisions before it can be approved by ${rejectedBy}.`],
  details: [
    { label: "Document", value: documentName },
    { label: "Project", value: projectName },
    { label: "Reviewed By", value: rejectedBy },
    { label: "Reason", value: reason },
    ...(feedback ? [{ label: "Feedback", value: feedback }] : []),
  ],
  button: { text: "View Document", url: documentUrl },
  supportEmail: "support@workspace.com",
});

export const buildFileReviewRequested = (
  firstName: string,
  fileName: string,
  requestedBy: string,
  projectName: string,
  dueDate: string,
  reviewUrl: string
): EmailData => ({
  subject: `File Review Requested: ${fileName}`,
  previewText: `${requestedBy} is requesting your review on "${fileName}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "File Review" },
  statusIndicator: { type: "warning", label: "Review Requested" },
  intro: [`${requestedBy} has requested your review on the file "${fileName}" in ${projectName}.`],
  details: [
    { label: "File", value: fileName },
    { label: "Project", value: projectName },
    { label: "Requested By", value: requestedBy },
    { label: "Due Date", value: dueDate },
  ],
  button: { text: "Start Review", url: reviewUrl },
  supportEmail: "support@workspace.com",
});

export const buildFileReviewCompleted = (
  firstName: string,
  fileName: string,
  reviewedBy: string,
  projectName: string,
  verdict: string,
  comments: string,
  fileUrl: string
): EmailData => ({
  subject: `File Review Completed: ${fileName}`,
  previewText: `${reviewedBy} has completed their review of "${fileName}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Approvals", timestamp: ts(), action: "Review Completed" },
  statusIndicator: {
    type: verdict === "Approved" ? "success" : "error",
    label: verdict,
  },
  intro: [`${reviewedBy} has completed their review of "${fileName}" in ${projectName}.`],
  details: [
    { label: "File", value: fileName },
    { label: "Project", value: projectName },
    { label: "Reviewed By", value: reviewedBy },
    { label: "Verdict", value: verdict },
    ...(comments ? [{ label: "Comments", value: comments }] : []),
  ],
  button: { text: "View File", url: fileUrl },
  supportEmail: "support@workspace.com",
});
