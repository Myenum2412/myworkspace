import { createNotification } from "../../services/notification.service.js";

export const notifyClient = {
  async created(userId: string, orgId: string, createdBy: string, clientName: string, clientId: string) {
    return createNotification({
      userId, orgId, createdBy,
      type: "client_created", category: "clients",
      title: "Client Added",
      message: `${clientName} has been added as a client by ${createdBy}`,
      link: `/clients?id=${clientId}`,
      metadata: { clientId, clientName },
    });
  },

  async updated(userId: string, orgId: string, updatedBy: string, clientName: string, clientId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "client_updated", category: "clients",
      title: "Client Updated",
      message: `${updatedBy} updated ${clientName}'s information`,
      link: `/clients?id=${clientId}`,
      metadata: { clientId },
    });
  },

  async assigned(userId: string, orgId: string, assignedBy: string, clientName: string, clientId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "client_assigned", category: "clients",
      title: "Client Assigned",
      message: `${assignedBy} assigned ${clientName} to you`,
      link: `/clients?id=${clientId}`,
      actions: [{ label: "View Client", action: "view", url: `/clients?id=${clientId}`, primary: true }],
      metadata: { clientId, clientName },
    });
  },

  async invitationSent(userId: string, orgId: string, sentBy: string, clientName: string, clientId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "client_invitation_sent", category: "clients",
      title: "Client Invitation Sent",
      message: `${sentBy} sent an invitation to ${clientName}`,
      link: `/clients?id=${clientId}`,
      metadata: { clientId },
    });
  },

  async invitationAccepted(userId: string, orgId: string, clientName: string, clientId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "client_invitation_accepted", category: "clients",
      title: "Client Accepted Invitation",
      message: `${clientName} has accepted their invitation and joined the portal`,
      link: `/clients?id=${clientId}`,
      actions: [{ label: "View Client", action: "view", url: `/clients?id=${clientId}`, primary: true }],
      metadata: { clientId },
    });
  },

  async uploadedFiles(userId: string, orgId: string, clientName: string, fileCount: number, clientId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "client_uploaded_files", category: "clients",
      title: "Client Uploaded Files",
      message: `${clientName} uploaded ${fileCount} file(s)`,
      link: `/clients?id=${clientId}`,
      metadata: { clientId, fileCount },
    });
  },

  async approvedDeliverables(userId: string, orgId: string, clientName: string, deliverableName: string, clientId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "client_approved_deliverables", category: "clients",
      title: "Client Approved Deliverables",
      message: `${clientName} approved "${deliverableName}"`,
      link: `/clients?id=${clientId}`,
      metadata: { clientId, deliverableName },
    });
  },

  async rejectedDeliverables(userId: string, orgId: string, clientName: string, deliverableName: string, reason?: string, clientId?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "client_rejected_deliverables", category: "clients", priority: "high",
      title: "Client Rejected Deliverables",
      message: `${clientName} rejected "${deliverableName}"${reason ? `: ${reason}` : ""}`,
      link: clientId ? `/clients?id=${clientId}` : "/clients",
      metadata: { deliverableName, reason },
    });
  },

  async contractSigned(userId: string, orgId: string, clientName: string, contractName: string, clientId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "contract_signed", category: "clients",
      title: "Contract Signed",
      message: `${clientName} signed "${contractName}"`,
      link: `/clients?id=${clientId}`,
      actions: [{ label: "View Contract", action: "view", url: `/clients?id=${clientId}`, primary: true }],
      metadata: { clientId, contractName },
    });
  },

  async proposalAccepted(userId: string, orgId: string, clientName: string, proposalName: string, clientId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "proposal_accepted", category: "clients",
      title: "Proposal Accepted",
      message: `${clientName} accepted "${proposalName}"`,
      link: `/clients?id=${clientId}`,
      metadata: { clientId, proposalName },
    });
  },

  async proposalRejected(userId: string, orgId: string, clientName: string, proposalName: string, reason?: string, clientId?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "proposal_rejected", category: "clients", priority: "high",
      title: "Proposal Rejected",
      message: `${clientName} rejected "${proposalName}"${reason ? `: ${reason}` : ""}`,
      link: clientId ? `/clients?id=${clientId}` : "/clients",
      metadata: { proposalName, reason },
    });
  },
};
